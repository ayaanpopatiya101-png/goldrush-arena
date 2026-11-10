import { PaletteCard, type PaletteStudy } from "./_PaletteCard";

const palette: PaletteStudy = {
  id: "01",
  name: "Buttercream & Racing Green",
  subtitle: "A sunny sporting club, sharpened for speed.",
  mood: "Bright club energy",
  tradeoff: "Warm, welcoming surfaces; the berry signal brings the competitive edge.",
  main: "#F2E4B8",
  secondary: "#244D3D",
  accent: "#B93456",
  ink: "#26372E",
  secondaryInk: "#F6EED8",
  accentInk: "#FFF4E8",
};

export function ButtercreamRacing() {
  return <PaletteCard palette={palette} />;
}
