// GoldRush Arena: stadium-pitch palette.
// Deep pitch-green surfaces, ivory scoreboard text, trophy-gold action.
// Seat colors read like arcade cabinet buttons: gold, signal red, ivory, lime.

const PLAYER_COLORS = ['#F0B429', '#E04A2F', '#EDE3CC', '#9CC93E'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

export const palette = {
  ink: '#0E2621',        // page background
  graphite: '#15372F',   // panel
  graphite2: '#1E4A3F',  // raised panel / input
  line: '#2F6456',       // borders
  lineStrong: '#4A8574',
  paper: '#F3EAD3',      // off-white text
  paperDim: '#CFE0D6',
  muted: '#93B8AB',
  ochre: '#F0B429',      // action
  ochreDeep: '#C98E12',
  ochreInk: '#1C1402',   // text on ochre
  clay: '#E04A2F',       // danger / loss
  moss: '#9CC93E',       // success / owned
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
