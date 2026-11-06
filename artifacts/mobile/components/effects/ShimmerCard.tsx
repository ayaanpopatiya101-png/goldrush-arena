// Flat panel. Shimmer sweeps removed; props kept for compatibility.
import React from 'react';
import { View, ViewProps } from 'react-native';

interface ShimmerCardProps extends ViewProps {
  shimmerColor?: string;
  duration?: number;
  pauseBetween?: number;
  active?: boolean;
  children?: React.ReactNode;
  borderRadius?: number;
}

export function ShimmerCard({ children, style, shimmerColor: _s, duration: _d, pauseBetween: _p, active: _a, borderRadius: _b, ...rest }: ShimmerCardProps) {
  return <View {...rest} style={[style, { borderRadius: 3, overflow: 'hidden' }]}>{children}</View>;
}

export function HolographicShimmer({ children, style }: { children?: React.ReactNode; borderRadius?: number; style?: object; active?: boolean }) {
  return <View style={[style, { borderRadius: 3, overflow: 'hidden' }]}>{children}</View>;
}
