import { BadRequestException } from "@nestjs/common";

/** §7.1 订单状态机：仅允许下列合法迁移，非法迁移直接拒绝，避免状态错乱 */
const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"], // v1无退款，paid->cancelled仅用于极少数人工关单场景，需人工核实
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

/** §7.2 支付状态机 */
const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ["pending_review", "paid", "failed"],
  pending_review: ["paid", "failed"],
  paid: [],
  failed: ["pending", "pending_review"], // 银行转账被驳回后用户可重新上传凭证
};

export function assertOrderTransition(from: string, to: string): void {
  if (!ORDER_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(`订单状态不允许从 ${from} 变更为 ${to}`);
  }
}

export function assertPaymentTransition(from: string, to: string): void {
  if (!PAYMENT_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(`支付状态不允许从 ${from} 变更为 ${to}`);
  }
}
