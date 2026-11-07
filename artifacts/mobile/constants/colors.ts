// GoldRush Arena: stadium-pitch palette.
// Deep pitch-green surfaces, ivory scoreboard text, trophy-gold action.
// Seat colors read like arcade cabinet buttons: gold, signal red, ivory, lime.

const PLAYER_COLORS = ['#F0B429', '#E04A2F', '#EDE3CC', '#9CC93E'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

export const palette = {
  ink: '#213D39',        // approved tactile arcade background
  graphite: '#294C44',   // keep body text AAA on raised surfaces
  graphite2: '#2B4E46',
  line: '#66897D',
  lineStrong: '#8EAA98',
  paper: '#F5E7C4',
  paperDim: '#DFD1AD',
  muted: '#D1DAC6',
  ochre: '#EFBD3C',
  ochreDeep: '#C88B17',
  ochreInk: '#29210F',
  clay: '#F0A38A',       // readable error text; coral stamp is separate
  moss: '#B8D795',
} as const;

/** Physical materials from the approved canvas; never use them as seat identities. */
export const tactile = {
  paperPanel: '#E8D6A8',
  paperInk: '#273D36',
  paperMuted: '#4B5B4D',
  brass: '#CCAD6A',
  brassEdge: '#E7D6AC',
  court: '#B4C0A0',
  courtLine: '#8E815B',
  courtInk: '#35483C',
  frame: '#294942',
  coral: '#E56846',
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
