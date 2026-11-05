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
