import { eq, or, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { shippingTemplates, shippingTemplateBindings } from "../../db/schema/index.js";

interface ShippingItem { productId: string; categoryId: string; weightGrams: number; qty: number }

/**
 * §6.3/D20⑤：运费 = 首重费 + ceil((总重-首重)/1kg)*续重费，满额包邮阈值触发则免运费。
 * 模板匹配优先级：商品级绑定 > 分类级绑定 > 全局默认模板；均未命中则用D20⑤系统默认值兜底（不静默免运费）。
 */
export async function computeShippingFee(items: ShippingItem[], discountedSubtotalCents: number): Promise<number> {
  if (items.length === 0) return 0;

  // 简化处理：取第一件商品命中的模板作为整单运费模板（v1不支持多包裹分开计费，SDRS未提及拆包逻辑）
  const first = items[0];
  const [productBinding] = await db
    .select()
    .from(shippingTemplateBindings)
    .where(eq(shippingTemplateBindings.productId, first.productId))
    .limit(1);
  const [categoryBinding] = productBinding
    ? []
    : await db.select().from(shippingTemplateBindings).where(eq(shippingTemplateBindings.categoryId, first.categoryId)).limit(1);

  let template;
  if (productBinding) {
    [template] = await db.select().from(shippingTemplates).where(eq(shippingTemplates.id, productBinding.templateId)).limit(1);
  } else if (categoryBinding) {
    [template] = await db.select().from(shippingTemplates).where(eq(shippingTemplates.id, categoryBinding.templateId)).limit(1);
  } else {
    [template] = await db.select().from(shippingTemplates).where(eq(shippingTemplates.isDefault, true)).limit(1);
  }

  // D20⑤兜底：未配置任何模板时，仍按标准费率计费，不静默免运费
  const firstWeightCents = template?.firstWeightCents ?? 3000;
  const firstWeightKg = template ? Number(template.firstWeightKg) : 1;
  const extraWeightCents = template?.extraWeightCents ?? 1000;
  const freeThreshold = template?.freeShippingThresholdCents ?? null;

  if (freeThreshold !== null && discountedSubtotalCents >= freeThreshold) {
    return 0;
  }

  const totalWeightGrams = items.reduce((sum, i) => sum + i.weightGrams * i.qty, 0);
  const totalWeightKg = totalWeightGrams / 1000;

  if (totalWeightKg <= firstWeightKg) {
    return firstWeightCents;
  }
  const extraKg = Math.ceil(totalWeightKg - firstWeightKg);
  return firstWeightCents + extraKg * extraWeightCents;
}
