// Flat 1px bordered panel. No glow.
import React from 'react';
import { palette } from '@/constants/colors';
import { View, ViewProps } from 'react-native';

interface GlowBorderProps extends ViewProps {
  color?: string;
  borderRadius?: number;
  spread?: number;
  pulse?: boolean;
  borderWidth?: number;
  children?: React.ReactNode;
}

export function GlowBorder({ color = palette.primary, borderWidth = 1, children, style, borderRadius: _r, spread: _s, pulse: _p, ...rest }: GlowBorderProps) {
  return <View {...rest} style={[{ borderColor: color, borderWidth, borderRadius: 3 }, style]}>{children}</View>;
}
