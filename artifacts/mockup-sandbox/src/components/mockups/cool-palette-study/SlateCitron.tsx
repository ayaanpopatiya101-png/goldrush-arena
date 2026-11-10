import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function SlateCitron() {
  return <PaletteCard palette={{
    number: '10', name: 'Slate & Citron', subtitle: 'A cool, technical court',
    mood: 'Mineral and precise, with a crisp citron signal.',
    tradeoff: 'The muted shell feels engineered; citron brings energy without neon.',
    main: '#52616A', secondary: '#C8D0CC', accent: '#C4D659',
    mainInk: '#F1F1E8', secondaryInk: '#27373A', accentInk: '#293126', mutedInk: '#D1D9D4',
    courtAccent: '#697B82', centerLine: '#87979B',
  }} />;
}
