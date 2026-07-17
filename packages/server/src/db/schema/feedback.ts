import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { orders } from "./orders.js";

// feedbacks —— §5.14/§6.7
export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // 游客可为空；账号即使日后被删，反馈记录也应留痕
  contact: varchar("contact", { length: 128 }),
  type: varchar("type", { length: 16 }).notNull(), // inquiry/complaint/suggestion
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  reply: text("reply"),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
});
