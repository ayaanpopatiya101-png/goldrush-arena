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
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  setAvatar: (emoji: string, color: string) => Promise<void>;
  claimDailyStreak: () => Promise<number>;
  claimSeasonTier: (tierIdx: number) => Promise<void>;
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

  const dismissStreakModal = useCallback(() => setShowStreakModal(false), []);

  return (
    <PlayerContext.Provider value={{
      profile, isLoaded, currentUsername: username, showStreakModal, dismissStreakModal,
      updateName, addMatchResult, unlockAchievement, purchaseSkin, equipSkin, equipTheme,
      addCoins, spendCoins, setAvatar, claimDailyStreak, claimSeasonTier, logout,
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
