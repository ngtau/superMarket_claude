import { Injectable } from "@nestjs/common";
import type { PaymentProvider, Charge } from "./payment-provider.interface.js";

@Injectable()
export class BankTransferProvider implements PaymentProvider {
  id = "bank_transfer" as const;

  async isEnabled(): Promise<boolean> {
    return true; // v1兜底通道，恒为可用（后台仍可关闭展示，但不阻塞支付链路设计）
  }

  async createCharge(orderId: string, amountCents: number): Promise<Charge> {
    // TODO: 从 payment_methods.merchant_info_encrypted 解密取真实收款账号
    return {
      orderId,
      amountCents,
      bankInfo: {
        bankName: "TODO: 从后台配置读取",
        accountNo: "TODO",
        accountName: "TODO",
      },
    };
  }

  /** 银行转账无回调验签，用户上传凭证后由后台人工审核触发状态流转 */
  async verifyCallback(): Promise<boolean> {
    return false;
  }

  async reconcile(): Promise<void> {
    // 银行转账对账 = 人工审核环节，无自动对账
  }
}
