export const ORDER_STATUS = [
  "pending_payment",
  "paid",
  "shipped",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_STATUS = [
  "pending",
  "pending_review",
  "paid",
  "failed",
] as const; // v2 追加 refunded
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_METHODS = ["fps", "payme", "alipayhk", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** D20 默认值（种子数据同步维护于 server 侧 platform_settings，此处仅作前端兜底常量） */
export const D20_DEFAULTS = {
  orderAutoCancelMinutes: 30,
  cartTtlDays: 7,
  receiptConfirmTimeoutDays: 14,
  paymentTimeoutMinutes: 30,
  shippingFirstWeightCents: 3000,
  shippingExtraWeightCents: 1000,
} as const;
