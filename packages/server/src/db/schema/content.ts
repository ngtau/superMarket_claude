import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { products } from "./catalog.js";

export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  copyZh: varchar("copy_zh", { length: 255 }),
  copyEn: varchar("copy_en", { length: 255 }),
  imageUrl: text("image_url").notNull(),
  link: text("link"),
  sort: integer("sort").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentZh: text("content_zh"),
  contentEn: text("content_en"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  slot: varchar("slot", { length: 32 }).notNull(), // recommend/hot/new
  sort: integer("sort").notNull().default(0),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  questionZh: varchar("question_zh", { length: 255 }).notNull(),
  questionEn: varchar("question_en", { length: 255 }).notNull(),
  answerZh: text("answer_zh").notNull(),
  answerEn: text("answer_en").notNull(),
  sort: integer("sort").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
});
