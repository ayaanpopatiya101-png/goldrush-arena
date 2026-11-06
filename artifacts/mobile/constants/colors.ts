// GoldRush Arena: flat graphite scoreboard palette.
// Graphite surfaces, off-white text, restrained ochre action color.
// Seat colors are muted, distinguishable sports-kit tones (no neon, no rainbow).

const PLAYER_COLORS = ['#C99A2E', '#B4533A', '#8C8F7A', '#6F8A5B'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

export const palette = {
  ink: '#16171A',        // page background
  graphite: '#1F2125',   // panel
  graphite2: '#2A2C31',  // raised panel / input
  line: '#3A3D44',       // borders
  lineStrong: '#555963',
  paper: '#ECE7DC',      // off-white text
  paperDim: '#B7B2A6',
  muted: '#8A867D',
  ochre: '#C99A2E',      // action
  ochreDeep: '#9E7620',
  ochreInk: '#1A1508',   // text on ochre
  clay: '#B4533A',       // danger / loss
  moss: '#6F8A5B',       // success / owned
} as const;

const gameTheme = {
  text: palette.paper,
  tint: palette.ochre,
  background: palette.ink,
  foreground: palette.paper,
  card: palette.graphite,
  cardForeground: palette.paper,
  primary: palette.ochre,
  primaryForeground: palette.ochreInk,
  secondary: palette.graphite2,
  secondaryForeground: palette.paper,
  muted: palette.graphite2,
  mutedForeground: palette.muted,
  accent: palette.moss,
  accentForeground: palette.ink,
  destructive: palette.clay,
  destructiveForeground: palette.paper,
  border: palette.line,
  input: palette.graphite2,
  playerColors: PLAYER_COLORS,
  playerGlow: PLAYER_GLOW,
};

const colors = {
  light: gameTheme,
  dark: gameTheme,
  radius: 3,
};

export default colors;
export { PLAYER_COLORS, PLAYER_GLOW };
