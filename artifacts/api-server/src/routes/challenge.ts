import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoreEntry {
  /** Display name shown on the leaderboard — separate from the deviceId key. */
  displayName: string;
  score:       number;
  durationMs:  number;
  submittedAt: number;
}

interface NonceEntry {
  /** Stable device UUID — prevents one device from submitting under another's identity. */
  deviceId:  string;
  seed:      string;
  issuedAt:  number;
  consumed:  boolean;
}

// ─── In-memory store (resets on restart; fine for dev/beta) ──────────────────
// Map<dateKey YYYYMMDD, Map<deviceId, ScoreEntry>>
const dailyScores = new Map<string, Map<string, ScoreEntry>>();
// Map<nonce UUID, NonceEntry>
const matchNonces = new Map<string, NonceEntry>();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function seedHash(dateKey: string): string {
  return crypto.createHash("sha256").update(dateKey).digest("hex");
}

/**
 * Derive daily speed parameters from the seed hash so every player
 * encounters the same difficulty curve on a given day.
 * The client PRNG uses the same seedHash to reproduce identical ball
 * spawn angles and power-up positions across all challenge runs.
 */
function deriveSpeedParams(hash: string): { startSpeedMult: number; rampRate: number } {
  const n = parseInt(hash.slice(0, 8), 16);
  const startSpeedMult = 0.50 + (n % 120) / 1000;
  const rampRate       = 0.040 + (n % 250) / 10_000;
  return { startSpeedMult, rampRate };
}

function getDayMap(): Map<string, ScoreEntry> {
  const key = todayKey();
  if (!dailyScores.has(key)) {
    if (dailyScores.size >= 3) {
      const oldest = [...dailyScores.keys()].sort()[0]!;
      dailyScores.delete(oldest);
    }
    dailyScores.set(key, new Map());
  }
  return dailyScores.get(key)!;
}

function getRank(day: Map<string, ScoreEntry>, deviceId: string): number {
  const mine = day.get(deviceId)?.score ?? 0;
  let rank = 1;
  for (const [id, e] of day) {
    if (id !== deviceId && e.score > mine) rank++;
  }
  return rank;
}

// ─── Nonce helpers ────────────────────────────────────────────────────────────
function issueNonce(deviceId: string, seed: string): string {
  const nonce = crypto.randomUUID();
  matchNonces.set(nonce, { deviceId, seed, issuedAt: Date.now(), consumed: false });
  // Prune nonces older than 48 h to avoid unbounded growth
  if (matchNonces.size > 10_000) {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    for (const [k, v] of matchNonces) {
      if (v.issuedAt < cutoff) matchNonces.delete(k);
    }
  }
  return nonce;
}

function validateAndConsumeNonce(nonce: string, deviceId: string, seed: string): boolean {
  const entry = matchNonces.get(nonce);
  if (!entry)                       return false;
  if (entry.consumed)               return false;
  if (entry.deviceId !== deviceId)  return false;
  if (entry.seed     !== seed)      return false;
  if (Date.now() - entry.issuedAt > 24 * 3600 * 1000) return false;
  entry.consumed = true;
  return true;
}

// ─── GET /challenge/today?deviceId=<uuid> ────────────────────────────────────
// Returns today's seed, seedHash (used as PRNG seed on client), and derived
// speed params.  When deviceId is supplied the server also issues a single-use
// match nonce bound to that device — required on score submission.
router.get("/challenge/today", (req, res) => {
  const seed   = todayKey();
  const hash   = seedHash(seed);
  const params = deriveSpeedParams(hash);
  const { deviceId } = req.query as { deviceId?: string };
  const matchNonce = deviceId ? issueNonce(deviceId, seed) : undefined;
  res.json({ seed, seedHash: hash, ...params, ...(matchNonce ? { matchNonce } : {}) });
});

// ─── POST /challenge/score ────────────────────────────────────────────────────
// Requires a matchNonce previously issued by GET /challenge/today?deviceId=...
// The nonce is single-use and bound to the device UUID that fetched it —
// a different device (or caller-supplied deviceId) cannot redeem the nonce.
router.post("/challenge/score", (req, res) => {
  const { deviceId, displayName, score, seed, durationMs, matchNonce } = req.body as {
    deviceId?: string; displayName?: string; score?: number; seed?: string;
    durationMs?: number; matchNonce?: string;
  };

  if (!deviceId || !displayName || typeof score !== "number" || !seed || typeof durationMs !== "number" || !matchNonce) {
    res.status(400).json({ error: "deviceId, displayName, score, seed, durationMs, and matchNonce required" });
    return;
  }
  if (seed !== todayKey()) {
    res.status(400).json({ error: "stale seed — only today's challenge accepted" });
    return;
  }
  if (!validateAndConsumeNonce(matchNonce, deviceId, seed)) {
    res.status(403).json({ error: "invalid or already-used match token" });
    return;
  }
  if (score < 0 || score > 10_000) {
    res.status(400).json({ error: "score out of range" });
    return;
  }
  if (score > 0 && durationMs / score < 300) {
    res.status(400).json({ error: "score rejected: implausibly fast" });
    return;
  }

  const day = getDayMap();
  const existing = day.get(deviceId);
  if (!existing || score > existing.score) {
    day.set(deviceId, { displayName, score, durationMs, submittedAt: Date.now() });
    logger.info({ deviceId, displayName, score, seed }, "challenge: new personal best");
  }

  const best = day.get(deviceId)!;
  res.json({ ok: true, personalBest: best.score, rank: getRank(day, deviceId), totalPlayers: day.size });
});

// ─── GET /challenge/leaderboard/today ────────────────────────────────────────
router.get("/challenge/leaderboard/today", (_req, res) => {
  const day  = getDayMap();
  const seed = todayKey();
  const entries = [...day.entries()]
    .map(([, e]) => ({ displayName: e.displayName, score: e.score, submittedAt: e.submittedAt }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  res.json({ seed, totalPlayers: day.size, entries });
});

// ─── GET /challenge/rank/:deviceId ────────────────────────────────────────────
router.get("/challenge/rank/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  const day   = getDayMap();
  const entry = day.get(deviceId);
  if (!entry) {
    res.json({ rank: null, score: null, displayName: null, totalPlayers: day.size });
    return;
  }
  res.json({
    rank: getRank(day, deviceId), score: entry.score,
    displayName: entry.displayName, totalPlayers: day.size,
  });
});

export default router;
