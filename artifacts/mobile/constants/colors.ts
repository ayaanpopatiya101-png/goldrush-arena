// Tournament scorecard: quiet surfaces, brass actions, distinct court positions.

const PLAYER_COLORS = ['#D0AF66', '#BB7865', '#A6AEA7', '#98A581'] as const;
const PLAYER_GLOW   = ['transparent', 'transparent', 'transparent', 'transparent'] as const;

const gameTheme = {
  text:                 '#EEE7D8',
  tint:                 '#D0AF66',
  background:           '#191B19',
  foreground:           '#EEE7D8',
  card:                 '#222520',
  cardForeground:       '#EEE7D8',
  primary:              '#D0AF66',
  primaryForeground:    '#191B19',
  secondary:            '#222520',
  secondaryForeground:  '#EEE7D8',
  muted:                '#222520',
  mutedForeground:      '#B9BDAF',
  accent:               '#A6AEA7',
  accentForeground:     '#191B19',
  destructive:          '#BB7865',
  destructiveForeground:'#EEE7D8',
  border:               '#51564B',
  input:                '#222520',
  playerColors:         PLAYER_COLORS,
  playerGlow:           PLAYER_GLOW,
};

const colors = {
  light: gameTheme,
  dark:  gameTheme,
  radius: 2,
};

export default colors;
export { PLAYER_COLORS, PLAYER_GLOW };
