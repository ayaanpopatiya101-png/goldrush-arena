import React from 'react';
import { Image, Text, View } from 'react-native';

const SHEET = require('../assets/images/avatar_sheet.png');

const SHEET_W = 1536;
const SHEET_H = 1024;
const COLS    = 12;
const ROWS    = 8;
const CELL    = SHEET_W / COLS; // 128 — square cells

/**
 * Renders an avatar icon.
 *
 * icon format:
 *   "icon:R,C" — crops from the 12×8 sprite sheet (row R, col C, 0-indexed)
 *   any other string — rendered as a legacy emoji
 */
export function AvatarIcon({ icon, size, style }: { icon: string; size: number; style?: object }) {
  if (icon.startsWith('icon:')) {
    const parts = icon.slice(5).split(',');
    const row   = parseInt(parts[0], 10);
    const col   = parseInt(parts[1], 10);
    const scale = size / CELL;
    return (
      <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
        <Image
          source={SHEET}
          style={{
            width:      SHEET_W * scale,
            height:     SHEET_H * scale,
            marginLeft: -col * CELL * scale,
            marginTop:  -row * CELL * scale,
          }}
          resizeMode="cover"
        />
      </View>
    );
  }
  // Legacy emoji fallback
  return (
    <Text style={[{ fontSize: size * 0.65, lineHeight: size }, style]}>
      {icon}
    </Text>
  );
}

// ─── Curated set of 24 avatar icons from the sheet ───────────────────────────
export const AVATAR_ICONS: string[] = [
  'icon:0,4',   // crown
  'icon:0,5',   // star hexagon
  'icon:0,6',   // skull hexagon
  'icon:0,8',   // lightning + gems
  'icon:0,10',  // magnet
  'icon:1,1',   // shield
  'icon:1,7',   // heart
  'icon:1,8',   // boots + wings
  'icon:2,0',   // spiky ball
  'icon:2,3',   // tornado
  'icon:2,7',   // bomb
  'icon:2,8',   // ghost
  'icon:3,0',   // gold star
  'icon:3,4',   // meteor fireball
  'icon:3,7',   // gold coin
  'icon:3,8',   // skull & crossbones
  'icon:4,0',   // disco ball
  'icon:4,2',   // explosion burst
  'icon:4,10',  // lightning bolt
  'icon:5,1',   // rubber duck
  'icon:5,5',   // evil skull
  'icon:5,8',   // muscle arm
  'icon:5,11',  // gem diamond
  'icon:6,0',   // shield star
];
