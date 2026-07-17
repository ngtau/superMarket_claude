import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// roles —— ✅已确认支持自定义角色。种子预置§7.5的7个内置角色（isBuiltin=true，不可删除，可改权限点）
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 32 }).notNull().unique(),
  nameZh: varchar("name_zh", { length: 64 }).notNull(),
  nameEn: varchar("name_en", { length: 64 }).notNull(),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// permissions —— 权限点目录，供自定义角色勾选矩阵UI枚举
export const permissions = pgTable("permissions", {
  key: varchar("key", { length: 64 }).primaryKey(),
  groupZh: varchar("group_zh", { length: 64 }).notNull(),
  groupEn: varchar("group_en", { length: 64 }).notNull(),
  labelZh: varchar("label_zh", { length: 128 }).notNull(),
  labelEn: varchar("label_en", { length: 128 }).notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 64 }).notNull().references(() => permissions.key),
  access: varchar("access", { length: 8 }).notNull(), // full / readonly / none
}, (t) => ({
  roleClientIdx: uniqueIndex("role_permissions_role_permission_idx").on(t.roleId, t.permission),
}));

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // ⚠️修复：此前缺onDelete，删除有历史操作记录的管理员账号会撞FK约束抛未处理500。
  // 审计日志的正确语义是"账号可以删，但操作记录必须留痕"，故用SET NULL而非CASCADE/RESTRICT。
  adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("target_type", { length: 64 }),
  targetId: varchar("target_id", { length: 64 }),
  detail: jsonb("detail"), // 脱敏后的操作详情
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// platform_settings —— D20默认值 + 平台基础信息，Key-Value结构
// value 允许为 NULL：用于表达"未配置"业务语义（如 D20⑥库存预警阈值、D20⑦限购上限，null=不生效）
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const systemBackups = pgTable("system_backups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  triggeredBy: varchar("triggered_by", { length: 16 }).notNull(), // scheduled / manual
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
