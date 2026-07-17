import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orders, orderItems } from "../../db/schema/index.js";
import { assertOrderTransition } from "./order-state-machine.js";
import { InventoryService } from "../inventory/inventory.service.js";

@Injectable()
export class OrdersService {
  constructor(private readonly inventoryService: InventoryService) {}

  async list(userId: string, status?: string) {
    const conditions = [eq(orders.userId, userId)];
    if (status) conditions.push(eq(orders.status, status));
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }

  async detail(id: string, userId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    if (order.userId !== userId) throw new ForbiddenException("无权访问该订单");
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    // v1物流展示：仅顺丰手动录单号，无第三方轨迹API，前端按 trackingNo 有无展示"待发货/已发货+单号"
    return { ...order, items };
  }

  /** C端确认收货：shipped→completed */
  async confirmReceipt(id: string, userId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    if (order.userId !== userId) throw new ForbiddenException("无权操作该订单");
    assertOrderTransition(order.status, "completed");
    const [updated] = await db.update(orders).set({ status: "completed", completedAt: new Date() }).where(eq(orders.id, id)).returning();
    return updated;
  }

  /** C端主动取消：仅pending_payment可取消，需释放库存占用 */
  async cancel(id: string, userId: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new NotFoundException("订单不存在");
    if (order.userId !== userId) throw new ForbiddenException("无权操作该订单");
    if (order.status !== "pending_payment") {
      throw new BadRequestException("仅待付款订单可取消，如需取消已付款订单请联系客服");
    }
    assertOrderTransition(order.status, "cancelled");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    for (const item of items) {
      await this.inventoryService.release(item.skuId, item.qty);
    }
    const [updated] = await db.update(orders).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(orders.id, id)).returning();
    return updated;
  }
}
