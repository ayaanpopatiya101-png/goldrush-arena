// Static court preview for paddle cosmetics. Uses only existing catalog fields
// (id, color, exclusive) plus the four-sided court semantics from matches:
// your paddle sits on the south wall, three bot seats on the other walls.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PLAYER_COLORS, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type SkinLike = { id: string; name: string; color: string; exclusive?: boolean };

function Paddle({ color, w, h }: { color: string; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, backgroundColor: color, borderWidth: 1.5, borderColor: tactile.courtInk }} />
  );
}

/** Still colour preview, not a promise of materials or shapes absent from gameplay. */
export function CosmeticPreview({ skin, size = 120, showLabel = true }: { skin: SkinLike; size?: number; showLabel?: boolean }) {
  const pw = Math.round(size * 0.42);
  const ph = Math.max(8, Math.round(size * 0.09));
  const bot = Math.round(size * 0.24);
  return (
    <View
      accessible
      accessibilityLabel={`${skin.name} colour preview, shown on the south wall of the court. Cosmetic only.`}
      style={{ alignItems: 'center', gap: 6 }}
    >
      <View style={[c.frame, { width: size, height: size }]}>
        <View style={c.court}>
          <View style={[c.midH]} />
          <View style={[c.circle, { width: size * 0.3, height: size * 0.3, marginLeft: -size * 0.15, marginTop: -size * 0.15 }]} />
          {/* bot seats: north, west, east */}
          <View style={[c.botN, { width: bot, backgroundColor: PLAYER_COLORS[1] }]} />
          <View style={[c.botW, { height: bot, backgroundColor: PLAYER_COLORS[2] }]} />
          <View style={[c.botE, { height: bot, backgroundColor: PLAYER_COLORS[3] }]} />
          <View style={[c.ball, { left: size * 0.56, top: size * 0.58 }]} />
          <View style={[c.south, { bottom: 6 }]}>
            <Paddle color={skin.color} w={pw} h={ph} />
          </View>
        </View>
      </View>
      {showLabel ? <Text style={c.material} numberOfLines={1}>{skin.exclusive ? 'Exclusive cosmetic' : 'Colour preview'}</Text> : null}
    </View>
  );
}

const c = StyleSheet.create({
  frame: { borderWidth: 3, borderColor: tactile.brassEdge, backgroundColor: tactile.brass, padding: 3 },
  court: { flex: 1, backgroundColor: tactile.court, borderWidth: 1, borderColor: tactile.courtLine, overflow: 'hidden' },
  midH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: tactile.courtLine },
  circle: { position: 'absolute', left: '50%', top: '50%', borderWidth: 1, borderColor: tactile.courtLine, borderRadius: 999 },
  botN: { position: 'absolute', top: 4, alignSelf: 'center', height: 4, opacity: 0.7 },
  botW: { position: 'absolute', left: 4, top: '38%', width: 4, opacity: 0.7 },
  botE: { position: 'absolute', right: 4, top: '38%', width: 4, opacity: 0.7 },
  ball: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: tactile.courtInk },
  south: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  material: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#575D5C', letterSpacing: 0.4 },
});
