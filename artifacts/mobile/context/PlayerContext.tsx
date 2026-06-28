import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─── Ranks & Skins ────────────────────────────────────────────────────────────
export const RANKS = [
  { name: 'Iron',     minXP: 0,     color: '#8B8B8B' },
  { name: 'Bronze',   minXP: 500,   color: '#CD7F32' },
  { name: 'Silver',   minXP: 1500,  color: '#C0C0C0' },
  { name: 'Gold',     minXP: 3000,  color: '#FFD700' },
  { name: 'Platinum', minXP: 6000,  color: '#00E5FF' },
  { name: 'Diamond',  minXP: 10000, color: '#B9F2FF' },
  { name: 'Master',   minXP: 20000, color: '#FF4757' },
  { name: 'Legend',   minXP: 40000, color: '#FFD700' },
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
  { id: 'ironhide',    name: 'Ironhide',     icon: '🛡️', color: '#9AA0A6', unlockRankIndex: 0, desc: 'Begin every match with a shield already active.',                   effect: { startShield: true } },
  { id: 'longarm',     name: 'Longarm',      icon: '📐', color: '#CD7F32', unlockRankIndex: 1, desc: 'Your paddle is 18% longer.',                                        effect: { paddleLenMult: 1.18 } },
  { id: 'quicksilver', name: 'Quicksilver',  icon: '💨', color: '#C0C0C0', unlockRankIndex: 2, desc: 'Your paddle moves 18% faster.',                                     effect: { paddleSpeedMult: 1.18 } },
  { id: 'secondwind',  name: 'Second Wind',  icon: '❤️', color: '#C8820A', unlockRankIndex: 3, desc: 'Start each match with +1 extra life.',                              effect: { bonusLives: 1 } },
  { id: 'prospector',  name: 'Prospector',   icon: '🧲', color: '#D9A441', unlockRankIndex: 3, desc: 'Power-ups drift toward your zone.',                                 effect: { magnet: true } },
  { id: 'aftershock',  name: 'Aftershock',   icon: '💥', color: '#1E8AAA', unlockRankIndex: 4, desc: 'Balls you deflect rebound 25% faster.',                             effect: { deflectBoost: 1.25 } },
  { id: 'timewarp',    name: 'Time Warp',    icon: '⏳', color: '#B9F2FF', unlockRankIndex: 5, desc: 'All balls move 35% slower for the first 6 seconds.',                effect: { slowStartFrames: 360 } },
  { id: 'bulwark',     name: 'Bulwark',      icon: '🪨', color: '#C03820', unlockRankIndex: 6, desc: 'Start with a shield and total immunity to shrink traps.',           effect: { startShield: true, shrinkImmune: true } },
  { id: 'phoenix',     name: 'Phoenix',      icon: '🔥', color: '#FF6B35', unlockRankIndex: 6, desc: 'Revive once with 2 lives the first time you are eliminated.',       effect: { revive: 2 } },
  { id: 'midas',       name: 'Midas Touch',  icon: '👑', color: '#FFD700', unlockRankIndex: 7, desc: 'Start with a shield, +1 life, and a 12% larger paddle.',            effect: { startShield: true, bonusLives: 1, paddleLenMult: 1.12 } },
];

export function getRelic(id: string | undefined | null): Relic | null {
  if (!id || id === 'none') return null;
  return RELICS.find(r => r.id === id) ?? null;
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
  if (matchType === 'casual') return 0.8;
  switch (variant) {
    case 'six_player': return 1.75;
    case 'chaos':      return 1.5;
    case 'rumble':     return 1.2;
    default:           return 1.0;  // classic ranked
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
  { id: 'gold_rank',  name: 'Gold Standard',   desc: 'Reach Gold rank'                },
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

// ─── Season pass ──────────────────────────────────────────────────────────────
export const SEASON_TIERS = [
  { games: 0,   reward: '50 coins',    icon: '🪙', name: 'Rookie',    coinReward: 50  },
  { games: 5,   reward: '100 coins',   icon: '💰', name: 'Contender', coinReward: 100 },
  { games: 10,  reward: '150 coins',   icon: '⚡', name: 'Fighter',   coinReward: 150 },
  { games: 20,  reward: 'Plasma skin', icon: '🎨', name: 'Warrior',   coinReward: 0   },
  { games: 30,  reward: '300 coins',   icon: '💎', name: 'Champion',  coinReward: 300 },
  { games: 50,  reward: 'Frost skin',  icon: '❄️', name: 'Legend',    coinReward: 0   },
  { games: 75,  reward: '500 coins',   icon: '🔥', name: 'Myth',      coinReward: 500 },
  { games: 100, reward: 'Cosmic skin', icon: '🌟', name: 'Immortal',  coinReward: 0   },
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
  const meta: SavedAccountMeta = { username, avatarEmoji, avatarColor, rank: 'Iron', lastPlayed: Date.now() };
  if (existing >= 0) accounts[existing] = { ...accounts[existing], lastPlayed: Date.now() };
  else accounts.unshift(meta);
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 10)));
}

export async function logoutAccount(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_KEY);
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
}

export interface MatchResult {
  id: string; won: boolean; xpEarned: number; coinsEarned: number;
  deflections: number; goalsAgainst: number; position: number; timestamp: number;
  matchType?: 'ranked' | 'casual';
  levelBefore?: number; levelAfter?: number;
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Player', xp: 0, level: 1, rank: 'Iron', coins: 200,
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
  claimSeasonTier: (tierIdx: number) => Promise<void>;
  completeTutorial: () => Promise<void>;
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
    await save({
      ...profile,
      xp: newXP, level: xpToLevel(newXP), rank: getRankFromXP(newXP),
      coins: profile.coins + result.coinsEarned,
      wins:  result.won ? profile.wins + 1 : profile.wins,
      losses: !result.won ? profile.losses + 1 : profile.losses,
      totalGames: profile.totalGames + 1,
      totalDeflections: profile.totalDeflections + result.deflections,
      winStreak: newWinStreak, bestStreak: Math.max(profile.bestStreak, newWinStreak),
      matchHistory: [match, ...profile.matchHistory].slice(0, 50),
      competitiveLevel: newCompLevel,
      highestLevel: Math.max(profile.highestLevel, newCompLevel),
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
    if (getRankIndex(profile.rank) < relic.unlockRankIndex) return; // not yet unlocked
    await save({ ...profile, currentRelic: relicId });
  }, [profile, save]);

  const upgradeRelic = useCallback(async (relicId: string): Promise<boolean> => {
    const relic = RELICS.find(r => r.id === relicId);
    if (!relic || getRankIndex(profile.rank) < relic.unlockRankIndex) return false;
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

  const claimSeasonTier = useCallback(async (tierIdx: number) => {
    if (profile.seasonPassClaimed.includes(tierIdx)) return;
    const tier = SEASON_TIERS[tierIdx];
    if (!tier) return;
    let updated = { ...profile, seasonPassClaimed: [...profile.seasonPassClaimed, tierIdx] };
    if (tier.coinReward > 0) updated = { ...updated, coins: updated.coins + tier.coinReward };
    await save(updated);
  }, [profile, save]);

  const logout = useCallback(async () => {
    await logoutAccount();
    onLogout();
  }, [onLogout]);

  const completeTutorial = useCallback(async () => {
    await save({ ...profile, tutorialComplete: true });
  }, [profile, save]);

  const dismissStreakModal = useCallback(() => setShowStreakModal(false), []);

  return (
    <PlayerContext.Provider value={{
      profile, isLoaded, currentUsername: username, showStreakModal, dismissStreakModal,
      updateName, addMatchResult, unlockAchievement, purchaseSkin, equipSkin, equipTheme, equipRelic, upgradeRelic,
      addCoins, spendCoins, setAvatar, claimDailyStreak, claimSeasonTier, completeTutorial, logout,
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
