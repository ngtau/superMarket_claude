import { sql } from "drizzle-orm";
import {
  pgTable, uuid, varchar, text, integer, boolean, bigint, jsonb, timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// categories —— §6.1，支持多级分类
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameZh: varchar("name_zh", { length: 128 }).notNull(),
  nameEn: varchar("name_en", { length: 128 }).notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  sort: integer("sort").notNull().default(0),
  disabled: boolean("disabled").notNull().default(false),
});

// products —— 不再冗余存库存字段，统一归 inventory（§9.1 v2.2修正）
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameZh: varchar("name_zh", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  descriptionZh: text("description_zh"), // 富文本，前端渲染须经DOMPurify（§11）
  descriptionEn: text("description_en"),
  priceOriginalCents: bigint("price_original_cents", { mode: "number" }).notNull(),
  priceAfterCents: bigint("price_after_cents", { mode: "number" }).notNull(),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft/on_shelf/off_shelf
  images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
  specSnapshotSchema: jsonb("spec_snapshot_schema"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// product_specs —— SKU级规格，联动价格与库存
export const productSpecs = pgTable("product_specs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  specNameZh: varchar("spec_name_zh", { length: 128 }).notNull(),
  specNameEn: varchar("spec_name_en", { length: 128 }).notNull(),
  priceOriginalCents: bigint("price_original_cents", { mode: "number" }),
  priceAfterCents: bigint("price_after_cents", { mode: "number" }),
  // ⚠️Phase4实现阶段补充：§7.4运费按重量（首重+续重/kg）计费，但原§9数据模型未定义重量字段，此处补上。
  // 默认1000g（1kg）= D20⑤首重档位，避免历史数据weight为空导致运费算不出来；建议后台商品编辑表单加"重量(g)"必填项。
  weightGrams: integer("weight_grams").notNull().default(1000),
});

// inventory —— §7.3 预留模型，唯一库存真值来源：available = stock - locked_stock
export const inventory = pgTable("inventory", {
  skuId: uuid("sku_id").primaryKey().references(() => productSpecs.id, { onDelete: "cascade" }),
  stock: integer("stock").notNull().default(0),
  lockedStock: integer("locked_stock").notNull().default(0),
  warnThreshold: integer("warn_threshold"), // 空=不触发预警（D20⑥）
});
