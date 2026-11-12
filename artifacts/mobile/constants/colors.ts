// GoldRush Arena: Slate Arcade. Green-tinted slate canvas, lighter slate panels, green action, gold identity.
// Surfaces and foregrounds are paired by explicit role. Lime fills always carry dark ink.
// PLAYER_COLORS are user/seat cosmetic defaults and intentionally unchanged.
const PLAYER_COLORS = ['#F36B3F', '#EDBA3C', '#EEE9DE', '#E3DFD3'] as const;
// Kept for API compatibility; no glow is rendered. Same as seat colors.
const PLAYER_GLOW = PLAYER_COLORS;

/** Reference court diagram rival colours (sampled). Used only for illustrative diagrams, not player cosmetics. */
export const diagram = { rivalTop: '#F6CA45', rivalLeft: '#EC5A53', rivalRight: '#53ADF0', you: '#78C93D' } as const;

const role = {
  /** 60%: app canvas. */
  background: '#161F23',
  /** Deepest wells, hard cabinet edges, modal scrims. */
  deepest: '#0B1114',
  /** Inset wells, court, tracks, inputs. */
  inset: '#0F161A',
  /** 30%: panels, cards, sheets, tab bar. */
  surface: '#233037',
  /** Raised plates, pressed/hovered secondary controls. */
  raised: '#2C3A42',
  /** Hairlines and outlines. */
  border: '#3C4D59',
  /** Heavy bevel edge under plates and buttons. */
  edge: '#0B1114',
  /** Primary text on carbon/moss/inset/raised. */
  foreground: '#F2F5F4',
  /** Supporting text on carbon/moss/inset/raised. */
  supporting: '#A9B8BF',
  /** Disabled / tertiary text (only on dark surfaces). */
  muted: '#8697A0',
  /** 10%: primary CTA, selected state, meaningful progress. */
  primary: '#78C93D',
  /** Dark ink for text/icons on lime or gold fills. */
  onAccent: '#161F23',
  /** Lower bevel edge under lime fills. */
  primaryEdge: '#5FA12F',
  /** Lower bevel edge under gold fills. */
  goldEdge: '#C99A1E',
  /** Errors, losses and destructive states. */
  danger: '#EF5D57',
  /** Brand and reward detail only. */
  gold: '#F6CA45',
} as const;

export const palette = {
  ...role,
  /** Reference rival accents for icons on dark surfaces only. */
  rivalRed: '#EC5A53',
  rivalBlue: '#53ADF0',
  onPrimary: role.onAccent,
  onGold: role.onAccent,
  // Legacy names, remapped by role. Remaining references are context-specific
  // (ternaries, dark labels on accent fills), so dark-ink tokens stay dark.
  stone: role.background,
  sandstone: role.surface,
  charcoal: role.onAccent,
  slate: role.supporting,
  orange: role.primary,
  navy: role.inset,
  courtText: role.foreground,
  ink: role.background,
  graphite: role.surface,
  graphite2: role.raised,
  line: role.border,
  lineStrong: role.border,
  paper: role.foreground,
  paperDim: role.supporting,
  ochre: role.gold,
  ochreDeep: role.primary,
  ochreInk: role.onAccent,
  clay: role.supporting,
  moss: role.primary,
} as const;

/** Visual allocation, not a per-screen pixel quota. Gold stays reward/brand-only. */
export const colorBalance = {
  main: { color: role.background, share: 60 },
  secondary: { color: role.surface, share: 30 },
  accent: { color: role.primary, share: 10 },
} as const;

/** Physical materials and court-specific colors. */
export const tactile = {
  paperPanel: role.surface,
  paperInk: role.foreground,
  paperMuted: role.supporting,
  brass: role.gold,
  brassEdge: role.edge,
  court: role.inset,
  courtLine: role.border,
  courtInk: role.foreground,
  courtText: role.foreground,
  frame: role.surface,
  coral: role.primary,
} as const;

const gameTheme = {
  text: role.foreground,
  tint: role.primary,
  background: role.background,
  foreground: role.foreground,
  card: role.surface,
  cardForeground: role.foreground,
  primary: role.primary,
  primaryForeground: role.onAccent,
  secondary: role.surface,
  secondaryForeground: role.foreground,
  muted: role.inset,
  mutedForeground: role.supporting,
  accent: role.primary,
  accentForeground: role.onAccent,
  destructive: role.danger,
  destructiveForeground: role.onAccent,
  border: role.border,
  input: role.inset,
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
