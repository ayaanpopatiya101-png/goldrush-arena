import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useEffect, useState } from 'react';
import {
  Animated, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Ellipse } from 'react-native-svg';

import { usePlayer, RANKS, getRankFromXP, xpForNextRank } from '@/context/PlayerContext';

const BG0  = '#08071A';
const BG1  = '#0F0C24';
const GOLD = '#F0B429';
const GOLDD= '#C8891A';
const WHITE= '#FFFFFF';
const MUTED= '#FFFFFF55';
const DIM  = '#FFFFFF18';
const CARD = '#FFFFFF07';
const BORDR= '#FFFFFF12';

const RANK_EMOJIS: Record<string, string> = {
  Iron:'🪨', Bronze:'🥉', Silver:'🥈', Gold:'🥇', Platinum:'💎', Diamond:'💠', Master:'⭐', Legend:'👑',
};

const MODES = [
  { id: 'casual',   label: 'Casual',   sub: 'Free-for-all fun',  icon: '🎮', color: '#3B82F6' },
  { id: 'ranked',   label: 'Ranked',   sub: 'Climb the ladder',  icon: '⚔️',  color: '#EF4444' },
  { id: 'duel',     label: 'Duel',     sub: '1v1 showdown',      icon: '🥊', color: '#8B5CF6' },
  { id: 'gauntlet', label: 'Gauntlet', sub: '7-round challenge', icon: '🏆', color: '#F59E0B' },
];

const QUICK = [
  { icon: '🛒', label: 'Shop',    route: '/(tabs)/shop'       },
  { icon: '📦', label: 'Gear',    route: '/(tabs)/inventory'  },
  { icon: '🗺️', label: 'Trophy',  route: '/(tabs)/trophyroad' },
  { icon: '🏆', label: 'Ranks',   route: '/(tabs)/leaderboard'},
  { icon: '👤', label: 'Profile', route: '/(tabs)/profile'    },
];

function ArenaSVG() {
  const pulse = useRef(new Animated.Value(0)).current;
  const puck  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(puck, { toValue: 1, duration: 950, useNativeDriver: true }),
        Animated.timing(puck, { toValue: 0, duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse, puck]);
  const ps = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] });
  const py = puck.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  return (
    <View style={S.arenaWrap}>
      <Animated.View style={{ transform: [{ scale: ps }] }}>
        <Svg width={150} height={150} viewBox="0 0 150 150">
          <Circle cx={75} cy={75} r={72} fill="#15123A" stroke={GOLD} strokeWidth={1.5} strokeOpacity={0.5} />
          <Circle cx={75} cy={75} r={55} fill="none"    stroke={GOLD} strokeWidth={0.8} strokeOpacity={0.15} />
          <Circle cx={75} cy={75} r={35} fill="none"    stroke={GOLD} strokeWidth={0.8} strokeOpacity={0.1} />
          <Line x1={3}  y1={75} x2={147} y2={75} stroke={GOLD} strokeWidth={0.8} strokeOpacity={0.2} />
          <Circle cx={75} cy={75} r={7}  fill="none"    stroke={GOLD} strokeWidth={1.2} strokeOpacity={0.35} />
          <Ellipse cx={75} cy={8}   rx={18} ry={4} fill="#EF4444" fillOpacity={0.7} />
          <Ellipse cx={75} cy={142} rx={18} ry={4} fill="#3B82F6" fillOpacity={0.7} />
        </Svg>
      </Animated.View>
      <Animated.View style={[S.puck, { transform: [{ translateY: py }] }]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const [modeIdx, setModeIdx] = useState(0);
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, useNativeDriver: true })).start();
  }, [ring]);
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const ringOp    = ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const xp        = profile?.xp ?? 0;
  const rankName  = getRankFromXP(xp);
  const rankData  = RANKS.find(r => r.name === rankName);
  const xpInfo    = xpForNextRank(xp);
  const xpPct     = xpInfo.progress;
  const mode      = MODES[modeIdx];

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[BG1, BG0]} style={StyleSheet.absoluteFill} />

      {/* HUD */}
      <View style={S.hud}>
        <View style={S.hudLeft}>
          <View style={S.avatar}>
            <Text style={{ fontSize: 17 }}>{profile?.avatarEmoji ?? '🎮'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={S.username} numberOfLines={1}>{profile?.name ?? '—'}</Text>
            <View style={S.xpRow}>
              <View style={S.xpBg}>
                <View style={[S.xpFill, { width: `${Math.round(xpPct * 100)}%` as `${number}%` }]} />
              </View>
              <Text style={S.xpTxt}>{xp} XP</Text>
            </View>
          </View>
        </View>
        <View style={S.hudRight}>
          <View style={S.chip}>
            <Text style={S.chipIcon}>{RANK_EMOJIS[rankName] ?? '🎖️'}</Text>
            <Text style={S.chipVal}>{rankName}</Text>
          </View>
          <View style={S.chip}>
            <Text style={S.chipIcon}>🪙</Text>
            <Text style={S.chipVal}>{profile?.coins ?? 0}</Text>
          </View>
          <Pressable onPress={() => router.push('/settings')} style={S.iconBtn}>
            <Text style={{ fontSize: 15 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Arena */}
        <View style={S.arenaCard}>
          <Text style={S.gameTitle}>GOLDRUSH ARENA</Text>
          <ArenaSVG />
          <View style={S.rankRow}>
            <Text style={{ fontSize: 14 }}>{RANK_EMOJIS[rankName] ?? '🎖️'}</Text>
            <Text style={[S.rankTxt, { color: rankData?.color ?? GOLD }]}>{rankName}  ·  Lv.{profile?.level ?? 1}</Text>
          </View>
        </View>

        {/* Quick nav */}
        <View style={S.quickRow}>
          {QUICK.map(q => (
            <Pressable key={q.label} onPress={() => router.push(q.route as Parameters<typeof router.push>[0])} style={S.quickBtn}>
              <Text style={{ fontSize: 18 }}>{q.icon}</Text>
              <Text style={S.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Game modes */}
        <Text style={S.secTitle}>GAME MODES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {MODES.map((m, i) => {
            const active = modeIdx === i;
            return (
              <Pressable key={m.id} onPress={() => setModeIdx(i)}
                style={[S.modeCard, { borderColor: active ? m.color + '80' : BORDR }]}>
                {active && <View style={[S.modeTopBar, { backgroundColor: m.color }]} />}
                <Text style={{ fontSize: 26, marginBottom: 4 }}>{m.icon}</Text>
                <Text style={[S.modeName, { color: active ? m.color : WHITE }]}>{m.label}</Text>
                <Text style={S.modeSub}>{m.sub}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Stats */}
        <Text style={S.secTitle}>YOUR STATS</Text>
        <View style={S.statsRow}>
          {[
            { label: 'WINS',   val: profile?.wins ?? 0 },
            { label: 'STREAK', val: profile?.winStreak ?? 0 },
            { label: 'GAMES',  val: profile?.totalGames ?? 0 },
          ].map(s => (
            <View key={s.label} style={S.statBox}>
              <Text style={S.statVal}>{s.val}</Text>
              <Text style={S.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Play bar */}
      <View style={[S.playBar, { paddingBottom: Math.max(insets.bottom - 50, 4) }]}>
        <View style={S.playBarBorder} />
        <View style={S.playRow}>
          <View style={S.modeInfo}>
            <Text style={{ fontSize: 22 }}>{mode.icon}</Text>
            <View>
              <Text style={S.modeInfoName}>{mode.label}</Text>
              <Text style={S.modeInfoSub}>{mode.sub}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push({ pathname: '/lobby', params: { matchType: mode.id } })} style={S.playBtnWrap}>
            <Animated.View style={[S.playRing, { transform: [{ scale: ringScale }], opacity: ringOp }]} />
            <LinearGradient colors={[GOLD, GOLDD]} style={S.playBtn}>
              <Text style={S.playTxt}>PLAY</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG0 },
  scroll:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  hud:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDR },
  hudLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GOLD + '44', flexShrink: 0 },
  username:{ fontFamily: 'Exo2_700Bold', fontSize: 13, color: WHITE },
  xpRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  xpBg:    { width: 76, height: 3, backgroundColor: DIM, borderRadius: 2, overflow: 'hidden' },
  xpFill:  { height: '100%', backgroundColor: GOLD, borderRadius: 2 },
  xpTxt:   { fontFamily: 'Exo2_500Medium', fontSize: 9, color: MUTED },
  hudRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipIcon:{ fontSize: 12 },
  chipVal: { fontFamily: 'Exo2_700Bold', fontSize: 12, color: WHITE },
  iconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center' },

  arenaCard:{ backgroundColor: CARD, borderWidth: 1, borderColor: GOLD + '22', borderRadius: 18, alignItems: 'center', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 12, marginBottom: 14 },
  gameTitle:{ fontFamily: 'Exo2_900Black', fontSize: 15, color: GOLD, letterSpacing: 3.5, marginBottom: 6 },
  arenaWrap:{ alignItems: 'center', justifyContent: 'center', height: 160 },
  puck:    { position: 'absolute', width: 13, height: 13, borderRadius: 7, backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  rankTxt: { fontFamily: 'Exo2_600SemiBold', fontSize: 11 },

  quickRow:  { flexDirection: 'row', gap: 8, marginBottom: 18 },
  quickBtn:  { flex: 1, alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDR, borderRadius: 12, paddingVertical: 10, gap: 4 },
  quickLabel:{ fontFamily: 'Exo2_600SemiBold', fontSize: 8, color: MUTED, letterSpacing: 0.5 },

  secTitle:  { fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED, letterSpacing: 2, marginBottom: 10 },
  modeCard:  { width: 118, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, padding: 14, gap: 2, overflow: 'hidden' },
  modeTopBar:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.9 },
  modeName:  { fontFamily: 'Exo2_700Bold', fontSize: 13 },
  modeSub:   { fontFamily: 'Exo2_400Regular', fontSize: 10, color: MUTED },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox:  { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDR, paddingVertical: 14, alignItems: 'center', gap: 3 },
  statVal:  { fontFamily: 'Exo2_900Black', fontSize: 24, color: WHITE },
  statLbl:  { fontFamily: 'Exo2_600SemiBold', fontSize: 9, color: MUTED, letterSpacing: 1.5 },

  playBar:      { borderTopWidth: 1, borderTopColor: BORDR, backgroundColor: BG0 + 'EE' },
  playBarBorder:{ height: 1, backgroundColor: GOLD + '28' },
  playRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  modeInfo:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeInfoName: { fontFamily: 'Exo2_700Bold', fontSize: 16, color: WHITE },
  modeInfoSub:  { fontFamily: 'Exo2_400Regular', fontSize: 11, color: MUTED },
  playBtnWrap:  { alignItems: 'center', justifyContent: 'center' },
  playRing:     { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, borderColor: GOLD },
  playBtn:      { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: GOLD, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  playTxt:      { fontFamily: 'Exo2_900Black', fontSize: 14, color: BG0, letterSpacing: 1.5 },
});
