import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Returns an animated style that fades in to opacity:1 each time the screen
 * comes into focus, and fades out to opacity:0 when the screen loses focus.
 * Works for both initial mount and repeat tab navigation (unlike Reanimated
 * entering= / exiting= which only fire on mount/unmount).
 */
export function useFocusAnimation(enterDuration = 320, exitDuration = 180) {
  const opacity = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      // Enter: fade in
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: enterDuration });

      // Exit: fade out on blur
      return () => {
        opacity.value = withTiming(0, { duration: exitDuration });
      };
    }, [enterDuration, exitDuration])
  );
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
