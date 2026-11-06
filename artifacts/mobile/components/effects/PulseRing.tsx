// Decorative pulsing rings removed. Renders children only.
import React from 'react';
import { View } from 'react-native';

export function PulseRing({ children, style }: { color?: string; size?: number; rings?: number; duration?: number; opacity?: number; children?: React.ReactNode; style?: object }) {
  if (!children) return null;
  return <View style={style}>{children}</View>;
}
