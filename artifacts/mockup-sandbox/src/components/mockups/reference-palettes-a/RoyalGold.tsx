import './_group.css';
import { PaletteCard } from './_PaletteCard';

export function RoyalGold() {
  return <PaletteCard palette={{
    number: '03',
    name: 'Royal Gold',
    subtitle: 'A restrained charcoal stage with a ceremonial flash.',
    main: '#101014',
    secondary: '#30283C',
    accent: '#FFD166',
    mainInk: '#F4F0E8',
    secondaryInk: '#F4F0E8',
    accentInk: '#19150D',
    mutedInk: '#C5BEC9',
    courtAccent: '#FFD166',
    centerLine: '#C5BEC9',
    mood: 'Regal and measured; muted plum adds warmth without softening the competitive edge.',
    tradeoff: 'More atmospheric than sporty, with a slightly quieter separation between court and shell.',
  }} />;
}
