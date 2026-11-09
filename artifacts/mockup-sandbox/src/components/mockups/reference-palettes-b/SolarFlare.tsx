import { PaletteCard, type PaletteStudy } from './_PaletteCard';

const palette: PaletteStudy = {
  number: '06',
  name: 'Solar Flare',
  subtitle: 'Warm amber cuts through a bruised-plum arena',
  mood: 'A little dangerous, with a crowd-lit after-dark charge.',
  tradeoff: 'The orange feels celebratory; keep interface copy calm and sparse.',
  main: '#15101B',
  secondary: '#482339',
  accent: '#FFAC45',
  mainInk: '#F5F0EA',
  secondaryInk: '#F5F0EA',
  accentInk: '#24140A',
  mutedInk: '#D0C3CC',
  courtAccent: '#FFAC45',
  centerLine: '#FFAC45',
};

export function SolarFlare() {
  return <PaletteCard palette={palette} />;
}
