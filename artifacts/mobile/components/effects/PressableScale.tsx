// Pressable with a direct, non-decorative press state and optional haptic.
import * as Haptics from '@/utils/haptics';
import React from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

export type HapticStrength = 'light' | 'medium' | 'heavy' | 'none';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  haptic?: HapticStrength;
  sinkTo?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const IMPACT: Record<Exclude<HapticStrength, 'none'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export function PressableScale({ haptic = 'light', style, children, onPressIn, scaleTo: _s, sinkTo: _k, ...rest }: PressableScaleProps) {
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        if (haptic !== 'none' && Platform.OS !== 'web') Haptics.impactAsync(IMPACT[haptic]).catch(() => {});
        onPressIn?.(e);
      }}
      style={({ pressed }) => [style, pressed && { opacity: 0.82 }]}
    >
      {children}
    </Pressable>
  );
}
