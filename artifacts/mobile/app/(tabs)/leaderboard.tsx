import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RANKS, usePlayer } from '@/context/PlayerContext';

const GLOBAL_LEADERS = [
  { name: 'NightViper', rank: 'Legend',   wins: 2847, xp: 52000, level: 48, color: '#C8820A',  emoji: '👑' },
  { name: 'CrystalX',   rank: 'Legend',   wins: 2614, xp: 48500, level: 46, color: '#B9F2FF',  emoji: '💎' },
  { name: 'Inferno_K',  rank: 'Master',   wins: 1990, xp: 38200, level: 41, color: '#FF4757',  emoji: '🔥' },
  { name: 'ZeroGravity',rank: 'Master',   wins: 1823, xp: 34700, level: 39, color: '#FF6B35',  emoji: '🌀' },
  { name: 'Blaze_99',   rank: 'Platinum', wins: 1450, xp: 28000, level: 33, color: '#FF4757',  emoji: '⚡' },
  { name: 'IceQueen',   rank: 'Diamond',  wins: 1380, xp: 25600, level: 30, color: '#00BFFF',  emoji: '❄️' },
  { name: 'Venom_X',    rank: 'Master',   wins: 1270, xp: 22100, level: 27, color: '#00FF88',  emoji: '🐍' },
  { name: 'ShadowFX',   rank: 'Diamond',  wins: 1100, xp: 19800, level: 24, color: '#9B59B6',  emoji: '👻' },
  { name: 'PulseWave',  rank: 'Diamond',  wins: 980,  xp: 17600, level: 21, color: '#FF00FF',  emoji: '🌊' },
  { name: 'NeonBlitz',  rank: 'Platinum', wins: 870,  xp: 15200, level: 18, color: '#FF6B35',  emoji: '💥' },
];

const SEASON_LEADERS = [
  { name: 'NightViper',  wins: 187, color: '#C8820A', emoji: '👑', rank: 'Legend',   level: 48 },
  { name: 'ZeroGravity', wins: 164, color: '#FF6B35', emoji: '🌀', rank: 'Master',   level: 39 },
  { name: 'CrystalX',   wins: 159, color: '#B9F2FF', emoji: '💎', rank: 'Legend',   level: 46 },
  { name: 'Blaze_99',   wins: 143, color: '#FF4757', emoji: '⚡', rank: 'Platinum', level: 33 },
  { name: 'Venom_X',    wins: 138, color: '#00FF88', emoji: '🐍', rank: 'Master',   level: 27 },
  { name: 'IceQueen',   wins: 121, color: '#00BFFF', emoji: '❄️', rank: 'Diamond',  level: 30 },
  { name: 'DarkMatter', wins: 98,  color: '#8B8B8B', emoji: '🌑', rank: 'Platinum', level: 20 },
  { name: 'PulseWave',  wins: 87,  color: '#FF00FF', emoji: '🌊', rank: 'Diamond',  level: 21 },
];

type Tab = 'GLOBAL' | 'SEASON' | 'YOUR RANK';

// ─── Podium step ──────────────────────────────────────────────────────────────
function PodiumStep({ player, position }: {
  player: typeof GLOBAL_LEADERS[0] & { emoji?: string }; position: 1 | 2 | 3;
}) {
  const rise   = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 800 + position * 100, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const podColor = position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32';
  const podH     = position === 1 ? 90 : position === 2 ? 70 : 55;
  const podW     = position === 1 ? 100 : 88;
  const glowOp   = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const riseY    = rise.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

  return (
    <Animated.View style={[
      PD.step,
      { width: podW, opacity: rise, transform: [{ translateY: riseY }] },
    ]}>
      {/* Player avatar */}
      <Animated.View style={[PD.avatarRing, { borderColor: podColor, shadowColor: podColor, shadowOpacity: glowOp }]}>
        <Text style={{ fontSize: position === 1 ? 28 : 22 }}>{player.emoji ?? '🎮'}</Text>
      </Animated.View>

      <Text style={[PD.name, { color: player.color }]} numberOfLines={1}>{player.name}</Text>
      <Text style={PD.wins}>{player.wins} W</Text>

      {/* Podium block */}
      <LinearGradient
        colors={[podColor + '55', podColor + '33', podColor + '11']}
        style={[PD.block, { height: podH, borderColor: podColor + '88' }]}
      >
        <Text style={[PD.pos, { color: podColor }]}>{medal}</Text>
        <Text style={[PD.posNum, { color: podColor }]}>#{position}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const PD = StyleSheet.create({
  step: { alignItems: 'center', gap: 4 },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF0A',
    shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  name: { fontFamily: 'Inter_700Bold', fontSize: 9, textAlign: 'center' },
  wins: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF55' },
  block: {
    width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10,
    borderWidth: 1.5, borderBottomWidth: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 8,
  },
  pos:    { fontSize: 18 },
  posNum: { fontFamily: 'Inter_900Black', fontSize: 13 },
});

// ─── Player row ───────────────────────────────────────────────────────────────
function PlayerRow({ player, rank, isYou }: {
  player: typeof GLOBAL_LEADERS[0]; rank: number; isYou?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400 + rank * 60, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[
      LB.row,
      isYou && LB.youRow,
      { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
    ]}>
      {isYou && <LinearGradient colors={['#E5A02022', '#E5A02008']} style={StyleSheet.absoluteFill} />}
      <Text style={[LB.rankNum, { color: rank <= 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][rank - 1] : '#FFFFFF44' }]}>
        {rank}
      </Text>
      <View style={[LB.avatar, { borderColor: player.color + '88', backgroundColor: player.color + '22' }]}>
        <Text style={{ fontSize: 16 }}>{(player as never as { emoji?: string }).emoji ?? '🎮'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[LB.name, isYou && { color: '#E5A020' }]}>{player.name}</Text>
          {isYou && <View style={LB.youBadge}><Text style={LB.youTxt}>YOU</Text></View>}
        </View>
        <Text style={LB.sub}>{player.rank} · Lv {player.level}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[LB.wins, { color: player.color }]}>{player.wins}</Text>
        <Text style={LB.winsLbl}>WINS</Text>
      </View>
    </Animated.View>
  );
}

const LB = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF0E',
    padding: 10, marginBottom: 6, overflow: 'hidden',
    backgroundColor: '#FFFFFF05',
  },
  youRow: { borderColor: '#E5A02044' },
  rankNum: { fontFamily: 'Inter_900Black', fontSize: 16, width: 28, textAlign: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name:   { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' },
  sub:    { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF44' },
  wins:   { fontFamily: 'Inter_900Black', fontSize: 16 },
  winsLbl:{ fontFamily: 'Inter_600SemiBold', fontSize: 7, color: '#FFFFFF44', letterSpacing: 1 },
  youBadge: { backgroundColor: '#E5A02033', borderWidth: 1, borderColor: '#E5A02066', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  youTxt: { color: '#E5A020', fontFamily: 'Inter_700Bold', fontSize: 7 },
});

// ─── Leaderboard screen ───────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const [tab, setTab] = useState<Tab>('GLOBAL');
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 56) : insets.top;

  const list = tab === 'SEASON' ? SEASON_LEADERS.map(p => ({ ...p, xp: p.wins * 200, emoji: p.emoji })) : GLOBAL_LEADERS;

  const playerEntry = { name: profile.name, rank: profile.rank, wins: profile.wins, xp: profile.xp, level: profile.competitiveLevel ?? 1, color: '#E5A020', emoji: '🎮' };
  const combined = [...list, playerEntry].sort((a, b) => b.xp - a.xp);
  const playerPos = combined.findIndex(p => p.name === profile.name) + 1;
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#07051A' }}>
      <LinearGradient colors={['#0E0B22', '#07051A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <LinearGradient colors={['#1A1530', '#0E0B22']} style={[L.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={L.title}>🏆 LEADERBOARD</Text>
          <Text style={L.sub}>Top players globally</Text>
        </View>
        <View style={[L.yourRankChip, { borderColor: rankData.color + '66', backgroundColor: rankData.color + '22' }]}>
          <Text style={{ fontSize: 16 }}>👤</Text>
          <View>
            <Text style={[L.yourRankNum, { color: rankData.color }]}>#{playerPos}</Text>
            <Text style={L.yourRankLbl}>YOUR RANK</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={L.tabRow}>
        {(['GLOBAL', 'SEASON', 'YOUR RANK'] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[L.tab, tab === t && L.tabActive]}>
            <Text style={[L.tabTxt, tab === t && L.tabTxtActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        {tab !== 'YOUR RANK' ? (
          <>
            {/* Podium */}
            <View style={L.podium}>
              <PodiumStep player={list[1] as never} position={2} />
              <PodiumStep player={list[0] as never} position={1} />
              <PodiumStep player={list[2] as never} position={3} />
            </View>

            {/* List */}
            {list.map((p, i) => (
              <PlayerRow key={p.name} player={p as never} rank={i + 1} isYou={p.name === profile.name} />
            ))}
            <PlayerRow player={playerEntry} rank={playerPos} isYou />
          </>
        ) : (
          <>
            {/* Your rank card */}
            <LinearGradient colors={[rankData.color + '44', rankData.color + '22', '#07051A']} style={L.yourCard}>
              <Text style={{ fontSize: 44 }}>👤</Text>
              <Text style={[L.yourName, { color: rankData.color }]}>{profile.name}</Text>
              <Text style={L.yourRankStr}>{profile.rank} · Lv {profile.competitiveLevel}</Text>
              <View style={L.yourStatsRow}>
                {[
                  { label: 'RANK', val: `#${playerPos}` },
                  { label: 'WINS', val: String(profile.wins) },
                  { label: 'XP',   val: profile.xp.toLocaleString() },
                ].map(s => (
                  <View key={s.label} style={L.yourStat}>
                    <Text style={[L.yourStatVal, { color: rankData.color }]}>{s.val}</Text>
                    <Text style={L.yourStatLbl}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* Nearby players */}
            <Text style={L.nearbyTitle}>NEARBY PLAYERS</Text>
            {combined.slice(Math.max(0, playerPos - 2), playerPos + 3).map((p, i) => (
              <PlayerRow key={p.name + i} player={p as never} rank={Math.max(0, playerPos - 2) + i + 1} isYou={p.name === profile.name} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const L = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E',
  },
  title: { fontFamily: 'Inter_900Black', fontSize: 22, color: '#FFD700', letterSpacing: 1 },
  sub:   { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF44', marginTop: 2 },
  yourRankChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8,
  },
  yourRankNum: { fontFamily: 'Inter_900Black', fontSize: 18 },
  yourRankLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 7, color: '#FFFFFF44', letterSpacing: 1 },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E',
    backgroundColor: '#0A0818',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E5A020' },
  tabTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 0.8 },
  tabTxtActive: { color: '#E5A020' },

  podium: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    gap: 12, marginBottom: 20, paddingTop: 10,
  },

  yourCard: {
    borderRadius: 22, borderWidth: 1.5, borderColor: '#FFFFFF1A',
    padding: 24, alignItems: 'center', gap: 8, marginBottom: 20, overflow: 'hidden',
  },
  yourName: { fontFamily: 'Inter_900Black', fontSize: 22 },
  yourRankStr: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#FFFFFF66' },
  yourStatsRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  yourStat: { alignItems: 'center', gap: 2 },
  yourStatVal: { fontFamily: 'Inter_900Black', fontSize: 20 },
  yourStatLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF44', letterSpacing: 1 },
  nearbyTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF44', letterSpacing: 2, marginBottom: 10 },
});
