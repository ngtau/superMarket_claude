import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { SUPPORTED_LOCALES, type Locale } from "@app/shared";

/** 从 ?locale=zh-HK|en 取值，非法/缺省时回退 zh-HK（与 @app/shared SUPPORTED_LOCALES 对齐） */
export const CurrentLocale = createParamDecorator((_data: unknown, ctx: ExecutionContext): Locale => {
  const request = ctx.switchToHttp().getRequest();
  const raw = request.query?.locale;
  return SUPPORTED_LOCALES.includes(raw) ? raw : "zh-HK";
});
