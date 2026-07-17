import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, bigint, jsonb, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";

// payments —— §7.2/§8.4，幂等以 gateway_txn_id 唯一约束
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  method: varchar("method", { length: 16 }).notNull(), // fps/payme/alipayhk/bank_transfer
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  voucherUrl: text("voucher_url"),
  gatewayTxnId: varchar("gateway_txn_id", { length: 128 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idempotencyIdx: uniqueIndex("payments_gateway_txn_idx").on(t.gatewayTxnId),
}));

// payment_methods —— 四渠道开关+商户信息（D15/§8.4）
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id", { length: 16 }).primaryKey(), // fps/payme/alipayhk/bank_transfer
  enabled: boolean("enabled").notNull().default(false),
  merchantInfoEncrypted: text("merchant_info_encrypted"),
  config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
});
