import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { paymentMethods } from "../../db/schema/index.js";
import { decrypt } from "../../common/crypto/aes.util.js";
import type { PaymentProvider, Charge } from "./payment-provider.interface.js";

export interface BankMerchantInfo {
  bankName: string;
  accountNo: string;
  accountName: string;
}

@Injectable()
export class BankTransferProvider implements PaymentProvider {
  id = "bank_transfer" as const;

  async isEnabled(): Promise<boolean> {
    return true; // v1兜底通道，恒为可用（后台仍可关闭展示，但不阻塞支付链路设计）
  }

  /**
   * ⚠️修复：此前收款信息一直是硬编码"TODO"占位，从未真正读取后台在支付方式管理里配置的银行信息。
   * 现从 payment_methods.merchant_info_encrypted 解密取值；后台未配置时给出明确提示而非误导性占位符。
   */
  async createCharge(orderId: string, amountCents: number): Promise<Charge> {
    const bankInfo = await this.getBankInfo();
    return { orderId, amountCents, bankInfo };
  }

  async getBankInfo(): Promise<BankMerchantInfo> {
    const [row] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, "bank_transfer")).limit(1);
    if (!row?.merchantInfoEncrypted) {
      return { bankName: "尚未配置收款账号，请联系管理员", accountNo: "-", accountName: "-" };
    }
    try {
      return JSON.parse(decrypt(row.merchantInfoEncrypted)) as BankMerchantInfo;
    } catch {
      return { bankName: "收款信息解析失败，请联系管理员", accountNo: "-", accountName: "-" };
    }
  }

  /** 银行转账无回调验签，用户上传凭证后由后台人工审核触发状态流转 */
  async verifyCallback(): Promise<boolean> {
    return false;
  }

  async reconcile(): Promise<void> {
    // 银行转账对账 = 人工审核环节，无自动对账
  }
}
