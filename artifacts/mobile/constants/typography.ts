// GoldRush Arena typography: scoreboard condensed display + legible body.
// Fonts loaded in app/_layout.tsx from @expo-google-fonts/barlow-condensed and
// @expo-google-fonts/source-sans-3.
export const fonts = {
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold',
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_600SemiBold',
  bodySemiBold: 'SourceSans3_600SemiBold',
  bodyBold: 'SourceSans3_700Bold',
} as const;

export const displayScale = {
  hero: 40,
  title: 30,
  heading: 22,
  subheading: 17,
  stat: 26,
} as const;
