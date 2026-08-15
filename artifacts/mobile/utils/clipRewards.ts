/**
 * Clip reward tier system.
 *
 * Clip score is computed from the game state at the moment of recording:
 *   clipScore = min(5, activeBalls) * 25 + max(0, 5 - playerLives) * 20
 *
 * More balls in play + fewer lives remaining = higher-pressure moment = better tier.
 *
 * A daily cap of MAX_DAILY_REWARDS clips can be rewarded per day to prevent farming.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ClipTier {
  minScore: number;
  label: string;
  emoji: string;
  coins: number;
  xp: number;
  color: string;
}

export const CLIP_TIERS: ClipTier[] = [
  { minScore: 150, label: 'LEGENDARY', emoji: '🔥', coins: 200, xp: 250, color: '#FF4757' },
  { minScore: 100, label: 'EPIC',      emoji: '⚡', coins: 90,  xp: 120, color: '#9B59B6' },
  { minScore: 50,  label: 'NICE',      emoji: '🎯', coins: 40,  xp: 60,  color: '#3498DB' },
  { minScore: 0,   label: 'BASIC',     emoji: '🎬', coins: 15,  xp: 25,  color: '#95A5A6' },
];

export const MAX_DAILY_REWARDS = 3;
const STORAGE_KEY = 'clip_reward_daily';

/** Return the tier for a given clip score. */
export function getClipTier(clipScore: number): ClipTier {
  return CLIP_TIERS.find(t => clipScore >= t.minScore) ?? CLIP_TIERS[CLIP_TIERS.length - 1];
}

/**
 * Compute the clip quality score from in-game state at the moment of recording.
 * Higher score = more chaotic / higher-pressure moment.
 */
export function computeClipScore(activeBalls: number, playerLives: number): number {
  return Math.min(5, activeBalls) * 25 + Math.max(0, 5 - playerLives) * 20;
}

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
  const today  = new Date().toDateString();
  const record = await getDailyRecord();
  const current = record.date === today ? record.count : 0;
  if (current >= MAX_DAILY_REWARDS) return false;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
  return true;
}
