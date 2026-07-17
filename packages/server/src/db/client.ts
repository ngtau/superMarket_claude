import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

/**
 * D1：标准PostgreSQL（TCP），驱动 = drizzle-orm/node-postgres。
 * 二选一：
 *  - DB_USE_CLIENT_POOL=true  → 连接 Neon "direct" 端点，应用层建 pg Pool（推荐）
 *  - DB_USE_CLIENT_POOL=false → 连接 Neon "pooled" 端点（PgBouncer事务模式），
 *                                 应用层不再建连接池，避免"双重池化"（见 D1/§13）
 */
const useClientPool = process.env.DB_USE_CLIENT_POOL !== "false";

const connectionConfig = { connectionString: process.env.DATABASE_URL };

export const pool = useClientPool
  ? new Pool({ ...connectionConfig, max: 10 })
  : new Pool({ ...connectionConfig, max: 1 }); // pooled端点场景：不做客户端侧池化，退化为单连接直通

export const db = drizzle(pool, { schema });
