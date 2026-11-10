import { PaletteCard, type PaletteStudy } from "./_PaletteCard";

const palette: PaletteStudy = {
  id: "04",
  name: "Aubergine & Apricot",
  subtitle: "A rich warm-night court, lit with ripe apricot.",
  mood: "Velvet after-hours play",
  tradeoff: "Aubergine gives the game weight; apricot keeps every cue warm.",
  main: "#5B344F",
  secondary: "#80566D",
  accent: "#F0A878",
  ink: "#F6E5D5",
  secondaryInk: "#FFF0E4",
  accentInk: "#38272D",
};

export function AubergineApricot() {
  return <PaletteCard palette={palette} />;
}
