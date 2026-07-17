import { z } from "zod";

// ⚠️修复：此前qty无任何运行时校验，实测负数/零均可成功写入购物车（201），
// 会污染后续结算金额计算，且流入库存原子锁定SQL(locked_stock += qty)时负数会反向操作，
// 存在被用于伪造库存释放/负金额订单的风险。现补上正整数校验，上限9999防止异常大值。
const qtySchema = z.number().int().positive().max(9999);

export const addItemSchema = z.object({
  skuId: z.string().uuid(),
  qty: qtySchema,
});

export const updateItemSchema = z.object({
  qty: qtySchema.optional(),
  checked: z.boolean().optional(),
});

export const mergeCartSchema = z.object({
  items: z.array(z.object({ skuId: z.string().uuid(), qty: qtySchema })),
});
