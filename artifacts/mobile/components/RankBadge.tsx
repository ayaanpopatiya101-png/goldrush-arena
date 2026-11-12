// Physical rank medallion: vector tier icon on a raised coin with a hard bottom edge.
// No emoji and no looping glow. Rank names, colors and tier numbers come from RANKS.
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { RANKS } from '@/context/PlayerContext';

interface RankBadgeProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

type IconName = React.ComponentProps<typeof Feather>['name'];
const TIER_ICON: Record<string, IconName> = {
  Bronze: 'shield', Silver: 'shield', Gold: 'award', Diamond: 'hexagon', Master: 'zap', Champion: 'star',
};

export function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const rankData = RANKS.find(r => r.name === rank) ?? RANKS[0];
  const color = rankData.color;
  const [tier, num = ''] = rank.split(' ');
  const icon = TIER_ICON[tier ?? ''] ?? 'shield';
  const elite = tier === 'Diamond' || tier === 'Master' || tier === 'Champion';

  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 40;
  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 24 : 18;
  const pip = size === 'sm' ? 13 : size === 'lg' ? 20 : 16;
  const labelSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;

  return (
    <View style={styles.wrapper} accessibilityLabel={`Rank ${rank}`}>
      <View style={[styles.coin, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color, borderBottomWidth: size === 'sm' ? 3 : 4 }]}>
        <View style={[styles.face, { width: dim - (size === 'sm' ? 8 : 10), height: dim - (size === 'sm' ? 8 : 10), borderRadius: dim, borderWidth: elite ? 2 : 1.5 }]}>
          <Feather name={icon} size={iconSize} color={color} />
        </View>
        {num ? (
          <View style={[styles.pip, { minWidth: pip, height: pip, borderRadius: pip / 2 }]}>
            <Text style={[styles.pipTxt, { fontSize: pip - 5, lineHeight: pip - 2 }]}>{num}</Text>
          </View>
        ) : null}
      </View>
      {showLabel ? <Text style={[styles.label, { color, fontSize: labelSize }]}>{rank.toUpperCase()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 4 },
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: palette.edge },
  face: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inset, borderColor: palette.edge },
  pip: { position: 'absolute', bottom: -4, right: -4, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, borderWidth: 1.5, borderColor: palette.edge },
  pipTxt: { fontFamily: fonts.display, color: palette.onGold },
  label: { fontFamily: fonts.display, letterSpacing: 1.2 },
});
