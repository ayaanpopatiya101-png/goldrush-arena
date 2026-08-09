import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── In-memory state ─────────────────────────────────────────────────────────
// code → { playerId (referrer), pendingRewards }
const referralCodes = new Map<string, { playerId: string; pendingRewards: number }>();
// playerId → code (reverse lookup so each player only ever has one code)
const playerCodes   = new Map<string, string>();
// Set of "code:redeemerPlayerId" pairs already used — prevents double-claim
const redeemed      = new Set<string>();

function makeCode(playerId: string): string {
  // 6-char alphanumeric derived from playerId hash; no ambiguous chars
  const hash = crypto.createHash('sha256').update(playerId).digest('base64url');
  return hash.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
}

function getOrCreateCode(playerId: string): string {
  if (playerCodes.has(playerId)) return playerCodes.get(playerId)!;
  let code = makeCode(playerId);
  // Resolve collision: if another player already owns this code, append a digit
  let attempt = 0;
  while (referralCodes.has(code) && referralCodes.get(code)!.playerId !== playerId) {
    code = makeCode(playerId + attempt++);
  }
  playerCodes.set(playerId, code);
  referralCodes.set(code, { playerId, pendingRewards: 0 });
  return code;
}

// ─── GET /referral/code/:playerId — get (or create) this player's referral code
router.get('/referral/code/:playerId', (req, res) => {
  const { playerId } = req.params;
  if (!playerId) { res.status(400).json({ error: 'playerId required' }); return; }
  const code = getOrCreateCode(playerId);
  res.json({ code });
});

// ─── POST /referral/redeem — friend enters referrer's code; referrer earns a reward
router.post('/referral/redeem', (req, res) => {
  const { code, redeemerPlayerId } = req.body as { code?: string; redeemerPlayerId?: string };
  if (!code || !redeemerPlayerId) {
    res.status(400).json({ error: 'code and redeemerPlayerId required' });
    return;
  }

  const normalized = code.trim().toUpperCase();
  const entry = referralCodes.get(normalized);
  if (!entry) { res.status(404).json({ error: 'Referral code not found.' }); return; }

  if (entry.playerId === redeemerPlayerId) {
    res.status(400).json({ error: "You can't use your own referral code." });
    return;
  }

  const pairKey = `${normalized}:${redeemerPlayerId}`;
  if (redeemed.has(pairKey)) {
    res.status(409).json({ error: 'You have already used this referral code.' });
    return;
  }

  redeemed.add(pairKey);
  entry.pendingRewards += 1;
  logger.info({ code: normalized, referrerPlayerId: entry.playerId, redeemerPlayerId }, 'referral: redeemed');
  res.json({ ok: true, referrerPlayerId: entry.playerId });
});

// ─── GET /referral/pending/:playerId — how many unclaimed rewards does this player have?
router.get('/referral/pending/:playerId', (req, res) => {
  const { playerId } = req.params;
  const code = playerCodes.get(playerId);
  if (!code) { res.json({ pending: 0 }); return; }
  const entry = referralCodes.get(code);
  res.json({ pending: entry?.pendingRewards ?? 0 });
});

// ─── POST /referral/claim/:playerId — decrement one pending reward after mobile applies it
router.post('/referral/claim/:playerId', (req, res) => {
  const { playerId } = req.params;
  const code  = playerCodes.get(playerId);
  if (!code) { res.status(404).json({ error: 'no referral code for this player' }); return; }
  const entry = referralCodes.get(code);
  if (!entry || entry.pendingRewards <= 0) {
    res.status(409).json({ error: 'no pending rewards to claim' });
    return;
  }
  entry.pendingRewards -= 1;
  logger.info({ playerId, remaining: entry.pendingRewards }, 'referral: reward claimed');
  res.json({ ok: true, remaining: entry.pendingRewards });
});

export default router;
