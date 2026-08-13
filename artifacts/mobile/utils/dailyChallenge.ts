/**
 * Daily challenge utilities.
 *
 * The server returns a deterministic seed (YYYYMMDD) and derived speed
 * parameters so every player encounters the same ball-speed pattern each day,
 * making scores directly comparable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyChallengeData {
  seed:           string;   // YYYYMMDD
  seedHash:       string;   // hex SHA-256 of seed
  startSpeedMult: number;   // initial ball speed multiplier
  rampRate:       number;   // speed increase per deflection
  fetchedAt:      number;   // Date.now() at fetch time
  /** Single-use match nonce issued by the server — required on score submission. */
  matchNonce:     string;
}

export interface ChallengeRankData {
  rank:         number | null;
  score:        number | null;
  totalPlayers: number;
}

export interface ChallengeScoreResult {
  rank:         number | null;
  personalBest: number | null;
  totalPlayers: number;
}

// ─── Internal cache ───────────────────────────────────────────────────────────
const CACHE_KEY = 'daily_challenge_v1';
let _memCache: DailyChallengeData | null = null;

function todayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Fetch today's daily challenge parameters.
 * Pass `playerId` to receive a server-issued match nonce — required for score
 * submission and needed only when starting an actual challenge match.
 * Results are cached in memory and AsyncStorage; a fresh nonce is always
 * re-fetched when playerId is provided to prevent nonce reuse across runs.
 */
export async function fetchTodayChallenge(playerId?: string): Promise<DailyChallengeData | null> {
  const today = todayKey();

  // Without a playerId we can use the cache (no nonce needed — read-only context)
  if (!playerId) {
    if (_memCache?.seed === today) return _memCache;
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyChallengeData;
        if (parsed.seed === today) { _memCache = parsed; return _memCache; }
      }
    } catch { /* ignore */ }
  }

  // Fetch from server — always fresh when a nonce is needed
  try {
    const url = playerId
      ? apiUrl(`/challenge/today?playerId=${encodeURIComponent(playerId)}`)
      : apiUrl('/challenge/today');
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Omit<DailyChallengeData, 'fetchedAt'>;
    const entry: DailyChallengeData = { ...data, matchNonce: data.matchNonce ?? '', fetchedAt: Date.now() };
    if (!playerId) {
      _memCache = entry;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Submit a completed challenge-match score to the daily leaderboard.
 * Requires the matchNonce previously returned by fetchTodayChallenge(playerId).
 */
export async function submitChallengeScore(
  playerId:   string,
  score:      number,
  durationMs: number,
  matchNonce: string,
  seed:       string,
): Promise<ChallengeScoreResult> {
  if (!matchNonce || !seed) return { rank: null, personalBest: null, totalPlayers: 0 };
  try {
    const res = await fetch(apiUrl('/challenge/score'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, score, seed, durationMs, matchNonce }),
    });
    if (!res.ok) return { rank: null, personalBest: null, totalPlayers: 0 };
    const d = await res.json() as { rank: number; personalBest: number; totalPlayers: number };
    return { rank: d.rank, personalBest: d.personalBest, totalPlayers: d.totalPlayers };
  } catch {
    return { rank: null, personalBest: null, totalPlayers: 0 };
  }
}

/** Fetch this player's current daily rank without submitting a new score. */
export async function fetchMyRank(playerId: string): Promise<ChallengeRankData | null> {
  try {
    const res = await fetch(apiUrl(`/challenge/rank/${encodeURIComponent(playerId)}`));
    if (!res.ok) return null;
    return (await res.json()) as ChallengeRankData;
  } catch {
    return null;
  }
}

/**
 * Build the deep-link URL for a friend challenge.
 * Format: goldrush://challenge?seed=YYYYMMDD&score=47&player=Alex
 */
export function buildChallengeLink(seed: string, score: number, playerName: string): string {
  return `goldrush://challenge?seed=${encodeURIComponent(seed)}&score=${score}&player=${encodeURIComponent(playerName)}`;
}
