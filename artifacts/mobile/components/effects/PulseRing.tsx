/**
 * PulseRing — expanding concentric rings radiating outward from a center point.
 * Great for active tab indicators, milestone slots, "ready" states, VIP badges.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface PulseRingProps {
  color?: string;
  size?: number;
  rings?: number;
  /** Duration of one ring's full expand cycle (ms) */
  duration?: number;
  /** Extra opacity multiplier */
  opacity?: number;
  children?: React.ReactNode;
  style?: object;
}

function Ring({
  color, size, duration, delay, opacity,
}: {
  color: string; size: number; duration: number; delay: number; opacity: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true })
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.0] });
  const op    = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [opacity, opacity * 0.7, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        transform: [{ scale }],
        opacity: op,
      }}
    />
  );
}

export function PulseRing({
  color = '#C8820A',
  size = 48,
  rings = 3,
  duration = 1800,
  opacity = 0.7,
  children,
  style,
}: PulseRingProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {Array.from({ length: rings }, (_, i) => (
        <Ring
          key={i}
          color={color}
          size={size}
          duration={duration}
          delay={(duration / rings) * i}
          opacity={opacity}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
