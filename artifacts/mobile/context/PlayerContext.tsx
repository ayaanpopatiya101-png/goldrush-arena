import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─── Ranks & Skins ────────────────────────────────────────────────────────────
// 20 ranks: Bronze/Silver/Gold/Diamond/Master (×3 each) + Champion (×5, top-100 leaderboard)
export const RANKS = [
  // ── Bronze ──────────────────────────────────────────────────────────────────
  { name: 'Bronze 1',    minXP: 0,        color: '#CD7F32' },  // 0
  { name: 'Bronze 2',    minXP: 500,      color: '#D4904A' },  // 1
  { name: 'Bronze 3',    minXP: 1_200,    color: '#DBA060' },  // 2
  // ── Silver ──────────────────────────────────────────────────────────────────
  { name: 'Silver 1',    minXP: 2_200,    color: '#A8A9B4' },  // 3
  { name: 'Silver 2',    minXP: 3_600,    color: '#B8C0CC' },  // 4
  { name: 'Silver 3',    minXP: 5_400,    color: '#C8D0DC' },  // 5
  // ── Gold ────────────────────────────────────────────────────────────────────
  { name: 'Gold 1',      minXP: 8_000,    color: '#E8C040' },  // 6
  { name: 'Gold 2',      minXP: 11_500,   color: '#EFD050' },  // 7
  { name: 'Gold 3',      minXP: 16_000,   color: '#F6E060' },  // 8
  // ── Diamond ─────────────────────────────────────────────────────────────────
  { name: 'Diamond 1',   minXP: 22_000,   color: '#7DD8FF' },  // 9
  { name: 'Diamond 2',   minXP: 31_000,   color: '#50CCFF' },  // 10
  { name: 'Diamond 3',   minXP: 43_000,   color: '#00BFFF' },  // 11
  // ── Master ──────────────────────────────────────────────────────────────────
  { name: 'Master 1',    minXP: 58_000,   color: '#CC88FF' },  // 12
  { name: 'Master 2',    minXP: 78_000,   color: '#BB66FF' },  // 13
  { name: 'Master 3',    minXP: 105_000,  color: '#AA44FF' },  // 14
  // ── Champion (top-100 leaderboard) ──────────────────────────────────────────
  { name: 'Champion 1',  minXP: 138_000,  color: '#FF9944' },  // 15
  { name: 'Champion 2',  minXP: 180_000,  color: '#FF7722' },  // 16
  { name: 'Champion 3',  minXP: 232_000,  color: '#FF5500' },  // 17
  { name: 'Champion 4',  minXP: 295_000,  color: '#FF2244' },  // 18
  { name: 'Champion 5',  minXP: 370_000,  color: '#FF0066' },  // 19
];

export const SKINS = [
  { id: 'default', name: 'Classic',  color: '#FFD700', glowColor: '#FFD70055', price: 0   },
  { id: 'plasma',  name: 'Plasma',   color: '#FF4757', glowColor: '#FF475755', price: 150 },
  { id: 'frost',   name: 'Frost',    color: '#00BFFF', glowColor: '#00BFFF55', price: 150 },
  { id: 'toxic',   name: 'Toxic',    color: '#00FF88', glowColor: '#00FF8855', price: 200 },
  { id: 'void',    name: 'Void',     color: '#9B59B6', glowColor: '#9B59B655', price: 250 },
  { id: 'inferno', name: 'Inferno',  color: '#FF6B35', glowColor: '#FF6B3555', price: 300 },
  { id: 'chrome',  name: 'Chrome',   color: '#E0E0E8', glowColor: '#E0E0E855', price: 350 },
  { id: 'cosmic',  name: 'Cosmic',   color: '#FF00FF', glowColor: '#FF00FF55', price: 500 },
];

// ─── Rank helpers ─────────────────────────────────────────────────────────────
/** Index of a rank name into RANKS. Unknown ranks (e.g. bot "Grandmaster") map to the top tier. */
export function getRankIndex(rankName: string): number {
  const i = RANKS.findIndex(r => r.name === rankName);
  return i >= 0 ? i : RANKS.length - 1;
}
export const MAX_RANK_INDEX = RANKS.length - 1;

// ─── Relics ───────────────────────────────────────────────────────────────────
// Relics are battle artifacts unearthed in the GoldRush. Unlocked by RANK (not bought).
// Each grants one passive ability that applies in-match to the player who equips it —
// and to bots, who are assigned a relic appropriate to their own rank.
export interface RelicEffect {
  startShield?: boolean;       // begin the match with a shield active
  paddleLenMult?: number;      // multiply paddle length
  paddleSpeedMult?: number;    // multiply paddle movement speed
  bonusLives?: number;         // extra starting lives
  magnet?: boolean;            // power-ups drift toward the player's zone (human only)
  deflectBoost?: number;       // multiply rebound speed on deflection
  slowStartFrames?: number;    // slow ALL balls for the first N frames (human only)
  revive?: number;             // revive once with this many lives when eliminated
  shrinkImmune?: boolean;      // immune to the shrink trap
}

export interface Relic {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  unlockRankIndex: number;     // index into RANKS
  effect: RelicEffect;
}

export const RELICS: Relic[] = [
  { id: 'ironhide',    name: 'Ironhide',     icon: '🛡️', color: '#9AA0A6', unlockRankIndex: 0,  desc: 'Begin every match with a shield already active.',                   effect: { startShield: true } },
  { id: 'longarm',     name: 'Longarm',      icon: '📐', color: '#CD7F32', unlockRankIndex: 2,  desc: 'Your paddle is 18% longer.',                                        effect: { paddleLenMult: 1.18 } },
  { id: 'quicksilver', name: 'Quicksilver',  icon: '💨', color: '#C0C0C0', unlockRankIndex: 3,  desc: 'Your paddle moves 18% faster.',                                     effect: { paddleSpeedMult: 1.18 } },
  { id: 'secondwind',  name: 'Second Wind',  icon: '❤️', color: '#C8820A', unlockRankIndex: 5,  desc: 'Start each match with +1 extra life.',                              effect: { bonusLives: 1 } },
  { id: 'prospector',  name: 'Prospector',   icon: '🧲', color: '#D9A441', unlockRankIndex: 6,  desc: 'Power-ups drift toward your zone.',                                 effect: { magnet: true } },
  { id: 'aftershock',  name: 'Aftershock',   icon: '💥', color: '#1E8AAA', unlockRankIndex: 9,  desc: 'Balls you deflect rebound 25% faster.',                             effect: { deflectBoost: 1.25 } },
  { id: 'timewarp',    name: 'Time Warp',    icon: '⏳', color: '#B9F2FF', unlockRankIndex: 11, desc: 'All balls move 35% slower for the first 6 seconds.',                effect: { slowStartFrames: 360 } },
  { id: 'bulwark',     name: 'Bulwark',      icon: '🪨', color: '#C03820', unlockRankIndex: 12, desc: 'Start with a shield and total immunity to shrink traps.',           effect: { startShield: true, shrinkImmune: true } },
  { id: 'phoenix',     name: 'Phoenix',      icon: '🔥', color: '#FF6B35', unlockRankIndex: 14, desc: 'Revive once with 2 lives the first time you are eliminated.',       effect: { revive: 2 } },
  { id: 'midas',       name: 'Midas Touch',  icon: '👑', color: '#FFD700', unlockRankIndex: 15, desc: 'Start with a shield, +1 life, and a 12% larger paddle.',            effect: { startShield: true, bonusLives: 1, paddleLenMult: 1.12 } },
];

export function getRelic(id: string | undefined | null): Relic | null {
  if (!id || id === 'none') return null;
  return RELICS.find(r => r.id === id) ?? null;
}

// ─── Super Abilities (level-gated active powers) ───────────────────────────
export interface SuperAbility {
  id: 1 | 2 | 3;
  name: string;
  icon: string;
  desc: string;
  unlockLevel: number;
}

export const SUPERS: SuperAbility[] = [
  { id: 1, name: 'RAMPART',   icon: '🛡️', desc: 'Goal blocked\n3 seconds',             unlockLevel: 5  },
  { id: 2, name: 'DEAD ZONE', icon: '🌀', desc: 'Incoming balls\nmove at crawl speed',  unlockLevel: 10 },
  { id: 3, name: 'SHATTER',   icon: '💥', desc: 'Ball that scores\nvanishes from play', unlockLevel: 15 },
];

// ─── Forge Abilities (bought with Credits after all relics unlocked) ──────
export interface ForgeAbility {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  cost: number;
  effect: RelicEffect;
}

export const FORGE_ABILITIES: ForgeAbility[] = [
  {
    id: 'precision_core', name: 'Precision Core', icon: '⚙️', color: '#9AA0A6', cost: 50,
    desc: 'Refines field calibration for improved match response.',
    effect: { paddleSpeedMult: 1.20, deflectBoost: 1.15 },
  },
  {
    id: 'iron_aegis', name: 'Iron Aegis', icon: '🪖', color: '#1E8AAA', cost: 75,
    desc: 'Deploys reinforced shielding protocols at match initialization.',
    effect: { startShield: true, shrinkImmune: true },
  },
  {
    id: 'void_drive', name: 'Void Drive', icon: '🌑', color: '#7A50A0', cost: 100,
    desc: 'Interfaces with an unstable spatial frequency channel.',
    effect: { paddleSpeedMult: 1.45, deflectBoost: 1.40, bonusLives: 1 },
  },
  {
    id: 'temporal_shift', name: 'Temporal Shift', icon: '⌛', color: '#B9F2FF', cost: 125,
    desc: 'Applies a subtle temporal recalibration to match initialization.',
    effect: { slowStartFrames: 600, bonusLives: 2, revive: 2 },
  },
  {
    id: 'catalyst', name: 'Catalyst', icon: '🔮', color: '#D4A030', cost: 150,
    desc: 'A balanced enhancement across multiple match parameters.',
    effect: { paddleLenMult: 1.25, startShield: true, bonusLives: 1 },
  },
];

export function getForgeAbility(id: string | undefined | null): ForgeAbility | null {
  if (!id) return null;
  return FORGE_ABILITIES.find(f => f.id === id) ?? null;
}

/** Merge a relic effect + forge effect into one combined RelicEffect. */
export function mergeRelicEffects(a: RelicEffect | undefined, b: RelicEffect | undefined): RelicEffect {
  if (!a && !b) return {};
  if (!a) return b!;
  if (!b) return a;
  return {
    startShield:      (a.startShield      || b.startShield)      || undefined,
    shrinkImmune:     (a.shrinkImmune     || b.shrinkImmune)     || undefined,
    magnet:           (a.magnet           || b.magnet)           || undefined,
    paddleLenMult:    (a.paddleLenMult  ?? 1) * (b.paddleLenMult  ?? 1) > 1 ? (a.paddleLenMult ?? 1) * (b.paddleLenMult ?? 1) : undefined,
    paddleSpeedMult:  (a.paddleSpeedMult ?? 1) * (b.paddleSpeedMult ?? 1) > 1 ? (a.paddleSpeedMult ?? 1) * (b.paddleSpeedMult ?? 1) : undefined,
    deflectBoost:     (a.deflectBoost   ?? 1) * (b.deflectBoost   ?? 1) > 1 ? (a.deflectBoost ?? 1) * (b.deflectBoost ?? 1) : undefined,
    bonusLives:       ((a.bonusLives    ?? 0) + (b.bonusLives    ?? 0)) || undefined,
    slowStartFrames:  ((a.slowStartFrames ?? 0) + (b.slowStartFrames ?? 0)) || undefined,
    revive:           ((a.revive        ?? 0) + (b.revive        ?? 0)) || undefined,
  };
}

// ─── Events ───────────────────────────────────────────────────────────────────
// Weekly events rotate by (ISO week number % 8).
// Monthly cups select by month index 0–11.
// Annual cup is one per year.
// Credits require rank index >= creditRankIndex (8 = Legend 1).

export function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
export function getWeekPeriodKey(d = new Date()): string {
  return `w_${d.getFullYear()}_${getISOWeek(d)}`;
}
// Monthly period key = calendar month. Cup opens on the 28th of that month.
export function getMonthPeriodKey(d = new Date()): string {
  return `m_${d.getFullYear()}_${d.getMonth() + 1}`;
}
// Annual period key = calendar year. Cup opens on Oct 28 of that year.
export function getAnnualPeriodKey(d = new Date()): string {
  return `a_${d.getFullYear()}`;
}
export function isMonthlyEventOpen(d = new Date()): boolean {
  return d.getDate() >= 28;
}
export function isAnnualEventOpen(d = new Date()): boolean {
  return d >= new Date(d.getFullYear(), 9, 28);
}
function _msUntilEndOfWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 0 ? 1 : 8 - day;
  const next = new Date(now); next.setDate(now.getDate() + daysUntil); next.setHours(0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}
function _msUntilMonthly(): number {
  const now = new Date();
  const open = isMonthlyEventOpen(now);
  // locked → time until the 28th of this month; open → time until the 28th of next month
  const target = open
    ? new Date(now.getFullYear(), now.getMonth() + 1, 28)
    : new Date(now.getFullYear(), now.getMonth(), 28);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}
function _msUntilAnnual(): number {
  const now = new Date();
  const open = isAnnualEventOpen(now);
  const year = now.getFullYear();
  // locked → time until Oct 28 this year; open → time until Oct 28 next year
  const target = open
    ? new Date(year + 1, 9, 28)
    : new Date(year, 9, 28);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}

// Minimum rank index to access events at all (Master 1 = index 12)
export const EVENT_MIN_RANK_INDEX = 12;

/** One stage of an event's qualifier ladder (qualifier → semi → main draw). */
export interface QualifierRoundDef {
  name:       string;    // "Open Qualifier" | "Semi-Final" | "Grand Final" | "Main Draw"
  badge:      string;    // emoji used as the round's icon
  maxPlays:   number;    // how many plays this round allows
  threshold:  number;    // QP required to advance (0 = this is the final/main-draw round)
  /** QP awarded for 1st, 2nd, 3rd, 4th place. */
  qpPerPlace: [number, number, number, number];
  /** If true, uses eventPlaysUsed + full event bonus rewards. */
  isMainDraw: boolean;
}

export interface EventDefinition {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'annual';
  emoji: string;
  description: string;
  color: string;
  maxPlays: number;
  winRewards: { xp: number; coins: number };
  loseRewards: { xp: number; coins: number };
  creditsOnWin: number;
  creditsOnLose: number;
  creditRankIndex: number;
  mode: string;
  periodKey: string;
  /** ms until the event opens (if locked) or closes/resets (if open). */
  endsIn: number;
  /** true = event hasn't reached its unlock date yet */
  isLocked: boolean;
  /** Human-readable unlock date for locked state, e.g. "Jul 28" */
  opensOnLabel: string;
  /** Qualifier ladder. null = no qualifier (weekly events are direct entry). */
  rounds: QualifierRoundDef[] | null;
}

type EventBase = Omit<EventDefinition, 'type' | 'maxPlays' | 'creditRankIndex' | 'periodKey' | 'endsIn' | 'isLocked' | 'opensOnLabel' | 'rounds'>;

const WEEKLY_POOL: EventBase[] = [
  { id: 'blaze_wk',      name: 'Blaze Week',      emoji: '🔥', color: '#FF6B35', mode: 'chaos',      description: 'Multi-ball chaos — survive the inferno.',          winRewards: { xp: 200, coins: 100 }, loseRewards: { xp: 60,  coins: 25 }, creditsOnWin: 4, creditsOnLose: 1 },
  { id: 'speed_sprint',  name: 'Speed Sprint',    emoji: '⚡', color: '#FFD700', mode: 'blitz',      description: 'Blitz mode — faster ball, sharper reflexes.',      winRewards: { xp: 180, coins: 90  }, loseRewards: { xp: 55,  coins: 22 }, creditsOnWin: 3, creditsOnLose: 1 },
  { id: 'wave_surge',    name: 'Wave Surge',      emoji: '🌊', color: '#3A9DD4', mode: 'classic',    description: 'Classic ranked — prove your fundamentals.',        winRewards: { xp: 160, coins: 80  }, loseRewards: { xp: 50,  coins: 20 }, creditsOnWin: 3, creditsOnLose: 1 },
  { id: 'diamond_clash', name: 'Diamond Clash',   emoji: '💎', color: '#B9F2FF', mode: 'classic',    description: 'Ranked Classic — maximum XP, maximum stakes.',      winRewards: { xp: 240, coins: 120 }, loseRewards: { xp: 70,  coins: 30 }, creditsOnWin: 5, creditsOnLose: 1 },
  { id: 'chaos_carni',   name: 'Chaos Carnival',  emoji: '🎪', color: '#E040FB', mode: 'chaos',      description: 'Multi-ball mayhem — expect the unexpected.',        winRewards: { xp: 260, coins: 130 }, loseRewards: { xp: 75,  coins: 32 }, creditsOnWin: 5, creditsOnLose: 2 },
  { id: 'battle_surge',  name: 'Battle Surge',    emoji: '⚔️', color: '#E04030', mode: 'six_player', description: 'Six-player showdown — survive the crowd.',           winRewards: { xp: 300, coins: 150 }, loseRewards: { xp: 80,  coins: 35 }, creditsOnWin: 6, creditsOnLose: 2 },
  { id: 'relic_rumble',  name: 'Relic Rumble',    emoji: '🧬', color: '#9055C8', mode: 'blitz',      description: 'Blitz mode — relic effects are amplified.',         winRewards: { xp: 220, coins: 110 }, loseRewards: { xp: 65,  coins: 28 }, creditsOnWin: 4, creditsOnLose: 1 },
  { id: 'precision_duel',name: 'Precision Duel',  emoji: '🎯', color: '#00FF88', mode: 'classic',    description: 'One arena. Four players. No excuses.',              winRewards: { xp: 200, coins: 100 }, loseRewards: { xp: 60,  coins: 25 }, creditsOnWin: 4, creditsOnLose: 1 },
];

const MONTHLY_POOL: EventBase[] = [
  { id: 'frost_cup',    name: 'Frost Cup',    emoji: '❄️', color: '#B9F2FF', mode: 'classic',    description: 'January — conquer the frozen arena.',               winRewards: { xp: 500, coins: 250 }, loseRewards: { xp: 120, coins: 50 }, creditsOnWin: 10, creditsOnLose: 3 },
  { id: 'heart_cup',   name: 'Heart Cup',    emoji: '💝', color: '#FF4785', mode: 'blitz',      description: 'February — battle with passion.',                   winRewards: { xp: 500, coins: 250 }, loseRewards: { xp: 120, coins: 50 }, creditsOnWin: 10, creditsOnLose: 3 },
  { id: 'spring_cup',  name: 'Spring Cup',   emoji: '🌱', color: '#00E676', mode: 'classic',    description: 'March — new season, new glory.',                     winRewards: { xp: 520, coins: 260 }, loseRewards: { xp: 125, coins: 52 }, creditsOnWin: 10, creditsOnLose: 3 },
  { id: 'bloom_cup',   name: 'Bloom Cup',    emoji: '🌸', color: '#FF69B4', mode: 'chaos',      description: 'April — chaos blooms in the arena.',                 winRewards: { xp: 520, coins: 260 }, loseRewards: { xp: 125, coins: 52 }, creditsOnWin: 10, creditsOnLose: 3 },
  { id: 'sol_cup',     name: 'Sol Cup',      emoji: '☀️', color: '#FFD700', mode: 'classic',    description: 'May — peak competition under the blazing sun.',       winRewards: { xp: 540, coins: 270 }, loseRewards: { xp: 130, coins: 55 }, creditsOnWin: 11, creditsOnLose: 3 },
  { id: 'wave_cup',    name: 'Wave Cup',     emoji: '🌊', color: '#3A9DD4', mode: 'blitz',      description: 'June — blitz at high tide.',                         winRewards: { xp: 540, coins: 270 }, loseRewards: { xp: 130, coins: 55 }, creditsOnWin: 11, creditsOnLose: 3 },
  { id: 'inferno_cup', name: 'Inferno Cup',  emoji: '🔥', color: '#FF6B35', mode: 'chaos',      description: 'July — summer heat, fierce battles.',                winRewards: { xp: 560, coins: 280 }, loseRewards: { xp: 135, coins: 58 }, creditsOnWin: 12, creditsOnLose: 4 },
  { id: 'thunder_cup', name: 'Thunder Cup',  emoji: '⚡', color: '#9055C8', mode: 'six_player', description: 'August — six players, one winner.',                   winRewards: { xp: 560, coins: 280 }, loseRewards: { xp: 135, coins: 58 }, creditsOnWin: 12, creditsOnLose: 4 },
  { id: 'harvest_cup', name: 'Harvest Cup',  emoji: '🍂', color: '#C8820A', mode: 'classic',    description: 'September — reap the rewards of your grind.',        winRewards: { xp: 540, coins: 270 }, loseRewards: { xp: 130, coins: 55 }, creditsOnWin: 11, creditsOnLose: 3 },
  { id: 'shadow_cup',  name: 'Shadow Cup',   emoji: '🎃', color: '#9900CC', mode: 'chaos',      description: 'October — haunted arena chaos.',                     winRewards: { xp: 560, coins: 280 }, loseRewards: { xp: 135, coins: 58 }, creditsOnWin: 12, creditsOnLose: 4 },
  { id: 'eclipse_cup', name: 'Eclipse Cup',  emoji: '🌙', color: '#5050C8', mode: 'blitz',      description: 'November — night falls, only one survives.',         winRewards: { xp: 560, coins: 280 }, loseRewards: { xp: 135, coins: 58 }, creditsOnWin: 12, creditsOnLose: 4 },
  { id: 'winter_cup',  name: 'Winter Cup',   emoji: '🎄', color: '#00E5FF', mode: 'classic',    description: 'December — end the year as champion.',               winRewards: { xp: 600, coins: 300 }, loseRewards: { xp: 150, coins: 65 }, creditsOnWin: 15, creditsOnLose: 5 },
];

const ANNUAL_CUP_BASE: EventBase = {
  id: 'grand_prix', name: 'GoldRush Grand Prix', emoji: '🏆', color: '#FFD700', mode: 'classic',
  description: 'The ultimate annual championship. Every arena warrior competes for glory, massive rewards, and the prestigious Grand Prix title.',
  winRewards: { xp: 2000, coins: 1000 }, loseRewards: { xp: 400, coins: 150 }, creditsOnWin: 50, creditsOnLose: 10,
};

/** Returns the 3 currently active events (weekly, monthly, annual). Deterministic from device date. */
export function getCurrentEvents(): { weekly: EventDefinition; monthly: EventDefinition; annual: EventDefinition } {
  const now      = new Date();
  const wBase    = WEEKLY_POOL[getISOWeek(now) % WEEKLY_POOL.length];
  const mBase    = MONTHLY_POOL[now.getMonth()];
  const monthOpen  = isMonthlyEventOpen(now);
  const annualOpen = isAnnualEventOpen(now);

  // Monthly opens on the 28th of the current calendar month
  const monthOpenDate = new Date(now.getFullYear(), now.getMonth(), 28);
  const monthLabel = monthOpenDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Annual opens on Oct 28 of the current year
  const annualOpenDate = new Date(now.getFullYear(), 9, 28);
  const annualLabel = annualOpenDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    weekly: {
      ...wBase, type: 'weekly', maxPlays: 5,
      creditRankIndex: EVENT_MIN_RANK_INDEX,
      periodKey: getWeekPeriodKey(now),
      endsIn: _msUntilEndOfWeek(),
      isLocked: false,
      opensOnLabel: '',
      rounds: null,
    },
    monthly: {
      ...mBase, type: 'monthly', maxPlays: 3,
      creditRankIndex: EVENT_MIN_RANK_INDEX,
      periodKey: getMonthPeriodKey(now),
      endsIn: _msUntilMonthly(),
      isLocked: !monthOpen,
      opensOnLabel: monthOpen ? '' : monthLabel,
      rounds: [
        { name: 'Open Qualifier', badge: '🎯', maxPlays: 6,  threshold: 20, qpPerPlace: [10, 7, 4, 2], isMainDraw: false },
        { name: 'Main Draw',      badge: '🏆', maxPlays: 3,  threshold: 0,  qpPerPlace: [0,  0, 0, 0], isMainDraw: true  },
      ],
    },
    annual: {
      ...ANNUAL_CUP_BASE, type: 'annual', maxPlays: 2,
      creditRankIndex: EVENT_MIN_RANK_INDEX,
      periodKey: getAnnualPeriodKey(now),
      endsIn: _msUntilAnnual(),
      isLocked: !annualOpen,
      opensOnLabel: annualOpen ? '' : annualLabel,
      rounds: [
        { name: 'Open Qualifier', badge: '🎯', maxPlays: 8, threshold: 30, qpPerPlace: [10, 7, 4, 2], isMainDraw: false },
        { name: 'Semi-Final',     badge: '⚔️', maxPlays: 6, threshold: 25, qpPerPlace: [10, 7, 4, 2], isMainDraw: false },
        { name: 'Grand Final',    badge: '👑', maxPlays: 2, threshold: 0,  qpPerPlace: [0,  0, 0, 0], isMainDraw: true  },
      ],
    },
  };
}

/**
 * Returns the player's current state within an event's qualifier ladder.
 * Returns null for events with no qualifier (weekly).
 */
export function getEventQualifierState(
  profile: PlayerProfile,
  ev: EventDefinition,
): {
  roundIdx:    number;
  roundDef:    QualifierRoundDef;
  qp:          number;
  playsUsed:   number;
  playsLeft:   number;
  isEliminated: boolean;
} | null {
  if (!ev.rounds) return null;
  const roundIdx = (profile.qualifierRound ?? {})[ev.periodKey] ?? 0;
  const roundDef = ev.rounds[roundIdx];
  if (!roundDef) return null;
  const qpKey    = `${ev.periodKey}_${roundIdx}`;
  const qp       = roundDef.isMainDraw ? 0 : ((profile.qualifierPoints ?? {})[qpKey] ?? 0);
  const playsUsed = roundDef.isMainDraw
    ? ((profile.eventPlaysUsed ?? {})[ev.periodKey] ?? 0)
    : ((profile.qualifierPlaysUsed ?? {})[qpKey] ?? 0);
  const playsLeft     = Math.max(0, roundDef.maxPlays - playsUsed);
  const isEliminated  = !roundDef.isMainDraw && playsLeft === 0 && qp < roundDef.threshold;
  return { roundIdx, roundDef, qp, playsUsed, playsLeft, isEliminated };
}

// ─── Maps (rank-unlocked arenas) ──────────────────────────────────────────────
// Each map is a distinct arena with its own atmosphere. Higher ranks unlock more.
// Maps drive the in-match background/atmosphere and apply light gameplay modifiers.
export interface ArenaMap {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlockRankIndex: number;
  bg: [string, string, string];       // outer screen gradient
  arenaBg: [string, string, string];  // inner arena gradient
  accent: string;
  mods?: { startSpeedMult?: number; ballSpawnFrames?: number; noPowerups?: boolean };
}

export const MAPS: ArenaMap[] = [
  { id: 'dustbowl',     name: 'Dust Bowl',       icon: '🏜️', unlockRankIndex: 0, accent: '#C8820A', bg: ['#0D0A06','#181208','#0D0A06'], arenaBg: ['#0A0804','#1A1008','#0A0804'], desc: 'Sun-baked prospector flats where every legend begins.' },
  { id: 'coppercanyon', name: 'Copper Canyon',   icon: '🪨', unlockRankIndex: 1, accent: '#D07018', bg: ['#120A04','#221206','#120A04'], arenaBg: ['#140A04','#241408','#140A04'], desc: 'Burnished canyon walls glowing in the dusk light.' },
  { id: 'ironfoundry',  name: 'Iron Foundry',    icon: '⚙️', unlockRankIndex: 2, accent: '#C0C0C0', bg: ['#0A0A0C','#16161A','#0A0A0C'], arenaBg: ['#0C0C0E','#1A1A20','#0C0C0E'], desc: 'Molten steel runs hot — and the ball runs hotter.', mods: { startSpeedMult: 1.1 } },
  { id: 'emeraldmire',  name: 'Emerald Mire',    icon: '☣️', unlockRankIndex: 3, accent: '#4A8A38', bg: ['#04120A','#08240F','#04120A'], arenaBg: ['#04140A','#082810','#04140A'], desc: 'A toxic swamp thick with salvage and danger.', mods: { ballSpawnFrames: 660 } },
  { id: 'cobaltdepths', name: 'Cobalt Depths',   icon: '🔷', unlockRankIndex: 4, accent: '#1E8AAA', bg: ['#04101A','#06203A','#04101A'], arenaBg: ['#04121E','#063050','#04121E'], desc: 'Deep steel-blue caverns. Cold, fast, merciless.', mods: { startSpeedMult: 1.15 } },
  { id: 'crimsonforge', name: 'Crimson Forge',   icon: '🔥', unlockRankIndex: 5, accent: '#C03820', bg: ['#1A0402','#300806','#1A0402'], arenaBg: ['#1E0604','#380A06','#1E0604'], desc: 'The anvil of champions, lit by iron-red flame.', mods: { ballSpawnFrames: 660, startSpeedMult: 1.1 } },
  { id: 'obsidianspire',name: 'Obsidian Spire',  icon: '🌑', unlockRankIndex: 6, accent: '#7A50A0', bg: ['#0A0414','#160A28','#0A0414'], arenaBg: ['#0C0618','#1A0C30','#0C0618'], desc: 'A blackglass tower where only masters tread.', mods: { startSpeedMult: 1.2 } },
  { id: 'motherlode',   name: 'The Mother Lode', icon: '👑', unlockRankIndex: 7, accent: '#FFD700', bg: ['#1A1200','#2A2000','#1A1200'], arenaBg: ['#1E1500','#322600','#1E1500'], desc: 'The legendary golden vault — winner takes everything.', mods: { startSpeedMult: 1.15, ballSpawnFrames: 720 } },
];

export function getMap(id: string | undefined | null): ArenaMap {
  return MAPS.find(m => m.id === id) ?? MAPS[0];
}

// ─── Relic level system (1–10, Clash-Royale / Brawl-Stars style) ─────────────
export const RELIC_MAX_LEVEL = 10;
const RELIC_UPGRADE_COSTS = [50, 100, 200, 400, 800, 1500, 2500, 4000, 6000];

export function getRelicLevel(profile: PlayerProfile, relicId: string): number {
  return profile.relicLevels?.[relicId] ?? 1;
}
export function getRelicUpgradeCost(currentLevel: number): number {
  if (currentLevel >= RELIC_MAX_LEVEL) return 0;
  return RELIC_UPGRADE_COSTS[currentLevel - 1] ?? 0;
}

// ─── Reward multipliers ─────────────────────────────────────────────────────
// Streak bonus: each consecutive win pumps up XP & coins earned (wins only).
// Streak is the count BEFORE this match is recorded (0 = first win).
export function getStreakMultiplier(winStreak: number, won: boolean): number {
  if (!won) return 1.0;
  if (winStreak <= 0) return 1.0;
  if (winStreak === 1) return 1.25;
  if (winStreak === 2) return 1.5;
  if (winStreak === 3) return 1.75;
  return 2.0; // 4+ streak
}

// Difficulty bonus: harder mode = bigger reward. Casual is discounted.
// variant is the game-mode key ('classic', 'rumble', 'chaos', 'six_player').
export function getDifficultyMultiplier(variant: string | undefined, matchType: string): number {
  if (matchType === 'gauntlet') return 3.0;
  if (matchType === 'casual') return 0.8;
  switch (variant) {
    case 'warlord':        return 5.0;
    case 'ghost_protocol': return 3.0;
    case 'storm_surge':    return 2.0;
    case 'six_player':     return 1.75;
    case 'chaos':          return 1.5;
    case 'rumble':         return 1.2;
    default:               return 1.0;  // classic ranked
  }
}

function lerpR(a: number, b: number, level: number): number {
  const t = (Math.max(1, Math.min(RELIC_MAX_LEVEL, level)) - 1) / (RELIC_MAX_LEVEL - 1);
  return a + (b - a) * t;
}

// Returns the RelicEffect for a given relic at its current power level.
// Numeric stats scale linearly L1→L10; binary bonuses unlock at L5 and L10.
export function getScaledRelicEffect(relicId: string, level: number): RelicEffect {
  switch (relicId) {
    case 'ironhide':
      return { startShield: true, ...(level >= 5 && { shrinkImmune: true }), ...(level >= 10 && { bonusLives: 1 }) };
    case 'longarm':
      return { paddleLenMult: lerpR(1.08, 1.28, level) };
    case 'quicksilver':
      return { paddleSpeedMult: lerpR(1.08, 1.28, level) };
    case 'secondwind':
      return { bonusLives: level >= 7 ? 2 : 1, ...(level >= 10 && { startShield: true }) };
    case 'prospector':
      return { magnet: true, ...(level >= 5 && { bonusLives: 1 }) };
    case 'aftershock':
      return { deflectBoost: lerpR(1.10, 1.35, level) };
    case 'timewarp':
      return { slowStartFrames: Math.round(lerpR(180, 480, level)) };
    case 'bulwark':
      return { startShield: true, shrinkImmune: true, ...(level >= 5 && { bonusLives: 1 }), ...(level >= 10 && { paddleLenMult: 1.10 }) };
    case 'phoenix':
      return { revive: level >= 7 ? 3 : level >= 4 ? 2 : 1 };
    case 'midas':
      return { startShield: true, bonusLives: level >= 7 ? 2 : 1, paddleLenMult: lerpR(1.06, 1.22, level) };
    default:
      return {};
  }
}

export const ACHIEVEMENTS = [
  { id: 'first_win',  name: 'First Blood',    desc: 'Win your first match'           },
  { id: 'hat_trick',  name: 'Hat Trick',       desc: 'Deflect 10 balls in one match'  },
  { id: 'survivor',   name: 'Last Stand',      desc: 'Win with 1 life remaining'      },
  { id: 'streak3',    name: 'On Fire',         desc: 'Win 3 matches in a row'         },
  { id: 'streak5',    name: 'Unstoppable',     desc: 'Win 5 matches in a row'         },
  { id: 'level10',    name: 'Veteran',         desc: 'Reach level 10'                 },
  { id: 'level25',    name: 'Elite',           desc: 'Reach level 25'                 },
  { id: 'collector',  name: 'Collector',       desc: 'Own 3 skins'                    },
  { id: 'gold_rank',  name: 'Gold Standard',   desc: 'Reach Gold 1 rank'               },
  { id: 'century',    name: 'Centurion',       desc: 'Play 100 matches'               },
  { id: 'deflect100', name: 'The Wall',        desc: 'Deflect 100 balls total'        },
  { id: 'powerup10',  name: 'Power Hungry',    desc: 'Collect 10 power-ups'           },
];

// ─── Streak rewards ────────────────────────────────────────────────────────────
export const STREAK_REWARDS = [50, 100, 150, 200, 250, 300, 500];
export function getStreakReward(streak: number) {
  return STREAK_REWARDS[Math.min(streak - 1, STREAK_REWARDS.length - 1)];
}

// ─── Avatar options ────────────────────────────────────────────────────────────
export const AVATAR_EMOJIS  = ['🎮','⚡','🔥','💀','🦁','👑','🐉','💎'];
export const AVATAR_COLORS  = ['#FFD700','#FF4757','#00BFFF','#00FF88','#BF5FFF','#FF6B35','#FF69B4','#C0C0C0'];

// ─── Challenge code ────────────────────────────────────────────────────────────
export function getChallengeCode(username: string): string {
  let hash = 5381;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) + hash) + username.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

// ─── Lucky Block ──────────────────────────────────────────────────────────────
export type LuckyBlockTier = 'rare' | 'epic' | 'mythic' | 'legendary' | 'ultra';

export interface LuckyBlock {
  id: string;
  tier: LuckyBlockTier;
  source: string;
}

export interface LuckyBlockReward {
  coins: number;
  xp: number;
  label: string;
}

export const LUCKY_BLOCK_META: Record<LuckyBlockTier, { name: string; emoji: string; color: string }> = {
  rare:      { name: 'Rush Crate',    emoji: '📦', color: '#3399FF' },
  epic:      { name: 'Storm Vault',   emoji: '⚡', color: '#AA44FF' },
  mythic:    { name: 'Shadow Coffer', emoji: '🔮', color: '#FF44CC' },
  legendary: { name: 'Dragon Cache', emoji: '🔥', color: '#FF6622' },
  ultra:     { name: 'Nexus Core',   emoji: '💎', color: '#00EEFF' },
};

const LB_TIER_ORDER: LuckyBlockTier[] = ['rare', 'epic', 'mythic', 'legendary', 'ultra'];
const LB_UPGRADE_CHANCE: Record<LuckyBlockTier, number> = {
  rare: 0.38, epic: 0.26, mythic: 0.16, legendary: 0.06, ultra: 0,
};

export function rollLuckyBlockUpgrade(tier: LuckyBlockTier): LuckyBlockTier {
  const idx = LB_TIER_ORDER.indexOf(tier);
  if (idx < LB_TIER_ORDER.length - 1 && Math.random() < LB_UPGRADE_CHANCE[tier]) {
    return LB_TIER_ORDER[idx + 1];
  }
  return tier;
}

export function generateLuckyBlockReward(tier: LuckyBlockTier): LuckyBlockReward {
  const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  switch (tier) {
    case 'rare': {
      const c = rnd(200, 600);
      return { coins: c, xp: 0, label: `${c} Coins` };
    }
    case 'epic': {
      const c = rnd(600, 1200); const x = rnd(200, 500);
      return { coins: c, xp: x, label: `${c} Coins + ${x} XP` };
    }
    case 'mythic': {
      const c = rnd(1200, 2500); const x = rnd(500, 1200);
      return { coins: c, xp: x, label: `${c} Coins + ${x} XP` };
    }
    case 'legendary': {
      const c = rnd(2500, 5000); const x = rnd(1200, 3000);
      return { coins: c, xp: x, label: `${c} Coins + ${x} XP` };
    }
    case 'ultra': {
      const c = rnd(5000, 12000); const x = rnd(3000, 8000);
      return { coins: c, xp: x, label: `${c} Coins + ${x} XP` };
    }
  }
}

// ─── Trophy Road ──────────────────────────────────────────────────────────────
export type TrophyReward =
  | { type: 'coins'; amount: number }
  | { type: 'skin';  id: string }
  | { type: 'relic'; id: string }
  | { type: 'luckyblock'; tier: LuckyBlockTier };

export interface TrophyMilestone {
  id: string;
  xp: number;
  reward: TrophyReward;
}

export const TROPHY_ROAD: TrophyMilestone[] = [
  { id: 'tr_01', xp: 100,    reward: { type: 'coins', amount: 200  } },
  { id: 'tr_02', xp: 300,    reward: { type: 'relic', id: 'ironhide'    } },
  { id: 'tr_03', xp: 600,    reward: { type: 'luckyblock', tier: 'rare'      } },
  { id: 'tr_04', xp: 1000,   reward: { type: 'skin',  id: 'plasma'      } },
  { id: 'tr_05', xp: 1500,   reward: { type: 'coins', amount: 400  } },
  { id: 'tr_06', xp: 2000,   reward: { type: 'relic', id: 'longarm'     } },
  { id: 'tr_07', xp: 3000,   reward: { type: 'skin',  id: 'frost'       } },
  { id: 'tr_08', xp: 4000,   reward: { type: 'luckyblock', tier: 'epic'      } },
  { id: 'tr_09', xp: 6000,   reward: { type: 'relic', id: 'quicksilver' } },
  { id: 'tr_10', xp: 8000,   reward: { type: 'skin',  id: 'toxic'       } },
  { id: 'tr_11', xp: 10000,  reward: { type: 'coins', amount: 800  } },
  { id: 'tr_12', xp: 12000,  reward: { type: 'relic', id: 'secondwind'  } },
  { id: 'tr_13', xp: 15000,  reward: { type: 'skin',  id: 'void'        } },
  { id: 'tr_14', xp: 20000,  reward: { type: 'luckyblock', tier: 'mythic'    } },
  { id: 'tr_15', xp: 25000,  reward: { type: 'relic', id: 'aftershock'  } },
  { id: 'tr_16', xp: 30000,  reward: { type: 'skin',  id: 'inferno'     } },
  { id: 'tr_17', xp: 35000,  reward: { type: 'coins', amount: 1200 } },
  { id: 'tr_18', xp: 40000,  reward: { type: 'relic', id: 'timewarp'    } },
  { id: 'tr_19', xp: 50000,  reward: { type: 'skin',  id: 'chrome'      } },
  { id: 'tr_20', xp: 60000,  reward: { type: 'luckyblock', tier: 'legendary' } },
  { id: 'tr_21', xp: 75000,  reward: { type: 'relic', id: 'bulwark'     } },
  { id: 'tr_22', xp: 100000, reward: { type: 'skin',  id: 'cosmic'      } },
  { id: 'tr_23', xp: 125000, reward: { type: 'luckyblock', tier: 'legendary' } },
  { id: 'tr_24', xp: 150000, reward: { type: 'relic', id: 'phoenix'     } },
  { id: 'tr_25', xp: 200000, reward: { type: 'relic', id: 'midas'       } },
];

// ─── Season pass ──────────────────────────────────────────────────────────────
export const SEASON_TIERS = [
  { games: 0,   reward: '50 coins',         icon: '🪙', name: 'Rookie',    coinReward: 50,  luckyBlockTier: null as LuckyBlockTier | null },
  { games: 5,   reward: '100 coins',         icon: '💰', name: 'Contender', coinReward: 100, luckyBlockTier: null as LuckyBlockTier | null },
  { games: 10,  reward: 'Rush Crate',        icon: '📦', name: 'Fighter',   coinReward: 0,   luckyBlockTier: 'rare'      as LuckyBlockTier | null },
  { games: 20,  reward: 'Plasma skin',       icon: '🎨', name: 'Warrior',   coinReward: 0,   luckyBlockTier: null as LuckyBlockTier | null },
  { games: 30,  reward: 'Storm Vault',       icon: '⚡', name: 'Champion',  coinReward: 0,   luckyBlockTier: 'epic'      as LuckyBlockTier | null },
  { games: 50,  reward: 'Frost skin',        icon: '❄️', name: 'Legend',    coinReward: 0,   luckyBlockTier: null as LuckyBlockTier | null },
  { games: 75,  reward: 'Shadow Coffer',     icon: '🔮', name: 'Myth',      coinReward: 0,   luckyBlockTier: 'mythic'    as LuckyBlockTier | null },
  { games: 100, reward: 'Cosmic skin',       icon: '🌟', name: 'Immortal',  coinReward: 0,   luckyBlockTier: null as LuckyBlockTier | null },
];

// ─── Saved account meta (for login screen) ────────────────────────────────────
export interface SavedAccountMeta {
  username: string;
  avatarEmoji: string;
  avatarColor: string;
  rank: string;
  lastPlayed: number;
}

const ACCOUNTS_KEY  = '@goldrush_accounts';
const CURRENT_KEY   = '@goldrush_current';
const profileKey    = (u: string) => `@goldrush_v3_${u}`;

export async function getSavedAccounts(): Promise<SavedAccountMeta[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as SavedAccountMeta[]; } catch { return []; }
}

export async function loginAccount(username: string, avatarEmoji: string, avatarColor: string): Promise<void> {
  await AsyncStorage.setItem(CURRENT_KEY, username);
  const accounts = await getSavedAccounts();
  const existing = accounts.findIndex(a => a.username === username);
  const meta: SavedAccountMeta = { username, avatarEmoji, avatarColor, rank: 'Bronze', lastPlayed: Date.now() };
  if (existing >= 0) accounts[existing] = { ...accounts[existing], lastPlayed: Date.now() };
  else accounts.unshift(meta);
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 10)));
}

export async function logoutAccount(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_KEY);
}

export async function deleteAccount(username: string): Promise<void> {
  const accounts = await getSavedAccounts();
  const filtered = accounts.filter(a => a.username !== username);
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
  const current = await AsyncStorage.getItem(CURRENT_KEY);
  if (current === username) await AsyncStorage.removeItem(CURRENT_KEY);
  const KEY = `@goldrush_v3_${username}`;
  await AsyncStorage.removeItem(KEY);
}

export async function getLoggedInUser(): Promise<string | null> {
  return AsyncStorage.getItem(CURRENT_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlayerProfile {
  name: string;
  xp: number;
  level: number;
  rank: string;
  coins: number;
  wins: number;
  losses: number;
  totalGames: number;
  totalDeflections: number;
  totalPowerups: number;
  ownedSkins: string[];
  currentSkin: string;
  achievements: string[];
  winStreak: number;
  bestStreak: number;
  matchHistory: MatchResult[];
  loginStreak: number;
  lastLoginDate: string;
  streakBonusClaimed: boolean;
  avatarEmoji: string;
  avatarFrameColor: string;
  seasonPassClaimed: number[];
  // Halo-style competitive ranking
  competitiveLevel: number;    // 1–50
  highestLevel: number;        // best ever reached
  // Arena theme
  ownedThemes: string[];
  currentArenaTheme: string;
  // Equipped relic (rank-unlocked battle artifact); 'none' = no relic
  currentRelic: string;
  // Per-relic power levels (1–10). Missing key = level 1.
  relicLevels?: Record<string, number>;
  // Onboarding: false = never shown tutorial, true = completed
  tutorialComplete?: boolean;
  // Super ability equipped for matches: 1=Rampart, 2=Dead Zone, 3=Shatter
  selectedSuper?: 1 | 2 | 3;
  // Credits earned once all relics are unlocked (Brawl Stars-style overflow currency)
  credits?: number;
  // Forge Abilities purchased with credits
  ownedForgeAbilities?: string[];
  equippedForgeAbility?: string | null;
  // Trophy Road claimed milestone IDs
  trophyRoadClaimed?: string[];
  // Relics unlocked via Trophy Road (bypass rank requirement)
  trophyUnlockedRelics?: string[];
  // Event plays used: key = periodKey (e.g. "w_2026_28"), value = plays consumed
  eventPlaysUsed?: Record<string, number>;
  // Qualifier data — keys: periodKey for round index, `${periodKey}_${roundIdx}` for QP/plays
  qualifierRound?:     Record<string, number>;
  qualifierPoints?:    Record<string, number>;
  qualifierPlaysUsed?: Record<string, number>;
  // Lucky blocks inventory
  luckyBlocks?: LuckyBlock[];
  // Set during addMatchResult when a win-streak block is earned; cleared on open
  pendingStreakLuckyBlockId?: string | null;
  // Tracks which redemption codes have already been used on this account
  redeemedCodes?: string[];
}

export interface MatchResult {
  id: string; won: boolean; xpEarned: number; coinsEarned: number;
  deflections: number; goalsAgainst: number; position: number; timestamp: number;
  matchType?: 'ranked' | 'casual';
  levelBefore?: number; levelAfter?: number;
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Player', xp: 0, level: 1, rank: 'Bronze', coins: 200,
  wins: 0, losses: 0, totalGames: 0, totalDeflections: 0, totalPowerups: 0,
  ownedSkins: ['default'], currentSkin: 'default', achievements: [],
  winStreak: 0, bestStreak: 0, matchHistory: [],
  loginStreak: 0, lastLoginDate: '', streakBonusClaimed: false,
  avatarEmoji: '🎮', avatarFrameColor: '#FFD700',
  seasonPassClaimed: [],
  competitiveLevel: 1, highestLevel: 1,
  ownedThemes: ['default'], currentArenaTheme: 'default',
  currentRelic: 'none',
  relicLevels: {},
  tutorialComplete: false,
  selectedSuper: 1,
  trophyRoadClaimed: [],
  trophyUnlockedRelics: [],
  credits: 0,
  ownedForgeAbilities: [],
  equippedForgeAbility: null,
  luckyBlocks: [],
  pendingStreakLuckyBlockId: null,
  eventPlaysUsed: {},
};

// ─── Halo-style level change calculator ───────────────────────────────────────
export function calcLevelDelta(position: number, matchType: 'ranked' | 'casual'): number {
  if (matchType === 'casual') return 0; // casual never affects rank
  if (position === 1) return 2;         // champion → +2 levels
  if (position === 2) return 0;         // runner-up → no change
  return -1;                            // eliminated early → -1 level
}

// ─── Utility fns ──────────────────────────────────────────────────────────────
export function xpToLevel(xp: number) { return Math.floor(Math.pow(xp / 80, 0.72)) + 1; }
export function getRankFromXP(xp: number) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.minXP) r = rank; }
  return r.name;
}
export function xpForNextRank(xp: number) {
  let cur = RANKS[0], nxt = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXP) { cur = RANKS[i]; nxt = RANKS[i + 1] ?? null; }
  }
  if (!nxt) return { current: cur.name, next: null, progress: 1, remaining: 0 };
  return { current: cur.name, next: nxt.name, progress: (xp - cur.minXP) / (nxt.minXP - cur.minXP), remaining: nxt.minXP - xp };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface PlayerContextType {
  profile: PlayerProfile;
  isLoaded: boolean;
  currentUsername: string;
  showStreakModal: boolean;
  dismissStreakModal: () => void;
  updateName: (name: string) => Promise<void>;
  addMatchResult: (r: Omit<MatchResult, 'id'|'timestamp'>) => Promise<void>;
  unlockAchievement: (id: string) => Promise<string | null>;
  purchaseSkin: (skinId: string) => Promise<boolean>;
  equipSkin: (skinId: string) => Promise<void>;
  equipTheme: (themeId: string) => Promise<void>;
  equipRelic: (relicId: string) => Promise<void>;
  upgradeRelic: (relicId: string) => Promise<boolean>;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  setAvatar: (emoji: string, color: string) => Promise<void>;
  claimDailyStreak: () => Promise<number>;
  claimSeasonTier: (tierIdx: number) => Promise<LuckyBlock | null>;
  claimTrophyRoad: (id: string) => Promise<LuckyBlock | null>;
  openLuckyBlock: (blockId: string, reward: LuckyBlockReward) => Promise<void>;
  completeTutorial: () => Promise<void>;
  setSelectedSuper: (type: 1 | 2 | 3) => Promise<void>;
  purchaseForgeAbility: (id: string) => Promise<boolean>;
  equipForgeAbility: (id: string | null) => Promise<void>;
  spendEventPlay: (periodKey: string) => Promise<boolean>;
  claimEventBonus: (bonus: { xp: number; coins: number; credits: number }) => Promise<void>;
  spendQualifierPlay: (periodKey: string, roundIdx: number) => Promise<boolean>;
  earnQualifierPoints: (
    periodKey: string,
    roundIdx: number,
    placement: number,
    rounds: QualifierRoundDef[],
  ) => Promise<{ qpEarned: number; totalQP: number; advanced: boolean; nextRoundName: string }>;
  redeemCode: (code: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PlayerProvider({ username, onLogout, children }: {
  username: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [profile, setProfile]             = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded]           = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const KEY = profileKey(username);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      let base = { ...DEFAULT_PROFILE, name: username };
      if (raw) {
        try { base = { ...base, ...JSON.parse(raw) }; } catch { /* ignore */ }
      }
      // Daily streak logic on load
      const today = todayStr();
      let streak = base.loginStreak ?? 0;
      const last  = base.lastLoginDate ?? '';
      let showModal = false;
      if (last !== today) {
        const yesterday = (() => {
          const d = new Date(); d.setDate(d.getDate() - 1);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        })();
        streak = (last === yesterday) ? streak + 1 : 1;
        showModal = true;
        base = { ...base, loginStreak: streak, lastLoginDate: today, streakBonusClaimed: false };
      }
      setProfile(base);
      setIsLoaded(true);
      if (showModal) setShowStreakModal(true);
      // Save updated streak
      AsyncStorage.setItem(KEY, JSON.stringify(base));
    });
  }, [KEY]);

  const save = useCallback(async (updated: PlayerProfile) => {
    setProfile(updated);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    // Update saved accounts meta
    const accounts = await getSavedAccounts();
    const idx = accounts.findIndex(a => a.username === username);
    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], rank: updated.rank, avatarEmoji: updated.avatarEmoji, avatarColor: updated.avatarFrameColor, lastPlayed: Date.now() };
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  }, [KEY, username]);

  const updateName = useCallback(async (name: string) => {
    await save({ ...profile, name: name.trim() || username });
  }, [profile, save]);

  const addMatchResult = useCallback(async (result: Omit<MatchResult, 'id'|'timestamp'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const matchType = result.matchType ?? 'casual';
    const levelDelta = calcLevelDelta(result.position, matchType);
    const newCompLevel = Math.max(1, Math.min(50, profile.competitiveLevel + levelDelta));
    const newXP  = profile.xp + result.xpEarned;
    const newWinStreak = result.won ? profile.winStreak + 1 : 0;
    const match: MatchResult = {
      ...result, id, timestamp: Date.now(),
      levelBefore: profile.competitiveLevel, levelAfter: newCompLevel,
    };
    // Award credits when all relics are unlocked (Brawl Stars overflow mechanic)
    const trophyRelics = profile.trophyUnlockedRelics ?? [];
    const allRelicsOwned = RELICS.every(r =>
      trophyRelics.includes(r.id) || getRankIndex(getRankFromXP(newXP)) >= r.unlockRankIndex
    );
    const creditsEarned = allRelicsOwned ? (result.won ? 2 : 1) : 0;

    // Award a lucky block every 5th win streak
    let streakBlock: LuckyBlock | null = null;
    if (result.won && newWinStreak > 0 && newWinStreak % 5 === 0) {
      const tier: LuckyBlockTier =
        newWinStreak >= 20 ? 'legendary' :
        newWinStreak >= 15 ? 'mythic'    :
        newWinStreak >= 10 ? 'epic'      : 'rare';
      streakBlock = { id: Date.now().toString(36) + 'lb', tier, source: 'win_streak' };
    }

    await save({
      ...profile,
      xp: newXP, level: xpToLevel(newXP), rank: getRankFromXP(newXP),
      coins: profile.coins + result.coinsEarned,
      credits: (profile.credits ?? 0) + creditsEarned,
      wins:  result.won ? profile.wins + 1 : profile.wins,
      losses: !result.won ? profile.losses + 1 : profile.losses,
      totalGames: profile.totalGames + 1,
      totalDeflections: profile.totalDeflections + result.deflections,
      winStreak: newWinStreak, bestStreak: Math.max(profile.bestStreak, newWinStreak),
      matchHistory: [match, ...profile.matchHistory].slice(0, 50),
      competitiveLevel: newCompLevel,
      highestLevel: Math.max(profile.highestLevel, newCompLevel),
      luckyBlocks: streakBlock
        ? [...(profile.luckyBlocks ?? []), streakBlock]
        : (profile.luckyBlocks ?? []),
      pendingStreakLuckyBlockId: streakBlock ? streakBlock.id : profile.pendingStreakLuckyBlockId,
    });
  }, [profile, save]);

  const unlockAchievement = useCallback(async (id: string): Promise<string|null> => {
    if (profile.achievements.includes(id)) return null;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return null;
    await save({ ...profile, achievements: [...profile.achievements, id] });
    return ach.name;
  }, [profile, save]);

  const purchaseSkin = useCallback(async (skinId: string): Promise<boolean> => {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || profile.ownedSkins.includes(skinId) || profile.coins < skin.price) return false;
    await save({ ...profile, coins: profile.coins - skin.price, ownedSkins: [...profile.ownedSkins, skinId] });
    return true;
  }, [profile, save]);

  const equipSkin = useCallback(async (skinId: string) => {
    if (!profile.ownedSkins.includes(skinId)) return;
    await save({ ...profile, currentSkin: skinId });
  }, [profile, save]);

  const equipTheme = useCallback(async (themeId: string) => {
    if (!profile.ownedThemes.includes(themeId)) return;
    await save({ ...profile, currentArenaTheme: themeId });
  }, [profile, save]);

  const equipRelic = useCallback(async (relicId: string) => {
    if (relicId === 'none') { await save({ ...profile, currentRelic: 'none' }); return; }
    const relic = RELICS.find(r => r.id === relicId);
    if (!relic) return;
    const trophyUnlocked = (profile.trophyUnlockedRelics ?? []).includes(relicId);
    if (!trophyUnlocked && getRankIndex(profile.rank) < relic.unlockRankIndex) return;
    await save({ ...profile, currentRelic: relicId });
  }, [profile, save]);

  const upgradeRelic = useCallback(async (relicId: string): Promise<boolean> => {
    const relic = RELICS.find(r => r.id === relicId);
    const trophyUnlocked = (profile.trophyUnlockedRelics ?? []).includes(relicId);
    if (!relic || (!trophyUnlocked && getRankIndex(profile.rank) < relic.unlockRankIndex)) return false;
    const currentLevel = profile.relicLevels?.[relicId] ?? 1;
    if (currentLevel >= RELIC_MAX_LEVEL) return false;
    const cost = getRelicUpgradeCost(currentLevel);
    if (profile.coins < cost) return false;
    await save({
      ...profile,
      coins: profile.coins - cost,
      relicLevels: { ...(profile.relicLevels ?? {}), [relicId]: currentLevel + 1 },
    });
    return true;
  }, [profile, save]);

  const addCoins  = useCallback(async (amount: number) => { await save({ ...profile, coins: profile.coins + amount }); }, [profile, save]);
  const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (profile.coins < amount) return false;
    await save({ ...profile, coins: profile.coins - amount });
    return true;
  }, [profile, save]);

  const setAvatar = useCallback(async (emoji: string, color: string) => {
    await save({ ...profile, avatarEmoji: emoji, avatarFrameColor: color });
  }, [profile, save]);

  const claimDailyStreak = useCallback(async (): Promise<number> => {
    const reward = getStreakReward(profile.loginStreak);
    await save({ ...profile, coins: profile.coins + reward, streakBonusClaimed: true });
    return reward;
  }, [profile, save]);

  const claimSeasonTier = useCallback(async (tierIdx: number): Promise<LuckyBlock | null> => {
    if (profile.seasonPassClaimed.includes(tierIdx)) return null;
    const tier = SEASON_TIERS[tierIdx];
    if (!tier) return null;
    let updated = { ...profile, seasonPassClaimed: [...profile.seasonPassClaimed, tierIdx] };
    let earnedBlock: LuckyBlock | null = null;
    if (tier.coinReward > 0) updated = { ...updated, coins: updated.coins + tier.coinReward };
    if (tier.luckyBlockTier) {
      earnedBlock = { id: Date.now().toString(36) + 'sp', tier: tier.luckyBlockTier, source: 'season_pass' };
      updated = { ...updated, luckyBlocks: [...(updated.luckyBlocks ?? []), earnedBlock] };
    }
    await save(updated);
    return earnedBlock;
  }, [profile, save]);

  const logout = useCallback(async () => {
    await logoutAccount();
    onLogout();
  }, [onLogout]);

  const completeTutorial = useCallback(async () => {
    await save({ ...profile, tutorialComplete: true });
  }, [profile, save]);

  const claimTrophyRoad = useCallback(async (id: string): Promise<LuckyBlock | null> => {
    if ((profile.trophyRoadClaimed ?? []).includes(id)) return null;
    const milestone = TROPHY_ROAD.find(m => m.id === id);
    if (!milestone || profile.xp < milestone.xp) return null;
    let updated = { ...profile, trophyRoadClaimed: [...(profile.trophyRoadClaimed ?? []), id] };
    const r = milestone.reward;
    let earnedBlock: LuckyBlock | null = null;
    if (r.type === 'coins') {
      updated = { ...updated, coins: updated.coins + r.amount };
    } else if (r.type === 'skin') {
      if (!updated.ownedSkins.includes(r.id))
        updated = { ...updated, ownedSkins: [...updated.ownedSkins, r.id] };
    } else if (r.type === 'relic') {
      const prev = updated.trophyUnlockedRelics ?? [];
      const relicData = RELICS.find(rl => rl.id === r.id);
      const alreadyHas = prev.includes(r.id) ||
        (relicData ? getRankIndex(updated.rank) >= relicData.unlockRankIndex : false);
      if (alreadyHas) {
        updated = { ...updated, credits: (updated.credits ?? 0) + 15 };
      } else {
        updated = { ...updated, trophyUnlockedRelics: [...prev, r.id] };
      }
    } else if (r.type === 'luckyblock') {
      earnedBlock = { id: Date.now().toString(36) + 'tr', tier: r.tier, source: 'trophy_road' };
      updated = { ...updated, luckyBlocks: [...(updated.luckyBlocks ?? []), earnedBlock] };
    }
    await save(updated);
    return earnedBlock;
  }, [profile, save]);

  const setSelectedSuper = useCallback(async (type: 1 | 2 | 3) => {
    await save({ ...profile, selectedSuper: type });
  }, [profile, save]);

  const purchaseForgeAbility = useCallback(async (id: string): Promise<boolean> => {
    const forge = FORGE_ABILITIES.find(f => f.id === id);
    if (!forge) return false;
    if ((profile.ownedForgeAbilities ?? []).includes(id)) return false;
    if ((profile.credits ?? 0) < forge.cost) return false;
    await save({
      ...profile,
      credits: (profile.credits ?? 0) - forge.cost,
      ownedForgeAbilities: [...(profile.ownedForgeAbilities ?? []), id],
      equippedForgeAbility: profile.equippedForgeAbility ?? id,
    });
    return true;
  }, [profile, save]);

  const equipForgeAbility = useCallback(async (id: string | null) => {
    if (id !== null && !(profile.ownedForgeAbilities ?? []).includes(id)) return;
    await save({ ...profile, equippedForgeAbility: id });
  }, [profile, save]);

  const spendEventPlay = useCallback(async (periodKey: string): Promise<boolean> => {
    const events = getCurrentEvents();
    const all = [events.weekly, events.monthly, events.annual];
    const ev = all.find(e => e.periodKey === periodKey);
    if (!ev) return false;
    const used = (profile.eventPlaysUsed ?? {})[periodKey] ?? 0;
    if (used >= ev.maxPlays) return false;
    await save({ ...profile, eventPlaysUsed: { ...(profile.eventPlaysUsed ?? {}), [periodKey]: used + 1 } });
    return true;
  }, [profile, save]);

  const claimEventBonus = useCallback(async (bonus: { xp: number; coins: number; credits: number }) => {
    if (bonus.xp === 0 && bonus.coins === 0 && bonus.credits === 0) return;
    const newXP = profile.xp + bonus.xp;
    let newRank = profile.rank;
    for (const r of RANKS) { if (newXP >= r.minXP) newRank = r.name; }
    await save({
      ...profile,
      xp: newXP,
      coins: profile.coins + bonus.coins,
      credits: (profile.credits ?? 0) + bonus.credits,
      rank: newRank,
    });
  }, [profile, save]);

  const spendQualifierPlay = useCallback(async (periodKey: string, roundIdx: number): Promise<boolean> => {
    const events = getCurrentEvents();
    const ev = [events.weekly, events.monthly, events.annual].find(e => e.periodKey === periodKey);
    if (!ev?.rounds) return false;
    const roundDef = ev.rounds[roundIdx];
    if (!roundDef || roundDef.isMainDraw) return false;
    const qpKey  = `${periodKey}_${roundIdx}`;
    const used   = (profile.qualifierPlaysUsed ?? {})[qpKey] ?? 0;
    if (used >= roundDef.maxPlays) return false;
    await save({ ...profile, qualifierPlaysUsed: { ...(profile.qualifierPlaysUsed ?? {}), [qpKey]: used + 1 } });
    return true;
  }, [profile, save]);

  const earnQualifierPoints = useCallback(async (
    periodKey: string,
    roundIdx: number,
    placement: number,
    rounds: QualifierRoundDef[],
  ): Promise<{ qpEarned: number; totalQP: number; advanced: boolean; nextRoundName: string }> => {
    const roundDef = rounds[roundIdx];
    if (!roundDef || roundDef.isMainDraw) return { qpEarned: 0, totalQP: 0, advanced: false, nextRoundName: '' };
    const placeIdx = Math.min(Math.max(placement - 1, 0), 3) as 0 | 1 | 2 | 3;
    const qpEarned = roundDef.qpPerPlace[placeIdx];
    const qpKey    = `${periodKey}_${roundIdx}`;
    const currentQP = (profile.qualifierPoints ?? {})[qpKey] ?? 0;
    const totalQP   = currentQP + qpEarned;
    const advanced  = roundDef.threshold > 0 && totalQP >= roundDef.threshold;
    const nextRound = rounds[roundIdx + 1];
    const updates: Partial<PlayerProfile> = {
      qualifierPoints: { ...(profile.qualifierPoints ?? {}), [qpKey]: totalQP },
    };
    if (advanced) {
      updates.qualifierRound = { ...(profile.qualifierRound ?? {}), [periodKey]: roundIdx + 1 };
    }
    await save({ ...profile, ...updates });
    return { qpEarned, totalQP, advanced, nextRoundName: nextRound?.name ?? '' };
  }, [profile, save]);

  const openLuckyBlock = useCallback(async (blockId: string, reward: LuckyBlockReward) => {
    const blocks = (profile.luckyBlocks ?? []).filter(b => b.id !== blockId);
    const newXP = profile.xp + reward.xp;
    let newRank = profile.rank;
    if (reward.xp > 0) {
      for (const r of RANKS) { if (newXP >= r.minXP) newRank = r.name; }
    }
    await save({
      ...profile,
      luckyBlocks: blocks,
      pendingStreakLuckyBlockId:
        profile.pendingStreakLuckyBlockId === blockId ? null : profile.pendingStreakLuckyBlockId,
      coins: profile.coins + reward.coins,
      xp: reward.xp > 0 ? newXP : profile.xp,
      rank: reward.xp > 0 ? newRank : profile.rank,
    });
  }, [profile, save]);

  const redeemCode = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    const normalized = code.trim().toUpperCase();
    if ((profile.redeemedCodes ?? []).includes(normalized)) {
      return { success: false, message: 'Code already redeemed.' };
    }
    type CodeReward = { xp?: number; coins?: number; skins?: string[]; themes?: string[]; label: string };
    const CODES: Record<string, CodeReward> = {
      'GOLDRUSH': {
        xp: 28000, coins: 28000,
        skins:  ['default','plasma','frost','toxic','void','inferno','chrome','cosmic'],
        themes: ['default','solar','arctic','toxic','cosmic','golden'],
        label: '28,000 XP + 28,000 Coins + all skins & themes unlocked!',
      },
    };
    const reward = CODES[normalized];
    if (!reward) {
      return { success: false, message: 'Invalid or expired code.' };
    }
    let updated = { ...profile };
    if (reward.xp) {
      const newXP = updated.xp + reward.xp;
      updated = { ...updated, xp: newXP, level: xpToLevel(newXP), rank: getRankFromXP(newXP) };
    }
    if (reward.coins) {
      updated = { ...updated, coins: updated.coins + reward.coins };
    }
    if (reward.skins) {
      updated = { ...updated, ownedSkins: [...new Set([...updated.ownedSkins, ...reward.skins])] };
    }
    if (reward.themes) {
      updated = { ...updated, ownedThemes: [...new Set([...(updated.ownedThemes ?? []), ...reward.themes])] };
    }
    updated = { ...updated, redeemedCodes: [...(updated.redeemedCodes ?? []), normalized] };
    await save(updated);
    return { success: true, message: reward.label };
  }, [profile, save]);

  const dismissStreakModal = useCallback(() => setShowStreakModal(false), []);

  return (
    <PlayerContext.Provider value={{
      profile, isLoaded, currentUsername: username, showStreakModal, dismissStreakModal,
      updateName, addMatchResult, unlockAchievement, purchaseSkin, equipSkin, equipTheme, equipRelic, upgradeRelic,
      addCoins, spendCoins, setAvatar, claimDailyStreak, claimSeasonTier, claimTrophyRoad, completeTutorial,
      setSelectedSuper, purchaseForgeAbility, equipForgeAbility,
      spendEventPlay, claimEventBonus, spendQualifierPlay, earnQualifierPoints,
      openLuckyBlock, redeemCode, logout,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
