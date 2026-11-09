import React from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Panel, ScreenTitle, SectionLabel, Shell } from '@/components/ui/Primitives';
import { RankBadge } from '@/components/RankBadge';
import { HistoryRow, NumberedNote, PlacementTrack, SeasonBadges, SeasonScoreboard } from '@/components/rank/CompetitionPanels';
import { palette } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import { RANKS, usePlayer } from '@/context/PlayerContext';
import { useCompetition } from '@/hooks/useCompetition';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, currentUsername } = usePlayer();
  const focusStyle = useFocusAnimation();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCompetition(currentUsername);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const rankIdx = Math.max(0, RANKS.findIndex(r => r.name === profile.rank));
  const next = RANKS[rankIdx + 1];
  const cur = RANKS[rankIdx];
  const pct = next ? Math.min(1, Math.max(0, (profile.xp - cur.minXP) / (next.minXP - cur.minXP))) : 1;
  const history = data ? [...data.history].sort((a, b) => b.season.localeCompare(a.season)) : [];

  return (
    <Reanimated.View style={[s.root, focusStyle]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <ScreenTitle kicker="Personal competition" title="Ranks" tone="dark" style={{ flex: 1 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <Shell variant="prose" style={{ gap: 22 }}>
          {/* Live season */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="This season" right={isRefetching ? <ActivityIndicator size="small" color={palette.slate} /> : null} />
            {!currentUsername ? (
              <Panel style={s.pad}><Text style={s.body}>Choose a local player profile to load your ranked season.</Text></Panel>
            ) : isLoading ? (
              <View style={s.loading} accessibilityLabel="Loading competitive season">
                <ActivityIndicator color={palette.stone} />
                <Text style={s.loadingText}>Reading your season from the arena server</Text>
              </View>
            ) : isError || !data ? (
              <Panel style={[s.pad, { borderColor: palette.orange, gap: 10 }]}>
                <Text style={s.h}>Season unavailable</Text>
                <Text style={s.body}>
                  The arena server did not return your season. {error?.message ? `(${error.message}) ` : ''}Your XP, rank and collection on this device are unchanged.
                </Text>
                <Button label="Retry" icon="rotate-cw" onPress={() => void refetch()} testID="competition-retry" />
              </Panel>
            ) : (
              <>
                <SeasonScoreboard s={data.current} />
                <PlacementTrack games={data.current.games} placed={data.current.placed} />
                <SeasonBadges s={data.current} />
              </>
            )}
          </View>

          {/* History */}
          {data ? (
            <View style={{ gap: 6 }}>
              <SectionLabel title="Previous seasons" />
              {history.length === 0 ? (
                <Text style={s.muted}>No finished seasons yet. When this month closes, your result is kept here.</Text>
              ) : history.map(h => <HistoryRow key={h.season} s={h} />)}
            </View>
          ) : null}

          {/* Service rank */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="Service rank" />
            <Panel style={[s.pad, s.youRow]}>
              <RankBadge rank={profile.rank} size="md" showLabel={false} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.h}>{profile.rank}</Text>
                <Text style={s.muted}>{profile.xp.toLocaleString()} XP{next ? ` · ${(next.minXP - profile.xp).toLocaleString()} to ${next.name}` : ' · top service rank'}</Text>
                <View style={s.track}><View style={[s.fill, { width: `${pct * 100}%` }]} /></View>
              </View>
            </Panel>
            <Text style={s.muted}>Service rank grows with XP from every match you play. It never resets and is separate from your season rating.</Text>
          </View>

          {/* Legacy */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="Legacy record" />
            <Panel style={[s.pad, { gap: 8, backgroundColor: palette.stone, borderStyle: 'dashed' }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={s.legacyCell}><Text style={s.legacyV}>{profile.competitiveLevel ?? 1}</Text><Text style={s.legacyL}>LAST LEVEL</Text></View>
                <View style={s.legacyCell}><Text style={s.legacyV}>{profile.highestLevel ?? 1}</Text><Text style={s.legacyL}>HIGHEST LEVEL</Text></View>
              </View>
              <Text style={s.muted}>Historical. These levels came from the earlier 1 to 50 system, which included bot matches. They are preserved for your record and do not measure your live skill.</Text>
            </Panel>
          </View>

          {/* How it works */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="How rating works" />
            <Panel style={[s.pad, { gap: 12 }]}>
              <NumberedNote n={1}>Ranked counts only matches against real people. Bot and practice games never change your rating.</NumberedNote>
              <NumberedNote n={2}>An Elo-style score: each finish compares your placement against every opponent in the arena, weighted by their rating. Beating stronger players earns more; losing to weaker players costs more.</NumberedNote>
              <NumberedNote n={3}>Your first 5 games use a K factor of 64 so you settle quickly. After placement, K drops to 24.</NumberedNote>
              <NumberedNote n={4}>Each season is a UTC calendar month. On the 1st everyone restarts at 1000 with 5 new placement games. XP, service rank, cosmetics, achievements and past seasons are never erased.</NumberedNote>
              <Text style={s.fine}>This is GoldRush's own formula. It is not Halo's or any other game's proprietary matchmaking algorithm.</Text>
            </Panel>
          </View>

          {/* Ladder */}
          <View style={{ gap: 10 }}>
            <SectionLabel title="Public ladder" />
            <View style={s.ladder}>
              <Text style={s.ladderTitle}>NOT PUBLISHED YET</Text>
              <Text style={s.ladderBody}>There is no global ladder right now, so we show no other players instead of invented names. Your season above is your real standing.</Text>
            </View>
          </View>
        </Shell>
      </ScrollView>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.stone },
  header: { paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: palette.charcoal, marginBottom: 18, backgroundColor: palette.navy },
  pad: { padding: 14 },
  h: { fontFamily: fonts.display, fontSize: 22, color: palette.charcoal, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: textScale.body, lineHeight: 22, color: palette.charcoal },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.slate },
  fine: { fontFamily: fonts.body, fontSize: 13, color: palette.slate, borderTopWidth: 1, borderTopColor: palette.slate, paddingTop: 10 },
  loading: { backgroundColor: palette.navy, borderWidth: 3, borderColor: palette.charcoal, padding: 28, alignItems: 'center', gap: 10, minHeight: 200, justifyContent: 'center' },
  loadingText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.stone },
  track: { height: 14, padding: 2, borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.stone },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.stone, borderColor: palette.orange },
  fill: { height: '100%', backgroundColor: palette.orange },
  legacyCell: { flex: 1, borderWidth: 2, borderColor: palette.slate, padding: 10, backgroundColor: palette.sandstone },
  legacyV: { fontFamily: fonts.display, fontSize: 30, color: palette.slate, fontVariant: ['tabular-nums'] },
  legacyL: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: palette.slate },
  ladder: { borderWidth: 2, borderBottomWidth: 5, borderColor: palette.charcoal, backgroundColor: palette.navy, padding: 18, gap: 6 },
  ladderTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: palette.gold },
  ladderBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.courtText },
});
