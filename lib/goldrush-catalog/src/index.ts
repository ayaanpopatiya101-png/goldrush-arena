/** Pure catalog boundary extracted from the existing native shop and player rules.
 * Native files remain untouched. Source parity is covered by catalog.test.ts.
 * Money prices intentionally come only from a configured provider, never fallbacks.
 */
export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: 'skins' | 'themes' | 'powerups' | 'extras' | 'store';
  kind: 'skin' | 'theme' | 'trail' | 'bundle' | 'money';
  color: string;
  price: number | null;
  available: boolean;
  restriction?: string;
}

export const SKINS = [
  { id: 'default', name: 'Classic', color: '#C99A2E', price: 0 },
  { id: 'plasma', name: 'Plasma', color: '#B4533A', price: 150 },
  { id: 'frost', name: 'Frost', color: '#B7BFBE', price: 150 },
  { id: 'toxic', name: 'Toxic', color: '#7F9065', price: 200 },
  { id: 'void', name: 'Void', color: '#77746D', price: 250 },
  { id: 'inferno', name: 'Inferno', color: '#C27E49', price: 300 },
  { id: 'chrome', name: 'Chrome', color: '#D4D0C6', price: 350 },
  { id: 'cosmic', name: 'Cosmic', color: '#A99572', price: 500 },
  { id: 'season_aurora', name: 'Aurora', color: '#B1BA91', price: 0, exclusive: true },
  { id: 'season_phantom', name: 'Phantom', color: '#9D998F', price: 0, exclusive: true },
];
export const PAYMENT_UNAVAILABLE = 'Checkout unavailable: this browser profile has no verified link to a game player or safe entitlement delivery. Use the existing game store. No charge is started here.';
const unfinished = 'Unavailable in this build. Saved ownership is preserved; purchasing and equipping are disabled.';
const themes: Array<[string, string, string, number, string]> = [
  ['default', 'Dark Void', 'Classic deep-space arena', 0, '#EDE3CC'],
  ['solar', 'Solar Flare', 'Scorching red-orange arena', 300, '#CE7863'],
  ['arctic', 'Arctic Ice', 'Cool blue frost arena', 300, '#EDE3CC'],
  ['toxic', 'Toxic Wasteland', 'Neon green hazard zone', 350, '#9BB77A'],
  ['cosmic', 'Cosmic Dream', 'Purple nebula atmosphere', 400, '#EDE3CC'],
  ['golden', 'Gold Rush', 'Prestige golden arena', 500, '#D7A83B'],
];
const money: Array<[string, string, string, 'extras' | 'store']> = [
  ['starter_sack', 'Starter Sack', '1,000 coins', 'store'],
  ['gold_pouch', 'Gold Pouch', '5,000 coins', 'store'],
  ['treasure_chest', 'Treasure Chest', '15,000 coins', 'store'],
  ['dragon_vault', 'Dragon Vault', '50,000 coins', 'store'],
  ['void_striker_pack', 'Void Striker Pack', 'Void paddle skin', 'store'],
  ['inferno_pack', 'Inferno Pack', 'Inferno paddle skin', 'store'],
  ['elite_bundle', 'Elite Bundle', 'Chrome and Cosmic skins', 'store'],
  ['season_pass', 'GoldRush Season Pass', 'Legacy ownership record only. Does not unlock Battle Pass rewards.', 'store'],
  ['battle_pass_premium_s1', 'GoldRush Battle Pass Premium', 'Season 1 premium reward track. Rewards require reaching each tier in the game.', 'store'],
  ['extra_life_1', '1 Extra Life', 'Adds one life to the game lives bank, subject to match caps.', 'extras'],
  ['extra_lives_3', '3 Extra Lives', 'Adds three lives to the game lives bank, subject to match caps.', 'extras'],
];
export const CATALOG: CatalogItem[] = [
  ...SKINS.map(s => ({
    ...s, kind: 'skin' as const, category: 'skins' as const,
    description: `${s.name} paddle finish. Cosmetic only; no change to speed, reach or match rewards.`,
    available: !('exclusive' in s && s.exclusive),
    ...('exclusive' in s && s.exclusive ? { restriction: 'Earn this skin from its Premium Battle Pass tier in the game. It cannot be bought with coins.' } : {}),
  })),
  ...themes.map(([id, name, description, price, color]) => ({
    id, name, description, price, color, kind: 'theme' as const,
    category: 'themes' as const, available: false, restriction: unfinished,
  })),
  ...([
    ['shield3', 'Shield Pack', '3x Shield Power-ups', 80],
    ['speed3', 'Speed Pack', '3x Speed Boosts', 80],
    ['mixed5', 'Mixed Bundle', '5x Random Power-ups', 100],
  ] as const).map(([id, name, description, price]) => ({
    id, name, description, price, color: '#D7A83B', kind: 'bundle' as const,
    category: 'powerups' as const, available: false, restriction: unfinished,
  })),
  ...([
    ['trail_fire', 'Fire Trail', 'Balls leave fire trails', 200, '#CE7863'],
    ['trail_ice', 'Ice Trail', 'Balls leave ice trails', 200, '#EDE3CC'],
    ['trail_neon', 'Neon Trail', 'Rainbow neon trails', 300, '#EDE3CC'],
  ] as const).map(([id, name, description, price, color]) => ({
    id, name, description, price, color, kind: 'trail' as const,
    category: 'skins' as const, available: false, restriction: 'Coming soon. Ball trails cannot be purchased or equipped.',
  })),
  ...money.map(([id, name, description, category]) => ({
    id, name, description, category, kind: 'money' as const,
    price: null, color: '#D7A83B', available: false,
    restriction: id === 'season_pass' ? `Legacy Season Pass is disabled. Existing ownership remains intact. ${PAYMENT_UNAVAILABLE}` : PAYMENT_UNAVAILABLE,
  })),
];

export function skinPurchaseError(profile: { coins: number; ownedSkins: string[] }, itemId: string): string | null {
  const skin = SKINS.find(s => s.id === itemId);
  if (!skin) return 'This product cannot be purchased with coins.';
  if ('exclusive' in skin && skin.exclusive) return 'Locked to a Premium Battle Pass tier.';
  if (profile.ownedSkins.includes(itemId)) return 'Already owned. No coins were spent.';
  if (profile.coins < skin.price) return `Insufficient funds. You need ${skin.price - profile.coins} more coins.`;
  return null;
}
