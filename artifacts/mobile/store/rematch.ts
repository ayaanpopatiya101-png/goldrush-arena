/** One-shot countdown. Cancellation is terminal for this results visit. */
export function createRematchController(seconds = 15) {
  let remaining = seconds;
  let stopped = false;
  return {
    cancel() { stopped = true; },
    tick(safe: boolean) {
      if (!safe) stopped = true;
      if (stopped) return null;
      remaining = Math.max(0, remaining - 1);
      if (remaining === 0) stopped = true;
      return remaining;
    },
  };
}

const cancellations = new Set<() => void>();
export function subscribeRematchCancel(cancel: () => void) {
  cancellations.add(cancel);
  return () => { cancellations.delete(cancel); };
}
export function cancelAutomaticRematch() {
  cancellations.forEach(cancel => cancel());
}
