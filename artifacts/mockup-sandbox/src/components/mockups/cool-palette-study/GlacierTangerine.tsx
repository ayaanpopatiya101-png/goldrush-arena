import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function GlacierTangerine() {
  return <PaletteCard palette={{
    number: '06', name: 'Glacier & Tangerine', subtitle: 'Fresh coastal competition',
    mood: 'Cool air, clear sightlines, quick reactions.',
    tradeoff: 'The pale field opens up space; orange needs a measured hand to stay special.',
    main: '#DCE8E8', secondary: '#264B62', accent: '#E66F3C',
    mainInk: '#183847', secondaryInk: '#F3F0E7', accentInk: '#2E241E', mutedInk: '#53666D',
    courtAccent: '#E66F3C', centerLine: '#91C0C7',
  }} />;
}
