import { PaletteCard, type PaletteStudy } from './_PaletteCard';

const palette: PaletteStudy = {
  number: '05',
  name: 'Hyper Neon',
  subtitle: 'Acid signal against a deep machine-room field',
  mood: 'Fast, technical, and unmistakably arcade.',
  tradeoff: 'The vivid lime lands hard; reserve it for score and decisive moments.',
  main: '#090E14',
  secondary: '#163039',
  accent: '#B8FF37',
  mainInk: '#F4F2E9',
  secondaryInk: '#F4F2E9',
  accentInk: '#172016',
  mutedInk: '#C2CCC8',
  courtAccent: '#B8FF37',
  centerLine: '#B8FF37',
};

export function HyperNeon() {
  return <PaletteCard palette={palette} />;
}
