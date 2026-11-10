import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function SageCranberry() {
  return <PaletteCard palette={{
    number: '07', name: 'Sage & Cranberry', subtitle: 'Mature, organic sport',
    mood: 'Grounded and composed, with a confident pulse.',
    tradeoff: 'Olive shadow adds warmth; cranberry reads more deliberate than electric.',
    main: '#D9E2D0', secondary: '#424936', accent: '#A83B50',
    mainInk: '#30382E', secondaryInk: '#F3F0E6', accentInk: '#FFF4E8', mutedInk: '#5C6656',
    courtAccent: '#D8B782', centerLine: '#A8B99B',
  }} />;
}
