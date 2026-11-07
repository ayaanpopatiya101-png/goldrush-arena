// GoldRush Arena mark: a square court seen from above, four edge paddles,
// one brass puck. Your seat (south) is the solid brass paddle.
import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

import { palette } from '@/constants/colors';

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="GoldRush Arena">
      <Rect x={1} y={1} width={38} height={38} rx={2} fill={palette.graphite} stroke={palette.lineStrong} strokeWidth={1.5} />
      <Rect x={13} y={33} width={14} height={3} fill={palette.ochre} />
      <Rect x={13} y={4} width={14} height={2} fill={palette.paperDim} />
      <Rect x={4} y={13} width={2} height={14} fill={palette.paperDim} />
      <Rect x={34} y={13} width={2} height={14} fill={palette.paperDim} />
      <Circle cx={22} cy={18} r={3.2} fill={palette.ochre} />
    </Svg>
  );
}
