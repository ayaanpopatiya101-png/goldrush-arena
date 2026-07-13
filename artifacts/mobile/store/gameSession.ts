export type MatchType   = 'ranked' | 'casual' | 'gauntlet';
export type GameVariant =
  | 'classic'
  | 'duos'
  | 'blitz'
  | 'chaos'
  | 'survival'
  | 'sudden_death'
  | 'turbo'
  | 'pinball'
  | 'six_player'
  | 'storm_surge'
  | 'ghost_protocol'
  | 'warlord';

export interface GameSessionConfig {
  playerName:      string;
  playerSkinId:    string;
  playerColor:     string;
  playerGlowColor: string;
  matchType:       MatchType;
  variant:         GameVariant;
  /** Equipped relic id (rank-unlocked battle artifact). 'none' = no relic. */
  playerRelicId?:  string;
  /** Selected arena map id (chosen in the lobby). */
  mapId?:          string;
  /** Opponent names for the match — set by matchmaking (real or bot). */
  opponentNames?:  string[];
  /** Opponent ranks for the match — used to scale bot difficulty. */
  opponentRanks?:  string[];
}

let _config: GameSessionConfig = {
  playerName:      'Player',
  playerSkinId:    'default',
  playerColor:     '#FFD700',
  playerGlowColor: '#FFD70055',
  matchType:       'ranked',
  variant:         'classic',
  playerRelicId:   'none',
  mapId:           'dustbowl',
};

export function setGameConfig(config: GameSessionConfig) {
  _config = { ...config };
}

/** Merge a partial update into the current config without clobbering other fields. */
export function updateGameConfig(partial: Partial<GameSessionConfig>) {
  _config = { ..._config, ...partial };
}

export function getGameConfig(): GameSessionConfig {
  return _config;
}

// ─── Active Event Bonus ────────────────────────────────────────────────────────
export interface ActiveEventBonus {
  eventId: string;
  eventName: string;
  eventEmoji: string;
  eventColor: string;
  winXP: number;
  winCoins: number;
  loseXP: number;
  loseCoins: number;
  winCredits: number;
  loseCredits: number;
}

let _activeEvent: ActiveEventBonus | null = null;
export function setActiveEvent(e: ActiveEventBonus | null): void { _activeEvent = e; }
export function getActiveEvent(): ActiveEventBonus | null { return _activeEvent; }
export function clearActiveEvent(): void { _activeEvent = null; }

// ─── Qualifier Context ─────────────────────────────────────────────────────────
// Set before a qualifier match starts; read + cleared by the postgame screen.
export interface QualifierContext {
  periodKey:   string;
  roundIdx:    number;
  roundName:   string;
  totalRounds: number;
  threshold:   number;
  qpPerPlace:  [number, number, number, number];
  eventName:   string;
  eventEmoji:  string;
  eventColor:  string;
}

let _qualCtx: QualifierContext | null = null;
export function setQualifierContext(c: QualifierContext): void { _qualCtx = c; }
export function getQualifierContext(): QualifierContext | null { return _qualCtx; }
export function clearQualifierContext(): void { _qualCtx = null; }
