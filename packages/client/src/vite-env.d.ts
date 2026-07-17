/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ADMIN_ORIGIN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
