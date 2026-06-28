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
  | 'six_player';

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
