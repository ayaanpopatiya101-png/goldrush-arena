import { PaletteCard, type PaletteStudy } from "./_PaletteCard";

const palette: PaletteStudy = {
  id: "02",
  name: "Terracotta & Petrol",
  subtitle: "An earthy court with a flash of tournament gold.",
  mood: "Grounded, then electric",
  tradeoff: "The clay keeps the field human; petrol gives the play a deep anchor.",
  main: "#C9785A",
  secondary: "#164C50",
  accent: "#F2C35E",
  ink: "#312A26",
  secondaryInk: "#F3E9D9",
  accentInk: "#302A20",
};

export function TerracottaPetrol() {
  return <PaletteCard palette={palette} />;
}
