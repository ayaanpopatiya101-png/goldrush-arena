// Expo vector icons use these exact font files and codepoint maps.
// Only createIconSet's native font-loader wrapper is replaced.
import React from 'react';
import { Text, type StyleProp, type TextStyle } from './native';
import featherMap from './assets/Feather.json';
import materialMap from './assets/MaterialCommunityIcons.json';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  [key: string]: any;
};
function iconSet(map: Record<string, number>, family: string) {
  return function Icon({ name, size = 12, color, style, ...props }: IconProps) {
    return (
      <Text {...props} selectable={false} style={[
        { fontSize: size, color, fontFamily: family, fontWeight: 'normal', fontStyle: 'normal' },
        style,
      ]}>{String.fromCodePoint(map[name] ?? map['help-circle'] ?? 0)}</Text>
    );
  };
}
export const Feather = iconSet(featherMap, 'GoldRushGuideFeather');
export const MaterialCommunityIcons = iconSet(materialMap, 'GoldRushGuideMaterialCommunityIcons');
