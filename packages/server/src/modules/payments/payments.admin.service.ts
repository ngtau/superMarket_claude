import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments, orders, paymentMethods } from "../../db/schema/index.js";
import { assertPaymentTransition, assertOrderTransition } from "../orders/order-state-machine.js";
import { encrypt } from "../../common/crypto/aes.util.js";

@Injectable()
export class PaymentsAdminService {
  reviewQueue() {
    return db
      .select({ payment: payments, orderNo: orders.orderNo, orderId: orders.id })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(eq(payments.status, "pending_review"));
  }

  /** 审核通过：payment→paid，联动order.paymentStatus+order.status→paid（§7.1/§7.2状态机同步） */
  async approve(paymentId: string) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw new NotFoundException("支付记录不存在");
    assertPaymentTransition(payment.status, "paid");

    const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
    assertOrderTransition(order.status, "paid");

    return db.transaction(async (tx) => {
      const [updatedPayment] = await tx
        .update(payments)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(payments.id, paymentId))
        .returning();
      await tx
        .update(orders)
        .set({ paymentStatus: "paid", status: "paid", paidAt: new Date() })
        .where(eq(orders.id, order.id));
      return updatedPayment;
    });
  }

  async reject(paymentId: string) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) throw new NotFoundException("支付记录不存在");
    assertPaymentTransition(payment.status, "failed");
    const [updated] = await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId)).returning();
    return updated;
  }

  findAllMethods() {
    return db.select({ id: paymentMethods.id, enabled: paymentMethods.enabled, config: paymentMethods.config }).from(paymentMethods);
  }

  /** D11：商户信息落库前AES-256加密，接口不回显明文 */
  async updateMethod(id: string, patch: { enabled?: boolean; merchantInfo?: Record<string, string>; config?: Record<string, unknown> }) {
    const values: Partial<typeof paymentMethods.$inferInsert> = {};
    if (patch.enabled !== undefined) values.enabled = patch.enabled;
    if (patch.config !== undefined) values.config = patch.config;
    if (patch.merchantInfo !== undefined) values.merchantInfoEncrypted = encrypt(JSON.stringify(patch.merchantInfo));

    const [existing] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);
    if (!existing) {
      const [created] = await db.insert(paymentMethods).values({ id, enabled: false, config: {}, ...values }).returning();
      return created;
    }
    const [updated] = await db.update(paymentMethods).set(values).where(eq(paymentMethods.id, id)).returning();
    return updated;
  }
}
