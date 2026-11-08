import { pgTable, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

// This ledger is separate from device-local saves and payment entitlements.
export const arenaPlayers = pgTable("arena_players", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  rating: integer("rating").notNull().default(1000),
  avatarId: text("avatar_id"),
  avatarShared: boolean("avatar_shared").notNull().default(false),
  competitive: jsonb("competitive").$type<Record<string, { rating: number; games: number; wins: number; peak: number; lastDelta: number }>>().notNull().default({}),
  earnedCoins: integer("earned_coins").notNull().default(0),
  earnedXP: integer("earned_xp").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const avatarUploads = pgTable("avatar_uploads", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => arenaPlayers.id),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const arenaResults = pgTable("arena_results", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull().references(() => arenaPlayers.id),
  matchId: text("match_id").notNull(),
  receipt: jsonb("receipt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
