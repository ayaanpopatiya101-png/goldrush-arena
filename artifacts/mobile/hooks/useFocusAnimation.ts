import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Short opacity fade when a screen gains focus. With Reduce Motion enabled the
 * screen is shown immediately at full opacity and never fades.
 */
export function useFocusAnimation(enterDuration = 160, exitDuration = 0) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      if (reduced) { opacity.value = 1; return () => { opacity.value = 1; }; }
      opacity.value = 0.6;
      opacity.value = withTiming(1, { duration: enterDuration });
      return () => {
        opacity.value = exitDuration > 0 ? withTiming(1, { duration: exitDuration }) : 1;
      };
    }, [enterDuration, exitDuration, reduced])
  );
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
