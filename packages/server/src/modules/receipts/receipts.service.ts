import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { receipts, orders } from "../../db/schema/index.js";

@Injectable()
export class ReceiptsService {
  /** §6.10：基础电子收据，订单完成/已付款后即可生成，一订单一收据（unique约束防重复生成） */
  private async getOrCreate(orderId: string) {
    const [existing] = await db.select().from(receipts).where(eq(receipts.orderId, orderId)).limit(1);
    if (existing) return existing;

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    if (order.paymentStatus !== "paid") {
      throw new NotFoundException("订单尚未支付，暂无法生成收据");
    }
    const receiptNo = `RCP${order.orderNo}`;
    const [created] = await db.insert(receipts).values({ orderId, receiptNo }).returning();
    return created;
  }

  async getForUser(orderId: string, userId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    if (order.userId !== userId) throw new ForbiddenException("无权访问该订单");
    return this.getOrCreate(orderId);
  }

  async getForAdmin(orderId: string) {
    return this.getOrCreate(orderId);
  }
}
