import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettings } from '@/hooks/useSettings';

/** True when the OS asks for reduced motion. Components skip non-essential motion. */
export function useReducedMotion(): boolean {
  const { settings } = useSettings();
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduced(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced || settings.reducedEffects;
}
