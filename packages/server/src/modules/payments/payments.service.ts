import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments, orders } from "../../db/schema/index.js";
import { assertPaymentTransition } from "../orders/order-state-machine.js";
import { BankTransferProvider } from "../payment/bank-transfer.provider.js";
import { OnlineGatewayProvider } from "../payment/online-gateway.provider.js";
import type { PaymentMethodId } from "../payment/payment-provider.interface.js";

@Injectable()
export class PaymentsService {
  constructor(private readonly bankTransferProvider: BankTransferProvider) {}

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

  /** ⚠️修复：此前前端付款页展示的银行信息是硬编码"TODO"占位，从未接入后台真实配置。现按需附加bankInfo。 */
  async getStatus(orderId: string, userId: string) {
    const { payment } = await this.getOwnedPayment(orderId, userId);
    const bankInfo = payment.method === "bank_transfer" ? await this.bankTransferProvider.getBankInfo() : undefined;
    return { status: payment.status, method: payment.method, amountCents: payment.amountCents, bankInfo };
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

  /**
   * §5.7 / API契约§5：POST /payments/:orderId/charge —— 发起支付。
   * - bank_transfer：直接返回后台配置的商户收款信息（与 getStatus 的 bankInfo 同源），由用户线下转账后上传凭证。
   * - fps/payme/alipayhk：先走 provider.isEnabled() 门控，未激活（PSP商户号未就绪）时返回明确 400 而非 500，
   *   商户号就绪后由 provider.createCharge 返回跳转链接/收款二维码。
   */
  async createCharge(orderId: string, userId: string) {
    const { payment } = await this.getOwnedPayment(orderId, userId);
    if (payment.status === "paid") {
      throw new BadRequestException("该订单已完成支付");
    }

    if (payment.method === "bank_transfer") {
      const bankInfo = await this.bankTransferProvider.getBankInfo();
      return { method: payment.method, status: payment.status, amountCents: payment.amountCents, bankInfo };
    }

    const method = payment.method as Extract<PaymentMethodId, "fps" | "payme" | "alipayhk">;
    const provider = new OnlineGatewayProvider(method);
    if (!(await provider.isEnabled())) {
      throw new BadRequestException(`${method.toUpperCase()} 渠道尚未开通，请选择其他支付方式`);
    }
    const charge = await provider.createCharge(orderId, payment.amountCents);
    return { method, status: payment.status, amountCents: payment.amountCents, charge };
  }
}
