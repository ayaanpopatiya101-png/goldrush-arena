import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
export * from "./multiplayer";
export * from "./sms";
export * from "./store";

export const purchaseCodes = pgTable("purchase_codes", {
  code:       text("code").primaryKey(),
  rewardJson: text("reward_json").notNull(),
  used:       boolean("used").notNull().default(false),
  claimedBy:  text("claimed_by"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
});

export type PurchaseCode = typeof purchaseCodes.$inferSelect;
