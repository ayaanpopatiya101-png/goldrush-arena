// Presentational catalogs and XP helpers copied from context/PlayerContext.tsx.
// The provider, API, storage, authentication and analytics are NOT imported.
import { rankIndexForName } from './rankIndex';
import { useSampleState } from './state';

export const RANKS = [
  { name: 'Bronze 1', minXP: 0, color: '#CD7F32' },
  { name: 'Bronze 2', minXP: 500, color: '#D4904A' },
  { name: 'Bronze 3', minXP: 1_200, color: '#DBA060' },
  { name: 'Silver 1', minXP: 2_200, color: '#A8A9B4' },
  { name: 'Silver 2', minXP: 3_600, color: '#B8C0CC' },
  { name: 'Silver 3', minXP: 5_400, color: '#C8D0DC' },
  { name: 'Gold 1', minXP: 8_000, color: '#C99A2E' },
  { name: 'Gold 2', minXP: 11_500, color: '#C99A2E' },
  { name: 'Gold 3', minXP: 16_000, color: '#C99A2E' },
  { name: 'Diamond 1', minXP: 22_000, color: '#B8B8AD' },
  { name: 'Diamond 2', minXP: 31_000, color: '#B8B8AD' },
  { name: 'Diamond 3', minXP: 43_000, color: '#B8B8AD' },
  { name: 'Master 1', minXP: 58_000, color: '#A99D81' },
  { name: 'Master 2', minXP: 78_000, color: '#A99D81' },
  { name: 'Master 3', minXP: 105_000, color: '#A99D81' },
  { name: 'Champion 1', minXP: 138_000, color: '#C99A2E' },
  { name: 'Champion 2', minXP: 180_000, color: '#C99A2E' },
  { name: 'Champion 3', minXP: 232_000, color: '#C99A2E' },
  { name: 'Champion 4', minXP: 295_000, color: '#C99A2E' },
  { name: 'Champion 5', minXP: 370_000, color: '#C99A2E' },
];
export const SKINS = [
  { id: 'default', name: 'Classic', color: '#F36B3F', glowColor: '#F36B3F55', price: 0 },
  { id: 'plasma', name: 'Plasma', color: '#B4533A', glowColor: '#B4533A55', price: 150 },
  { id: 'frost', name: 'Frost', color: '#B7BFBE', glowColor: '#B7BFBE55', price: 150 },
  { id: 'toxic', name: 'Toxic', color: '#7F9065', glowColor: '#7F906555', price: 200 },
  { id: 'void', name: 'Void', color: '#77746D', glowColor: '#77746D55', price: 250 },
  { id: 'inferno', name: 'Inferno', color: '#C27E49', glowColor: '#C27E4955', price: 300 },
  { id: 'chrome', name: 'Chrome', color: '#D4D0C6', glowColor: '#D4D0C655', price: 350 },
  { id: 'cosmic', name: 'Cosmic', color: '#A99572', glowColor: '#A9957255', price: 500 },
  { id: 'season_aurora', name: 'Aurora', color: '#B1BA91', glowColor: '#B1BA9155', price: 0, exclusive: true },
  { id: 'season_phantom', name: 'Phantom', color: '#9D998F', glowColor: '#9D998F55', price: 0, exclusive: true },
];
export function getRankIndex(rankName: string): number {
  return rankIndexForName(rankName, RANKS.map(rank => rank.name));
}
export const SUPERS = [
  { id: 1, name: 'RAMPART', icon: '🛡️', desc: 'Goal blocked\n3 seconds', unlockLevel: 5 },
  { id: 2, name: 'DEAD ZONE', icon: '🌀', desc: 'Incoming balls\nmove at crawl speed', unlockLevel: 10 },
  { id: 3, name: 'SHATTER', icon: '💥', desc: 'Ball that scores\nvanishes from play', unlockLevel: 15 },
];
type LuckyBlockTier = 'rare' | 'epic' | 'mythic';
export const SEASON_TIERS = [
  { games: 0, reward: '50 coins', icon: '🪙', name: 'Rookie', coinReward: 50, luckyBlockTier: null as LuckyBlockTier | null },
  { games: 5, reward: '100 coins', icon: '💰', name: 'Contender', coinReward: 100, luckyBlockTier: null as LuckyBlockTier | null },
  { games: 10, reward: 'Rush Crate', icon: '📦', name: 'Fighter', coinReward: 0, luckyBlockTier: 'rare' as LuckyBlockTier | null },
  { games: 20, reward: 'Plasma skin', icon: '🎨', name: 'Warrior', coinReward: 0, luckyBlockTier: null as LuckyBlockTier | null },
  { games: 30, reward: 'Storm Vault', icon: '⚡', name: 'Champion', coinReward: 0, luckyBlockTier: 'epic' as LuckyBlockTier | null },
  { games: 50, reward: 'Frost skin', icon: '❄️', name: 'Legend', coinReward: 0, luckyBlockTier: null as LuckyBlockTier | null },
  { games: 75, reward: 'Shadow Coffer', icon: '🔮', name: 'Myth', coinReward: 0, luckyBlockTier: 'mythic' as LuckyBlockTier | null },
  { games: 100, reward: 'Cosmic skin', icon: '🌟', name: 'Immortal', coinReward: 0, luckyBlockTier: null as LuckyBlockTier | null },
];
export function xpToLevel(xp: number) { return Math.floor(Math.pow(xp / 80, 0.72)) + 1; }
export function xpForNextRank(xp: number) {
  let cur = RANKS[0], nxt = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXP) { cur = RANKS[i]; nxt = RANKS[i + 1] ?? null; }
  }
  if (!nxt) return { current: cur.name, next: null, progress: 1, remaining: 0 };
  return { current: cur.name, next: nxt.name, progress: (xp - cur.minXP) / (nxt.minXP - cur.minXP), remaining: nxt.minXP - xp };
}
export const STREAK_REWARDS = [50, 100, 150, 200, 250, 300, 500];
export function getStreakReward(streak: number) {
  return STREAK_REWARDS[Math.min(streak - 1, STREAK_REWARDS.length - 1)];
}
export function usePlayer() {
  const { profile, setProfile } = useSampleState();
  return {
    profile,
    currentUsername: 'sample-player',
    isLoaded: true,
    showStreakModal: false,
    dismissStreakModal: () => {},
    claimDailyStreak: async () => {},
    claimSeasonTier: (index: number) => setProfile(p => {
      if (p.seasonPassClaimed.includes(index) || p.totalGames < SEASON_TIERS[index].games) return p;
      return { ...p, coins: p.coins + SEASON_TIERS[index].coinReward, seasonPassClaimed: [...p.seasonPassClaimed, index] };
    }),
    setSelectedSuper: (id: number) => setProfile(p => ({ ...p, selectedSuper: id })),
  };
}
