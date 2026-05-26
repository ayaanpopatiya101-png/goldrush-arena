const PLAYER_COLORS = ['#FFD700', '#FF4757', '#00BFFF', '#00FF88'] as const;
const PLAYER_GLOW = ['#FFD70066', '#FF475766', '#00BFFF66', '#00FF8866'] as const;

const gameTheme = {
  text: '#F0F0FF',
  tint: '#FFD700',
  background: '#080812',
  foreground: '#F0F0FF',
  card: '#0E0E20',
  cardForeground: '#F0F0FF',
  primary: '#FFD700',
  primaryForeground: '#080812',
  secondary: '#181830',
  secondaryForeground: '#F0F0FF',
  muted: '#1C1C38',
  mutedForeground: '#8888BB',
  accent: '#00E5FF',
  accentForeground: '#080812',
  destructive: '#FF4757',
  destructiveForeground: '#FFFFFF',
  border: '#252545',
  input: '#181830',
  playerColors: PLAYER_COLORS,
  playerGlow: PLAYER_GLOW,
};

const colors = {
  light: gameTheme,
  dark: gameTheme,
  radius: 12,
};

export default colors;
export { PLAYER_COLORS, PLAYER_GLOW };
