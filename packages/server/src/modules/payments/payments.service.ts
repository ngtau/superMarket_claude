import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments, orders } from "../../db/schema/index.js";
import { assertPaymentTransition } from "../orders/order-state-machine.js";

@Injectable()
export class PaymentsService {
  private async getOwnedPayment(orderId: string, userId: string) {
    const [row] = await db
      .select({ payment: payments, order: orders })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(payments.orderId, orderId))
      .limit(1);
    if (!row) throw new NotFoundException("支付记录不存在");
    if (row.order.userId !== userId) throw new ForbiddenException("无权访问该订单");
    return row;
  }

  async getStatus(orderId: string, userId: string) {
    const { payment } = await this.getOwnedPayment(orderId, userId);
    return { status: payment.status, method: payment.method, amountCents: payment.amountCents };
  }

  /** 银行转账：上传凭证 → pending_review，等待后台人工审核（v1唯一完整实现的支付链路） */
  async uploadVoucher(orderId: string, userId: string, voucherUrl: string) {
    const { payment } = await this.getOwnedPayment(orderId, userId);
    if (payment.method !== "bank_transfer") {
      throw new BadRequestException("仅银行转账支持上传凭证");
    }
    assertPaymentTransition(payment.status, "pending_review");
    const [updated] = await db
      .update(payments)
      .set({ status: "pending_review", voucherUrl })
      .where(eq(payments.id, payment.id))
      .returning();
    return updated;
  }

  /** 前端轮询：直接返回当前状态，不做特殊处理（线上渠道由webhook异步推进状态） */
  async poll(orderId: string, userId: string) {
    return this.getStatus(orderId, userId);
  }
}
