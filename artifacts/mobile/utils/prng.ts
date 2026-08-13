/**
 * Mulberry32 — a fast, seedable 32-bit PRNG.
 *
 * Used to make daily-challenge gameplay deterministic: every player who runs
 * the same day's seed sees the same ball spawn angles and power-up positions,
 * so their deflection scores are directly comparable.
 *
 * Returns a closure whose successive calls advance the PRNG state.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0; // force unsigned 32-bit
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Convert the first 8 hex characters of a hash string into a 32-bit seed.
 * The daily challenge `seedHash` (SHA-256 hex) is the canonical input.
 */
export function seedFromHex(hex: string): number {
  return (parseInt(hex.slice(0, 8), 16) || 1) >>> 0;
}
