// Achievement cabinet: larger art, explicit unlocked/locked state, vector fallback.
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';

import { fonts } from '@/constants/typography';
/* eslint-disable @typescript-eslint/no-require-imports */
const ACH_IMAGE: Partial<Record<string, number>> = {
  first_win: require('../../assets/images/ach_first_win.png'),
  hat_trick: require('../../assets/images/ach_hat_trick.png'),
  survivor: require('../../assets/images/ach_survivor.png'),
  streak3: require('../../assets/images/ach_streak3.png'),
  streak5: require('../../assets/images/ach_streak5.png'),
  level10: require('../../assets/images/ach_level10.png'),
  level25: require('../../assets/images/ach_level25.png'),
  collector: require('../../assets/images/ach_collector.png'),
  gold_rank: require('../../assets/images/ach_gold_rank.png'),
  century: require('../../assets/images/ach_century.png'),
  deflect100: require('../../assets/images/ach_deflect100.png'),
  powerup10: require('../../assets/images/ach_powerup10.png'),
};

export function AchievementGrid({ items, unlockedIds }: { items: { id: string; name: string; desc: string }[]; unlockedIds: string[] }) {
  const count = items.filter(i => unlockedIds.includes(i.id)).length;
  return (
    <View style={{ gap: 10 }}>
      <View style={g.head}>
        <Text style={g.title} accessibilityRole="header">ACHIEVEMENTS</Text>
        <Text style={g.count}>{count} of {items.length} unlocked</Text>
      </View>
      <View style={g.meter}><View style={[g.meterFill, { width: `${(count / Math.max(1, items.length)) * 100}%` }]} /></View>
      <View style={g.grid}>
        {items.map(ach => {
          const on = unlockedIds.includes(ach.id);
          const img = ACH_IMAGE[ach.id];
          return (
            <View key={ach.id} accessible accessibilityLabel={`${ach.name}, ${on ? 'unlocked' : 'locked'}. ${ach.desc}`}
              style={[g.card, on ? g.cardOn : g.cardOff]}>
              <View style={[g.art, on && { borderColor: palette.gold }]}>
                {img != null
                  ? <Image source={img} style={{ width: 60, height: 60, opacity: on ? 1 : 0.35 }} resizeMode="contain" />
                  : <MaterialCommunityIcons name="medal-outline" size={40} color={on ? palette.gold : palette.muted} />}
                {!on && (
                  <View style={g.lock}><MaterialCommunityIcons name="lock-outline" size={14} color={palette.foreground} /></View>
                )}
              </View>
              <Text style={[g.name, !on && { color: palette.supporting }]}>{ach.name}</Text>
              <Text style={g.desc}>{ach.desc}</Text>
              <Text style={[g.state, on ? { color: palette.onAccent, backgroundColor: palette.gold } : { color: palette.supporting, backgroundColor: palette.inset }]}>
                {on ? 'UNLOCKED' : 'LOCKED'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1.2, color: palette.foreground },
  count: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.supporting },
  meter: { height: 10, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.inset },
  meterFill: { height: '100%', backgroundColor: palette.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flexGrow: 1, flexBasis: 136, padding: 10, gap: 6, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5 },
  cardOn: { backgroundColor: palette.raised, borderColor: palette.edge },
  cardOff: { backgroundColor: palette.surface, borderColor: palette.border },
  art: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inset, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  lock: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  name: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.foreground },
  desc: { fontFamily: 'SourceSans3_400Regular', fontSize: 13, lineHeight: 18, color: palette.supporting },
  state: { alignSelf: 'flex-start', fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, paddingHorizontal: 6, paddingVertical: 2 },
});
