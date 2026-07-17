import { sql } from "drizzle-orm";
import { pgTable, uuid, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { productSpecs } from "./catalog.js";

// carts —— TTL 默认7天（D20②），登录同步，未登录本地存储
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  skuId: uuid("sku_id").notNull().references(() => productSpecs.id),
  qty: integer("qty").notNull(),
  checked: boolean("checked").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
