import { PaletteCard, type PaletteStudy } from './_PaletteCard';

const palette: PaletteStudy = {
  number: '07',
  name: 'Electric Rush',
  subtitle: 'Royal voltage with a high-visibility acid cue',
  mood: 'Competitive and theatrical, like a tournament bracket under lights.',
  tradeoff: 'Violet dominates quickly; the chartreuse accent needs disciplined use.',
  main: '#111035',
  secondary: '#6D28D9',
  accent: '#C6FF35',
  mainInk: '#F5F2FC',
  secondaryInk: '#FFF9FF',
  accentInk: '#1D2011',
  mutedInk: '#CDC8E5',
  courtAccent: '#C6FF35',
  centerLine: '#C6FF35',
};

export function ElectricRush() {
  return <PaletteCard palette={palette} />;
}
