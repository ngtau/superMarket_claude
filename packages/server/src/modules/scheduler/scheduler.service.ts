import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { platformSettings } from "../../db/schema/index.js";
import { OrdersAdminService } from "../orders/orders.admin.service.js";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly ordersAdminService: OrdersAdminService) {}

  /** D20①：30分钟未支付订单自动取消+释放库存。每分钟扫描一次，超时阈值从platform_settings读取（后台可配） */
  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredOrders() {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, "order_auto_cancel_minutes")).limit(1);
    const timeoutMinutes = (setting?.value as number) ?? 30;
    const result = await this.ordersAdminService.cancelExpiredPendingOrders(timeoutMinutes);
    if (result.cancelledCount > 0) {
      this.logger.log(`自动取消超时未支付订单 ${result.cancelledCount} 笔`);
    }
  }

  // D20③：14天自动确认收货，每小时扫描一次（发货后长期未确认收货的订单，扫描频率低于取消检查合理）
  @Cron(CronExpression.EVERY_HOUR)
  async autoConfirmReceipt() {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, "receipt_confirm_timeout_days")).limit(1);
    const timeoutDays = (setting?.value as number) ?? 14;
    const result = await this.ordersAdminService.autoConfirmShippedOrders(timeoutDays);
    if (result.confirmedCount > 0) {
      this.logger.log(`自动确认收货订单 ${result.confirmedCount} 笔`);
    }
  }
}
