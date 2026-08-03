// ── GoldRush Arena typography system ─────────────────────────────────────────
// Two-tier font hierarchy — the single biggest "premium" signal in a game UI.
//
//   DISPLAY (Rajdhani)  → titles, ranks, big numbers, buttons, anything LOUD.
//     Angular, condensed, esports-grade. Gives the app its own voice instead
//     of the generic "default sans-serif" look.
//
//   BODY (Inter)        → descriptions, labels, settings, anything quiet.
//     Neutral and highly legible at small sizes.
//
// Usage:
//   import { fonts } from '@/constants/typography';
//   <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>VICTORY</Text>

export const fonts = {
  /** Rajdhani Bold — hero titles, rank names, results, CTAs */
  display: 'Rajdhani_700Bold',
  /** Rajdhani SemiBold — section headers, stat numbers, secondary display */
  displayMedium: 'Rajdhani_600SemiBold',
  /** Inter Regular — body copy, descriptions */
  body: 'Inter_400Regular',
  /** Inter Medium — subtitles, hints */
  bodyMedium: 'Inter_500Medium',
  /** Inter SemiBold — emphasized body, small labels */
  bodySemiBold: 'Inter_600SemiBold',
  /** Inter Bold — small bold labels, chips, badges */
  bodyBold: 'Inter_700Bold',
} as const;

// Display type reads ~10% smaller than Inter at the same px size because it is
// condensed — bump sizes slightly when migrating a style from Inter to Rajdhani.
export const displayScale = {
  hero: 38,     // splash title, home logo
  title: 30,    // screen titles, VICTORY banner
  heading: 22,  // card headers, CTA buttons
  subheading: 16,
  stat: 26,     // big animated numbers
} as const;
