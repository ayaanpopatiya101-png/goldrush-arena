/**
 * ShimmerCard — animated shimmer/holographic sweep overlay.
 * Wrap any card or surface. The shimmer slides from left to right on loop.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');

interface ShimmerCardProps extends ViewProps {
  /** Shimmer highlight color (default: semi-white) */
  shimmerColor?: string;
  /** How long one sweep takes (ms) */
  duration?: number;
  /** Pause between sweeps (ms) */
  pauseBetween?: number;
  /** Whether the shimmer is active */
  active?: boolean;
  children?: React.ReactNode;
  borderRadius?: number;
}

export function ShimmerCard({
  shimmerColor = 'rgba(255,255,255,0.18)',
  duration = 1600,
  pauseBetween = 2400,
  active = true,
  children,
  borderRadius = 14,
  style,
  ...rest
}: ShimmerCardProps) {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.delay(pauseBetween),
        Animated.timing(translateX, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  const shimmerTranslate = translateX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SW * 1.5, SW * 1.5],
  });

  return (
    <View style={[{ overflow: 'hidden', borderRadius }, style as object]} {...rest}>
      {children}
      {active && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: shimmerTranslate }], borderRadius },
          ]}
        >
          <LinearGradient
            colors={['transparent', shimmerColor, shimmerColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * HolographicShimmer — rainbow iridescent shimmer. Uses 3 sweeping gradient passes.
 */
export function HolographicShimmer({
  children,
  borderRadius = 14,
  style,
  active = true,
}: {
  children?: React.ReactNode;
  borderRadius?: number;
  style?: object;
  active?: boolean;
}) {
  return (
    <ShimmerCard
      shimmerColor="rgba(167,139,250,0.22)"
      duration={1400}
      pauseBetween={1800}
      borderRadius={borderRadius}
      active={active}
      style={style}
    >
      {/* Second pass — cyan */}
      <ShimmerCard
        shimmerColor="rgba(6,182,212,0.14)"
        duration={2000}
        pauseBetween={3200}
        borderRadius={borderRadius}
        active={active}
      >
        {children}
      </ShimmerCard>
    </ShimmerCard>
  );
}
