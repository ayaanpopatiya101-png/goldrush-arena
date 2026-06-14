import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { RANKS, usePlayer } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

const GLOBAL_LEADERS = [
  { name: 'NightViper', rank: 'Legend', wins: 2847, xp: 52000, level: 48, color: '#FFD700' },
  { name: 'CrystalX',   rank: 'Legend', wins: 2614, xp: 48500, level: 46, color: '#B9F2FF' },
  { name: 'Inferno_K',  rank: 'Master', wins: 1990, xp: 38200, level: 41, color: '#FF4757' },
  { name: 'ZeroGravity',rank: 'Master', wins: 1823, xp: 34700, level: 39, color: '#FF6B35' },
  { name: 'Blaze_99',   rank: 'Platinum',wins: 1450, xp: 28000, level: 33, color: '#FF4757' },
  { name: 'IceQueen',   rank: 'Diamond', wins: 1380, xp: 25600, level: 30, color: '#00BFFF' },
  { name: 'Venom_X',    rank: 'Master',  wins: 1270, xp: 22100, level: 27, color: '#00FF88' },
  { name: 'ShadowFX',   rank: 'Diamond', wins: 1100, xp: 19800, level: 24, color: '#9B59B6' },
  { name: 'PulseWave',  rank: 'Diamond', wins: 980,  xp: 17600, level: 21, color: '#FF00FF' },
  { name: 'NeonBlitz',  rank: 'Platinum',wins: 870,  xp: 15200, level: 18, color: '#FF6B35' },
];

const REGIONAL_LEADERS: Record<string, Array<{name:string;rank:string;wins:number;level:number;color:string}>> = {
  NA: [
    { name: 'NightViper',  rank: 'Legend',   wins: 2847, level: 48, color: '#FFD700' },
    { name: 'Blaze_99',    rank: 'Platinum', wins: 1450, level: 33, color: '#FF4757' },
    { name: 'Venom_X',     rank: 'Master',   wins: 1270, level: 27, color: '#00FF88' },
    { name: 'DarkRift',    rank: 'Diamond',  wins: 940,  level: 22, color: '#8B8B8B' },
    { name: 'StormBreaker',rank: 'Gold',     wins: 620,  level: 14, color: '#FFD700' },
  ],
  EU: [
    { name: 'CrystalX',   rank: 'Legend',   wins: 2614, level: 46, color: '#B9F2FF' },
    { name: 'IceQueen',   rank: 'Diamond',  wins: 1380, level: 30, color: '#00BFFF' },
    { name: 'ShadowFX',   rank: 'Diamond',  wins: 1100, level: 24, color: '#9B59B6' },
    { name: 'Ghostline',  rank: 'Platinum', wins: 880,  level: 20, color: '#FFFFFF88' },
    { name: 'VoidWalker', rank: 'Gold',     wins: 560,  level: 13, color: '#8800FF' },
  ],
  APAC: [
    { name: 'Inferno_K',  rank: 'Master',   wins: 1990, level: 41, color: '#FF4757' },
    { name: 'PulseWave',  rank: 'Diamond',  wins: 980,  level: 21, color: '#FF00FF' },
    { name: 'PixelHawk',  rank: 'Platinum', wins: 810,  level: 19, color: '#00E5FF' },
    { name: 'NeonSword',  rank: 'Gold',     wins: 540,  level: 12, color: '#FFD700' },
    { name: 'AstroKid',   rank: 'Silver',   wins: 280,  level: 7,  color: '#C0C0C0' },
  ],
  LATAM: [
    { name: 'ZeroGravity',rank: 'Master',   wins: 1823, level: 39, color: '#FF6B35' },
    { name: 'NeonBlitz',  rank: 'Platinum', wins: 870,  level: 18, color: '#FF6B35' },
    { name: 'TigerKing',  rank: 'Gold',     wins: 620,  level: 15, color: '#FFD700' },
    { name: 'LatinFury',  rank: 'Silver',   wins: 390,  level: 9,  color: '#C0C0C0' },
    { name: 'DragonX',    rank: 'Bronze',   wins: 180,  level: 4,  color: '#CD7F32' },
  ],
};

const SEASON_LEADERS = [
  { name: 'NightViper',  rank: 'Legend',   wins: 187, level: 48, color: '#FFD700' },
  { name: 'ZeroGravity', rank: 'Master',   wins: 164, level: 39, color: '#FF6B35' },
  { name: 'CrystalX',   rank: 'Legend',   wins: 159, level: 46, color: '#B9F2FF' },
  { name: 'Blaze_99',   rank: 'Platinum', wins: 143, level: 33, color: '#FF4757' },
  { name: 'Venom_X',    rank: 'Master',   wins: 138, level: 27, color: '#00FF88' },
  { name: 'IceQueen',   rank: 'Diamond',  wins: 121, level: 30, color: '#00BFFF' },
  { name: 'DarkMatter', rank: 'Platinum', wins: 98,  level: 20, color: '#8B8B8B' },
  { name: 'PulseWave',  rank: 'Diamond',  wins: 87,  level: 21, color: '#FF00FF' },
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
    const sorted = [...GLOBAL_LEADERS, { name: profile.name, rank: profile.rank, wins: profile.wins, xp: profile.xp, level: profile.competitiveLevel ?? 1, color: '#FFD700' }]
      .sort((a, b) => b.xp - a.xp);
    return sorted.findIndex(p => p.name === profile.name) + 1;
  }

  const playerPosition = findPlayerRank();
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#080814', '#0A0A1E']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>LEADERBOARD</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>LVL {profile.competitiveLevel ?? 1}</Text>
        </View>
      </View>

      {/* Season banner */}
      <View style={[styles.seasonBanner, { backgroundColor: '#FF475518', borderColor: '#FF475544' }]}>
        <Feather name="calendar" size={13} color="#FF4757" />
        <Text style={[styles.seasonText, { color: '#FF4757' }]}>Season 7 Active · 18 days remaining</Text>
        <View style={[styles.rewardBadge, { backgroundColor: '#FF475522' }]}>
          <Text style={[styles.rewardText, { color: '#FF4757' }]}>SEASON REWARDS</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollWrap} contentContainerStyle={styles.tabRow}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>{t}</Text>
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
                    <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.podiumLevel, { color: p.color }]}>LVL {p.level}</Text>
                    <LinearGradient colors={[p.color + '44', p.color + '22']} style={[styles.podiumBlock, { height: heights[i] }]}>
                      <Text style={[styles.podiumPos, { color: p.color }]}>{pos}</Text>
                      <Text style={[styles.podiumWins, { color: colors.mutedForeground }]}>{p.wins}W</Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
            <View style={styles.list}>
              {GLOBAL_LEADERS.slice(3).map((p, i) => (
                <View key={p.name} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              ))}
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
                  <Text style={[styles.regionBtnText, region === r && { color: '#FFD700' }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            {(REGIONAL_LEADERS[region] ?? []).map((p, i) => (
              <View key={p.name} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.rowPos, { color: i < 3 ? '#FFD700' : colors.mutedForeground }]}>{i + 1}</Text>
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
              <View key={p.name} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.rowPos, { color: i < 3 ? '#FFD700' : colors.mutedForeground }]}>{i + 1}</Text>
                <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                  <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{p.rank}</Text>
                </View>
                <Text style={[styles.rowWins, { color: '#00FF88', width: 36, textAlign: 'right' }]}>{p.level}</Text>
                <Text style={[styles.rowWins, { color: colors.foreground }]}>{p.wins}W</Text>
              </View>
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
                <Text style={[styles.lvlNum, { color: '#FFD700' }]}>{profile.competitiveLevel ?? 1} / 50</Text>
              </View>
              <View style={[styles.lvlTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.lvlFill, { width: `${((profile.competitiveLevel ?? 1) / 50) * 100}%` }]} />
              </View>
              <Text style={[styles.lvlSub, { color: colors.mutedForeground }]}>
                Peak: LVL {profile.highestLevel ?? 1}  ·  Win ranked matches to level up
              </Text>
            </View>

            <Text style={[styles.nearbyTitle, { color: colors.mutedForeground }]}>NEARBY PLAYERS</Text>
            {[...GLOBAL_LEADERS].sort((a, b) => b.xp - a.xp).slice(Math.max(0, playerPosition - 3), playerPosition + 2).map((p, i) => (
              <View key={p.name} style={[styles.row, {
                backgroundColor: p.name === profile.name ? rankData.color + '22' : colors.card,
                borderColor: p.name === profile.name ? rankData.color : colors.border,
              }]}>
                <Text style={[styles.rowPos, { color: colors.mutedForeground }]}>{i + Math.max(1, playerPosition - 2)}</Text>
                <View style={[styles.rowAvatar, { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                  <Text style={[styles.rowAvatarText, { color: p.color }]}>{p.name.charAt(0)}</Text>
                </View>
                <Text style={[styles.rowName, { color: colors.foreground, flex: 1 }]}>{p.name}</Text>
                <Text style={[styles.rowSub, { color: '#FFD700', marginRight: 4 }]}>LVL {p.level}</Text>
                <Text style={[styles.rowWins, { color: colors.mutedForeground }]}>{p.xp} XP</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  levelPill: { backgroundColor: '#FFD70022', borderRadius: 10, borderWidth: 1, borderColor: '#FFD70055', paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#FFD700', letterSpacing: 1 },
  seasonBanner: { marginHorizontal: 16, borderRadius: 10, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  seasonText: { fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1 },
  rewardBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rewardText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  tabScrollWrap: { maxHeight: 44 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#FFFFFF14' },
  tab: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 },
  regionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  regionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF22', backgroundColor: '#FFFFFF08', paddingVertical: 8, alignItems: 'center' },
  regionBtnActive: { borderColor: '#FFD700', backgroundColor: '#FFD70015' },
  regionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#FFFFFF55' },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 4 },
  podiumSpot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  podiumAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  podiumName: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  podiumLevel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  podiumBlock: { width: '100%', borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  podiumPos: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  podiumWins: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  list: { paddingHorizontal: 16, gap: 6, paddingTop: 4 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1 },
  th: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  rowPos: { fontFamily: 'Inter_700Bold', fontSize: 13, width: 22, textAlign: 'center' },
  rowAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  rowName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  rowWins: { fontFamily: 'Inter_700Bold', fontSize: 13, width: 48, textAlign: 'right' },
  levelBadge: { borderRadius: 6, borderWidth: 1, borderColor: '#FFD70044', backgroundColor: '#FFD70011', paddingHorizontal: 6, paddingVertical: 2 },
  levelBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFD700' },
  yourRank: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  playerRankCard: { borderRadius: 18, borderWidth: 1.5, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },
  rankStats: { flex: 1, gap: 4 },
  rankName: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  rankPos: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1 },
  rankStatsRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  rStat: { alignItems: 'center', gap: 2 },
  rStatV: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  rStatL: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  lvlCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  lvlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lvlTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  lvlNum: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  lvlTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  lvlFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFD700' },
  lvlSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  nearbyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, paddingTop: 4 },
});
