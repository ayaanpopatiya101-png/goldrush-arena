import type { GameVariant } from './gameSession';

// ─── Variant pool & metadata ──────────────────────────────────────────────────
const GAUNTLET_VARIANT_POOL: GameVariant[] = [
  'blitz', 'chaos', 'turbo', 'sudden_death', 'survival', 'pinball', 'classic',
];

export const GAUNTLET_VARIANT_META: Record<string, {
  emoji: string; name: string; sub: string; color: string;
}> = {
  blitz:        { emoji: '⚡', name: 'BLITZ',        sub: '1 Life · Lightning Fast',   color: '#C8820A' },
  chaos:        { emoji: '🌪️', name: 'CHAOS',        sub: '5 Balls · No Power-ups',    color: '#FF6B35' },
  turbo:        { emoji: '🚀', name: 'TURBO',        sub: '1.8× Speed from Second 1',  color: '#BF5FFF' },
  sudden_death: { emoji: '💀', name: 'SUDDEN DEATH', sub: '1 Life · 3 Balls Active',   color: '#FF4757' },
  survival:     { emoji: '🛡️', name: 'SURVIVAL',     sub: '12 Lives · Outlast All',    color: '#00FF88' },
  pinball:      { emoji: '🎰', name: 'PINBALL',      sub: 'Ball Every 3s · Up to 8',   color: '#FF69B4' },
  classic:      { emoji: '🏆', name: 'CLASSIC',      sub: 'Standard 4-Player Rules',   color: '#C8820A' },
};

export const GAUNTLET_TARGET_WINS = 5;

// ─── Bot roster ───────────────────────────────────────────────────────────────
const BOT_POOL = [
  { name: 'Blaze_99',   color: '#FF4757' },
  { name: 'IceQueen',   color: '#00BFFF' },
  { name: 'Venom_X',    color: '#00FF88' },
  { name: 'ShadowFX',   color: '#9B59B6' },
  { name: 'NeonBlitz',  color: '#FF6B35' },
  { name: 'DarkMatter', color: '#C0C0C0' },
  { name: 'PulseWave',  color: '#FF00FF' },
  { name: 'GhostPing',  color: '#CD7F32' },
];

export interface GauntletBot { name: string; color: string; }

export interface GauntletState {
  active: boolean;
  roundNumber: number;
  playerWins: number;
  botWins: [number, number, number];
  bots: [GauntletBot, GauntletBot, GauntletBot];
  variantOrder: GameVariant[];
  totalXP: number;
  totalCoins: number;
  lastRoundWon: boolean | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Module-level store (same pattern as gameSession.ts) ──────────────────────
let _state: GauntletState = {
  active: false,
  roundNumber: 1,
  playerWins: 0,
  botWins: [0, 0, 0],
  bots: [BOT_POOL[0], BOT_POOL[1], BOT_POOL[2]] as [GauntletBot, GauntletBot, GauntletBot],
  variantOrder: [...GAUNTLET_VARIANT_POOL],
  totalXP: 0,
  totalCoins: 0,
  lastRoundWon: null,
};

/** Initialise a fresh gauntlet. Returns the first round's variant. */
export function startGauntlet(): GameVariant {
  const shuffledBots    = shuffle(BOT_POOL);
  const variantOrder    = shuffle([...GAUNTLET_VARIANT_POOL]);
  _state = {
    active: true,
    roundNumber: 1,
    playerWins: 0,
    botWins: [0, 0, 0],
    bots: [shuffledBots[0], shuffledBots[1], shuffledBots[2]] as [GauntletBot, GauntletBot, GauntletBot],
    variantOrder,
    totalXP: 0,
    totalCoins: 0,
    lastRoundWon: null,
  };
  return variantOrder[0];
}

/** The variant for the current round (uses current roundNumber). */
export function getCurrentRoundVariant(): GameVariant {
  const idx = (_state.roundNumber - 1) % _state.variantOrder.length;
  return _state.variantOrder[idx];
}

/**
 * Called from handleGameOver after each game round.
 * Updates win counts, increments roundNumber, and returns gauntlet status.
 */
export function recordRoundResult(
  won: boolean, xp: number, coins: number,
): { gauntletWon: boolean; gauntletOver: boolean } {
  if (won) {
    _state.playerWins += 1;
  } else {
    const botIdx = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    _state.botWins[botIdx] += 1;
  }
  _state.totalXP    += xp;
  _state.totalCoins += coins;
  _state.lastRoundWon = won;
  _state.roundNumber  += 1;

  const gauntletWon = _state.playerWins >= GAUNTLET_TARGET_WINS;
  const anyBotWon   = _state.botWins.some(w => w >= GAUNTLET_TARGET_WINS);
  const gauntletOver = gauntletWon || anyBotWon;
  if (gauntletOver) _state.active = false;

  return { gauntletWon, gauntletOver };
}

export function getGauntletState(): GauntletState {
  return {
    ..._state,
    botWins: [..._state.botWins] as [number, number, number],
    bots: [..._state.bots] as [GauntletBot, GauntletBot, GauntletBot],
    variantOrder: [..._state.variantOrder],
  };
}
