// Flat text. Glow, pulse and glitch were removed by the visual rules; props kept for compatibility.
import React from 'react';
import { Text, TextProps } from 'react-native';

export interface GlowTextProps extends TextProps {
  color?: string;
  glowColor?: string;
  intensity?: 'soft' | 'medium' | 'strong';
  pulse?: boolean;
  glitch?: boolean;
}

export function GlowText({ color = '#ECE7DC', style, children, glowColor: _g, intensity: _i, pulse: _p, glitch: _gl, ...rest }: GlowTextProps) {
  return <Text {...rest} style={[{ color }, style]}>{children}</Text>;
}
