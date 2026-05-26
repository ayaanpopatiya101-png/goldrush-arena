export interface GameSessionConfig {
  playerName: string;
  playerSkinId: string;
  playerColor: string;
  playerGlowColor: string;
}

let _config: GameSessionConfig = {
  playerName: 'Player',
  playerSkinId: 'default',
  playerColor: '#FFD700',
  playerGlowColor: '#FFD70055',
};

export function setGameConfig(config: GameSessionConfig) {
  _config = { ...config };
}

export function getGameConfig(): GameSessionConfig {
  return _config;
}
