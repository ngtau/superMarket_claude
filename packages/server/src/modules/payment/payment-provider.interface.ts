export type PaymentMethodId = "fps" | "payme" | "alipayhk" | "bank_transfer";

export interface Charge {
  orderId: string;
  amountCents: number;
  redirectUrl?: string;      // 线上渠道跳转链接
  qrCodeUrl?: string;        // 或收款二维码
  bankInfo?: {               // 银行转账收款信息
    bankName: string;
    accountNo: string;
    accountName: string;
  };
}

export interface PaymentProvider {
  id: PaymentMethodId;
  isEnabled(): Promise<boolean>;
  createCharge(orderId: string, amountCents: number): Promise<Charge>;
  /** 线上渠道验签；bank_transfer 无回调，走后台人工审核 */
  verifyCallback(payload: unknown, signature: string): Promise<boolean>;
  reconcile(): Promise<void>;
}
