// Decorative spark particles removed. Ref API kept as a no-op.
import { forwardRef, useImperativeHandle } from 'react';

export interface SparkBurstRef {
  burst: (x?: number, y?: number, color?: string) => void;
}

export const SparkBurst = forwardRef<SparkBurstRef, object>(function SparkBurst(_, ref) {
  useImperativeHandle(ref, () => ({ burst() { /* intentionally no-op */ } }), []);
  return null;
});
