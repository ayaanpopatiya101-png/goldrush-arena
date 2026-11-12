import twilio from "twilio";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { db, smsLimits } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SmsError } from "./smsRules.js";

export interface SmsProvider {
  mobile: (phone: string) => Promise<boolean>;
  verify: (phone: string) => Promise<string>;
  check: (sid: string, code: string) => Promise<boolean>;
  send: (phone: string, body: string, deliveryId: string) => Promise<{ sid: string; status: string }>;
  status: (sid: string) => Promise<string>;
}
function client() {
  const { TWILIO_API_KEY_SID: key, TWILIO_API_KEY_SECRET: secret, TWILIO_ACCOUNT_SID: accountSid } = process.env;
  if (!key || !secret || !accountSid) throw new SmsError(503, "SMS credentials are not configured.");
  // No automatic SDK retries: a lost create response is ambiguous, not permission
  // to submit a second message or verification.
  return twilio(key, secret, { accountSid, autoRetry: false, timeout: 10_000, logLevel: "silent" });
}
export const twilioSmsProvider: SmsProvider = {
  mobile: async phone => {
    const result = await client().lookups.v2.phoneNumbers(phone).fetch({ fields: "line_type_intelligence" });
    return result.valid && result.countryCode === "US" &&
      result.lineTypeIntelligence?.type === "mobile" &&
      !result.lineTypeIntelligence?.errorCode;
  },
  verify: async phone => {
    const result = await client().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: "sms" });
    return result.sid;
  },
  check: async (sid, code) => {
    const result = await client().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ verificationSid: sid, code });
    return result.status === "approved";
  },
  send: async (phone, body, deliveryId) => {
    const result = await client().messages.create({
      to: phone, body, messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
      // Pin the approved sender. Never let a service choose an unapproved pool member.
      from: process.env.SMS_APPROVED_FROM!,
      statusCallback: `${callbackBase()}/api/sms-reminders/provider/status?job=${encodeURIComponent(deliveryId)}`,
      validityPeriod: 60,
      contentRetention: "discard",
      addressRetention: "obfuscate",
    });
    return { sid: result.sid, status: result.status };
  },
  status: async sid => (await client().messages(sid).fetch()).status,
};

export function callbackBase() {
  const value = process.env.SMS_PUBLIC_BASE_URL ?? "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return "";
    return url.origin;
  } catch { return ""; }
}
export function staticSmsGates() {
  const blockers: string[] = [];
  const env = process.env;
  if (env.SMS_LIVE_ENABLED !== "true") blockers.push("Live texting is disabled. Owner approval is required before any verification or reminder text.");
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_API_KEY_SID || !env.TWILIO_API_KEY_SECRET || !env.TWILIO_AUTH_TOKEN) blockers.push("Secure provider setup is incomplete.");
  if ((env.SESSION_SECRET?.length ?? 0) < 32) blockers.push("Private number encryption is not ready.");
  if (!callbackBase()) blockers.push("Approved HTTPS callback address is not configured.");
  if (env.SMS_COMPLIANCE_APPROVED !== "true") blockers.push("Publisher, consent, 18+ policy, support contact and campaign review are pending.");
  if (!env.SMS_SUPPORT_CONTACT || !env.SMS_PRIVACY_URL) blockers.push("Verified support contact and public privacy policy are pending.");
  if (env.SMS_WORKER_APPROVED !== "true") blockers.push("An always-on durable SMS worker has not been approved.");
  if (!(Number(env.SMS_DAILY_BUDGET_CENTS) >= 1 && Number(env.SMS_DAILY_BUDGET_CENTS) <= 100_000)) blockers.push("A bounded daily SMS/verification budget has not been approved.");
  if (!["10dlc", "tollfree"].includes(env.SMS_SENDER_TYPE ?? "") ||
      !/^MG[a-f0-9]{32}$/i.test(env.TWILIO_MESSAGING_SERVICE_SID ?? "") ||
      !/^PN[a-f0-9]{32}$/i.test(env.SMS_APPROVED_PHONE_SID ?? "") || !env.SMS_APPROVED_FROM) {
    blockers.push("An approved US sender and Messaging Service are not configured.");
  }
  return blockers;
}
let approvedUntil = 0;
let runtimeBlocker = "Sender approval has not been verified with Twilio.";
export async function smsGates() {
  const blockers = staticSmsGates();
  if (!blockers.length) {
    const [heartbeat] = await db.select().from(smsLimits).where(eq(smsLimits.id, "worker-heartbeat"));
    if (!heartbeat || heartbeat.expiresAt.getTime() < Date.now()) blockers.push("The durable SMS worker is not healthy. Texting is paused.");
  }
  if (!blockers.length && Date.now() > approvedUntil) {
    try {
      const api = client();
      const serviceId = process.env.TWILIO_MESSAGING_SERVICE_SID!;
      const senderId = process.env.SMS_APPROVED_PHONE_SID!;
      const [account, service, sender, pool] = await Promise.all([
        api.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch(),
        api.messaging.v1.services(serviceId).fetch(),
        api.incomingPhoneNumbers(senderId).fetch(),
        api.messaging.v1.services(serviceId).phoneNumbers.list({ limit: 100 }),
      ]);
      if (account.status !== "active" || account.type === "Trial" || !sender.capabilities.sms ||
          sender.phoneNumber !== process.env.SMS_APPROVED_FROM || !sender.phoneNumber.startsWith("+1") ||
          !pool.some(p => p.sid === senderId) ||
          service.useInboundWebhookOnNumber ||
          service.inboundRequestUrl !== `${callbackBase()}/api/sms-reminders/provider/inbound`) {
        throw new Error("Account, sender or callback configuration is pending");
      }
      if (process.env.SMS_ADVANCED_OPTOUT_APPROVED !== "true") throw new Error("Keyword configuration has not been reviewed");
      if (process.env.SMS_SENDER_TYPE === "10dlc") {
        if (/^\+1(800|833|844|855|866|877|888)/.test(sender.phoneNumber) ||
            parsePhoneNumberFromString(sender.phoneNumber)?.country !== "US") throw new Error("Wrong US 10DLC sender type");
        const campaigns = await api.messaging.v1.services(serviceId).usAppToPerson.list({ limit: 20 });
        if (!campaigns.some(c => c.campaignStatus === "VERIFIED" && c.campaignId === process.env.SMS_APPROVED_CAMPAIGN_ID)) {
          throw new Error("10DLC campaign not approved");
        }
      } else {
        // NANP toll-free prefixes are not geographic regions.
        if (!/^\+1(800|833|844|855|866|877|888)/.test(sender.phoneNumber)) throw new Error("Wrong sender type");
        const verifications = await api.messaging.v1.tollfreeVerifications.list({ tollfreePhoneNumberSid: senderId, limit: 20 });
        if (!verifications.some(v => v.status === "TWILIO_APPROVED")) throw new Error("Toll-free verification not approved");
      }
      runtimeBlocker = "";
    } catch {
      // Provider errors can include credentials, full numbers and submitted
      // content. Never serialize, rethrow, or log them.
      runtimeBlocker = "Twilio account, sender approval or signed callback setup is not verified. Sending remains blocked.";
    }
    approvedUntil = Date.now() + 60_000;
  }
  if (!blockers.length && runtimeBlocker) blockers.push(runtimeBlocker);
  const remindersAvailable = !blockers.length;
  const verificationAvailable = remindersAvailable &&
    process.env.SMS_OTP_APPROVED === "true" && /^VA[a-f0-9]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID ?? "");
  if (!verificationAvailable && remindersAvailable) blockers.push("Verification service and owner approval for verification texts are pending.");
  return { blockers, remindersAvailable, verificationAvailable };
}

export function validTwilioCallback(url: string, signature: string, body: Record<string, string>) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !callbackBase() || body.AccountSid !== process.env.TWILIO_ACCOUNT_SID) return false;
  return validateSmsSignature({ token, origin: callbackBase(), accountSid: process.env.TWILIO_ACCOUNT_SID! }, url, signature, body);
}
export function validateSmsSignature(config: { token: string; origin: string; accountSid: string }, url: string, signature: string, body: Record<string, string>) {
  if (body.AccountSid !== config.accountSid) return false;
  try { return twilio.validateRequest(config.token, signature, `${config.origin}${url}`, body); }
  catch { return false; }
}
