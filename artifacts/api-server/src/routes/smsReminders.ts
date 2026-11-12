import { Router, type IRouter, type Request, type Response } from "express";
import {
  CheckSmsVerificationBody, GetSmsRemindersResponse, RequestSmsVerificationBody, SaveSmsRemindersBody,
} from "@workspace/api-zod";
import { requireArenaIdentity } from "../lib/arenaIdentity.js";
import { validTwilioCallback } from "../lib/smsProvider.js";
import { SmsError } from "../lib/smsRules.js";
import {
  applySmsStatus, beginSmsVerification, cancelSmsForPlayer, completeSmsVerification,
  handleSmsOptOut, saveSmsSettings, smsRequestLimit, smsState,
} from "../lib/smsService.js";

const router: IRouter = Router();
function callback(req: Request) {
  if (!req.is("application/x-www-form-urlencoded")) return false;
  const body = req.body;
  if (!body || Object.keys(body).length > 50 || Object.values(body).some(v => typeof v !== "string")) return false;
  return validTwilioCallback(req.originalUrl, req.get("X-Twilio-Signature") ?? "", body);
}
router.post("/sms-reminders/provider/status", async (req, res): Promise<void> => {
  if (!callback(req)) { res.sendStatus(403); return; }
  const { MessageSid, MessageStatus, To, From } = req.body;
  if (!/^SM[a-f0-9]{32}$/i.test(MessageSid ?? "") || From !== process.env.SMS_APPROVED_FROM ||
      typeof req.query.job !== "string" || typeof To !== "string") { res.sendStatus(400); return; }
  await applySmsStatus(req.query.job, MessageSid, To, MessageStatus, req.body.ErrorCode);
  res.sendStatus(204);
});
router.post("/sms-reminders/provider/inbound", async (req, res): Promise<void> => {
  if (!callback(req) || req.body.To !== process.env.SMS_APPROVED_FROM) { res.sendStatus(403); return; }
  // Advanced Opt-Out sends OptOutType and handles approved STOP/START/HELP
  // replies itself. Returning a second SMS here would duplicate those replies.
  const word = String(req.body.Body ?? "").trim().toUpperCase();
  const kind = req.body.OptOutType ||
    (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"].includes(word) ? "STOP" :
      ["START", "UNSTOP"].includes(word) ? "START" : word === "HELP" || word === "INFO" ? "HELP" : "");
  if (kind === "STOP" || kind === "START") {
    if (!/^SM[a-f0-9]{32}$/i.test(req.body.MessageSid ?? "")) { res.sendStatus(400); return; }
    await handleSmsOptOut(req.body.From, kind, req.body.MessageSid);
  }
  res.type("text/xml").send("<Response/>");
});

router.use("/sms-reminders", requireArenaIdentity, async (req, res, next): Promise<void> => {
  res.set("Cache-Control", "no-store");
  await smsRequestLimit(res.locals.arenaPlayer, req.ip ?? "unknown");
  next();
});
const state = async (res: Response) => {
  res.json(GetSmsRemindersResponse.parse(await smsState(res.locals.arenaPlayer)));
};
router.get("/sms-reminders", async (_req, res): Promise<void> => { await state(res); });
router.put("/sms-reminders", async (req, res): Promise<void> => {
  const input = SaveSmsRemindersBody.strict().safeParse(req.body);
  if (!input.success || !Number.isInteger(input.data.leadMinutes)) throw new SmsError(400, "Invalid SMS settings. Choose valid events, timezone and whole minutes from 5 to 10,080.");
  await saveSmsSettings(res.locals.arenaPlayer, input.data);
  await state(res);
});
router.post("/sms-reminders/verification", async (req, res): Promise<void> => {
  const input = RequestSmsVerificationBody.strict().safeParse(req.body);
  if (!input.success || !input.data.verificationConsent || !input.data.adultConfirmed) {
    throw new SmsError(400, "Confirm you are 18 or older and explicitly request an ownership verification text.");
  }
  await beginSmsVerification(res.locals.arenaPlayer, input.data, req.ip ?? "unknown");
  await state(res);
});
router.post("/sms-reminders/verification/check", async (req, res): Promise<void> => {
  const input = CheckSmsVerificationBody.strict().safeParse(req.body);
  if (!input.success) throw new SmsError(400, "Enter the six-digit ownership code.");
  await completeSmsVerification(res.locals.arenaPlayer, input.data.code);
  await state(res);
});
router.post("/sms-reminders/cancel", async (_req, res): Promise<void> => {
  await cancelSmsForPlayer(res.locals.arenaPlayer);
  res.sendStatus(204);
});
router.delete("/sms-reminders", async (_req, res): Promise<void> => {
  await cancelSmsForPlayer(res.locals.arenaPlayer, true);
  await state(res);
});
// No provider/DB errors, validation input, codes or numbers enter Express's
// default error handler, response bodies, request logs or analytics.
router.use("/sms-reminders", (error: unknown, _req: Request, res: Response, _next: unknown) => {
  if (error instanceof SmsError) res.status(error.status).json({ error: error.message });
  else res.status(503).json({ error: "SMS service could not complete this request. No success is confirmed; retry settings or contact support." });
});
export default router;
