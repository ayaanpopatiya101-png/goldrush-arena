// ── Deep Cosmos palette ───────────────────────────────────────────────────────
// Near-black midnight navy base — makes gold/copper accents explode with
// contrast while giving a premium "dark velvet" arena feel.

const PLAYER_COLORS = ['#C8820A', '#C03820', '#1E8AAA', '#4A8A38'] as const;
const PLAYER_GLOW   = ['#C8820A66', '#C0382066', '#1E8AAA66', '#4A8A3866'] as const;

const gameTheme = {
  text:                 '#F0EAE0',
  tint:                 '#C8820A',
  background:           '#07090F',
  foreground:           '#F0EAE0',
  card:                 '#0C1020',
  cardForeground:       '#F0EAE0',
  primary:              '#C8820A',
  primaryForeground:    '#07090F',
  secondary:            '#101828',
  secondaryForeground:  '#F0EAE0',
  muted:                '#131E2C',
  mutedForeground:      '#607888',
  accent:               '#1E8AAA',
  accentForeground:     '#07090F',
  destructive:          '#C03820',
  destructiveForeground:'#F0EAE0',
  border:               '#1A2840',
  input:                '#101828',
  playerColors:         PLAYER_COLORS,
  playerGlow:           PLAYER_GLOW,
};

const colors = {
  light: gameTheme,
  dark:  gameTheme,
  radius: 12,
};

export default colors;
export { PLAYER_COLORS, PLAYER_GLOW };
