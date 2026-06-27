// ── Scorched Earth palette ────────────────────────────────────────────────────
// Warm dark charcoal base (not purple), burnished copper-gold, iron red,
// steel blue, military green. Feels like a real studio decision.

const PLAYER_COLORS = ['#C8820A', '#C03820', '#1E8AAA', '#4A8A38'] as const;
const PLAYER_GLOW   = ['#C8820A66', '#C0382066', '#1E8AAA66', '#4A8A3866'] as const;

const gameTheme = {
  text:                 '#F0E8D8',
  tint:                 '#C8820A',
  background:           '#0D0A06',
  foreground:           '#F0E8D8',
  card:                 '#161008',
  cardForeground:       '#F0E8D8',
  primary:              '#C8820A',
  primaryForeground:    '#0D0A06',
  secondary:            '#1E1408',
  secondaryForeground:  '#F0E8D8',
  muted:                '#221808',
  mutedForeground:      '#8A7050',
  accent:               '#1E8AAA',
  accentForeground:     '#0D0A06',
  destructive:          '#C03820',
  destructiveForeground:'#F0E8D8',
  border:               '#2A1C0A',
  input:                '#1E1408',
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
