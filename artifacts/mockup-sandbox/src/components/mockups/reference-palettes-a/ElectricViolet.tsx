import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function ElectricViolet() {
  return <PaletteCard palette={{
    number: '04',
    name: 'Electric Violet',
    subtitle: 'A cool, ink-dark shell punctuated by a vivid violet court.',
    main: '#0B0B1F',
    secondary: '#262052',
    accent: '#A78BFA',
    mainInk: '#F5F2FA',
    secondaryInk: '#F5F2FA',
    accentInk: '#171024',
    mutedInk: '#C1BED4',
    courtAccent: '#A78BFA',
    centerLine: '#C1BED4',
    mood: 'Competitive and modern; the violet signal gives the court a distinct identity.',
    tradeoff: 'The tightly related dark tones feel cohesive, though fine court markings need careful contrast.',
  }} />;
}
