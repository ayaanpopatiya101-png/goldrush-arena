// GoldRush Arena typography: bold friendly sans display (reference match) + legible body.
// Fonts loaded in app/_layout.tsx from @expo-google-fonts/barlow-condensed and
// @expo-google-fonts/source-sans-3.
export const fonts = {
  display: 'SourceSans3_700Bold',
  displayMedium: 'SourceSans3_700Bold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_600SemiBold',
  bodySemiBold: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
} as const;

export const displayScale = {
  hero: 34,
  title: 26,
  heading: 20,
  subheading: 17,
  stat: 24,
} as const;

/** Minimum readable roles for controls, metadata and explanatory copy. */
export const textScale = {
  body: 16,
  control: 14,
  caption: 12,
} as const;
