import { BadRequestException } from "@nestjs/common";

interface LimitCheckItem { skuId: string; qty: number }

/**
 * §7.7/D20⑦ 限购风控（均为全局统一配置，非按SKU单独设置）：
 * - perProductLimit：单品限购 = 每单同一SKU最多N件
 * - totalItemsLimit：单次购物商品上限 = 订单内商品总件数上限
 * 二者均可为null（未配置=不限）。任一越界即整单拒绝。
 */
export function checkPurchaseLimits(
  items: LimitCheckItem[],
  perProductLimit: number | null,
  totalItemsLimit: number | null
): void {
  if (perProductLimit !== null) {
    for (const item of items) {
      if (item.qty > perProductLimit) {
        throw new BadRequestException({
          code: "PURCHASE_LIMIT_EXCEEDED",
          message: `单品限购 ${perProductLimit} 件，商品 ${item.skuId} 当前 ${item.qty} 件`,
        });
      }
    }
  }
  if (totalItemsLimit !== null) {
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    if (totalQty > totalItemsLimit) {
      throw new BadRequestException({
        code: "PURCHASE_LIMIT_EXCEEDED",
        message: `订单商品总件数上限 ${totalItemsLimit} 件，当前 ${totalQty} 件`,
      });
    }
  }
}
