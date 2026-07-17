import { z } from "zod";

/**
 * D19：金额唯一真值 = 非负整数「分」。
 * 禁止浮点数（如 12.5）与字符串金额入参，序列化统一为整数。
 */
export const moneyCentsSchema = z
  .number()
  .int({ message: "金额必须为整数分，禁止浮点数" })
  .nonnegative({ message: "金额不能为负数" });

export type MoneyCents = z.infer<typeof moneyCentsSchema>;

/** 展示层格式化：整数分 -> "HK$1,234.56" */
export function formatCurrency(cents: number, locale: "zh-HK" | "en" = "zh-HK"): string {
  const yuan = cents / 100;
  const formatted = new Intl.NumberFormat(locale === "zh-HK" ? "zh-HK" : "en-HK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(yuan);
  return `HK$${formatted}`;
}
