// Flat replacements for gradient and blur surfaces.
// The visual rules forbid gradients and glass. These keep the old call sites
// compiling while rendering a single flat fill (or nothing for translucent veils).
import React from 'react';
import { View, ViewProps } from 'react-native';

function isOpaque(c: string | undefined): boolean {
  if (!c || typeof c !== 'string') return false;
  if (c === 'transparent') return false;
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return true;
  if (/^#[0-9a-fA-F]{8}$/.test(c)) return parseInt(c.slice(7, 9), 16) >= 0xcc;
  const m = c.match(/rgba\([^)]*,\s*([0-9.]+)\)/);
  if (m) return parseFloat(m[1] ?? '0') >= 0.8;
  return c.startsWith('rgb(');
}

type GradientProps = ViewProps & {
  colors: readonly string[] | string[];
  start?: unknown; end?: unknown; locations?: unknown;
  children?: React.ReactNode;
};

/** Renders the first color as a flat fill when opaque; translucent veils render no fill. */
export function LinearGradient({ colors, start: _s, end: _e, locations: _l, style, children, ...rest }: GradientProps) {
  const first = colors[0];
  const bg = isOpaque(first) ? first : undefined;
  if (!bg && !children) return null;
  return <View {...rest} style={[style, bg ? { backgroundColor: bg } : null]}>{children}</View>;
}

type BlurProps = ViewProps & { intensity?: number; tint?: string; children?: React.ReactNode; experimentalBlurMethod?: string };

/** Flat graphite panel in place of a blur/glass surface. */
export function BlurView({ intensity: _i, tint: _t, experimentalBlurMethod: _m, style, children, ...rest }: BlurProps) {
  return <View {...rest} style={[style, { backgroundColor: '#1F2125' }]}>{children}</View>;
}
