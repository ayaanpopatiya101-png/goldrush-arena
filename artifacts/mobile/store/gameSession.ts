export type MatchType   = 'ranked' | 'casual';
export type GameVariant =
  | 'classic'
  | 'duos'
  | 'blitz'
  | 'chaos'
  | 'survival'
  | 'sudden_death'
  | 'turbo'
  | 'pinball';

export interface GameSessionConfig {
  playerName:      string;
  playerSkinId:    string;
  playerColor:     string;
  playerGlowColor: string;
  matchType:       MatchType;
  variant:         GameVariant;
}

let _config: GameSessionConfig = {
  playerName:      'Player',
  playerSkinId:    'default',
  playerColor:     '#FFD700',
  playerGlowColor: '#FFD70055',
  matchType:       'ranked',
  variant:         'classic',
};

export function setGameConfig(config: GameSessionConfig) {
  _config = { ...config };
}

export function getGameConfig(): GameSessionConfig {
  return _config;
}
