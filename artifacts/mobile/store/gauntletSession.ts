import type { GameVariant } from './gameSession';

// ─── Variant pool & metadata ──────────────────────────────────────────────────
const GAUNTLET_VARIANT_POOL: GameVariant[] = [
  'blitz', 'chaos', 'turbo', 'sudden_death', 'survival', 'pinball', 'classic',
];

export const GAUNTLET_VARIANT_META: Record<string, {
  emoji: string; name: string; sub: string; color: string;
}> = {
  blitz:        { emoji: '⚡', name: 'BLITZ',        sub: '1 Life · Lightning Fast',   color: '#BB7865' },
  chaos:        { emoji: '🌪️', name: 'CHAOS',        sub: '5 Balls · No Power-ups',    color: '#BB7865' },
  turbo:        { emoji: '🚀', name: 'TURBO',        sub: '1.8× Speed from Second 1',  color: '#A6AEA7' },
  sudden_death: { emoji: '💀', name: 'SUDDEN DEATH', sub: '1 Life · 3 Balls Active',   color: '#BB7865' },
  survival:     { emoji: '🛡️', name: 'SURVIVAL',     sub: '12 Lives · Outlast All',    color: '#98A581' },
  pinball:      { emoji: '🎰', name: 'PINBALL',      sub: 'Ball Every 3s · Up to 8',   color: '#BB7865' },
  classic:      { emoji: '🏆', name: 'CLASSIC',      sub: 'Standard 4-Player Rules',   color: '#BB7865' },
};

export const GAUNTLET_TARGET_WINS = 5;

// ─── Bot roster ───────────────────────────────────────────────────────────────
const BOT_POOL = [
  { name: 'Blaze_99',   color: '#BB7865' },
  { name: 'IceQueen',   color: '#A6AEA7' },
  { name: 'Venom_X',    color: '#98A581' },
  { name: 'ShadowFX',   color: '#A6AEA7' },
  { name: 'NeonBlitz',  color: '#BB7865' },
  { name: 'DarkMatter', color: '#B9BDAF' },
  { name: 'PulseWave',  color: '#A6AEA7' },
  { name: 'GhostPing',  color: '#BB7865' },
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
