// Radial orbs removed by visual rules. Exports kept for compatibility.
export interface OrbConfig { color?: string; size?: number; x?: number; y?: number; duration?: number }
export const ORBS_ARCANE: OrbConfig[] = [];
export const ORBS_GOLD: OrbConfig[] = [];
export function FloatingOrbs(_props: { orbs?: OrbConfig[]; opacity?: number }) {
  return null;
}
