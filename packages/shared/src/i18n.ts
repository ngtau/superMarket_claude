import { z } from "zod";

export const SUPPORTED_LOCALES = ["zh-HK", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const localeSchema = z.enum(SUPPORTED_LOCALES);

/** 业务双语字段：DB 存 _zh/_en 两列，API 按 locale 取值并互为回退，避免出现空白 */
export function resolveBilingual(
  zh: string | null | undefined,
  en: string | null | undefined,
  locale: Locale
): string {
  if (locale === "zh-HK") return zh || en || "";
  return en || zh || "";
}

/**
 * 后台编辑场景：校验一对双语值（zh/en 互为回退，任一为空都会导致前端出现空白，故两侧都要求非空）。
 * 注意：本函数只校验取值，不产出 {zh,en} 字段形状——后台 API 的双语字段遵循 §4.3 的 `xxxZh`/`xxxEn`
 * 命名约定，schema 里直接写两个字段即可，无需再用工厂拼形状。
 */
export function assertBilingual(zh: unknown, en: unknown, minLen = 1): boolean {
  return (
    typeof zh === "string" && zh.trim().length >= minLen &&
    typeof en === "string" && en.trim().length >= minLen
  );
}
