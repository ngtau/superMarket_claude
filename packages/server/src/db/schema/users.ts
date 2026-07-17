import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { memberLevels } from "./memberLevels.js";

// users —— 注册主身份 = 邮箱 + 密码（D18/D20⑧）
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phoneEncrypted: text("phone_encrypted"),
  locale: varchar("locale", { length: 8 }).notNull().default("zh-HK"),
  telegramId: varchar("telegram_id", { length: 64 }), // 预留字段，v1不使用（D16）
  memberLevelId: uuid("member_level_id").references(() => memberLevels.id),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// email_reset_tokens —— 找回密码（D18），一次性/含TTL/幂等，仅存哈希
export const emailResetTokens = pgTable("email_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// refresh_tokens —— D2：refresh token 轮换，需服务端可撤销存储（Phase2实现阶段补充，仅存哈希不存明文）
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// addresses —— §5.10
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipient: varchar("recipient", { length: 128 }).notNull(),
  phoneEncrypted: text("phone_encrypted").notNull(),
  detail: text("detail").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// favorites —— §5.10：此前遗漏，API契约文档写了但从未落地建表，本轮补上
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  userProductIdx: uniqueIndex("favorites_user_product_idx").on(t.userId, t.productId),
}));
