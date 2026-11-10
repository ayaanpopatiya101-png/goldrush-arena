// GoldRush Arena: warm-stone shell, navy court, and hard-edged cabinet accents.
// Surfaces and their foregrounds are deliberately paired by context below.
const PLAYER_COLORS = ['#F36B3F', '#EDBA3C', '#EEE9DE', '#E3DFD3'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

export const palette = {
  stone: '#EEE9DE',
  sandstone: '#E3DFD3',
  charcoal: '#252A2B',
  slate: '#575D5C',
  orange: '#F36B3F',
  gold: '#EDBA3C',
  navy: '#23344B',
  courtText: '#EEE9DE',
  // Compatibility aliases used throughout existing screens.
  ink: '#EEE9DE',
  graphite: '#E3DFD3',
  graphite2: '#E3DFD3',
  line: '#575D5C',
  lineStrong: '#575D5C',
  paper: '#252A2B',
  paperDim: '#575D5C',
  muted: '#575D5C',
  ochre: '#EDBA3C',
  ochreDeep: '#F36B3F',
  ochreInk: '#252A2B',
  clay: '#575D5C',
  moss: '#EDBA3C',
} as const;

/** Physical materials and court-specific text colors. */
export const tactile = {
  paperPanel: '#E3DFD3',
  paperInk: '#252A2B',
  paperMuted: '#575D5C',
  brass: '#EDBA3C',
  brassEdge: '#252A2B',
  court: '#23344B',
  courtLine: '#EEE9DE',
  courtInk: '#EEE9DE',
  courtText: '#EEE9DE',
  frame: '#E3DFD3',
  coral: '#F36B3F',
} as const;

const gameTheme = {
  text: palette.charcoal,
  tint: palette.orange,
  background: palette.stone,
  foreground: palette.charcoal,
  card: palette.sandstone,
  cardForeground: palette.charcoal,
  primary: palette.orange,
  primaryForeground: palette.charcoal,
  secondary: palette.sandstone,
  secondaryForeground: palette.charcoal,
  muted: palette.sandstone,
  mutedForeground: palette.slate,
  accent: palette.gold,
  accentForeground: palette.charcoal,
  destructive: palette.orange,
  destructiveForeground: palette.charcoal,
  border: palette.slate,
  input: palette.sandstone,
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
