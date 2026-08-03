import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

export type HapticStrength = 'light' | 'medium' | 'heavy' | 'none';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Scale target while pressed (default 0.96) */
  scaleTo?: number;
  /** Haptic impact fired on press-in (default 'light'; no-op on web) */
  haptic?: HapticStrength;
  /** Extra vertical sink while pressed, in px (default 1) */
  sinkTo?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const IMPACT: Record<Exclude<HapticStrength, 'none'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/**
 * PressableScale — the universal "premium button feel" wrapper.
 *
 * Drop-in replacement for <Pressable>. Every touch gets:
 *   1. A spring-based scale-down (not an instant snap — springs read as physical)
 *   2. A subtle downward sink (depth illusion)
 *   3. A haptic tick on native (silently skipped on web)
 *
 * This is the #1 micro-interaction that separates top-grossing game UIs from
 * generic ones: EVERY tappable surface should respond with motion + touch.
 *
 * Usage:
 *   <PressableScale onPress={play} haptic="medium" style={styles.cta}>
 *     <Text>PLAY NOW</Text>
 *   </PressableScale>
 */
export function PressableScale({
  scaleTo = 0.96,
  sinkTo = 1,
  haptic = 'light',
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const sink = useRef(new Animated.Value(0)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    if (haptic !== 'none' && Platform.OS !== 'web') {
      Haptics.impactAsync(IMPACT[haptic]).catch(() => {});
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0 }),
      Animated.spring(sink, { toValue: sinkTo, useNativeDriver: true, speed: 40, bounciness: 0 }),
    ]).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 9 }),
      Animated.spring(sink, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 9 }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View
        style={[style, { transform: [{ scale }, { translateY: sink }] }, disabled && { opacity: 0.5 }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
