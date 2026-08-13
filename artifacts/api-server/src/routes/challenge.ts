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

// ─── In-memory store (resets on restart; fine for dev/beta) ──────────────────
// Map<dateKey YYYYMMDD, Map<playerId, ScoreEntry>>
const dailyScores = new Map<string, Map<string, ScoreEntry>>();

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

// ─── GET /challenge/today ─────────────────────────────────────────────────────
router.get("/challenge/today", (_req, res) => {
  const seed = todayKey();
  const hash = seedHash(seed);
  const params = deriveSpeedParams(hash);
  res.json({ seed, seedHash: hash, ...params });
});

// ─── POST /challenge/score ────────────────────────────────────────────────────
router.post("/challenge/score", (req, res) => {
  const { playerId, score, seed, durationMs } = req.body as {
    playerId?: string; score?: number; seed?: string; durationMs?: number;
  };

  if (!playerId || typeof score !== "number" || !seed || typeof durationMs !== "number") {
    res.status(400).json({ error: "playerId, score, seed, and durationMs required" });
    return;
  }
  if (seed !== todayKey()) {
    res.status(400).json({ error: "stale seed — only today's challenge accepted" });
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
