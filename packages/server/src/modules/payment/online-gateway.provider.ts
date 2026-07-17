import { Injectable } from "@nestjs/common";
import type { PaymentProvider, PaymentMethodId, Charge } from "./payment-provider.interface.js";

/**
 * D15：FPS/PayMe/AlipayHK 三线上渠道，v1仅做"配置开关+商户信息持久化+门控激活"骨架。
 * 商户号就绪前 isEnabled() 恒为 false，前端结算页不展示该支付选项。
 * PSP商户号就绪后：① 在 payment_methods 表启用对应 enabled 字段并写入 merchant_info_encrypted；
 * ② 实现 createCharge/verifyCallback 真实网关调用与验签（payment-sign.ts）。
 */
@Injectable()
export class OnlineGatewayProvider implements PaymentProvider {
  constructor(public readonly id: Extract<PaymentMethodId, "fps" | "payme" | "alipayhk">) {}

  async isEnabled(): Promise<boolean> {
    // TODO: 查询 payment_methods 表 enabled 字段 + 商户信息是否已持久化
    return false;
  }

  async createCharge(orderId: string, amountCents: number): Promise<Charge> {
    throw new Error(`${this.id} 渠道尚未就绪（PSP商户号未激活），门控关闭`);
  }

  async verifyCallback(payload: unknown, signature: string): Promise<boolean> {
    // TODO: payment-sign.ts 验签实现
    throw new Error(`${this.id} 验签逻辑待PSP商户号就绪后实现`);
  }

  async reconcile(): Promise<void> {
    // TODO: 异步对账逻辑
  }
}
