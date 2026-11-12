import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import twilio from "twilio";
import { readFile } from "node:fs/promises";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool, arenaPlayers, smsRecipients, smsDeliveries, smsConsentAudit, smsSuppressions, smsLimits } from "@workspace/db";
import {
  deliveryKey, FEATURED_SMS_EVENTS, nextDeliveryStatus, quietHours, SMS_CONSENT_VERSION,
  smsEventWindow, usMobileCandidate, validSmsTimezone,
} from "../src/lib/smsRules.js";
import { decryptPhone, encryptPhone, smsHash } from "../src/lib/smsCrypto.js";
import { validTwilioCallback, validateSmsSignature, type SmsProvider } from "../src/lib/smsProvider.js";
import {
  applySmsStatus, beginSmsVerification, cancelSmsForPlayer, completeSmsVerification,
  handleSmsOptOut, reconcileSmsSchedules, reserveLimits, saveSmsSettings as saveSmsSettingsRaw, sendSmsDelivery, smsState,
} from "../src/lib/smsService.js";

// Reserved fictional fixture. All carrier operations use the injected provider.
const phone = "+12025550123";
const hash = smsHash(phone);
const ids: string[] = [];
const ratePrefix = `test-sms-${randomUUID()}`;
let existingGlobalLimits = new Set<string>();
let prepared = false;
const globalLimitFilter = sql`${smsLimits.id} LIKE 'budget:cents:%' OR ${smsLimits.id} LIKE 'send:global:%'`;
before(async () => {
  assert.notEqual(process.env.SMS_LIVE_ENABLED, "true", "Fake-provider tests require live texting OFF");
  assert.notEqual(process.env.NODE_ENV, "production", "Use only the development test database");
  existingGlobalLimits = new Set((await db.select({ id: smsLimits.id }).from(smsLimits).where(globalLimitFilter)).map(r => r.id));
  prepared = true;
});
const allow = async () => ({ verificationAvailable: true, remindersAvailable: true, blockers: [] });
async function saveSmsSettings(
  identity: Parameters<typeof saveSmsSettingsRaw>[0],
  input: Omit<Parameters<typeof saveSmsSettingsRaw>[1], "expectedRevision">,
  gates = allow,
) {
  return saveSmsSettingsRaw(identity, { ...input, expectedRevision: (await smsState(identity)).revision }, gates);
}
let sends = 0, verifies = 0, mobile = true, validCode = true, ambiguous = false;
const provider: SmsProvider = {
  mobile: async () => mobile,
  verify: async () => { verifies++; return "VE" + "1".repeat(32); },
  check: async () => validCode,
  send: async () => {
    sends++;
    if (ambiguous) throw new Error("Simulated lost response; no network request occurred");
    return { sid: "SM" + randomUUID().replaceAll("-", ""), status: "queued" };
  },
  status: async () => "delivered",
};
process.env.SMS_DAILY_BUDGET_CENTS = "10000";

async function identity() {
  const id = randomUUID();
  const tokenHash = smsHash(randomUUID());
  ids.push(id);
  await db.insert(arenaPlayers).values({ id, tokenHash });
  return { id, tokenHash };
}
async function verified() {
  const p = await identity();
  await db.insert(smsRecipients).values({
    playerId: p.id, phoneHash: hash, phoneCipher: encryptPhone(phone),
    verifiedAt: new Date(), timezone: "America/New_York",
  });
  return p;
}
async function clearFixture() {
  for (const id of ids.splice(0)) {
    await db.delete(smsDeliveries).where(eq(smsDeliveries.playerId, id));
    await db.delete(smsRecipients).where(eq(smsRecipients.playerId, id));
    await db.delete(arenaPlayers).where(eq(arenaPlayers.id, id));
    await db.delete(smsLimits).where(sql`${smsLimits.id} LIKE ${"%" + id + "%"}`);
  }
  await db.delete(smsConsentAudit).where(eq(smsConsentAudit.phoneHash, hash));
  await db.delete(smsSuppressions).where(eq(smsSuppressions.phoneHash, hash));
  // Delete only reservations belonging to fictional fixtures or this test run.
  await db.delete(smsLimits).where(sql`${smsLimits.id} LIKE ${"%" + hash + "%"} OR ${smsLimits.id} LIKE ${ratePrefix + "%"}`);
}
after(async () => {
  if (!prepared) { await pool.end(); return; }
  await clearFixture();
  // Live gates are off, so only this fake-provider suite can reserve these.
  // Preserve every pre-existing reservation; never reset the operational budget.
  const added = (await db.select({ id: smsLimits.id }).from(smsLimits).where(globalLimitFilter))
    .map(r => r.id).filter(id => !existingGlobalLimits.has(id));
  if (added.length) await db.delete(smsLimits).where(inArray(smsLimits.id, added));
  await pool.end();
});

test("US region metadata rejects Canada, Caribbean, invalid input and foreign numbers", () => {
  assert.ok(usMobileCandidate(phone).startsWith("+1"));
  for (const input of ["+14165550123", "+12425550123", "+447700900123", "+1123", "not a number", "call " + phone]) {
    assert.throws(() => usMobileCandidate(input));
  }
});
test("IANA validation rejects arbitrary offsets and invalid zones", () => {
  assert.equal(validSmsTimezone("America/New_York"), true);
  assert.equal(validSmsTimezone("UTC"), true);
  for (const input of ["+01:00", "GMT+4", "Mars/City", ""]) assert.equal(validSmsTimezone(input), false);
});
test("calendar boundaries follow DST, not 24-hour arithmetic", () => {
  const spring = smsEventWindow("turbo_sunday", "America/New_York", new Date("2026-03-08T12:00:00Z"))!;
  const fall = smsEventWindow("turbo_sunday", "America/New_York", new Date("2026-11-01T12:00:00Z"))!;
  assert.equal(spring.closesAt.getTime() - spring.opensAt.getTime(), 23 * 3600_000);
  assert.equal(fall.closesAt.getTime() - fall.opensAt.getTime(), 25 * 3600_000);
  assert.equal(smsEventWindow("invented", "UTC"), null);
});
test("server featured schedule agrees with the shipped game calendar", async () => {
  const source = await readFile(new URL("../../mobile/utils/featuredModes.ts", import.meta.url), "utf8");
  for (const event of FEATURED_SMS_EVENTS) {
    const section = source.slice(source.indexOf(`'${event.id}'`));
    assert.match(section.split("overrides:")[0]!, new RegExp(`startDay:\\s*${event.startDay},\\s*endDay:\\s*${event.endDay}`));
  }
});
test("ciphertexts are authenticated, randomized, and purpose-separated from suppression hashes", () => {
  const first = encryptPhone(phone), second = encryptPhone(phone);
  assert.notEqual(first, second);
  assert.equal(decryptPhone(first), phone);
  assert.equal(first.includes(phone), false);
  assert.notEqual(first, smsHash(phone));
  assert.throws(() => decryptPhone(first.slice(0, -3) + "AAA"));
});
test("quiet hours and status transitions do not regress terminal or sent state", () => {
  assert.equal(quietHours(new Date("2026-11-10T04:00:00Z"), "America/New_York"), true);
  assert.equal(quietHours(new Date("2026-11-10T20:00:00Z"), "America/New_York"), false);
  assert.equal(nextDeliveryStatus("sent", "queued"), "sent");
  assert.equal(nextDeliveryStatus("unknown", "delivered"), "delivered");
  assert.equal(nextDeliveryStatus("queued", "undelivered"), "failed");
  assert.equal(nextDeliveryStatus("delivered", "failed"), "delivered");
});
test("missing and forged callback signatures are rejected", () => {
  assert.equal(validTwilioCallback("/api/sms-reminders/provider/status", "", {}), false);
  assert.equal(validTwilioCallback("/api/sms-reminders/provider/status", "forged", { AccountSid: "fake" }), false);
});
test("signed callback validation binds account, exact path/query and submitted fields", () => {
  const config = { token: "synthetic-test-secret", origin: "https://example.test", accountSid: "AC" + "0".repeat(32) };
  const url = "/api/sms-reminders/provider/status?job=fixture";
  const body = { AccountSid: config.accountSid, MessageStatus: "delivered", To: phone };
  const signature = twilio.getExpectedTwilioSignature(config.token, config.origin + url, body);
  assert.equal(validateSmsSignature(config, url, signature, body), true);
  assert.equal(validateSmsSignature(config, url + "changed", signature, body), false);
  assert.equal(validateSmsSignature(config, url, signature, { ...body, MessageStatus: "failed" }), false);
  assert.equal(validateSmsSignature(config, url, signature, { ...body, AccountSid: "other" }), false);
});
test("ownership, consent version, eligibility and quiet-hour schedules are enforced", async () => {
  const p = await verified();
  const settings = { enabled: true, eventIds: ["xp_rush"], leadMinutes: 300, timezone: "America/New_York", source: "events" as const };
  await assert.rejects(smsState({ ...p, tokenHash: "wrong" }), { status: 401 });
  await assert.rejects(saveSmsSettings(p, settings, allow), { status: 400 });
  await assert.rejects(saveSmsSettings(p, { ...settings, consent: true, adultConfirmed: true, consentVersion: "old" }, allow), { status: 400 });
  await assert.rejects(saveSmsSettings(p, { ...settings, eventIds: ["weekly"] }, allow), { status: 400 });
  await assert.rejects(saveSmsSettings(p, { ...settings, timezone: "fake" }, allow), { status: 400 });
  await saveSmsSettings(p, { ...settings, consent: true, adultConfirmed: true, consentVersion: SMS_CONSENT_VERSION }, allow);
  const state = await smsState(p);
  assert.equal(state.enabled, true);
  assert.ok(state.consentedAt);
  assert.equal(state.events.find(e => e.id === "weekly")?.available, false);
  const [row] = await db.select().from(smsRecipients).where(eq(smsRecipients.playerId, p.id));
  assert.equal(row?.consentSource, "events");
  await assert.rejects(saveSmsSettingsRaw(p, { ...settings, expectedRevision: 0 }, allow), { status: 409 });
  await saveSmsSettings(p, { ...settings, leadMinutes: 360 }, allow);
  const edited = await smsState(p);
  assert.equal(edited.deliveries.filter(d => d.status === "pending").length, 1);
  assert.equal(edited.deliveries[0]!.id, state.deliveries[0]!.id);
  assert.notEqual(edited.deliveries[0]!.fireAt, state.deliveries[0]!.fireAt);
  await saveSmsSettings(p, { ...settings, leadMinutes: 180 }, allow);
  const quiet = await smsState(p);
  assert.equal(quiet.deliveries.filter(d => d.status === "pending").length, 0);
  await cancelSmsForPlayer(p, true);
});
test("rate reservations are atomic rolling limits across concurrent callers and restarts", async () => {
  const key = ratePrefix + "-rolling";
  const input = [{ key, max: 1, windowMs: 120_000 }];
  const results = await Promise.allSettled([reserveLimits(input), reserveLimits(input)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  await assert.rejects(reserveLimits(input), { status: 429 });
  await reserveLimits(input, Date.now() + 120_001);
  await assert.rejects(reserveLimits([{ key: ratePrefix + "-budget", max: 0, windowMs: 1000, units: 1 }]), { status: 429 });
});
test("OTP stays separate from recurring consent, attempts persist and resends are throttled", async () => {
  await clearFixture();
  const p = await identity();
  await beginSmsVerification(p, { phone, timezone: "America/New_York" }, ratePrefix, provider, allow);
  assert.equal(verifies, 1);
  let state = await smsState(p);
  assert.equal(state.enabled, false);
  assert.equal(state.verified, false);
  assert.equal(state.verificationPending, true);
  await assert.rejects(beginSmsVerification(p, { phone, timezone: "America/New_York" }, ratePrefix, provider, allow), { status: 429 });
  validCode = false;
  await assert.rejects(completeSmsVerification(p, "123456", provider, allow), { status: 400 });
  validCode = true;
  await completeSmsVerification(p, "123456", provider, allow);
  state = await smsState(p);
  assert.equal(state.verified, true);
  assert.equal(state.enabled, false);
  assert.equal(state.consentedAt, null);
  assert.equal(state.deliveries.length, 0);
  await cancelSmsForPlayer(p, true);
});
test("unverified and expired verification flows cannot enable reminders", async () => {
  const p = await identity();
  await db.insert(smsRecipients).values({
    playerId: p.id, phoneHash: hash, phoneCipher: encryptPhone(phone),
    timezone: "UTC", verificationSid: "VE" + "2".repeat(32), verificationExpires: new Date(Date.now() - 1000),
  });
  await assert.rejects(saveSmsSettings(p, {
    enabled: true, eventIds: ["xp_rush"], leadMinutes: 300, timezone: "UTC", source: "settings",
    consent: true, consentVersion: SMS_CONSENT_VERSION, adultConfirmed: true,
  }, allow), { status: 409 });
  await assert.rejects(completeSmsVerification(p, "123456", provider, allow), { status: 400 });
  await cancelSmsForPlayer(p, true);
});
test("persistent OTP check limits cannot be reset by retrying a failed code", async () => {
  const p = await identity();
  await db.insert(smsRecipients).values({
    playerId: p.id, phoneHash: hash, phoneCipher: encryptPhone(phone),
    timezone: "UTC", verificationSid: "VE" + "3".repeat(32), verificationExpires: new Date(Date.now() + 600_000),
  });
  validCode = false;
  for (let i = 0; i < 5; i++) await assert.rejects(completeSmsVerification(p, "123456", provider, allow), { status: 400 });
  validCode = true;
  await assert.rejects(completeSmsVerification(p, "123456", provider, allow), { status: 429 });
  await cancelSmsForPlayer(p, true);
});
test("a stopped number remains suppressed after number deletion and on another profile", async () => {
  const p = await verified();
  await handleSmsOptOut(phone, "STOP");
  assert.equal((await smsState(p)).suppressed, true);
  await cancelSmsForPlayer(p, true);
  const other = await verified();
  const settings = { enabled: true, eventIds: ["xp_rush"], leadMinutes: 300, timezone: "America/New_York", source: "settings" as const,
    consent: true, adultConfirmed: true, consentVersion: SMS_CONSENT_VERSION };
  await assert.rejects(saveSmsSettings(other, settings, allow), { status: 409 });
  await handleSmsOptOut(phone, "START");
  assert.equal((await smsState(other)).enabled, false);
  assert.equal((await smsState(other)).verified, false);
  await assert.rejects(saveSmsSettings(other, settings, allow), { status: 409 });
  await cancelSmsForPlayer(other, true);
});

// Pick an IANA zone in daytime at execution time. SMS windows are computed by
// the production rules; no Date.now monkey-patching or live-provider calls.
function daytimeZone() {
  for (const zone of ["Pacific/Honolulu", "America/New_York", "Europe/London", "Asia/Tokyo", "Pacific/Auckland"]) {
    if (!quietHours(new Date(), zone)) return zone;
  }
  throw new Error("No daytime fixture zone");
}
async function dueFixture() {
  await db.delete(smsSuppressions).where(eq(smsSuppressions.phoneHash, hash));
  await db.delete(smsLimits).where(sql`${smsLimits.id} LIKE ${"%" + hash + "%"}`);
  const p = await verified();
  const zone = daytimeZone();
  const event = FEATURED_SMS_EVENTS.find(e => smsEventWindow(e.id, zone)!.active)!;
  const window = smsEventWindow(event.id, zone)!;
  const key = deliveryKey(hash, event.id, window.closesAt);
  await db.delete(smsDeliveries).where(eq(smsDeliveries.id, key));
  await db.update(smsRecipients).set({
    enabled: true, consentAt: new Date(), consentVersion: SMS_CONSENT_VERSION,
    eventIds: [event.id], timezone: zone,
  }).where(eq(smsRecipients.playerId, p.id));
  await db.insert(smsDeliveries).values({
    id: key, playerId: p.id, phoneHash: hash, eventId: event.id, revision: 0, timezone: zone,
    fireAt: new Date(Date.now() - 1000), closesAt: window.closesAt,
  });
  return { p, key };
}
test("leased attempts deduplicate concurrent sends and signed status races", async () => {
  const { p, key } = await dueFixture();
  const before = sends;
  await Promise.all([sendSmsDelivery(key, provider, allow), sendSmsDelivery(key, provider, allow)]);
  assert.equal(sends, before + 1);
  const [job] = await db.select().from(smsDeliveries).where(eq(smsDeliveries.id, key));
  assert.equal(job?.status, "queued");
  await applySmsStatus(key, job!.providerSid!, phone, "delivered");
  await applySmsStatus(key, job!.providerSid!, phone, "queued");
  assert.equal((await smsState(p)).deliveries[0]?.status, "delivered");
  await cancelSmsForPlayer(p, true);
});
test("an ambiguous provider acceptance is not retried after process recovery", async () => {
  const { p, key } = await dueFixture();
  ambiguous = true;
  const before = sends;
  await sendSmsDelivery(key, provider, allow);
  ambiguous = false;
  assert.equal((await smsState(p)).deliveries[0]?.status, "unknown");
  await reconcileSmsSchedules();
  await sendSmsDelivery(key, provider, allow);
  assert.equal(sends, before + 1);
  await cancelSmsForPlayer(p, true);
});
test("STOP before the final send check suppresses the job and sign-out cancels work", async () => {
  const { p, key } = await dueFixture();
  const before = sends;
  await handleSmsOptOut(phone, "STOP");
  await sendSmsDelivery(key, provider, allow);
  assert.equal(sends, before);
  await cancelSmsForPlayer(p);
  assert.equal((await smsState(p)).enabled, false);
  await cancelSmsForPlayer(p, true);
});
test("provider opt-out rejection suppresses future work even without a keyword callback", async () => {
  const { p, key } = await dueFixture();
  const reject: SmsProvider = { ...provider, send: async () => { throw Object.assign(new Error("Synthetic rejection"), { code: 21610 }); } };
  await sendSmsDelivery(key, reject, allow);
  const state = await smsState(p);
  assert.equal(state.suppressed, true);
  assert.equal(state.enabled, false);
  assert.equal(state.deliveries[0]?.status, "failed");
  await cancelSmsForPlayer(p, true);
});
test("expired event windows are skipped, and a crashed attempt becomes unknown", async () => {
  const { p, key } = await dueFixture();
  await db.update(smsDeliveries).set({ closesAt: new Date(Date.now() - 1000) }).where(eq(smsDeliveries.id, key));
  const before = sends;
  await sendSmsDelivery(key, provider, allow);
  assert.equal(sends, before);
  assert.equal((await smsState(p)).deliveries[0]?.status, "skipped");
  await db.update(smsDeliveries).set({ status: "sending", attemptAt: new Date(Date.now() - 120_000) }).where(eq(smsDeliveries.id, key));
  await reconcileSmsSchedules();
  assert.equal((await smsState(p)).deliveries[0]?.status, "unknown");
  await cancelSmsForPlayer(p, true);
});
