import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Returns an animated style that fades in to opacity:1 each time
 * the screen comes into focus. Works for both initial mount and
 * repeat tab navigation (unlike Reanimated entering= which only
 * fires on the first mount).
 */
export function useFocusAnimation(duration = 320) {
  const opacity = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration });
    }, [duration])
  );
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
