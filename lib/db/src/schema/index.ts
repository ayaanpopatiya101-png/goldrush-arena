import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const purchaseCodes = pgTable("purchase_codes", {
  code:       text("code").primaryKey(),
  rewardJson: text("reward_json").notNull(),
  used:       boolean("used").notNull().default(false),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export type PurchaseCode = typeof purchaseCodes.$inferSelect;
