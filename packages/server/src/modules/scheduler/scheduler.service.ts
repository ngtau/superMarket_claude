import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { eq, inArray, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { platformSettings, carts, cartItems, payments, orders } from "../../db/schema/index.js";
import { OrdersAdminService } from "../orders/orders.admin.service.js";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly ordersAdminService: OrdersAdminService) {}

  private async readNumberSetting(key: string, fallback: number): Promise<number> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
    const raw = setting?.value;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** D20①：30分钟未支付订单自动取消+释放库存。每分钟扫描一次，超时阈值从platform_settings读取（后台可配） */
  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredOrders() {
    const timeoutMinutes = await this.readNumberSetting("order_auto_cancel_minutes", 30);
    const result = await this.ordersAdminService.cancelExpiredPendingOrders(timeoutMinutes);
    if (result.cancelledCount > 0) {
      this.logger.log(`自动取消超时未支付订单 ${result.cancelledCount} 笔`);
    }
  }

  // D20③：14天自动确认收货，每小时扫描一次（发货后长期未确认收货的订单，扫描频率低于取消检查合理）
  @Cron(CronExpression.EVERY_HOUR)
  async autoConfirmReceipt() {
    const timeoutDays = await this.readNumberSetting("receipt_confirm_timeout_days", 14);
    const result = await this.ordersAdminService.autoConfirmShippedOrders(timeoutDays);
    if (result.confirmedCount > 0) {
      this.logger.log(`自动确认收货订单 ${result.confirmedCount} 笔`);
    }
  }

  /**
   * D20②：购物车 TTL（默认7天）—— 超时未结算的购物车项自动清理。
   * 判定基准是 carts.updated_at（购物车任何增删改都会触碰该字段，见 cart.service），
   * 而非 cart_items.created_at，避免"购物车一直在用、只是某件商品加了很久"被误清。
   */
  @Cron(CronExpression.EVERY_HOUR)
  async clearExpiredCarts() {
    const ttlDays = await this.readNumberSetting("cart_ttl_days", 7);
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
    const expired = await db.select({ id: carts.id }).from(carts).where(lt(carts.updatedAt, cutoff));
    if (expired.length === 0) return;

    const ids = expired.map((c) => c.id);
    // cart_items 有 FK onDelete cascade，删 carts 即连带清理；显式先删 items 只为日志能统计到条数
    await db.delete(cartItems).where(inArray(cartItems.cartId, ids));
    await db.delete(carts).where(inArray(carts.id, ids));
    this.logger.log(`清理超过 ${ttlDays} 天未结算的购物车 ${ids.length} 个`);
  }

  /**
   * D20④：支付超时（默认30分钟）—— pending/pending_review 超时置 failed，并同步订单 paymentStatus。
   * 订单本身的取消与库存释放由 D20① 的 cancelExpiredOrders 负责（两者每分钟各跑一次，
   * 支付先置 failed 再被关单，状态流转顺序符合 §7.2「支付失败/超时 → 订单取消」）。
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingPayments() {
    const timeoutMinutes = await this.readNumberSetting("payment_timeout_minutes", 30);
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const rows = await db
      .select({ id: payments.id, orderId: payments.orderId, createdAt: payments.createdAt })
      .from(payments)
      .where(eq(payments.status, "pending"));
    const targets = rows.filter((p) => p.createdAt < cutoff);

    for (const p of targets) {
      await db.update(payments).set({ status: "failed" }).where(eq(payments.id, p.id));
      const [order] = await db.select().from(orders).where(eq(orders.id, p.orderId)).limit(1);
      if (order && order.status === "pending_payment") {
        await db.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, p.orderId));
      }
    }
    if (targets.length > 0) {
      this.logger.log(`支付超时置为失败 ${targets.length} 笔（超过 ${timeoutMinutes} 分钟未支付）`);
    }
  }
}
