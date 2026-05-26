import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const RANKS = [
  { name: 'Iron', minXP: 0, color: '#8B8B8B' },
  { name: 'Bronze', minXP: 500, color: '#CD7F32' },
  { name: 'Silver', minXP: 1500, color: '#C0C0C0' },
  { name: 'Gold', minXP: 3000, color: '#FFD700' },
  { name: 'Platinum', minXP: 6000, color: '#00E5FF' },
  { name: 'Diamond', minXP: 10000, color: '#B9F2FF' },
  { name: 'Master', minXP: 20000, color: '#FF4757' },
  { name: 'Legend', minXP: 40000, color: '#FFD700' },
];

export const SKINS = [
  { id: 'default', name: 'Classic', color: '#FFD700', glowColor: '#FFD70055', price: 0 },
  { id: 'plasma', name: 'Plasma', color: '#FF4757', glowColor: '#FF475755', price: 150 },
  { id: 'frost', name: 'Frost', color: '#00BFFF', glowColor: '#00BFFF55', price: 150 },
  { id: 'toxic', name: 'Toxic', color: '#00FF88', glowColor: '#00FF8855', price: 200 },
  { id: 'void', name: 'Void', color: '#9B59B6', glowColor: '#9B59B655', price: 250 },
  { id: 'inferno', name: 'Inferno', color: '#FF6B35', glowColor: '#FF6B3555', price: 300 },
  { id: 'chrome', name: 'Chrome', color: '#E0E0E8', glowColor: '#E0E0E855', price: 350 },
  { id: 'cosmic', name: 'Cosmic', color: '#FF00FF', glowColor: '#FF00FF55', price: 500 },
];

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Blood', desc: 'Win your first match' },
  { id: 'hat_trick', name: 'Hat Trick', desc: 'Deflect 10 balls in one match' },
  { id: 'survivor', name: 'Last Stand', desc: 'Win with 1 life remaining' },
  { id: 'streak3', name: 'On Fire', desc: 'Win 3 matches in a row' },
  { id: 'streak5', name: 'Unstoppable', desc: 'Win 5 matches in a row' },
  { id: 'level10', name: 'Veteran', desc: 'Reach level 10' },
  { id: 'level25', name: 'Elite', desc: 'Reach level 25' },
  { id: 'collector', name: 'Collector', desc: 'Own 3 skins' },
  { id: 'gold_rank', name: 'Gold Standard', desc: 'Reach Gold rank' },
  { id: 'century', name: 'Centurion', desc: 'Play 100 matches' },
  { id: 'deflect100', name: 'The Wall', desc: 'Deflect 100 balls total' },
  { id: 'powerup10', name: 'Power Hungry', desc: 'Collect 10 power-ups' },
];

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
}

export interface MatchResult {
  id: string;
  won: boolean;
  xpEarned: number;
  coinsEarned: number;
  deflections: number;
  goalsAgainst: number;
  position: number;
  timestamp: number;
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Player',
  xp: 0,
  level: 1,
  rank: 'Iron',
  coins: 200,
  wins: 0,
  losses: 0,
  totalGames: 0,
  totalDeflections: 0,
  totalPowerups: 0,
  ownedSkins: ['default'],
  currentSkin: 'default',
  achievements: [],
  winStreak: 0,
  bestStreak: 0,
  matchHistory: [],
};

export function xpToLevel(xp: number): number {
  return Math.floor(Math.pow(xp / 80, 0.72)) + 1;
}

export function getRankFromXP(xp: number): string {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXP) rank = r;
  }
  return rank.name;
}

export function xpForNextRank(xp: number): { current: string; next: string | null; progress: number; remaining: number } {
  let currentRank = RANKS[0];
  let nextRank = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXP) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] ?? null;
    }
  }
  if (!nextRank) return { current: currentRank.name, next: null, progress: 1, remaining: 0 };
  const progress = (xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP);
  return {
    current: currentRank.name,
    next: nextRank.name,
    progress,
    remaining: nextRank.minXP - xp,
  };
}

interface PlayerContextType {
  profile: PlayerProfile;
  isLoaded: boolean;
  updateName: (name: string) => Promise<void>;
  addMatchResult: (result: Omit<MatchResult, 'id' | 'timestamp'>) => Promise<void>;
  unlockAchievement: (id: string) => Promise<string | null>;
  purchaseSkin: (skinId: string) => Promise<boolean>;
  equipSkin: (skinId: string) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);
const STORAGE_KEY = '@goldrush_v3';

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<PlayerProfile>;
          setProfile({ ...DEFAULT_PROFILE, ...saved });
        } catch {
          setProfile(DEFAULT_PROFILE);
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const save = useCallback(async (updated: PlayerProfile) => {
    setProfile(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const updateName = useCallback(async (name: string) => {
    await save({ ...profile, name: name.trim() || 'Player' });
  }, [profile, save]);

  const addMatchResult = useCallback(async (result: Omit<MatchResult, 'id' | 'timestamp'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const match: MatchResult = { ...result, id, timestamp: Date.now() };
    const newXP = profile.xp + result.xpEarned;
    const newWinStreak = result.won ? profile.winStreak + 1 : 0;
    const newAchievements = [...profile.achievements];

    const updated: PlayerProfile = {
      ...profile,
      xp: newXP,
      level: xpToLevel(newXP),
      rank: getRankFromXP(newXP),
      coins: profile.coins + result.coinsEarned,
      wins: result.won ? profile.wins + 1 : profile.wins,
      losses: !result.won ? profile.losses + 1 : profile.losses,
      totalGames: profile.totalGames + 1,
      totalDeflections: profile.totalDeflections + result.deflections,
      winStreak: newWinStreak,
      bestStreak: Math.max(profile.bestStreak, newWinStreak),
      achievements: newAchievements,
      matchHistory: [match, ...profile.matchHistory].slice(0, 50),
    };
    await save(updated);
  }, [profile, save]);

  const unlockAchievement = useCallback(async (id: string): Promise<string | null> => {
    if (profile.achievements.includes(id)) return null;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return null;
    const updated = { ...profile, achievements: [...profile.achievements, id] };
    await save(updated);
    return ach.name;
  }, [profile, save]);

  const purchaseSkin = useCallback(async (skinId: string): Promise<boolean> => {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || profile.ownedSkins.includes(skinId)) return false;
    if (profile.coins < skin.price) return false;
    const updated = {
      ...profile,
      coins: profile.coins - skin.price,
      ownedSkins: [...profile.ownedSkins, skinId],
    };
    await save(updated);
    return true;
  }, [profile, save]);

  const equipSkin = useCallback(async (skinId: string) => {
    if (!profile.ownedSkins.includes(skinId)) return;
    await save({ ...profile, currentSkin: skinId });
  }, [profile, save]);

  const addCoins = useCallback(async (amount: number) => {
    await save({ ...profile, coins: profile.coins + amount });
  }, [profile, save]);

  const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (profile.coins < amount) return false;
    await save({ ...profile, coins: profile.coins - amount });
    return true;
  }, [profile, save]);

  return (
    <PlayerContext.Provider value={{
      profile, isLoaded, updateName, addMatchResult,
      unlockAchievement, purchaseSkin, equipSkin, addCoins, spendCoins,
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
