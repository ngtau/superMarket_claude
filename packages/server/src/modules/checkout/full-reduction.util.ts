import { and, lte, gte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { fullReductions } from "../../db/schema/index.js";

interface CheckoutItem { categoryId: string; discountedSubtotalCents: number } // 单件按折后单价*数量累加的行小计

/**
 * §7.4 满减计算引擎，与原文数值示例逐条对齐：
 * - 基数 = 规则适用范围内的「折扣后小计」（scope=all用全单，scope=category用该分类小计）
 * - stackable=false 的规则互斥（跨scope全局互斥，非仅同scope互斥）→ 取达标规则中减额最大的一条
 * - stackable=true 的规则各自独立叠加生效，与上面选中的非叠加规则同时生效
 */
export async function computeFullReduction(items: CheckoutItem[]): Promise<{
  reductionCents: number;
  appliedRuleIds: string[];
}> {
  const now = new Date();
  const rules = await db.select().from(fullReductions).where(and(lte(fullReductions.startAt, now), gte(fullReductions.endAt, now)));
  if (rules.length === 0) return { reductionCents: 0, appliedRuleIds: [] };

  const orderSubtotal = items.reduce((s, i) => s + i.discountedSubtotalCents, 0);
  const categorySubtotal = new Map<string, number>();
  for (const i of items) {
    categorySubtotal.set(i.categoryId, (categorySubtotal.get(i.categoryId) ?? 0) + i.discountedSubtotalCents);
  }

  const basisOf = (rule: typeof rules[number]) =>
    rule.scope === "all" ? orderSubtotal : categorySubtotal.get(rule.categoryId ?? "") ?? 0;

  const eligible = rules.filter((r) => basisOf(r) >= r.thresholdCents);

  const nonStackable = eligible.filter((r) => !r.stackable);
  const stackable = eligible.filter((r) => r.stackable);

  let reductionCents = 0;
  const appliedRuleIds: string[] = [];

  if (nonStackable.length > 0) {
    // 互斥规则取"最优单条"=减额最大
    const best = nonStackable.reduce((a, b) => (b.reductionCents > a.reductionCents ? b : a));
    reductionCents += best.reductionCents;
    appliedRuleIds.push(best.id);
  }
  for (const r of stackable) {
    reductionCents += r.reductionCents;
    appliedRuleIds.push(r.id);
  }

  return { reductionCents, appliedRuleIds };
}
