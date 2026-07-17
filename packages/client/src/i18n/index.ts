import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhHKCommon from "./locales/zh-HK/common.json";
import enCommon from "./locales/en/common.json";

// D8/§4.3：仅支持 zh-HK / en 两语言，与 @app/shared 的 SUPPORTED_LOCALES 保持一致
i18n.use(initReactI18next).init({
  resources: {
    "zh-HK": { common: zhHKCommon },
    en: { common: enCommon },
  },
  lng: "zh-HK",
  fallbackLng: "zh-HK",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
