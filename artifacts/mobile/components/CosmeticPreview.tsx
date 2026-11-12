// Static court preview for paddle cosmetics. Renders the real catalog artwork
// on the south wall (your seat), three bot seats on the other walls.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { artworkFor, type Artwork } from '@workspace/goldrush-catalog/cosmetics';

import { PLAYER_COLORS, tactile, palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { PaddleArt, MOTIF_LABEL, TEXTURE_LABEL } from '@/components/cosmetics/PaddleArt';

type SkinLike = { id: string; name: string; color?: string; exclusive?: boolean };

/** Artwork preview at the real paddle proportions used in matches. Cosmetic only. */
export function CosmeticPreview({ skin, artwork, size = 120, showLabel = true }: { skin: SkinLike; artwork?: Artwork; size?: number; showLabel?: boolean }) {
  const design = artwork ?? artworkFor(skin.id);
  const pw = Math.round(size * 0.42);
  // Match in-game ratio: 88 x 14.
  const ph = Math.max(8, Math.round(pw * 14 / 88));
  const bot = Math.round(size * 0.24);
  const label = `${MOTIF_LABEL[design.motif] ?? 'Artwork'}, ${(TEXTURE_LABEL[design.texture] ?? 'Flat print').toLowerCase()}`;
  return (
    <View
      accessible
      accessibilityLabel={`${skin.name} paddle artwork: ${label}. Shown on the south wall of the court. Cosmetic only, no gameplay effect.`}
      style={{ alignItems: 'center', gap: 6 }}
    >
      <View style={[c.frame, { width: size, height: size }]}>
        <View style={c.court}>
          <View style={c.midH} />
          <View style={[c.circle, { width: size * 0.3, height: size * 0.3, marginLeft: -size * 0.15, marginTop: -size * 0.15 }]} />
          <View style={[c.botN, { width: bot, backgroundColor: PLAYER_COLORS[1] }]} />
          <View style={[c.botW, { height: bot, backgroundColor: PLAYER_COLORS[2] }]} />
          <View style={[c.botE, { height: bot, backgroundColor: PLAYER_COLORS[3] }]} />
          <View style={[c.ball, { left: size * 0.56, top: size * 0.58 }]} />
          <View style={[c.south, { bottom: 6 }]}>
            <PaddleArt design={design} width={pw} height={ph} />
          </View>
        </View>
      </View>
      {showLabel ? (
        <Text style={c.material} numberOfLines={1}>
          {skin.exclusive ? `Exclusive · ${label}` : label}
        </Text>
      ) : null}
    </View>
  );
}

const c = StyleSheet.create({
  frame: { borderRadius: 10, borderWidth: 3, borderColor: palette.edge, backgroundColor: tactile.brass, padding: 3 },
  court: { flex: 1, backgroundColor: palette.inset, borderRadius: 10, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  midH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: tactile.courtLine },
  circle: { position: 'absolute', left: '50%', top: '50%', borderWidth: 1, borderColor: palette.border, borderRadius: 999 },
  botN: { position: 'absolute', top: 4, alignSelf: 'center', height: 4, opacity: 0.7 },
  botW: { position: 'absolute', left: 4, top: '38%', width: 4, opacity: 0.7 },
  botE: { position: 'absolute', right: 4, top: '38%', width: 4, opacity: 0.7 },
  ball: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: palette.foreground },
  south: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  material: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: palette.supporting, letterSpacing: 0.4 },
});
