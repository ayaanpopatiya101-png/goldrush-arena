import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Application purchase limits and receipt delivery, NOT a parallel product/price catalog.
export const storeReservations = pgTable('store_reservations', {
  id: text('id').primaryKey(), // campaign:player -- shared cross-provider limit
  playerId: text('player_id').notNull(),
  campaignId: text('campaign_id').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull().default('pending'),
  providerSession: text('provider_session').unique(),
  checkoutUrl: text('checkout_url'),
  reward: jsonb('reward').$type<{ rewardType: 'skins'; rewardSkins: string[]; label: string }>().notNull(),
  productId: text('product_id').notNull(),
  appId: text('app_id'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const storeReceipts = pgTable('store_receipts', {
  id: text('id').primaryKey(), // authoritative provider transaction, globally unique
  playerId: text('player_id').notNull(),
  reservationId: text('reservation_id').unique(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const insertStoreReservationSchema = createInsertSchema(storeReservations);
export const insertStoreReceiptSchema = createInsertSchema(storeReceipts);
export type StoreReservation = typeof storeReservations.$inferSelect;
export type StoreReceipt = typeof storeReceipts.$inferSelect;
