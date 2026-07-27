/**
 * HolographicCard — 3D perspective tilt + holographic shimmer on press.
 * Driven by PanGestureHandler on mobile, mouse position on web.
 * Falls back gracefully to shimmer-only if gesture handler unavailable.
 */
import React, { useRef, useState } from 'react';
import { Platform, View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface HolographicCardProps extends ViewProps {
  children?: React.ReactNode;
  borderRadius?: number;
  disabled?: boolean;
  /** Max tilt degrees (default 12) */
  maxTilt?: number;
  /** Enable the holographic rainbow overlay */
  rainbow?: boolean;
}

export function HolographicCard({
  children,
  borderRadius = 16,
  disabled = false,
  maxTilt = 12,
  rainbow = true,
  style,
  ...rest
}: HolographicCardProps) {
  const rotX  = useSharedValue(0);
  const rotY  = useSharedValue(0);
  const scale = useSharedValue(1);
  const shimX = useSharedValue(0.5);
  const shimY = useSharedValue(0.5);
  const cardRef = useRef<View>(null);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
      { scale: scale.value },
    ],
  }));

  const shimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(rotX.value) + Math.abs(rotY.value),
      [0, maxTilt * 1.5],
      [0, 0.55],
      Extrapolation.CLAMP
    ),
  }));

  function onPointerMove(e: any) {
    if (disabled || !cardRef.current) return;
    if (Platform.OS !== 'web') return;
    const rect = (e.target as HTMLElement).getBoundingClientRect?.();
    if (!rect) return;
    const cx = (e.clientX - rect.left) / rect.width  - 0.5;
    const cy = (e.clientY - rect.top)  / rect.height - 0.5;
    rotX.value  = withSpring(-cy * maxTilt * 2, { damping: 15, stiffness: 200 });
    rotY.value  = withSpring( cx * maxTilt * 2, { damping: 15, stiffness: 200 });
    scale.value = withSpring(1.02, { damping: 15 });
    shimX.value = 0.5 + cx;
    shimY.value = 0.5 + cy;
  }

  function onPointerLeave() {
    rotX.value  = withSpring(0, { damping: 15, stiffness: 180 });
    rotY.value  = withSpring(0, { damping: 15, stiffness: 180 });
    scale.value = withSpring(1, { damping: 15 });
  }

  // Native tilt via onTouchMove
  function onTouchStart(e: any) {
    if (disabled) return;
    scale.value = withSpring(1.02, { damping: 15 });
  }
  function onTouchMove(e: any) {
    if (disabled || Platform.OS === 'web') return;
    const touch = e.nativeEvent.touches?.[0];
    if (!touch) return;
    // map touch position to card tilt
    const cx = (touch.locationX / 100) - 0.5;
    const cy = (touch.locationY / 150) - 0.5;
    rotX.value = withSpring(-cy * maxTilt, { damping: 12, stiffness: 180 });
    rotY.value = withSpring( cx * maxTilt, { damping: 12, stiffness: 180 });
  }
  function onTouchEnd() {
    rotX.value  = withSpring(0, { damping: 12 });
    rotY.value  = withSpring(0, { damping: 12 });
    scale.value = withSpring(1, { damping: 12 });
  }

  return (
    <Animated.View
      ref={cardRef as any}
      style={[{ borderRadius, overflow: 'hidden' }, cardStyle, style as object]}
      onMoveShouldSetResponder={() => !disabled}
      onResponderMove={onTouchMove}
      onResponderGrant={onTouchStart}
      onResponderRelease={onTouchEnd}
      {...(Platform.OS === 'web' ? {
        onMouseMove: onPointerMove,
        onMouseLeave: onPointerLeave,
      } : {})}
      {...rest}
    >
      {children}

      {/* Holographic shimmer overlay */}
      {rainbow && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', inset: 0, borderRadius } as any,
            shimStyle,
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(139,92,246,0.25)',
              'rgba(6,182,212,0.2)',
              'rgba(236,72,153,0.18)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius }}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
