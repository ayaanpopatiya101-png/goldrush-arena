export function canMovePaddle(
  paused: boolean,
  eliminated: boolean,
  phase: string,
): boolean {
  return !paused && !eliminated && phase === "playing";
}
export function clampPaddleRange(
  value: number,
  length: number,
  min: number,
  max: number,
): number {
  const half = length / 2 + 2;
  if (max - min <= half * 2) return (min + max) / 2;
  const safe = Number.isFinite(value) ? value : (min + max) / 2;
  return Math.max(min + half, Math.min(max - half, safe));
}
export function clampPaddle(
  value: number,
  length: number,
  size: number,
): number {
  return clampPaddleRange(value, length, 0, size);
}

/** Fold a projected coordinate through side-wall rebounds instead of parking at a corner. */
export function reflectedIntercept(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0 || !Number.isFinite(value)) return (min + max) / 2;
  const phase = ((value - min) % (2 * span) + 2 * span) % (2 * span);
  return min + (phase <= span ? phase : 2 * span - phase);
}
