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

/**
 * 商品新增入参校验（§6.1 行16）。
 *
 * 为什么放在 shared 而不是 server：前台/后台都可能生成商品导入数据（批量导入走的也是同一套字段），
 * 校验规则集中一处，避免"导入放宽、手动新增收紧"这类口径漂移。
 *
 * 关于价格：D19 规定一切金额必须是**非负整数分**，不接受浮点/字符串，
 * 这里用 moneyCentsSchema 卡死，防止 HK$12.345 这类值静默入库。
 */
export const productSpecInputSchema = z.object({
  specNameZh: z.string().min(1),
  specNameEn: z.string().min(1),
  priceOriginalCents: moneyCentsSchema.optional(),
  priceAfterCents: moneyCentsSchema.optional(),
  initialStock: z.number().int().min(0),
  // §7.4 运费按重量计费；缺省 1000g。上限 100kg，防止录错单位（把 kg 当 g 填）导致运费爆表
  weightGrams: z.number().int().min(1).max(100_000).optional(),
});

export const productCreateSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionZh: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  priceOriginalCents: moneyCentsSchema,
  priceAfterCents: moneyCentsSchema,
  categoryId: z.string().uuid(),
  images: z.array(z.string()).optional(),
  specs: z.array(productSpecInputSchema).min(1, "商品至少需要一个規格(SKU)"),
});
