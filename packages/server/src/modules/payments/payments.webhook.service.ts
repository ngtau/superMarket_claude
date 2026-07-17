import { Injectable, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments, orders } from "../../db/schema/index.js";
import { OnlineGatewayProvider } from "../payment/online-gateway.provider.js";
import { assertPaymentTransition, assertOrderTransition } from "../orders/order-state-machine.js";
import type { PaymentMethodId } from "../payment/payment-provider.interface.js";

@Injectable()
export class PaymentsWebhookService {
  /**
   * 线上渠道异步回调（FPS/PayMe/AlipayHK）。幂等：以 payments.gateway_txn_id 唯一索引兜底，
   * 重复回调直接返回已处理，不重复扣减/推进状态（见API契约文档"错误码与幂等规范"）。
   * v1商户号未就绪，provider.verifyCallback 恒抛错，此处仅打通骨架，PSP就绪后接真实验签。
   */
  async handle(method: Extract<PaymentMethodId, "fps" | "payme" | "alipayhk">, payload: unknown, signature: string, gatewayTxnId: string) {
    const provider = new OnlineGatewayProvider(method);
    const verified = await provider.verifyCallback(payload, signature); // 商户号未就绪前必抛错，由上层Controller捕获转为501

    if (!verified) {
      throw new BadRequestException("回调验签失败");
    }

    const [existing] = await db.select().from(payments).where(eq(payments.gatewayTxnId, gatewayTxnId)).limit(1);
    if (existing?.status === "paid") {
      return { alreadyProcessed: true }; // 幂等：已处理过，直接返回成功，不重复推进状态机
    }

    // TODO PSP就绪后：从payload解析orderId/amount，校验金额一致性，再执行下方状态流转
    throw new BadRequestException("线上渠道回调处理逻辑待PSP商户号就绪后实现");
  }
}
