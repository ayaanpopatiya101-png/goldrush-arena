import { PaletteCard, type PaletteStudy } from "./_PaletteCard";

const palette: PaletteStudy = {
  id: "05",
  name: "Espresso & Pistachio",
  subtitle: "A tactile warm-dark court with a fresh signal.",
  mood: "Close-grain competition",
  tradeoff: "Cocoa layers the dark field; pistachio is a clear, lively counterpoint.",
  main: "#52382D",
  secondary: "#76523F",
  accent: "#C7D98B",
  ink: "#F3E5CF",
  secondaryInk: "#F6E8D6",
  accentInk: "#34402A",
};

export function EspressoPistachio() {
  return <PaletteCard palette={palette} />;
}
