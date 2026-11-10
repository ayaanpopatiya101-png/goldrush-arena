import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function CoralTeal() {
  return <PaletteCard palette={{
    number: '09', name: 'Coral & Deep Teal', subtitle: 'A joyful, warm vintage arcade',
    mood: 'Sun-warmed color with a steady, inky counterweight.',
    tradeoff: 'Pale lemon gives the action a lift without turning the whole palette loud.',
    main: '#D98D7B', secondary: '#245653', accent: '#F1D98A',
    mainInk: '#452C2B', secondaryInk: '#F2F0E6', accentInk: '#353B2A', mutedInk: '#664944',
    courtAccent: '#A6C5B9', centerLine: '#C8B9A1',
  }} />;
}
