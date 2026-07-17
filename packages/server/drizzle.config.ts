import type { Config } from "drizzle-kit";

export default {
  schema: "./dist/db/schema/index.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
