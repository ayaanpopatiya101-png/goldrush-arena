import { pgTable, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { arenaPlayers } from "./multiplayer";

// This data is private and must never be joined into public player responses.
export const smsRecipients = pgTable("sms_recipients", {
  playerId: text("player_id").primaryKey().references(() => arenaPlayers.id),
  phoneHash: text("phone_hash").notNull(),
  phoneCipher: text("phone_cipher").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationSid: text("verification_sid"),
  verificationExpires: timestamp("verification_expires", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(false),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  consentSource: text("consent_source"),
  timezone: text("timezone").notNull(),
  eventIds: jsonb("event_ids").$type<string[]>().notNull().default([]),
  leadMinutes: integer("lead_minutes").notNull().default(60),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("sms_phone_hash_idx").on(table.phoneHash)]);

export const smsSuppressions = pgTable("sms_suppressions", {
  phoneHash: text("phone_hash").primaryKey(),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }).notNull().defaultNow(),
  // START only permits a fresh verification/consent flow; never restores jobs.
  restartedAt: timestamp("restarted_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
});

export const smsConsentAudit = pgTable("sms_consent_audit", {
  id: text("id").primaryKey(),
  phoneHash: text("phone_hash").notNull(),
  action: text("action").notNull(),
  version: text("version").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const smsDeliveries = pgTable("sms_deliveries", {
  // One receipt per recipient, event and closing instant, independent of edits.
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  phoneHash: text("phone_hash").notNull(),
  eventId: text("event_id").notNull(),
  revision: integer("revision").notNull(),
  timezone: text("timezone").notNull(),
  fireAt: timestamp("fire_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  attemptAt: timestamp("attempt_at", { withTimezone: true }),
  providerSid: text("provider_sid").unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("sms_delivery_due_idx").on(table.status, table.fireAt)]);

// All instances share fixed-window counters, including OTP attempts and spend.
export const smsLimits = pgTable("sms_limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
