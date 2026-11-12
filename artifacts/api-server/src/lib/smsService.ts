import { randomUUID } from "node:crypto";
import { and, eq, inArray, lt, lte, sql } from "drizzle-orm";
import { db, arenaPlayers, smsRecipients, smsDeliveries, smsSuppressions, smsLimits, smsConsentAudit } from "@workspace/db";
import type { SmsReminderInput } from "@workspace/api-zod";
import { decryptPhone, encryptPhone, smsHash } from "./smsCrypto.js";
import {
  deliveryKey, FEATURED_SMS_EVENTS, nextDeliveryStatus, quietHours, requireSmsTimezone,
  SMS_CONSENT_TEXT, SMS_CONSENT_VERSION, SmsError, smsCatalog, smsEventWindow, usMobileCandidate,
} from "./smsRules.js";
import { smsGates, twilioSmsProvider, type SmsProvider } from "./smsProvider.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Recipient = typeof smsRecipients.$inferSelect;
type Delivery = typeof smsDeliveries.$inferSelect;
type Identity = { id: string; tokenHash: string };
const now = () => new Date();
// A small, budget-capped release. The shared lock serializes STOP/cancel with
// the final send check across instances, not just within one Node process.
export async function smsTransaction<T>(work: (tx: Tx) => Promise<T>) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(748923106)`);
    return work(tx);
  });
}
async function owner(tx: Tx, identity: Identity) {
  const [player] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id, identity.id)).for("update");
  if (!player || player.tokenHash !== identity.tokenHash) throw new SmsError(401, "Player session expired.");
}
async function audit(tx: Tx, phoneHash: string, action: string, source: string) {
  await tx.insert(smsConsentAudit).values({ id: randomUUID(), phoneHash, action, source, version: SMS_CONSENT_VERSION });
}
async function suppressed(tx: Tx, hash: string) {
  const [row] = await tx.select().from(smsSuppressions).where(eq(smsSuppressions.phoneHash, hash));
  return row;
}
async function cancelPending(tx: Tx, playerId: string) {
  await tx.update(smsDeliveries).set({ status: "cancelled", updatedAt: now() })
    .where(and(eq(smsDeliveries.playerId, playerId), inArray(smsDeliveries.status, ["pending", "sending"])));
}
export async function reserveLimits(items: { key: string; max: number; windowMs: number; units?: number }[], at = Date.now()) {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(748923107)`);
    for (const item of items) {
      const units = item.units ?? 1;
      // Rolling windows, not reset-at-midnight counters that allow twice the
      // advertised volume around a boundary. Key material is internal only.
      const [usage] = await tx.select({ total: sql<number>`coalesce(sum(${smsLimits.count}), 0)::int` })
        .from(smsLimits).where(and(sql`${smsLimits.id} LIKE ${item.key + ":%"}`, sql`${smsLimits.expiresAt} > ${new Date(at)}`));
      if (units + (usage?.total ?? 0) > item.max) throw new SmsError(429, "SMS limit reached. Wait before trying again; no text was requested.");
      await tx.insert(smsLimits).values({
        id: `${item.key}:${randomUUID()}`, count: units, expiresAt: new Date(at + item.windowMs),
      });
    }
  });
}
export async function smsRequestLimit(identity: Identity, ip: string) {
  await reserveLimits([
    { key: `request:owner:${identity.id}`, max: 60, windowMs: 60_000 },
    { key: `request:ip:${smsHash(ip)}`, max: 120, windowMs: 60_000 },
    { key: "request:global", max: 600, windowMs: 60_000 },
  ]);
}
function budget(units: number) {
  return { key: "budget:cents", max: Math.min(Number(process.env.SMS_DAILY_BUDGET_CENTS) || 0, 100_000), windowMs: 86_400_000, units };
}
async function planRecipient(tx: Tx, row: Recipient, at = now()) {
  if (!row.enabled || !row.verifiedAt || row.consentVersion !== SMS_CONSENT_VERSION || !row.consentAt ||
      (await suppressed(tx, row.phoneHash))?.active) return;
  for (const id of row.eventIds) {
    const window = smsEventWindow(id, row.timezone, at);
    if (!window) continue;
    const fireAt = new Date(window.closesAt.getTime() - row.leadMinutes * 60_000);
    if (fireAt <= at || fireAt < window.opensAt || quietHours(fireAt, row.timezone)) continue;
    const key = deliveryKey(row.phoneHash, id, window.closesAt);
    await tx.insert(smsDeliveries).values({
      id: key, playerId: row.playerId, phoneHash: row.phoneHash, eventId: id,
      revision: row.revision, timezone: row.timezone, fireAt, closesAt: window.closesAt,
    }).onConflictDoUpdate({
      target: smsDeliveries.id,
      set: { playerId: row.playerId, revision: row.revision, timezone: row.timezone, fireAt, status: "pending", updatedAt: at },
      setWhere: and(inArray(smsDeliveries.status, ["pending", "cancelled", "skipped"]), sql`${smsDeliveries.attemptAt} IS NULL`),
    });
  }
}
export async function smsState(identity: Identity) {
  const gates = await smsGates();
  return smsTransaction(async tx => {
    await owner(tx, identity);
    const [row] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, identity.id));
    const stop = row ? await suppressed(tx, row.phoneHash) : undefined;
    const deliveries = await tx.select().from(smsDeliveries).where(eq(smsDeliveries.playerId, identity.id))
      .orderBy(sql`${smsDeliveries.fireAt} DESC`).limit(20);
    return {
      ...gates, consentText: SMS_CONSENT_TEXT, consentVersion: SMS_CONSENT_VERSION,
      hasNumber: !!row, maskedNumber: row ? `US mobile ending ${decryptPhone(row.phoneCipher).slice(-4)}` : null,
      verified: !!row?.verifiedAt, suppressed: !!stop?.active,
      verificationPending: !!row?.verificationSid && (row.verificationExpires?.getTime() ?? 0) > Date.now(),
      enabled: row?.enabled ?? false, eventIds: row?.eventIds ?? [], leadMinutes: row?.leadMinutes ?? 60,
      revision: row?.revision ?? 0,
      timezone: row?.timezone ?? "UTC", consentedAt: row?.consentAt?.toISOString() ?? null,
      events: smsCatalog(row?.timezone ?? "UTC"),
      deliveries: deliveries.map(d => ({ id: d.id, eventId: d.eventId, fireAt: d.fireAt.toISOString(), closesAt: d.closesAt.toISOString(), status: d.status })),
    };
  });
}

export async function beginSmsVerification(identity: Identity, input: { phone: string; timezone: string }, ip: string, provider = twilioSmsProvider, gates = smsGates) {
  const phone = usMobileCandidate(input.phone);
  const timezone = requireSmsTimezone(input.timezone);
  if (!(await gates()).verificationAvailable) throw new SmsError(503, "Verification texts are awaiting owner and provider approval. No text was sent.");
  const hash = smsHash(phone);
  await reserveLimits([
    { key: `otp:owner:${identity.id}`, max: 3, windowMs: 86_400_000 },
    { key: `otp:phone:${hash}`, max: 3, windowMs: 86_400_000 },
    { key: `otp:cooldown:${hash}`, max: 1, windowMs: 120_000 },
    { key: `otp:ip:${smsHash(ip)}`, max: 10, windowMs: 86_400_000 },
    // Reserve conservatively for a Lookup + Verify request including failures.
    budget(25),
  ]);
  await smsTransaction(async tx => {
    await owner(tx, identity);
    if ((await suppressed(tx, hash))?.active) throw new SmsError(409, "This number stopped GoldRush texts. Reply START to the approved sender before requesting a fresh verification.");
    const [old] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, identity.id));
    if (old && (Date.now() - old.updatedAt.getTime()) < 60_000) throw new SmsError(429, "Wait at least 60 seconds before requesting another code.");
    // Chargeable calls happen only beyond the live-approval gates and counters.
    if (!await provider.mobile(phone)) throw new SmsError(400, "Only verified US mobile lines are supported. Landline, VoIP and unknown line types are unavailable.");
    await cancelPending(tx, identity.id);
    if (old?.consentAt) await audit(tx, old.phoneHash, "withdraw", "number-change");
    const sid = await provider.verify(phone);
    await tx.insert(smsRecipients).values({
      playerId: identity.id, phoneHash: hash, phoneCipher: encryptPhone(phone), timezone,
      verificationSid: sid, verificationExpires: new Date(Date.now() + 10 * 60_000),
    }).onConflictDoUpdate({ target: smsRecipients.playerId, set: {
      phoneHash: hash, phoneCipher: encryptPhone(phone), verifiedAt: null,
      verificationSid: sid, verificationExpires: new Date(Date.now() + 10 * 60_000),
      enabled: false, consentAt: null, consentVersion: null, consentSource: null,
      eventIds: [], timezone, revision: sql`${smsRecipients.revision} + 1`, updatedAt: now(),
    } });
    await audit(tx, hash, "verification-request", "explicit-verification-only");
  });
}
export async function completeSmsVerification(identity: Identity, code: string, provider = twilioSmsProvider, gates = smsGates) {
  if (!(await gates()).verificationAvailable) throw new SmsError(503, "Verification is awaiting approval.");
  // This reservation commits even if the code is wrong or the provider fails.
  await reserveLimits([{ key: `otp-check:${identity.id}`, max: 5, windowMs: 10 * 60_000 }]);
  await smsTransaction(async tx => {
    await owner(tx, identity);
    const [row] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, identity.id));
    if (!row?.verificationSid || !row.verificationExpires || row.verificationExpires <= now()) throw new SmsError(400, "Request a new verification code.");
    if ((await suppressed(tx, row.phoneHash))?.active) throw new SmsError(409, "This number has stopped texts.");
    if (!await provider.check(row.verificationSid, code)) throw new SmsError(400, "Code not accepted. Check the code or request a new one after the cooldown.");
    // A new device must prove ownership, and cannot copy another device's consent.
    const others = await tx.select().from(smsRecipients).where(and(eq(smsRecipients.phoneHash, row.phoneHash), sql`${smsRecipients.playerId} <> ${identity.id}`));
    for (const other of others) {
      await cancelPending(tx, other.playerId);
      await tx.delete(smsRecipients).where(eq(smsRecipients.playerId, other.playerId));
    }
    await tx.update(smsRecipients).set({
      verifiedAt: now(), verificationSid: null, verificationExpires: null, updatedAt: now(),
      enabled: false, consentAt: null, consentVersion: null, consentSource: null,
    }).where(eq(smsRecipients.playerId, identity.id));
  });
}

export async function saveSmsSettings(identity: Identity, input: SmsReminderInput, gates = smsGates) {
  requireSmsTimezone(input.timezone);
  if (input.eventIds.some(id => !FEATURED_SMS_EVENTS.some(event => event.id === id))) throw new SmsError(400, "One or more events cannot be verified for SMS.");
  if (input.enabled && !(await gates()).remindersAvailable) throw new SmsError(503, "Event texting is awaiting approval. No reminders were enabled.");
  await smsTransaction(async tx => {
    await owner(tx, identity);
    const [row] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, identity.id));
    if (!row) throw new SmsError(409, "Add and verify your US mobile number first.");
    if (input.expectedRevision !== row.revision) throw new SmsError(409, "Reminder settings changed. Refresh before saving again.");
    const stop = await suppressed(tx, row.phoneHash);
    const fresh = input.consent === true && input.consentVersion === SMS_CONSENT_VERSION && input.adultConfirmed === true;
    if (input.enabled && (!row.verifiedAt || stop?.active || (stop?.restartedAt && row.verifiedAt <= stop.restartedAt))) {
      throw new SmsError(409, "Verify ownership again before enabling texts. A stopped number must first reply START.");
    }
    if (input.enabled && input.consent === false) throw new SmsError(400, "Text consent cannot be withdrawn while reminders are enabled.");
    if (input.enabled && !fresh && (!row.enabled || !row.consentAt || row.consentVersion !== SMS_CONSENT_VERSION)) {
      throw new SmsError(400, "Agree separately to the current recurring text consent and confirm you are 18 or older.");
    }
    await cancelPending(tx, identity.id);
    const [updated] = await tx.update(smsRecipients).set({
      enabled: input.enabled, eventIds: [...new Set(input.eventIds)], leadMinutes: input.leadMinutes,
      timezone: input.timezone, revision: row.revision + 1, updatedAt: now(),
      consentAt: !input.enabled ? null : fresh ? now() : row.consentAt,
      consentVersion: !input.enabled ? null : SMS_CONSENT_VERSION,
      consentSource: !input.enabled ? null : fresh ? input.source : row.consentSource,
    }).where(eq(smsRecipients.playerId, identity.id)).returning();
    if (fresh && input.enabled) await audit(tx, row.phoneHash, "grant", input.source);
    if (!input.enabled && row.consentAt) await audit(tx, row.phoneHash, "withdraw", input.source);
    await planRecipient(tx, updated!);
  });
}
export async function cancelSmsForPlayer(identity: Identity, remove = false) {
  await smsTransaction(async tx => {
    await owner(tx, identity);
    await removeSmsInTransaction(tx, identity.id, remove);
  });
}
export async function removeSmsInTransaction(tx: Tx, playerId: string, remove = true) {
  const [row] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, playerId));
  await cancelPending(tx, playerId);
  if (row) {
    await audit(tx, row.phoneHash, remove ? "remove" : "withdraw", remove ? "number-or-profile-removal" : "sign-out");
    if (remove) {
      await tx.delete(smsRecipients).where(eq(smsRecipients.playerId, playerId));
      await tx.delete(smsDeliveries).where(eq(smsDeliveries.playerId, playerId));
    } else await tx.update(smsRecipients).set({
      enabled: false, verifiedAt: null, consentAt: null, consentVersion: null, consentSource: null,
      verificationSid: null, verificationExpires: null,
      revision: row.revision + 1, updatedAt: now(),
    }).where(eq(smsRecipients.playerId, playerId));
  }
}

async function canSend(tx: Tx, delivery: Delivery, at: Date) {
  const [row] = await tx.select().from(smsRecipients).where(eq(smsRecipients.playerId, delivery.playerId));
  if (!row?.enabled || !row.verifiedAt || !row.consentAt || row.consentVersion !== SMS_CONSENT_VERSION ||
      row.revision !== delivery.revision || row.phoneHash !== delivery.phoneHash ||
      !row.eventIds.includes(delivery.eventId) || (await suppressed(tx, row.phoneHash))?.active) return null;
  const window = smsEventWindow(delivery.eventId, row.timezone, at);
  if (!window?.active || window.closesAt.getTime() !== delivery.closesAt.getTime() ||
      delivery.closesAt <= at || delivery.fireAt > at || at.getTime() - delivery.fireAt.getTime() > 10 * 60_000 ||
      quietHours(at, row.timezone)) return null;
  return row;
}
export async function sendSmsDelivery(id: string, provider: SmsProvider = twilioSmsProvider, gates = smsGates) {
  if (!(await gates()).remindersAvailable) return;
  // Commit the attempt marker BEFORE network I/O. Crash recovery never blindly
  // resubmits this receipt, even if provider acceptance was not recorded.
  const delivery = await smsTransaction(async tx => {
    const [job] = await tx.select().from(smsDeliveries).where(eq(smsDeliveries.id, id));
    if (!job || job.status !== "pending") return null;
    if (!await canSend(tx, job, now())) {
      await tx.update(smsDeliveries).set({ status: "skipped", updatedAt: now() }).where(eq(smsDeliveries.id, id));
      return null;
    }
    await tx.update(smsDeliveries).set({ status: "sending", attemptAt: now(), updatedAt: now() }).where(eq(smsDeliveries.id, id));
    return job;
  });
  if (!delivery) return;
  try {
    await reserveLimits([
      { key: `send:day:${delivery.phoneHash}`, max: 2, windowMs: 86_400_000 },
      { key: `send:month:${delivery.phoneHash}`, max: 8, windowMs: 31 * 86_400_000 },
      { key: "send:global", max: 100, windowMs: 86_400_000 }, budget(5),
    ]);
  } catch {
    await smsTransaction(async tx => {
      await tx.update(smsDeliveries).set({ status: "skipped", updatedAt: now() })
        .where(and(eq(smsDeliveries.id, id), eq(smsDeliveries.status, "sending")));
    });
    return;
  }
  await smsTransaction(async tx => {
    const [job] = await tx.select().from(smsDeliveries).where(eq(smsDeliveries.id, id));
    if (!job || job.status !== "sending") return;
    const row = await canSend(tx, job, now());
    if (!row || !(await gates()).remindersAvailable) {
      await tx.update(smsDeliveries).set({ status: "cancelled", updatedAt: now() }).where(eq(smsDeliveries.id, id));
      return;
    }
    const event = FEATURED_SMS_EVENTS.find(e => e.id === job.eventId)!;
    const body = `GoldRush Arena: ${event.name} closes soon. Max 2/day, 8/mo. Msg&data rates may apply. Open Events. STOP to stop; HELP for help.`;
    try {
      const response = await provider.send(decryptPhone(row.phoneCipher), body, job.id);
      await tx.update(smsDeliveries).set({
        status: nextDeliveryStatus("sending", response.status), providerSid: response.sid, updatedAt: now(),
      }).where(eq(smsDeliveries.id, id));
    } catch (error) {
      if ((error as { code?: number } | null)?.code === 21610) {
        await tx.update(smsDeliveries).set({ status: "failed", updatedAt: now() }).where(eq(smsDeliveries.id, id));
        await applyOptOut(tx, job.phoneHash, "STOP", "provider-optout-rejection");
        return;
      }
      // Even an HTTP failure can hide an accepted message. Only a signed
      // callback or explicit provider reconciliation may settle an ambiguity.
      await tx.update(smsDeliveries).set({ status: "unknown", updatedAt: now() }).where(eq(smsDeliveries.id, id));
    }
  });
}

export async function handleSmsOptOut(phone: string, kind: "STOP" | "START", providerMessageId?: string) {
  if (typeof phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(phone)) throw new SmsError(400, "Invalid provider recipient.");
  // Suppression never depends on line-type metadata remaining unchanged.
  const hash = smsHash(phone);
  await smsTransaction(async tx => {
    if (providerMessageId) {
      if (!/^SM[a-f0-9]{32}$/i.test(providerMessageId)) return;
      // A replayed old START must not unsuppress a later STOP. Retain only the
      // opaque provider reference, never the inbound message or phone.
      const inserted = await tx.insert(smsLimits).values({
        id: `inbound:${providerMessageId}`, count: 1,
        expiresAt: new Date(Date.now() + 730 * 86_400_000),
      }).onConflictDoNothing().returning({ id: smsLimits.id });
      if (!inserted.length) return;
    }
    await applyOptOut(tx, hash, kind, "signed-provider-keyword");
  });
}
async function applyOptOut(tx: Tx, hash: string, kind: "STOP" | "START", source: string) {
    const stop = await suppressed(tx, hash);
    if (kind === "STOP") {
      await tx.insert(smsSuppressions).values({ phoneHash: hash }).onConflictDoUpdate({
        target: smsSuppressions.phoneHash, set: { active: true, stoppedAt: now(), restartedAt: null },
      });
    } else if (stop) {
      await tx.update(smsSuppressions).set({ active: false, restartedAt: now() }).where(eq(smsSuppressions.phoneHash, hash));
    }
    const recipients = await tx.select().from(smsRecipients).where(eq(smsRecipients.phoneHash, hash));
    for (const row of recipients) {
      await cancelPending(tx, row.playerId);
      await tx.update(smsRecipients).set({
        enabled: false, verifiedAt: null, consentAt: null, consentVersion: null, consentSource: null,
        verificationSid: null, verificationExpires: null, revision: row.revision + 1, updatedAt: now(),
      }).where(eq(smsRecipients.playerId, row.playerId));
    }
    await audit(tx, hash, kind === "STOP" ? "provider-stop" : "provider-start-needs-fresh-consent", source);
}
export async function applySmsStatus(id: string, sid: string, phone: string, status: string, errorCode?: string) {
  await smsTransaction(async tx => {
    const [job] = await tx.select().from(smsDeliveries).where(eq(smsDeliveries.id, id));
    if (!job || !job.attemptAt || smsHash(phone) !== job.phoneHash ||
        (job.providerSid && job.providerSid !== sid)) return;
    await tx.update(smsDeliveries).set({
      providerSid: sid, status: nextDeliveryStatus(job.status, status), updatedAt: now(),
    }).where(eq(smsDeliveries.id, id));
    if (errorCode === "21610") await applyOptOut(tx, job.phoneHash, "STOP", "signed-provider-optout-rejection");
  });
}
export async function reconcileSmsSchedules() {
  await smsTransaction(async tx => {
    await tx.insert(smsLimits).values({ id: "worker-heartbeat", count: 1, expiresAt: new Date(Date.now() + 180_000) })
      .onConflictDoUpdate({ target: smsLimits.id, set: { expiresAt: new Date(Date.now() + 180_000) } });
    // A crashed or expired lease is an ambiguous attempt, never pending again.
    await tx.update(smsDeliveries).set({ status: "unknown", updatedAt: now() })
      .where(and(eq(smsDeliveries.status, "sending"), lt(smsDeliveries.attemptAt, new Date(Date.now() - 60_000))));
    const recipients = await tx.select().from(smsRecipients).where(eq(smsRecipients.enabled, true));
    for (const row of recipients) await planRecipient(tx, row);
    // Unverified numbers expire after 24h. Inactive verified numbers after 90d.
    const expired = await tx.select().from(smsRecipients).where(sql`
      (${smsRecipients.verifiedAt} IS NULL AND ${smsRecipients.updatedAt} < now() - interval '24 hours')
      OR (${smsRecipients.enabled} = false AND ${smsRecipients.updatedAt} < now() - interval '90 days')`);
    for (const row of expired) await removeSmsInTransaction(tx, row.playerId);
    await tx.delete(smsLimits).where(lt(smsLimits.expiresAt, new Date(Date.now() - 86_400_000)));
    await tx.delete(smsDeliveries).where(lt(smsDeliveries.closesAt, new Date(Date.now() - 30 * 86_400_000)));
    await tx.delete(smsConsentAudit).where(lt(smsConsentAudit.createdAt, new Date(Date.now() - 730 * 86_400_000)));
  });
  const due = await db.select({ id: smsDeliveries.id }).from(smsDeliveries)
    .where(and(eq(smsDeliveries.status, "pending"), lte(smsDeliveries.fireAt, now()))).limit(100);
  return due;
}
export async function reconcileSmsProvider(provider: SmsProvider = twilioSmsProvider) {
  if (!(await smsGates()).remindersAvailable) return;
  const unsettled = await db.select().from(smsDeliveries)
    .where(and(inArray(smsDeliveries.status, ["queued", "sent", "unknown"]), sql`${smsDeliveries.providerSid} IS NOT NULL`,
      lt(smsDeliveries.updatedAt, new Date(Date.now() - 5 * 60_000)))).limit(20);
  for (const job of unsettled) {
    try {
      const status = await provider.status(job.providerSid!);
      await smsTransaction(async tx => {
        const [fresh] = await tx.select().from(smsDeliveries).where(eq(smsDeliveries.id, job.id));
        if (fresh) await tx.update(smsDeliveries).set({ status: nextDeliveryStatus(fresh.status, status), updatedAt: now() }).where(eq(smsDeliveries.id, job.id));
      });
    } catch { /* Keep the unresolved state; no re-send and no provider error logs. */ }
  }
}
