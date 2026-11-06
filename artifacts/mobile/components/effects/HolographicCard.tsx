// Flat card. Tilt and rainbow overlay removed.
import React from 'react';
import { View, ViewProps } from 'react-native';

interface HolographicCardProps extends ViewProps {
  children?: React.ReactNode;
  borderRadius?: number;
  disabled?: boolean;
  maxTilt?: number;
  rainbow?: boolean;
}

export function HolographicCard({ children, style, borderRadius: _r, disabled: _d, maxTilt: _m, rainbow: _rb, ...rest }: HolographicCardProps) {
  return <View {...rest} style={[style, { borderRadius: 3, overflow: 'hidden' }]}>{children}</View>;
}
