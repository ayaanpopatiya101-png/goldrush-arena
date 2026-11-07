// GoldRush Arena: stadium-pitch palette.
// Deep pitch-green surfaces, ivory scoreboard text, trophy-gold action.
// Seat colors read like arcade cabinet buttons: gold, signal red, ivory, lime.

const PLAYER_COLORS = ['#F0B429', '#E04A2F', '#EDE3CC', '#9CC93E'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

export const palette = {
  ink: '#14231F',        // page background
  graphite: '#20372F',   // panel
  graphite2: '#294239',  // raised panel / input
  line: '#3B5A4E',       // borders
  lineStrong: '#5C7D70',
  paper: '#EEE7D7',      // off-white text
  paperDim: '#C9D2C6',
  muted: '#B8C3B6',
  ochre: '#D7A83B',      // action
  ochreDeep: '#B88B26',
  ochreInk: '#18221C',   // text on ochre
  clay: '#CE7863',       // danger / loss
  moss: '#9BB77A',       // success / owned
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
