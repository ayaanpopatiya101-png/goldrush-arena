/** Bound travel to half a ball radius per collision step, including dropped frames. */
export function collisionSteps(vx: number, vy: number, radius: number, delta: number): number {
  return Math.max(1, Math.ceil(Math.hypot(vx, vy) * delta / Math.max(1, radius / 2)));
}

/** Absolute pointer mapping must retain access to both walls at every sensitivity. */
export function paddleInput(x: number, size: number, length: number, sensitivity: number): number {
  const normalized = Math.max(-1, Math.min(1, (x - size / 2) / (size / 2)));
  const shaped = Math.sign(normalized) * Math.pow(Math.abs(normalized), 1 / sensitivity);
  return Math.max(length / 2 + 2, Math.min(size - length / 2 - 2, (shaped + 1) * size / 2));
}
