import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool, arenaPlayers, smsRecipients, smsDeliveries, smsConsentAudit, smsLimits } from "@workspace/db";
import { encryptPhone, smsHash } from "../src/lib/smsCrypto.js";
import { CreatePlayerSessionResponse, GetSmsRemindersResponse } from "@workspace/api-zod";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}/api`;
const sessions: { playerId: string; token: string }[] = [];
const fixture = "+12025550177";
const hash = smsHash(fixture);
async function session() {
  const response = await fetch(`${base}/multiplayer/session`, { method: "POST" });
  assert.equal(response.status, 200);
  const data = CreatePlayerSessionResponse.parse(await response.json());
  sessions.push(data);
  return data as { playerId: string; token: string };
}
async function call(token: string, path = "", method = "GET", body?: object) {
  return fetch(`${base}/sms-reminders${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
after(async () => {
  for (const s of sessions) {
    await db.delete(smsDeliveries).where(eq(smsDeliveries.playerId, s.playerId));
    await db.delete(smsRecipients).where(eq(smsRecipients.playerId, s.playerId));
    await db.delete(arenaPlayers).where(eq(arenaPlayers.id, s.playerId));
  }
  await db.delete(smsConsentAudit).where(eq(smsConsentAudit.phoneHash, hash));
  await pool.end();
});
test("private API fails closed, isolates owners, validates inputs, and cancels on retirement", async () => {
  assert.notEqual(process.env.SMS_LIVE_ENABLED, "true", "API tests require live texting OFF");
  assert.notEqual(process.env.NODE_ENV, "production", "Use the development API, never production");
  assert.equal((await call("not-a-token")).status, 401);
  const a = await session(), b = await session();
  await db.insert(smsRecipients).values({
    playerId: a.playerId, phoneHash: hash, phoneCipher: encryptPhone(fixture),
    timezone: "America/New_York", verifiedAt: new Date(), enabled: true,
    consentAt: new Date(), consentVersion: "event-sms-2026-11-12", eventIds: ["xp_rush"],
  });
  const id = randomUUID();
  await db.insert(smsDeliveries).values({
    id, playerId: a.playerId, phoneHash: hash, eventId: "xp_rush",
    revision: 0, timezone: "America/New_York", fireAt: new Date(Date.now() + 86_400_000), closesAt: new Date(Date.now() + 2 * 86_400_000),
  });
  const privateState = GetSmsRemindersResponse.parse(await (await call(a.token)).json());
  assert.equal(privateState.hasNumber, true);
  assert.equal(privateState.remindersAvailable, false);
  assert.equal(JSON.stringify(privateState).includes(fixture), false);
  const otherState = GetSmsRemindersResponse.parse(await (await call(b.token, `?playerId=${a.playerId}`)).json());
  assert.equal(otherState.hasNumber, false);
  assert.deepEqual(otherState.deliveries, []);
  await call(b.token, "", "DELETE");
  assert.equal(GetSmsRemindersResponse.parse(await (await call(a.token)).json()).hasNumber, true);
  const settings = { enabled: false, eventIds: [], leadMinutes: 60, timezone: "America/New_York", source: "settings", expectedRevision: 0 };
  assert.equal((await call(a.token, "", "PUT", { ...settings, playerId: b.playerId })).status, 400);
  assert.equal((await call(a.token, "", "PUT", { ...settings, leadMinutes: 5.5 })).status, 400);
  assert.equal((await call(a.token, "", "PUT", { ...settings, closesAt: "2099-01-01" })).status, 400);
  assert.equal((await call(a.token, "", "PUT", { ...settings, timezone: "not-a-zone" })).status, 400);
  assert.equal((await call(a.token, "/verification", "POST", { phone: fixture, timezone: "UTC", verificationConsent: false, adultConfirmed: true })).status, 400);
  assert.equal((await call(a.token, "/verification", "POST", { phone: "+14165550123", timezone: "UTC", verificationConsent: true, adultConfirmed: true })).status, 400);
  assert.equal((await call(a.token, "/verification", "POST", { phone: fixture, timezone: "UTC", verificationConsent: true, adultConfirmed: true })).status, 503);
  assert.equal((await call(a.token, "/cancel", "POST")).status, 204);
  const cancelled = GetSmsRemindersResponse.parse(await (await call(a.token)).json());
  assert.equal(cancelled.enabled, false);
  assert.equal(cancelled.deliveries[0].status, "cancelled");
  assert.equal((await fetch(`${base}/multiplayer/avatar/retire`, { method: "POST", headers: { Authorization: `Bearer ${a.token}` } })).status, 204);
  assert.equal((await call(a.token)).status, 401);
  const [left] = await db.select().from(smsRecipients).where(eq(smsRecipients.playerId, a.playerId));
  assert.equal(left, undefined);
  const forged = await fetch(`${base}/sms-reminders/provider/inbound`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "forged" },
    body: "Body=STOP&AccountSid=fake",
  });
  assert.equal(forged.status, 403);
  const responses = await Promise.all(Array.from({ length: 62 }, () => call(b.token)));
  assert.ok(responses.some(r => r.status === 429));
});
