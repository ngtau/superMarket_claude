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

/** 后台编辑场景：Zod schema 工厂，生成 { fieldZh, fieldEn } 必填校验 */
export function bilingualFieldSchema(minLen = 1) {
  return z.object({
    zh: z.string().min(minLen),
    en: z.string().min(minLen),
  });
}
