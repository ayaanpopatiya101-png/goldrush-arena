/**
 * GlowText — neon glow text effect.
 * Web: textShadow CSS (multi-layer authentic neon).
 * Native: shadow* props on wrapping View (iOS) + blurred duplicate layer.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TextProps, View } from 'react-native';

export interface GlowTextProps extends TextProps {
  color?: string;
  glowColor?: string;
  /** soft = subtle, medium = standard neon, strong = blazing */
  intensity?: 'soft' | 'medium' | 'strong';
  /** Continuously pulse the glow brightness */
  pulse?: boolean;
  /** Glitch effect (RGB split) — web only for now */
  glitch?: boolean;
}

export function GlowText({
  color = '#FFD700',
  glowColor,
  intensity = 'medium',
  pulse = false,
  glitch = false,
  style,
  children,
  ...rest
}: GlowTextProps) {
  const gc = glowColor ?? color;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.45, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  if (Platform.OS === 'web') {
    const radii: Record<typeof intensity, number[]> = {
      soft:   [3, 7],
      medium: [3, 8, 18, 28],
      strong: [3, 8, 18, 28, 50],
    };
    const shadows = radii[intensity].map(r => `0 0 ${r}px ${gc}`).join(', ');

    const glitchStyle = glitch ? {
      animation: 'glitch 3s infinite',
    } : {};

    const webStyle = {
      color,
      textShadow: shadows,
      ...glitchStyle,
    };

    return (
      <>
        {glitch && (
          // Inject glitch keyframes once
          <style>{`
            @keyframes glitch {
              0%,94%,100% { text-shadow: ${shadows}; }
              95% { text-shadow: 3px 0 0 #FF0044, -3px 0 0 #00FFFF, ${shadows}; transform: translateX(2px); }
              97% { text-shadow: -3px 0 0 #FF0044, 3px 0 0 #00FFFF, ${shadows}; transform: translateX(-2px); }
              98% { text-shadow: ${shadows}; transform: translateX(0); }
            }
          `}</style>
        )}
        <Animated.Text
          style={[style, webStyle as any, pulse && { opacity: pulseAnim }]}
          {...rest}
        >
          {children}
        </Animated.Text>
      </>
    );
  }

  // Native: shadow on View gives iOS glow; Android gets elevation shadow
  const shadowRadius: Record<typeof intensity, number> = { soft: 6, medium: 12, strong: 22 };
  const shadowOpacity: Record<typeof intensity, number> = { soft: 0.55, medium: 0.8, strong: 1 };

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          shadowColor: gc,
          shadowRadius: shadowRadius[intensity],
          shadowOpacity: shadowOpacity[intensity],
          shadowOffset: { width: 0, height: 0 },
        },
        pulse && { opacity: pulseAnim },
      ]}
    >
      <Text style={[style, { color }]} {...rest}>{children}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
});
