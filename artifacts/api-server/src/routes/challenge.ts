import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoreEntry {
  score:       number;
  durationMs:  number;
  submittedAt: number;
}

interface NonceEntry {
  playerId:  string;
  seed:      string;
  issuedAt:  number;
  consumed:  boolean;
}

// ─── In-memory store (resets on restart; fine for dev/beta) ──────────────────
// Map<dateKey YYYYMMDD, Map<playerId, ScoreEntry>>
const dailyScores = new Map<string, Map<string, ScoreEntry>>();
// Map<nonce UUID, NonceEntry> — one-time tokens that tie a score to a player identity
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
 * encounters the same ball-speed pattern on a given day.
 */
function deriveSpeedParams(hash: string): { startSpeedMult: number; rampRate: number } {
  const n = parseInt(hash.slice(0, 8), 16);
  // startSpeedMult: 0.50 – 0.62 (subtle daily variation)
  const startSpeedMult = 0.50 + (n % 120) / 1000;
  // rampRate: speed increase per successful deflection, 0.040 – 0.065
  const rampRate = 0.040 + (n % 250) / 10_000;
  return { startSpeedMult, rampRate };
}

function getDayMap(): Map<string, ScoreEntry> {
  const key = todayKey();
  if (!dailyScores.has(key)) {
    // Keep at most 3 days to avoid unbounded growth
    if (dailyScores.size >= 3) {
      const oldest = [...dailyScores.keys()].sort()[0]!;
      dailyScores.delete(oldest);
    }
    dailyScores.set(key, new Map());
  }
  return dailyScores.get(key)!;
}

function getRank(day: Map<string, ScoreEntry>, playerId: string): number {
  const mine = day.get(playerId)?.score ?? 0;
  let rank = 1;
  for (const [id, e] of day) {
    if (id !== playerId && e.score > mine) rank++;
  }
  return rank;
}

// ─── Nonce helpers ────────────────────────────────────────────────────────────
function issueNonce(playerId: string, seed: string): string {
  const nonce = crypto.randomUUID();
  matchNonces.set(nonce, { playerId, seed, issuedAt: Date.now(), consumed: false });
  // Prune nonces older than 48 h to avoid unbounded growth
  if (matchNonces.size > 10_000) {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    for (const [k, v] of matchNonces) {
      if (v.issuedAt < cutoff) matchNonces.delete(k);
    }
  }
  return nonce;
}

function validateAndConsumeNonce(nonce: string, playerId: string, seed: string): boolean {
  const entry = matchNonces.get(nonce);
  if (!entry) return false;
  if (entry.consumed)         return false;
  if (entry.playerId !== playerId) return false;
  if (entry.seed     !== seed)     return false;
  // Nonces expire after 24 hours (one full gaming day)
  if (Date.now() - entry.issuedAt > 24 * 3600 * 1000) return false;
  entry.consumed = true;
  return true;
}

// ─── GET /challenge/today?playerId=<id> ──────────────────────────────────────
// Returns today's seed + deterministic speed params.
// When playerId is supplied, also issues a single-use match nonce that the
// client must present on score submission — this binds the score to a specific
// player identity without requiring full auth.
router.get("/challenge/today", (req, res) => {
  const seed   = todayKey();
  const hash   = seedHash(seed);
  const params = deriveSpeedParams(hash);
  const { playerId } = req.query as { playerId?: string };
  const matchNonce = playerId ? issueNonce(playerId, seed) : undefined;
  res.json({ seed, seedHash: hash, ...params, ...(matchNonce ? { matchNonce } : {}) });
});

// ─── POST /challenge/score ────────────────────────────────────────────────────
// Requires a matchNonce previously issued by GET /challenge/today?playerId=...
// The nonce is single-use and expires after 24 h, preventing replay and
// ensuring the score is attributed to the same player who fetched the challenge.
router.post("/challenge/score", (req, res) => {
  const { playerId, score, seed, durationMs, matchNonce } = req.body as {
    playerId?: string; score?: number; seed?: string;
    durationMs?: number; matchNonce?: string;
  };

  if (!playerId || typeof score !== "number" || !seed || typeof durationMs !== "number" || !matchNonce) {
    res.status(400).json({ error: "playerId, score, seed, durationMs, and matchNonce required" });
    return;
  }
  if (seed !== todayKey()) {
    res.status(400).json({ error: "stale seed — only today's challenge accepted" });
    return;
  }
  // Validate nonce — binds this submission to the player who fetched the challenge
  if (!validateAndConsumeNonce(matchNonce, playerId, seed)) {
    res.status(403).json({ error: "invalid or already-used match token" });
    return;
  }
  if (score < 0 || score > 10_000) {
    res.status(400).json({ error: "score out of range" });
    return;
  }
  // Basic anti-cheat: minimum 300 ms per deflection
  if (score > 0 && durationMs / score < 300) {
    res.status(400).json({ error: "score rejected: implausibly fast" });
    return;
  }

  const day = getDayMap();
  const existing = day.get(playerId);
  if (!existing || score > existing.score) {
    day.set(playerId, { score, durationMs, submittedAt: Date.now() });
    logger.info({ playerId, score, seed }, "challenge: new personal best");
  }

  const best = day.get(playerId)!;
  res.json({ ok: true, personalBest: best.score, rank: getRank(day, playerId), totalPlayers: day.size });
});

// ─── GET /challenge/leaderboard/today ────────────────────────────────────────
router.get("/challenge/leaderboard/today", (_req, res) => {
  const day  = getDayMap();
  const seed = todayKey();
  const entries = [...day.entries()]
    .map(([playerId, e]) => ({ playerId, score: e.score, submittedAt: e.submittedAt }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
  res.json({ seed, totalPlayers: day.size, entries });
});

// ─── GET /challenge/rank/:playerId ────────────────────────────────────────────
router.get("/challenge/rank/:playerId", (req, res) => {
  const { playerId } = req.params;
  const day = getDayMap();
  const entry = day.get(playerId);
  if (!entry) {
    res.json({ rank: null, score: null, totalPlayers: day.size });
    return;
  }
  res.json({ rank: getRank(day, playerId), score: entry.score, totalPlayers: day.size });
});

export default router;
