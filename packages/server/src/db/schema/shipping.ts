import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, numeric, bigint, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { products, categories } from "./catalog.js";

// shipping_templates —— ✅已确认支持多套模板（§6.3/D20⑤）
export const shippingTemplates = pgTable("shipping_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameZh: varchar("name_zh", { length: 128 }).notNull(),
  nameEn: varchar("name_en", { length: 128 }).notNull(),
  firstWeightCents: bigint("first_weight_cents", { mode: "number" }).notNull().default(3000), // 默认HK$30
  firstWeightKg: numeric("first_weight_kg", { precision: 6, scale: 2 }).notNull().default("1.00"),
  extraWeightCents: bigint("extra_weight_cents", { mode: "number" }).notNull().default(1000), // 默认HK$10/kg
  freeShippingThresholdCents: bigint("free_shipping_threshold_cents", { mode: "number" }),
  isDefault: boolean("is_default").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// shipping_template_bindings —— 商品级 > 分类级 > 全局默认（优先级见数据库设计文档§5）
export const shippingTemplateBindings = pgTable("shipping_template_bindings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => shippingTemplates.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 16 }).notNull(), // product | category
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
}, (t) => ({
  productBindIdx: uniqueIndex("shipping_bindings_product_idx").on(t.productId),
}));
