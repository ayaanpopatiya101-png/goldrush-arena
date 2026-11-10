import React from 'react';

// react-native-svg's SVG/Rect primitives map directly to their DOM equivalents.
// Geometry, fills, strokes and the source viewBox are untouched.
export function Svg({ accessibilityLabel, ...props }: React.SVGProps<SVGSVGElement> & { accessibilityLabel?: string }) {
  return <svg {...props} aria-label={accessibilityLabel} role="img" />;
}
export function Rect(props: React.SVGProps<SVGRectElement>) {
  return <rect {...props} />;
}
