export interface StoreReward {
  rewardType: 'coins' | 'skins' | 'season_pass' | 'battle_pass' | 'extra_lives';
  rewardAmount?: number;
  rewardSkins?: string[];
  label: string;
}
const entries: Record<string, StoreReward> = {
  starter_sack: { rewardType: 'coins', rewardAmount: 1000, label: '1,000 device coins' },
  gold_pouch: { rewardType: 'coins', rewardAmount: 5000, label: '5,000 device coins' },
  treasure_chest: { rewardType: 'coins', rewardAmount: 15000, label: '15,000 device coins' },
  dragon_vault: { rewardType: 'coins', rewardAmount: 50000, label: '50,000 device coins' },
  inferno_pack: { rewardType: 'skins', rewardSkins: ['inferno'], label: 'Inferno paddle skin' },
  void_striker_pack: { rewardType: 'skins', rewardSkins: ['void'], label: 'Void paddle skin' },
  elite_bundle: { rewardType: 'skins', rewardSkins: ['chrome', 'cosmic'], label: 'Chrome + Cosmic paddle skins' },
  // Preserve historical receipts, including products no longer offered for sale.
  season_pass: { rewardType: 'season_pass', label: 'Legacy supporter ownership' },
  battle_pass_premium_s1: { rewardType: 'battle_pass', label: 'Season 1 premium pass' },
  extra_life_1: { rewardType: 'extra_lives', rewardAmount: 1, label: '1 extra life' },
  extra_lives_3: { rewardType: 'extra_lives', rewardAmount: 3, label: '3 extra lives' },
};
export function nativeReward(productId: string): StoreReward | undefined {
  const prefix = 'com.goldrush.arena.';
  return productId.startsWith(prefix) ? entries[productId.slice(prefix.length)] : undefined;
}
const standardIds: Record<string, string> = {
  'Starter Sack': 'starter_sack', 'Gold Pouch': 'gold_pouch', 'Treasure Chest': 'treasure_chest',
  'Dragon Vault': 'dragon_vault', 'Inferno Pack': 'inferno_pack', 'Void Striker Pack': 'void_striker_pack',
  'Elite Bundle': 'elite_bundle', 'GoldRush Battle Pass Premium': 'battle_pass_premium_s1',
  '1 Extra Life': 'extra_life_1', '3 Extra Lives': 'extra_lives_3',
};
/** Standard cards have fixed included rewards; hide rather than misrepresent a remapped product. */
export function standardProductMatches(name: string, metadata: Record<string, string>) {
  const expected = entries[standardIds[name] ?? ''];
  if (!expected) return false;
  try {
    const actual = rewardFromMetadata(metadata);
    return actual.rewardType === expected.rewardType && actual.rewardAmount === expected.rewardAmount
      && [...(actual.rewardSkins ?? [])].sort().join(',') === [...(expected.rewardSkins ?? [])].sort().join(',');
  } catch { return false; }
}
export function rewardFromMetadata(meta: Record<string, string>): StoreReward {
  const type = meta.reward_type;
  const reward: StoreReward = { rewardType: type as StoreReward['rewardType'], label: meta.reward_label || 'Purchase reward' };
  if (type === 'coins' || type === 'extra_lives') {
    const amount = Number(meta.reward_amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000) throw new Error('Invalid reward quantity.');
    reward.rewardAmount = amount;
  } else if (type === 'skins') {
    const skins = meta.reward_skins?.split(',');
    if (!skins?.length || skins.some(s => !['void', 'inferno', 'chrome', 'cosmic'].includes(s))) throw new Error('Invalid included skins.');
    reward.rewardSkins = [...new Set(skins)];
  } else if (!['season_pass', 'battle_pass'].includes(type)) throw new Error('Product has no supported reward.');
  return reward;
}
