/**
 * Clip reward tier system.
 *
 * Clip score is computed from the game state at the moment of recording:
 *   clipScore = min(5, activeBalls) * 25 + max(0, 5 - playerLives) * 20
 *
 * More balls in play + fewer lives remaining = higher-pressure moment = better tier.
 *
 * Tiers (ascending clipScore threshold):
 *   C  BASIC      0+   — 15 coins / 25 XP
 *   B  NICE       50+  — 40 coins / 60 XP
 *   A  EPIC       100+ — 90 coins / 120 XP
 *   S  LEGENDARY  150+ — 200 coins / 250 XP
 *   S+ GOD MODE   200+ — 500 coins / 600 XP
 *
 * A daily cap of MAX_DAILY_REWARDS clips can be rewarded per day.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ClipTier {
  minScore: number;
  label:    string;
  emoji:    string;
  coins:    number;
  xp:       number;
  color:    string;
}

export const CLIP_TIERS: ClipTier[] = [
  { minScore: 200, label: 'GOD MODE',  emoji: '🔱', coins: 500, xp: 600, color: '#FFD700' },
  { minScore: 150, label: 'LEGENDARY', emoji: '🔥', coins: 200, xp: 250, color: '#FF4757' },
  { minScore: 100, label: 'EPIC',      emoji: '⚡', coins: 90,  xp: 120, color: '#9B59B6' },
  { minScore: 50,  label: 'NICE',      emoji: '🎯', coins: 40,  xp: 60,  color: '#3498DB' },
  { minScore: 0,   label: 'BASIC',     emoji: '🎬', coins: 15,  xp: 25,  color: '#95A5A6' },
];

export const MAX_DAILY_REWARDS = 5;  // bumped from 3 → 5 to accommodate multi-clip matches
const STORAGE_KEY = 'clip_reward_daily';

// ── Tier lookup ───────────────────────────────────────────────────────────────

/** Return the tier for a given clip score. */
export function getClipTier(clipScore: number): ClipTier {
  return CLIP_TIERS.find(t => clipScore >= t.minScore) ?? CLIP_TIERS[CLIP_TIERS.length - 1];
}

// ── Letter grade ──────────────────────────────────────────────────────────────

export interface ClipGrade {
  letter: string;   // 'S+' | 'S' | 'A' | 'B' | 'C'
  label:  string;   // tier name
  color:  string;   // hex
  stars:  number;   // 1–5
}

export function getClipGrade(clipScore: number): ClipGrade {
  if (clipScore >= 200) return { letter: 'S+', label: 'GOD MODE',  color: '#FFD700', stars: 5 };
  if (clipScore >= 150) return { letter: 'S',  label: 'LEGENDARY', color: '#FF4757', stars: 4 };
  if (clipScore >= 100) return { letter: 'A',  label: 'EPIC',      color: '#9B59B6', stars: 3 };
  if (clipScore >= 50)  return { letter: 'B',  label: 'NICE',      color: '#3498DB', stars: 2 };
  return                       { letter: 'C',  label: 'BASIC',     color: '#95A5A6', stars: 1 };
}

// ── Score formula ─────────────────────────────────────────────────────────────

/**
 * Compute the clip quality score from in-game state at the moment of recording.
 * Higher score = more chaotic / higher-pressure moment.
 */
export function computeClipScore(activeBalls: number, playerLives: number): number {
  return Math.min(5, activeBalls) * 25 + Math.max(0, 5 - playerLives) * 20;
}

// ── Daily reward tracking ─────────────────────────────────────────────────────

interface DailyRecord { date: string; count: number; }

async function getDailyRecord(): Promise<DailyRecord> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: '', count: 0 };
    return JSON.parse(raw) as DailyRecord;
  } catch {
    return { date: '', count: 0 };
  }
}

/** Returns true if the player still has rewarded clips available today. */
export async function canClaimClipReward(): Promise<boolean> {
  const today  = new Date().toDateString();
  const record = await getDailyRecord();
  return record.date !== today || record.count < MAX_DAILY_REWARDS;
}

/** Returns how many rewarded clips remain today (0 = cap reached). */
export async function getRemainingClipRewards(): Promise<number> {
  const today  = new Date().toDateString();
  const record = await getDailyRecord();
  if (record.date !== today) return MAX_DAILY_REWARDS;
  return Math.max(0, MAX_DAILY_REWARDS - record.count);
}

/**
 * Attempt to consume one daily clip reward slot.
 * Returns true if the reward was granted, false if the daily cap is already hit.
 */
export async function consumeClipRewardSlot(): Promise<boolean> {
  const today   = new Date().toDateString();
  const record  = await getDailyRecord();
  const current = record.date === today ? record.count : 0;
  if (current >= MAX_DAILY_REWARDS) return false;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
  return true;
}
