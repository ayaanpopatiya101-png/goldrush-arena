export type MatchType = 'ranked' | 'casual';

export interface GameSessionConfig {
  playerName:      string;
  playerSkinId:    string;
  playerColor:     string;
  playerGlowColor: string;
  matchType:       MatchType;
}

let _config: GameSessionConfig = {
  playerName:      'Player',
  playerSkinId:    'default',
  playerColor:     '#FFD700',
  playerGlowColor: '#FFD70055',
  matchType:       'ranked',
};

export function setGameConfig(config: GameSessionConfig) {
  _config = { ...config };
}

export function getGameConfig(): GameSessionConfig {
  return _config;
}
