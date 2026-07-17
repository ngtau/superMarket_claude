import { and, eq, lte, gte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { discounts } from "../../db/schema/index.js";

/**
 * 计算商品当前有效售价。
 * §6.4：折扣按"当前时间是否落在start_at~end_at区间"实时生效，不依赖 discounts.status 字段
 * （该字段仅用于后台列表展示"进行中/未开始/已结束"，由后续定时任务同步，此处按时间窗口现算，避免状态不同步导致价格错误）。
 * type=percent：priceOriginalCents * percentValue，四舍五入到分；type=special：直接取specialPriceCents。
 */
export async function resolveEffectivePrice(
  productId: string,
  priceOriginalCents: number,
  priceAfterCents: number
): Promise<{ effectivePriceCents: number; hasActiveDiscount: boolean }> {
  const now = new Date();
  const [active] = await db
    .select()
    .from(discounts)
    .where(and(eq(discounts.productId, productId), lte(discounts.startAt, now), gte(discounts.endAt, now)))
    .limit(1);

  if (!active) {
    return { effectivePriceCents: priceAfterCents, hasActiveDiscount: false };
  }
  if (active.type === "percent" && active.percentValue !== null) {
    const effective = Math.round(priceOriginalCents * Number(active.percentValue));
    return { effectivePriceCents: effective, hasActiveDiscount: true };
  }
  if (active.type === "special" && active.specialPriceCents !== null) {
    return { effectivePriceCents: Number(active.specialPriceCents), hasActiveDiscount: true };
  }
  return { effectivePriceCents: priceAfterCents, hasActiveDiscount: false };
}
