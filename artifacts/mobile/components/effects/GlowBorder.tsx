/**
 * GlowBorder — animating pulsing glow border around any content.
 * Uses shadow* (native) and box-shadow (web) for authentic neon-outline feel.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewProps } from 'react-native';

interface GlowBorderProps extends ViewProps {
  color?: string;
  borderRadius?: number;
  /** Glow spread in px */
  spread?: number;
  /** Pulse the glow opacity */
  pulse?: boolean;
  borderWidth?: number;
  children?: React.ReactNode;
}

export function GlowBorder({
  color = '#C8820A',
  borderRadius = 14,
  spread = 10,
  pulse = true,
  borderWidth = 1.5,
  children,
  style,
  ...rest
}: GlowBorderProps) {
  const anim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 1500, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(anim, { toValue: 0.3, duration: 1500, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const shadowRadius = anim.interpolate({ inputRange: [0, 1], outputRange: [spread * 0.5, spread] });
  const shadowOp     = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });
  const borderOp     = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      style={[
        styles.base,
        {
          borderRadius,
          borderWidth,
          borderColor: color,
          borderOpacity: borderOp as any,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius,
          shadowOpacity: shadowOp,
          elevation: 8,
        },
        style as object,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
