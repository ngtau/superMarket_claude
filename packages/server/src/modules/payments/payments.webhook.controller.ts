import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { PaymentsWebhookService } from "./payments.webhook.service.js";
import type { PaymentMethodId } from "../payment/payment-provider.interface.js";

/**
 * API契约§5：POST /payments/webhook/:method —— PSP 异步回调入口（公开，安全性由验签保证，不走 JWT）。
 * 放在独立 Controller 而非 PaymentsController，是因为后者类级挂了 JwtUserGuard，
 * 网关回调不可能携带用户 token；同时避免 webhook 被限流守卫误伤。
 */
@Controller("payments/webhook")
export class PaymentsWebhookController {
  constructor(private readonly paymentsWebhookService: PaymentsWebhookService) {}

  @Post(":method")
  async handle(
    @Param("method") method: string,
    @Body() payload: unknown,
    @Headers("x-gateway-signature") signature: string,
    @Headers("x-gateway-txn-id") gatewayTxnId: string
  ) {
    if (!["fps", "payme", "alipayhk"].includes(method)) {
      return { received: false, reason: `不支持的回调渠道：${method}` };
    }
    return this.paymentsWebhookService.handle(
      method as Exclude<PaymentMethodId, "bank_transfer">,
      payload,
      signature ?? "",
      gatewayTxnId ?? ""
    );
  }
}
