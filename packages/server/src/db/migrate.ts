import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

async function main() {
  console.log("[migrate] 开始执行迁移...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("[migrate] 完成");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] 失败", err);
  process.exit(1);
});
