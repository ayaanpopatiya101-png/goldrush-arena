import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { RankBadge } from '@/components/RankBadge';
import { FloatingOrbs, GlowBorder, GlowText, ShimmerCard } from '@/components/effects';
import { RANKS, usePlayer } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';
import { Glyph } from '@/components/ui/Glyph';

const GLOBAL_LEADERS = [
  { name: 'NightViper', rank: 'Champion 5',  wins: 2847, xp: 390000, level: 48, color: '#B4533A' },
  { name: 'CrystalX',   rank: 'Champion 4',  wins: 2614, xp: 310000, level: 46, color: '#B4533A' },
  { name: 'Inferno_K',  rank: 'Champion 3',  wins: 1990, xp: 248000, level: 41, color: '#B4533A' },
  { name: 'ZeroGravity',rank: 'Champion 3',  wins: 1823, xp: 240000, level: 39, color: '#B4533A' },
  { name: 'Blaze_99',   rank: 'Champion 2',  wins: 1450, xp: 192000, level: 33, color: '#C99A2E' },
  { name: 'IceQueen',   rank: 'Champion 2',  wins: 1380, xp: 185000, level: 30, color: '#8C8F7A' },
  { name: 'Venom_X',    rank: 'Champion 1',  wins: 1270, xp: 145000, level: 27, color: '#6F8A5B' },
  { name: 'ShadowFX',   rank: 'Champion 1',  wins: 1100, xp: 140000, level: 24, color: '#8C8F7A' },
  { name: 'PulseWave',  rank: 'Master 3',    wins: 980,  xp: 112000, level: 21, color: '#8C8F7A' },
  { name: 'NeonBlitz',  rank: 'Master 3',    wins: 870,  xp: 108000, level: 18, color: '#8C8F7A' },
];

const REGIONAL_LEADERS: Record<string, Array<{name:string;rank:string;wins:number;level:number;color:string}>> = {
  NA: [
    { name: 'NightViper',  rank: 'Champion 5', wins: 2847, level: 48, color: '#B4533A' },
    { name: 'Blaze_99',    rank: 'Champion 2', wins: 1450, level: 33, color: '#C99A2E' },
    { name: 'Venom_X',     rank: 'Champion 1', wins: 1270, level: 27, color: '#6F8A5B' },
    { name: 'DarkRift',    rank: 'Master 3',   wins: 940,  level: 22, color: '#8C8F7A' },
    { name: 'StormBreaker',rank: 'Gold 2',     wins: 620,  level: 14, color: '#C99A2E' },
  ],
  EU: [
    { name: 'CrystalX',   rank: 'Champion 4', wins: 2614, level: 46, color: '#B4533A' },
    { name: 'IceQueen',   rank: 'Champion 2', wins: 1380, level: 30, color: '#8C8F7A' },
    { name: 'ShadowFX',   rank: 'Champion 1', wins: 1100, level: 24, color: '#8C8F7A' },
    { name: 'Ghostline',  rank: 'Master 2',   wins: 880,  level: 20, color: '#8C8F7A' },
    { name: 'VoidWalker', rank: 'Diamond 3',  wins: 560,  level: 13, color: '#8C8F7A' },
  ],
  APAC: [
    { name: 'Inferno_K',  rank: 'Champion 3', wins: 1990, level: 41, color: '#B4533A' },
    { name: 'PulseWave',  rank: 'Master 3',   wins: 980,  level: 21, color: '#8C8F7A' },
    { name: 'PixelHawk',  rank: 'Diamond 2',  wins: 810,  level: 19, color: '#8C8F7A' },
    { name: 'NeonSword',  rank: 'Gold 3',     wins: 540,  level: 12, color: '#C99A2E' },
    { name: 'AstroKid',   rank: 'Silver 2',   wins: 280,  level: 7,  color: '#B7B2A6' },
  ],
  LATAM: [
    { name: 'ZeroGravity',rank: 'Champion 3', wins: 1823, level: 39, color: '#B4533A' },
    { name: 'NeonBlitz',  rank: 'Master 3',   wins: 870,  level: 18, color: '#8C8F7A' },
    { name: 'TigerKing',  rank: 'Gold 1',     wins: 620,  level: 15, color: '#C99A2E' },
    { name: 'LatinFury',  rank: 'Silver 2',   wins: 390,  level: 9,  color: '#B7B2A6' },
    { name: 'DragonX',    rank: 'Bronze 3',   wins: 180,  level: 4,  color: '#C99A2E' },
  ],
};

const SEASON_LEADERS = [
  { name: 'NightViper',  rank: 'Champion 5', wins: 187, level: 48, color: '#B4533A' },
  { name: 'ZeroGravity', rank: 'Champion 3', wins: 164, level: 39, color: '#B4533A' },
  { name: 'CrystalX',   rank: 'Champion 4', wins: 159, level: 46, color: '#B4533A' },
  { name: 'Blaze_99',   rank: 'Champion 2', wins: 143, level: 33, color: '#C99A2E' },
  { name: 'Venom_X',    rank: 'Champion 1', wins: 138, level: 27, color: '#6F8A5B' },
  { name: 'IceQueen',   rank: 'Master 3',   wins: 121, level: 30, color: '#8C8F7A' },
  { name: 'DarkMatter', rank: 'Master 2',   wins: 98,  level: 20, color: '#8C8F7A' },
  { name: 'PulseWave',  rank: 'Master 1',   wins: 87,  level: 21, color: '#8C8F7A' },
];

const TABS = ['GLOBAL', 'REGIONAL', 'SEASON', 'YOUR RANK'] as const;
type TabKey = (typeof TABS)[number];
const REGIONS = ['NA', 'EU', 'APAC', 'LATAM'] as const;

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const [tab, setTab]    = useState<TabKey>('GLOBAL');
  const [region, setRegion] = useState<'NA'|'EU'|'APAC'|'LATAM'>('NA');

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  function findPlayerRank(): number {
    const sorted = [...GLOBAL_LEADERS, { name: profile.name, rank: profile.rank, wins: profile.wins, xp: profile.xp, level: profile.competitiveLevel ?? 1, color: '#C99A2E' }]
      .sort((a, b) => b.xp - a.xp);
    return sorted.findIndex(p => p.name === profile.name) + 1;
  }

  const playerPosition = findPlayerRank();
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const focusStyle = useFocusAnimation();

  return (
    <Reanimated.View style={[styles.root, { backgroundColor: colors.background }, focusStyle]}>
      <FloatingOrbs opacity={0.7} />
      <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#C99A2E22', '#C99A2E0E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#16171A88']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 2.5, color: '#ECE7DC44', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>LEADERBOARD</Text>
        </View>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>LVL {profile.competitiveLevel ?? 1}</Text>
        </View>
      </View>

      {/* Season banner */}
      <View style={[styles.seasonBanner, { backgroundColor: '#B4533A18', borderColor: '#B4533A44' }]}>
        <Feather name="calendar" size={13} color="#B4533A" />
        <Text style={[styles.seasonText, { color: '#B4533A' }]}>Season 7 Active · 18 days remaining</Text>
        <View style={[styles.rewardBadge, { backgroundColor: '#B4533A22' }]}>
          <Text style={[styles.rewardText, { color: '#B4533A' }]}>SEASON REWARDS</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollWrap} contentContainerStyle={styles.tabRow}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && { borderBottomColor: colors.primary }]}>
            {tab === t
              ? <GlowText intensity="soft" color={colors.primary} style={styles.tabText}>{t}</GlowText>
              : <Text style={[styles.tabText, { color: colors.mutedForeground }]}>{t}</Text>
            }
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {tab === 'GLOBAL' && (
          <>
            <View style={styles.podium}>
              {[GLOBAL_LEADERS[1], GLOBAL_LEADERS[0], GLOBAL_LEADERS[2]].map((p, i) => {
                const pos = i === 0 ? 2 : i === 1 ? 1 : 3;
                const heights = [90, 110, 75];
                return (
                  <View key={p.name} style={[styles.podiumSpot, { height: heights[i] + 50 }]}>
                    <View style={[styles.podiumAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                      <Text style={[styles.podiumAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                    </View>
                    <GlowText intensity="soft" color={p.color} style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</GlowText>
                    <Text style={[styles.podiumLevel, { color: p.color }]}>LVL {p.level}</Text>
                    <LinearGradient colors={[p.color + '55', p.color + '18']} style={[styles.podiumBlock, { height: heights[i], borderWidth: 1, borderColor: p.color + '44', borderRadius: 3 }]}>
                      <Glyph style={{ fontSize: pos === 1 ? 18 : 14 }} value={pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'} />
                      <GlowText intensity="strong" color={p.color} style={[styles.podiumPos, { color: p.color, fontSize: pos === 1 ? 22 : 18 }]}>{String(pos)}</GlowText>
                      <Text style={[styles.podiumWins, { color: colors.mutedForeground }]}>{p.wins}W</Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#C99A2E' }}>NEARBY PLAYERS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: '#ECE7DC33', letterSpacing: 1 }}>RANKED</Text>
            </View>
            <View style={styles.list}>
              {GLOBAL_LEADERS.slice(3).map((p, i) => {
                const isMe = p.name === profile.name;
                const rowContent = (
                  <View style={[styles.row, { backgroundColor: colors.card, borderColor: isMe ? '#C99A2E' : colors.border }]}>
                    <Text style={[styles.rowPos, { color: colors.mutedForeground }]}>{i + 4}</Text>
                    <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                      <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{p.rank} · LVL {p.level}</Text>
                    </View>
                    <RankBadge rank={p.rank} size="sm" showLabel={false} />
                    <Text style={[styles.rowWins, { color: colors.foreground }]}>{p.wins}W</Text>
                  </View>
                );
                return (
                  <Reanimated.View key={p.name} entering={FadeInRight.delay(i * 60).duration(300)}>
                    {isMe ? <GlowBorder color="#C99A2E" borderRadius={3} spread={8}>{rowContent}</GlowBorder> : rowContent}
                  </Reanimated.View>
                );
              })}
            </View>
          </>
        )}

        {tab === 'REGIONAL' && (
          <View style={styles.list}>
            {/* Region picker */}
            <View style={styles.regionRow}>
              {REGIONS.map(r => (
                <Pressable key={r} onPress={() => setRegion(r)}
                  style={[styles.regionBtn, region === r && styles.regionBtnActive]}>
                  <Text style={[styles.regionBtnText, region === r && { color: '#C99A2E' }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            {(REGIONAL_LEADERS[region] ?? []).map((p, i) => (
              <Reanimated.View key={p.name} entering={FadeInRight.delay(i * 60).duration(300)}>
                <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.rowPos, { color: i < 3 ? '#C99A2E' : colors.mutedForeground }]}>{i + 1}</Text>
                  <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                    <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.foreground }]}>{p.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{p.rank}</Text>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>LVL {p.level}</Text>
                  </View>
                  <Text style={[styles.rowWins, { color: colors.foreground }]}>{p.wins}W</Text>
                </View>
              </Reanimated.View>
            ))}
          </View>
        )}

        {tab === 'SEASON' && (
          <View style={styles.list}>
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 0.4 }]}>#</Text>
              <Text style={[styles.th, { color: colors.mutedForeground, flex: 2 }]}>PLAYER</Text>
              <Text style={[styles.th, { color: colors.mutedForeground }]}>LVL</Text>
              <Text style={[styles.th, { color: colors.mutedForeground }]}>WINS</Text>
            </View>
            {SEASON_LEADERS.map((p, i) => (
              <Reanimated.View key={p.name} entering={FadeInRight.delay(i * 60).duration(300)}>
                <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.rowPos, { color: i < 3 ? '#C99A2E' : colors.mutedForeground }]}>{i + 1}</Text>
                  <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                    <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.foreground }]}>{p.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{p.rank}</Text>
                  </View>
                  <Text style={[styles.rowWins, { color: '#6F8A5B', width: 36, textAlign: 'right' }]}>{p.level}</Text>
                  <Text style={[styles.rowWins, { color: colors.foreground }]}>{p.wins}W</Text>
                </View>
              </Reanimated.View>
            ))}
          </View>
        )}

        {tab === 'YOUR RANK' && (
          <View style={styles.yourRank}>
            <View style={[styles.playerRankCard, { backgroundColor: colors.card, borderColor: rankData.color + '55' }]}>
              <LinearGradient colors={[rankData.color + '22', rankData.color + '08']} style={StyleSheet.absoluteFill} />
              <RankBadge rank={profile.rank} size="lg" />
              <View style={styles.rankStats}>
                <Text style={[styles.rankName, { color: colors.foreground }]}>{profile.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.rankPos, { color: rankData.color }]}>Global #{playerPosition}</Text>
                  <View style={[styles.levelBadge, { borderColor: rankData.color + '55', backgroundColor: rankData.color + '22' }]}>
                    <Text style={[styles.levelBadgeText, { color: rankData.color }]}>LVL {profile.competitiveLevel ?? 1}/50</Text>
                  </View>
                </View>
                <View style={styles.rankStatsRow}>
                  {[
                    { l: 'Wins', v: String(profile.wins) },
                    { l: 'Games', v: String(profile.totalGames) },
                    { l: 'Win Rate', v: profile.totalGames > 0 ? `${Math.round(profile.wins / profile.totalGames * 100)}%` : '0%' },
                  ].map(stat => (
                    <View key={stat.l} style={styles.rStat}>
                      <Text style={[styles.rStatV, { color: colors.foreground }]}>{stat.v}</Text>
                      <Text style={[styles.rStatL, { color: colors.mutedForeground }]}>{stat.l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Competitive level progress */}
            <View style={[styles.lvlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.lvlHeader}>
                <Text style={[styles.lvlTitle, { color: colors.foreground }]}>Competitive Level</Text>
                <Text style={[styles.lvlNum, { color: '#C99A2E' }]}>{profile.competitiveLevel ?? 1} / 50</Text>
              </View>
              <View style={[styles.lvlTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.lvlFill, { width: `${((profile.competitiveLevel ?? 1) / 50) * 100}%` }]} />
              </View>
              <Text style={[styles.lvlSub, { color: colors.mutedForeground }]}>
                Peak: LVL {profile.highestLevel ?? 1}  ·  Win ranked matches to level up
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <View style={{ height: 1, backgroundColor: '#ECE7DC10', flex: 1 }} />
              <Text style={[styles.nearbyTitle, { color: colors.mutedForeground }]}>NEARBY PLAYERS</Text>
              <View style={{ height: 1, backgroundColor: '#ECE7DC10', flex: 1 }} />
            </View>
            {[...GLOBAL_LEADERS].sort((a, b) => b.xp - a.xp).slice(Math.max(0, playerPosition - 3), playerPosition + 2).map((p, i) => {
              const isMe = p.name === profile.name;
              const nearbyRow = (
                <View style={[styles.row, {
                  backgroundColor: isMe ? rankData.color + '22' : colors.card,
                  borderColor: isMe ? '#C99A2E' : colors.border,
                }]}>
                  <Text style={[styles.rowPos, { color: colors.mutedForeground }]}>{i + Math.max(1, playerPosition - 2)}</Text>
                  <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                    <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.rowName, { color: colors.foreground, flex: 1 }]}>{p.name}</Text>
                  <Text style={[styles.rowSub, { color: '#C99A2E', marginRight: 4 }]}>LVL {p.level}</Text>
                  <Text style={[styles.rowWins, { color: colors.mutedForeground }]}>{p.xp} XP</Text>
                </View>
              );
              return (
                <Reanimated.View key={p.name} entering={FadeInRight.delay(i * 60).duration(300)}>
                  {isMe ? <GlowBorder color="#C99A2E" borderRadius={3} spread={8}>{nearbyRow}</GlowBorder> : nearbyRow}
                </Reanimated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 19, letterSpacing: 2 },
  levelPill: { backgroundColor: '#C99A2E22', borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E55', paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#C99A2E', letterSpacing: 1 },
  seasonBanner: { marginHorizontal: 16, borderRadius: 3, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  seasonText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, flex: 1 },
  rewardBadge: { borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  rewardText: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1 },
  tabScrollWrap: { maxHeight: 44 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#ECE7DC14' },
  tab: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 1 },
  regionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  regionBtn: { flex: 1, borderRadius: 3, borderWidth: 1, borderColor: '#ECE7DC22', backgroundColor: '#ECE7DC08', paddingVertical: 8, alignItems: 'center' },
  regionBtnActive: { borderColor: '#C99A2E', backgroundColor: '#C99A2E15' },
  regionBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#ECE7DC55' },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 4 },
  podiumSpot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  podiumAvatar: { width: 40, height: 40, borderRadius: 3, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarText: { fontFamily: 'SourceSans3_700Bold', fontSize: 16 },
  podiumName: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, textAlign: 'center' },
  podiumLevel: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 0.5 },
  podiumBlock: { width: '100%', borderRadius: 3, alignItems: 'center', justifyContent: 'center', gap: 3 },
  podiumPos: { fontFamily: 'SourceSans3_700Bold', fontSize: 20 },
  podiumWins: { fontFamily: 'SourceSans3_700Bold', fontSize: 10 },
  list: { paddingHorizontal: 16, gap: 6, paddingTop: 4 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1 },
  th: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 3, borderWidth: 1, gap: 10 },
  rowPos: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, width: 22, textAlign: 'center' },
  rowAvatar: { width: 32, height: 32, borderRadius: 3, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  rowName: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  rowSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 10, marginTop: 1 },
  rowWins: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, width: 48, textAlign: 'right' },
  levelBadge: { borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E44', backgroundColor: '#C99A2E11', paddingHorizontal: 6, paddingVertical: 2 },
  levelBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, color: '#C99A2E' },
  yourRank: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  playerRankCard: { borderRadius: 3, borderWidth: 1.5, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },
  rankStats: { flex: 1, gap: 4 },
  rankName: { fontFamily: 'SourceSans3_700Bold', fontSize: 18 },
  rankPos: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, letterSpacing: 1 },
  rankStatsRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  rStat: { alignItems: 'center', gap: 3 },
  rStatV: { fontFamily: 'SourceSans3_700Bold', fontSize: 18 },
  rStatL: { fontFamily: 'SourceSans3_700Bold', fontSize: 8, letterSpacing: 1.5 },
  lvlCard: { borderRadius: 3, borderWidth: 1, padding: 14, gap: 8 },
  lvlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lvlTitle: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 14 },
  lvlNum: { fontFamily: 'SourceSans3_700Bold', fontSize: 18 },
  lvlTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  lvlFill: { height: '100%', borderRadius: 4, backgroundColor: '#C99A2E' },
  lvlSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 11 },
  nearbyTitle: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 1.5, paddingTop: 4 },
});
