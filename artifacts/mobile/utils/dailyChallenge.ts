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

/** Fetch and cache today's daily challenge parameters. */
export async function fetchTodayChallenge(): Promise<DailyChallengeData | null> {
  const today = todayKey();

  // In-memory cache
  if (_memCache?.seed === today) return _memCache;

  // AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyChallengeData;
      if (parsed.seed === today) {
        _memCache = parsed;
        return _memCache;
      }
    }
  } catch { /* ignore */ }

  // Fetch from server
  try {
    const res = await fetch(apiUrl('/challenge/today'));
    if (!res.ok) return null;
    const data = await res.json() as Omit<DailyChallengeData, 'fetchedAt'>;
    const entry: DailyChallengeData = { ...data, fetchedAt: Date.now() };
    _memCache = entry;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    return entry;
  } catch {
    return null;
  }
}

/**
 * Submit a completed-match score to the daily leaderboard.
 * The server validates the seed and applies basic anti-cheat.
 */
export async function submitChallengeScore(
  playerId:   string,
  score:      number,
  durationMs: number,
): Promise<ChallengeScoreResult> {
  const challenge = await fetchTodayChallenge();
  if (!challenge) return { rank: null, personalBest: null, totalPlayers: 0 };

  try {
    const res = await fetch(apiUrl('/challenge/score'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, score, seed: challenge.seed, durationMs }),
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
