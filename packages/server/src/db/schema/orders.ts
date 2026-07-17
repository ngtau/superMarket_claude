import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, integer, bigint, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { productSpecs } from "./catalog.js";

// orders —— §9.2，状态机见 §7.1
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNo: varchar("order_no", { length: 32 }).notNull().unique(), // D20⑨：YYYYMMDDHHmmss+4位随机数，代码固化
  userId: uuid("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 16 }).notNull().default("pending_payment"),
  paymentStatus: varchar("payment_status", { length: 16 }).notNull().default("pending"),
  addressSnapshot: jsonb("address_snapshot").notNull(),
  shippingMethod: varchar("shipping_method", { length: 16 }).notNull().default("sf_express"),
  trackingNo: varchar("tracking_no", { length: 64 }),
  remark: text("remark"),
  subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull(),
  discountCents: bigint("discount_cents", { mode: "number" }).notNull().default(0),
  shippingFeeCents: bigint("shipping_fee_cents", { mode: "number" }).notNull().default(0),
  totalCents: bigint("total_cents", { mode: "number" }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productSnapshot: jsonb("product_snapshot").notNull(), // 下单快照，避免商品后续变更影响历史订单
  skuId: uuid("sku_id").notNull().references(() => productSpecs.id),
  qty: integer("qty").notNull(),
  priceAfterCents: bigint("price_after_cents", { mode: "number" }).notNull(),
});

// receipts —— §6.10 基础电子收据
export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().unique().references(() => orders.id),
  receiptNo: varchar("receipt_no", { length: 32 }).notNull().unique(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
