// GoldRush Arena mark: a square court seen from above, four edge paddles,
// one gold puck. Your seat (south) carries the signature orange.
import React from 'react';
import Svg, { Rect } from 'react-native-svg';

import { palette, tactile } from '@/constants/colors';

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="GoldRush Arena">
      <Rect x={1.5} y={1.5} width={37} height={37} fill={palette.gold} stroke={palette.edge} strokeWidth={3} />
      <Rect x={9} y={9} width={22} height={22} fill={tactile.court} stroke={tactile.courtInk} strokeWidth={1.5} />
      <Rect x={14} y={29} width={12} height={3} fill={palette.orange} />
      <Rect x={14} y={8} width={12} height={3} fill={palette.gold} />
      <Rect x={8} y={14} width={3} height={12} fill={palette.slate} />
      <Rect x={29} y={14} width={3} height={12} fill={palette.gold} />
      <Rect x={17.5} y={17.5} width={6} height={6} fill={tactile.coral} stroke={tactile.courtInk} transform="rotate(45 20.5 20.5)" />
    </Svg>
  );
}
