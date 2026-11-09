import { PaletteCard, type PaletteStudy } from './_PaletteCard';

const palette: PaletteStudy = {
  number: '09',
  name: 'Neon Inferno',
  subtitle: 'Hot pink panels and a sharp yellow point of impact',
  mood: 'Loud, high-stakes, and made for a final-round entrance.',
  tradeoff: 'Pink is the dominant secondary surface; near-plum text protects readability.',
  main: '#291245',
  secondary: '#E83275',
  accent: '#FFDE35',
  mainInk: '#F9F2F7',
  secondaryInk: '#170926',
  accentInk: '#291245',
  mutedInk: '#D9C9E2',
  courtAccent: '#FFDE35',
  centerLine: '#FFDE35',
};

export function NeonInferno() {
  return <PaletteCard palette={palette} />;
}
