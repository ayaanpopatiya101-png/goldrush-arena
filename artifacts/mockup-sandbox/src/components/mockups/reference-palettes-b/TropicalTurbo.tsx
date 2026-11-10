import { PaletteCard, type PaletteStudy } from './_PaletteCard';

const palette: PaletteStudy = {
  number: '08',
  name: 'Tropical Turbo',
  subtitle: 'A deep lagoon base with bright cyan-teal and sunlit gold',
  mood: 'Breezy at first glance, still built for sharp competition.',
  tradeoff: 'The secondary teal is bright; dark labeling keeps it grounded and legible.',
  main: '#064E55',
  secondary: '#00A6A6',
  accent: '#FFCF33',
  mainInk: '#F6F5E9',
  secondaryInk: '#062C30',
  accentInk: '#2C2308',
  mutedInk: '#D2E8E3',
  courtAccent: '#FFCF33',
  centerLine: '#FFCF33',
};

export function TropicalTurbo() {
  return <PaletteCard palette={palette} />;
}
