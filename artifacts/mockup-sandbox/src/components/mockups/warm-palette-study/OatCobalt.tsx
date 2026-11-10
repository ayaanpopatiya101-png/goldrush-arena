import { PaletteCard, type PaletteStudy } from "./_PaletteCard";

const palette: PaletteStudy = {
  id: "03",
  name: "Oat & Cobalt",
  subtitle: "Clean sportswear lines with a vermilion rally point.",
  mood: "Crisp international pace",
  tradeoff: "Oat keeps the field open; cobalt feels assured, not cold.",
  main: "#E8DFC8",
  secondary: "#2855A2",
  accent: "#C64030",
  ink: "#26313C",
  secondaryInk: "#F6EEDC",
  accentInk: "#FFF4E9",
};

export function OatCobalt() {
  return <PaletteCard palette={palette} />;
}
