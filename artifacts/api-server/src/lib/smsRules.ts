import { Temporal } from "@js-temporal/polyfill";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createHash } from "node:crypto";

export const SMS_CONSENT_VERSION = "event-sms-2026-11-12";
export const SMS_CONSENT_TEXT = "I agree to receive recurring automated GoldRush Arena event reminder texts at my verified US mobile number for the events I select. Up to 2 reminders per day and 8 per month. Message and data rates may apply. Consent is not a condition of purchase or play. Reply STOP to stop or HELP for help. No shop marketing. I am 18 or older.";
export const FEATURED_SMS_EVENTS = [
  { id: "blitz_start", name: "Blitz Start", startDay: 1, endDay: 2 },
  { id: "xp_rush", name: "XP Rush", startDay: 3, endDay: 4 },
  { id: "double_coins", name: "Double Coins", startDay: 5, endDay: 6 },
  { id: "turbo_sunday", name: "Turbo Sunday", startDay: 0, endDay: 0 },
] as const;

export class SmsError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function usMobileCandidate(input: string) {
  const phone = parsePhoneNumberFromString(input, { defaultCountry: "US", extract: false });
  // NANP includes Canada and Caribbean regions. +1 is not a country check.
  if (!phone || !phone.isValid() || phone.country !== "US" ||
      !["MOBILE", "FIXED_LINE_OR_MOBILE"].includes(phone.getType() ?? "")) {
    throw new SmsError(400, "Enter a valid United States mobile number. Other +1 regions are not supported.");
  }
  return phone.number;
}
export function validSmsTimezone(zone: string) {
  try {
    // Require a named IANA zone, not a fixed offset or an arbitrary POSIX value.
    if (zone !== "UTC" && !zone.includes("/")) return false;
    Temporal.Now.instant().toZonedDateTimeISO(zone);
    return zone.length <= 80 && !/^[+-]/.test(zone);
  } catch { return false; }
}
export function requireSmsTimezone(zone: string) {
  if (!validSmsTimezone(zone)) throw new SmsError(400, "Choose a valid IANA timezone, such as America/New_York.");
  return zone;
}
export function smsEventWindow(eventId: string, zone: string, now = new Date()) {
  requireSmsTimezone(zone);
  const event = FEATURED_SMS_EVENTS.find(e => e.id === eventId);
  if (!event) return null;
  const local = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(zone);
  const day = local.dayOfWeek % 7;
  const length = (event.endDay - event.startDay + 7) % 7 + 1;
  const offset = (day - event.startDay + 7) % 7;
  const active = offset < length;
  const startDate = local.toPlainDate().add({ days: active ? -offset : (event.startDay - day + 7) % 7 });
  const opens = startDate.toZonedDateTime(zone);
  const closes = startDate.add({ days: length }).toZonedDateTime(zone);
  return { ...event, active, opensAt: new Date(opens.epochMilliseconds), closesAt: new Date(closes.epochMilliseconds) };
}
export function quietHours(at: Date, zone: string) {
  const hour = Temporal.Instant.fromEpochMilliseconds(at.getTime()).toZonedDateTimeISO(zone).hour;
  // Conservative release policy, not a representation of every US state's law.
  return hour < 9 || hour >= 20;
}
export function smsCatalog(zone: string, now = new Date()) {
  return [
    ...FEATURED_SMS_EVENTS.map(e => {
      const window = smsEventWindow(e.id, zone, now)!;
      return { id: e.id, name: e.name, available: true, reason: "Open to every player. Server calendar in your saved timezone.", closesAt: window.closesAt.toISOString() };
    }),
    ...[
      ["weekly", "Weekly challenge"], ["monthly", "Monthly cup"], ["annual", "Annual grand prix"],
    ].map(([id, name]) => ({
      id: id!, name: name!, available: false,
      reason: "SMS unavailable: rank, qualifying rounds and remaining plays are device-local and cannot be verified by the server.",
      closesAt: null,
    })),
  ];
}
export function deliveryKey(hash: string, eventId: string, closesAt: Date) {
  return createHash("sha256").update(`${hash}:${eventId}:${closesAt.getTime()}`).digest("hex");
}
export function nextDeliveryStatus(current: string, incoming: string) {
  if (["delivered", "failed", "cancelled", "skipped"].includes(current)) return current;
  const states: Record<string, number> = { pending: 0, sending: 1, unknown: 1, accepted: 2, scheduled: 2, queued: 2, sending_provider: 3, sent: 4, delivered: 5, failed: 5, undelivered: 5 };
  const mapped = incoming === "undelivered" ? "failed" : incoming === "accepted" || incoming === "scheduled" ? "queued" : incoming === "sending" ? "queued" : incoming;
  return mapped in states && states[mapped]! >= (states[current] ?? 0) ? mapped : current;
}
