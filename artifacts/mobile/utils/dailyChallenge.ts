/**
 * Daily challenge utilities.
 *
 * The server returns a deterministic seed (YYYYMMDD) whose SHA-256 hash is
 * used both to derive fixed speed parameters AND as the client-side PRNG seed
 * (via utils/prng.ts), making ball spawn angles and power-up positions
 * identical across all players running the same day's challenge.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyChallengeData {
  seed:           string;   // YYYYMMDD
  seedHash:       string;   // hex SHA-256 — used as client PRNG seed
  startSpeedMult: number;   // initial ball speed multiplier
  rampRate:       number;   // speed increase per ball spawn
  fetchedAt:      number;   // Date.now() at fetch time
  /** Single-use match nonce bound to the deviceId that fetched it. */
  matchNonce:     string;
}

export interface ChallengeRankData {
  rank:         number | null;
  score:        number | null;
  displayName:  string | null;
  totalPlayers: number;
}

export interface ChallengeScoreResult {
  rank:         number | null;
  personalBest: number | null;
  totalPlayers: number;
}

// ─── Internal cache ───────────────────────────────────────────────────────────
const CACHE_KEY = 'daily_challenge_v2';
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
 *
 * Pass the device's stable UUID (`deviceId`) to receive a server-issued
 * single-use match nonce — required for score submission.  Every call with a
 * deviceId hits the server fresh (no caching) so a new nonce is issued for
 * each run.  Calls without a deviceId may use the local cache (read-only).
 */
export async function fetchTodayChallenge(deviceId?: string): Promise<DailyChallengeData | null> {
  const today = todayKey();

  if (!deviceId) {
    // Read-only context — use cache
    if (_memCache?.seed === today) return _memCache;
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyChallengeData;
        if (parsed.seed === today) { _memCache = parsed; return _memCache; }
      }
    } catch { /* ignore */ }
  }

  // Always fetch fresh when a nonce is needed
  try {
    const url = deviceId
      ? apiUrl(`/challenge/today?deviceId=${encodeURIComponent(deviceId)}`)
      : apiUrl('/challenge/today');
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Omit<DailyChallengeData, 'fetchedAt'>;
    const entry: DailyChallengeData = { ...data, matchNonce: data.matchNonce ?? '', fetchedAt: Date.now() };
    if (!deviceId) {
      _memCache = entry;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Submit a completed challenge-match score.
 *
 * @param deviceId   The device's stable UUID (returned by getDeviceId()).
 * @param displayName Human-readable name shown on the leaderboard.
 * @param score      Deflection count.
 * @param durationMs Elapsed match time in milliseconds.
 * @param matchNonce Single-use nonce from fetchTodayChallenge(deviceId).
 * @param seed       The YYYYMMDD seed the match was played under.
 */
export async function submitChallengeScore(
  deviceId:    string,
  displayName: string,
  score:       number,
  durationMs:  number,
  matchNonce:  string,
  seed:        string,
): Promise<ChallengeScoreResult> {
  if (!matchNonce || !seed || !deviceId) return { rank: null, personalBest: null, totalPlayers: 0 };
  try {
    const res = await fetch(apiUrl('/challenge/score'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, displayName, score, seed, durationMs, matchNonce }),
    });
    if (!res.ok) return { rank: null, personalBest: null, totalPlayers: 0 };
    const d = await res.json() as { rank: number; personalBest: number; totalPlayers: number };
    return { rank: d.rank, personalBest: d.personalBest, totalPlayers: d.totalPlayers };
  } catch {
    return { rank: null, personalBest: null, totalPlayers: 0 };
  }
}

/** Fetch this device's current daily rank without submitting a new score. */
export async function fetchMyRank(deviceId: string): Promise<ChallengeRankData | null> {
  if (!deviceId) return null;
  try {
    const res = await fetch(apiUrl(`/challenge/rank/${encodeURIComponent(deviceId)}`));
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
