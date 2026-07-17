import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, gte, lte, ilike, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orders, orderItems, auditLogs } from "../../db/schema/index.js";
import { assertOrderTransition } from "./order-state-machine.js";
import { InventoryService } from "../inventory/inventory.service.js";

export interface AdminOrderQuery {
  orderNo?: string;
  userId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class OrdersAdminService {
  constructor(private readonly inventoryService: InventoryService) {}

  findAll(query: AdminOrderQuery = {}) {
    const conditions = [];
    if (query.orderNo) conditions.push(ilike(orders.orderNo, `%${query.orderNo}%`));
    if (query.userId) conditions.push(eq(orders.userId, query.userId));
    if (query.status) conditions.push(eq(orders.status, query.status));
    if (query.dateFrom) conditions.push(gte(orders.createdAt, query.dateFrom));
    if (query.dateTo) conditions.push(lte(orders.createdAt, query.dateTo));
    return db.select().from(orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt));
  }

  async findOne(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  /** 发货：order.status paid→shipped，同时真正出库(§7.3 fulfill: stock-=qty, locked_stock-=qty) */
  async ship(orderId: string, trackingNo: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    assertOrderTransition(order.status, "shipped");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      await this.inventoryService.fulfill(item.skuId, item.qty);
    }
    const [updated] = await db
      .update(orders)
      .set({ status: "shipped", trackingNo, shippedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  /** 关单：释放占用库存（§7.3 release），order.status→cancelled。仅pending_payment/paid可关单（状态机守卫） */
  async close(orderId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    assertOrderTransition(order.status, "cancelled");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      await this.inventoryService.release(item.skuId, item.qty);
    }
    const [updated] = await db.update(orders).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async remark(orderId: string, remark: string) {
    const [updated] = await db.update(orders).set({ remark }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  /** 改价：记录审计日志（谁、改前改后、原因），不做金额合法性校验(信任后台操作,但留痕以备核查) */
  async updatePrice(orderId: string, newTotalCents: number, adminId: string, reason: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");

    return db.transaction(async (tx) => {
      const [updated] = await tx.update(orders).set({ totalCents: newTotalCents }).where(eq(orders.id, orderId)).returning();
      await tx.insert(auditLogs).values({
        adminId,
        action: "order.update_price",
        targetType: "order",
        targetId: orderId,
        detail: { before: order.totalCents, after: newTotalCents, reason },
      });
      return updated;
    });
  }

  /** CSV导出：按当前筛选条件导出订单列表（不含order_items明细，明细见详情接口） */
  async exportCsv(query: AdminOrderQuery): Promise<string> {
    const rows = await this.findAll(query);
    const header = "订单号,状态,支付状态,商品小计(分),优惠(分),运费(分),总额(分),创建时间";
    const lines = rows.map((o) =>
      [o.orderNo, o.status, o.paymentStatus, o.subtotalCents, o.discountCents, o.shippingFeeCents, o.totalCents, o.createdAt.toISOString()].join(",")
    );
    return [header, ...lines].join("\n");
  }

  /** D20①：30分钟未支付自动取消 + 释放库存。v1先实现为可调用方法，供Phase14定时任务/或本轮手动触发验证 */
  async cancelExpiredPendingOrders(timeoutMinutes: number) {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const expired = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending_payment"));
    const toCancel = expired.filter((o) => o.createdAt < cutoff);
    for (const order of toCancel) {
      await this.close(order.id);
    }
    return { cancelledCount: toCancel.length };
  }

  /** D20③：14天未确认收货自动完成（shipped→completed），与用户手动确认收货同构 */
  async autoConfirmShippedOrders(timeoutDays: number) {
    const cutoff = new Date(Date.now() - timeoutDays * 24 * 60 * 60 * 1000);
    const shippedOrders = await db.select().from(orders).where(eq(orders.status, "shipped"));
    const toConfirm = shippedOrders.filter((o) => o.shippedAt && o.shippedAt < cutoff);
    for (const order of toConfirm) {
      assertOrderTransition(order.status, "completed");
      await db.update(orders).set({ status: "completed", completedAt: new Date() }).where(eq(orders.id, order.id));
    }
    return { confirmedCount: toConfirm.length };
  }
}
