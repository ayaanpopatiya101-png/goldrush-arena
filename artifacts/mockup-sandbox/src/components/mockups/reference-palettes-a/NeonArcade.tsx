import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function NeonArcade() {
  return <PaletteCard palette={{
    number: '02',
    name: 'Neon Arcade',
    subtitle: 'A crisp electric signal, grounded in a midnight cabinet.',
    main: '#090D16',
    secondary: '#172B42',
    accent: '#00E5FF',
    mainInk: '#F4F3EC',
    secondaryInk: '#F4F3EC',
    accentInk: '#071217',
    mutedInk: '#B9C7D1',
    courtAccent: '#00E5FF',
    centerLine: '#B9C7D1',
    mood: 'Fast, precise, and unmistakably arcade; cyan gives every scoring moment a clear focal point.',
    tradeoff: 'The bright accent has strong urgency, so reserve it for decisive actions and hits.',
  }} />;
}
