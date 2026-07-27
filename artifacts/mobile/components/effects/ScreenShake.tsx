/**
 * ScreenShake — Trauma-squared shake system using Reanimated withSequence.
 * Call ref.current.shake(intensity) from parent on hits, goals, explosions, etc.
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing as REasing,
} from 'react-native-reanimated';

export interface ScreenShakeRef {
  /** Shake the container. intensity 0–1, default 0.6 */
  shake: (intensity?: number) => void;
}

interface ScreenShakeProps extends ViewProps {
  children?: React.ReactNode;
}

export const ScreenShake = forwardRef<ScreenShakeRef, ScreenShakeProps>(function ScreenShake(
  { children, style, ...rest },
  ref
) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    shake(intensity = 0.6) {
      const m = Math.round(intensity * 10);   // max pixels
      const h = Math.round(m * 0.5);
      const q = Math.round(m * 0.25);
      const d = 50; // ms per step

      tx.value = withSequence(
        withTiming(-m, { duration: d }), withTiming(m, { duration: d }),
        withTiming(-h, { duration: d }), withTiming(h, { duration: d }),
        withTiming(-q, { duration: d }), withTiming(q, { duration: d }),
        withTiming(0,  { duration: d }),
      );
      ty.value = withSequence(
        withTiming(-Math.round(m * 0.4), { duration: d }),
        withTiming( Math.round(m * 0.4), { duration: d }),
        withTiming(-Math.round(h * 0.3), { duration: d }),
        withTiming( Math.round(h * 0.3), { duration: d }),
        withTiming(0, { duration: d }),
      );
    },
  }));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
});
