import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function MidnightGold() {
  return <PaletteCard palette={{
    number: '01',
    name: 'Midnight Gold',
    subtitle: 'A composed night arena with a decisive hit of gold.',
    main: '#0B1020',
    secondary: '#1D2C48',
    accent: '#FFC83D',
    mainInk: '#F5F2E9',
    secondaryInk: '#F5F2E9',
    accentInk: '#161718',
    mutedInk: '#BDC5D2',
    courtAccent: '#FFC83D',
    centerLine: '#BDC5D2',
    mood: 'Focused and premium; the warm ball reads instantly against cool court surfaces.',
    tradeoff: 'Deep surfaces reward play in dim rooms, but need deliberate separation on small screens.',
  }} />;
}
