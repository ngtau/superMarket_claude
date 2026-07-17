import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, numeric, bigint, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { products } from "./catalog.js";
import { categories } from "./catalog.js";

// discounts —— 单品折扣（§6.4）。✅已确认：拆分两列，避免一列混用两种语义
export const discounts = pgTable("discounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 16 }).notNull(), // percent | special
  percentValue: numeric("percent_value", { precision: 4, scale: 3 }), // type=percent，0~1
  specialPriceCents: bigint("special_price_cents", { mode: "number" }), // type=special，整数分
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
});

// full_reductions —— 满减（§7.4）
export const fullReductions = pgTable("full_reductions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameZh: varchar("name_zh", { length: 128 }).notNull(),
  nameEn: varchar("name_en", { length: 128 }).notNull(),
  thresholdCents: bigint("threshold_cents", { mode: "number" }).notNull(),
  reductionCents: bigint("reduction_cents", { mode: "number" }).notNull(),
  stackable: boolean("stackable").notNull().default(false),
  scope: varchar("scope", { length: 16 }).notNull(), // all | category
  categoryId: uuid("category_id").references(() => categories.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
});
