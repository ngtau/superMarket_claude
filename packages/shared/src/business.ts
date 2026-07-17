import { z } from "zod";
import { moneyCentsSchema } from "./money.js";

export const discountTypeSchema = z.enum(["percent", "special"]);

export const discountInputSchema = z
  .object({
    productId: z.string().uuid(),
    type: discountTypeSchema,
    percentValue: z.number().min(0).max(1).optional(),
    specialPriceCents: moneyCentsSchema.optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
  })
  .refine(
    (v) =>
      (v.type === "percent" && v.percentValue !== undefined && v.specialPriceCents === undefined) ||
      (v.type === "special" && v.specialPriceCents !== undefined && v.percentValue === undefined),
    { message: "percent 类型必须只填 percentValue；special 类型必须只填 specialPriceCents" }
  );

export const fullReductionInputSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  thresholdCents: moneyCentsSchema,
  reductionCents: moneyCentsSchema,
  stackable: z.boolean(),
  scope: z.enum(["all", "category"]),
  categoryId: z.string().uuid().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

/** §7.7 限购风控：单品每单限购 + 订单内商品总件数上限 */
export const purchaseLimitCheckInputSchema = z.object({
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      qty: z.number().int().positive(),
      perOrderLimit: z.number().int().positive().nullable(), // 该SKU"每单最多N件"，null=不限
    })
  ),
  totalItemsLimit: z.number().int().positive().nullable(), // 订单内商品总件数上限，null=不限
});
