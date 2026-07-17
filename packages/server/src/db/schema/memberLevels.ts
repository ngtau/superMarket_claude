import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";

// member_levels —— §7.6
export const memberLevels = pgTable("member_levels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nameZh: varchar("name_zh", { length: 64 }).notNull(),
  nameEn: varchar("name_en", { length: 64 }).notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});
