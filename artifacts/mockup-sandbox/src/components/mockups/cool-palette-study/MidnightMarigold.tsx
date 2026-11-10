import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function MidnightMarigold() {
  return <PaletteCard palette={{
    number: '08', name: 'Midnight & Marigold', subtitle: 'Classic confidence after dark',
    mood: 'A night-stadium atmosphere with a warm point of focus.',
    tradeoff: 'Dark surfaces heighten drama, but ask for disciplined text and highlight contrast.',
    main: '#172637', secondary: '#40566B', accent: '#E6B84E',
    mainInk: '#F0EEE5', secondaryInk: '#F5F0E4', accentInk: '#302717', mutedInk: '#B9C3C7',
    courtAccent: '#8BA8B8', centerLine: '#A7BAC3',
  }} />;
}
