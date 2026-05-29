import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { RankBadge } from '@/components/RankBadge';
import { RANKS, SKINS, usePlayer, xpForNextRank, xpToLevel } from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';
import { useColors } from '@/hooks/useColors';

function MiniArena() {
  const ballX = useRef(new Animated.Value(60)).current;
  const ballY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ballX, { toValue: 110, duration: 800, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 20, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 25, duration: 650, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 90, duration: 650, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 100, duration: 700, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 55, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 60, duration: 550, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 100, duration: 550, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={mini.arena}>
      <LinearGradient colors={['#0D0035', '#1A0060', '#0D0035']} style={StyleSheet.absoluteFill} />
      {/* Active wall strips */}
      <View style={[mini.wallH, { bottom: 0, backgroundColor: '#FFD70088' }]} />
      <View style={[mini.wallH, { top: 0, backgroundColor: '#FF475788' }]} />
      <View style={[mini.wallV, { left: 0, backgroundColor: '#00BFFF88' }]} />
      <View style={[mini.wallV, { right: 0, backgroundColor: '#00FF8888' }]} />
      {/* Paddles */}
      <View style={[mini.paddleH, { bottom: 10, left: 30, backgroundColor: '#FFD700' }]} />
      <View style={[mini.paddleH, { top: 10, left: 50, backgroundColor: '#FF4757' }]} />
      <View style={[mini.paddleV, { left: 10, top: 35, backgroundColor: '#00BFFF' }]} />
      <View style={[mini.paddleV, { right: 10, top: 50, backgroundColor: '#00FF88' }]} />
      {/* Ball */}
      <Animated.View style={[mini.ball, { transform: [{ translateX: ballX }, { translateY: ballY }] }]} />
      <View style={mini.border} />
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, isLoaded } = usePlayer();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  function handlePlay() {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name,
      playerSkinId: skin.id,
      playerColor: skin.color,
      playerGlowColor: skin.glowColor,
    });
    router.push('/lobby');
  }

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#0D0035' }} />;

  return (
    <View style={styles.root}>
      {/* Vibrant purple/indigo background */}
      <LinearGradient
        colors={['#0A0028', '#150050', '#0A0028']}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle radial glow in center */}
      <Svg style={StyleSheet.absoluteFill as never} pointerEvents="none">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="40%" r="55%">
            <Stop offset="0%" stopColor="#6600FF" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#6600FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="40%" r="100%" fill="url(#bg)" />
      </Svg>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.playerInfo}>
            <View style={[styles.avatar, { borderColor: rankData.color, backgroundColor: rankData.color + '33' }]}>
              <Text style={[styles.avatarText, { color: rankData.color }]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.playerName}>{profile.name}</Text>
              <Text style={[styles.levelText, { color: colors.mutedForeground }]}>Level {xpToLevel(profile.xp)}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <RankBadge rank={profile.rank} size="sm" showLabel={false} />
            <View style={styles.coinBadge}>
              <Feather name="circle" size={11} color="#FFD700" />
              <Text style={styles.coinText}>{profile.coins}</Text>
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBar}>
          <View style={[styles.xpTrack, { backgroundColor: '#FFFFFF15' }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
            {rankInfo.next ? `${rankInfo.remaining} XP to ${rankInfo.next}` : 'MAX RANK'}
          </Text>
        </View>

        {/* Mini arena */}
        <View style={styles.arenaWrap}>
          <MiniArena />
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Animated.Text style={[styles.gameTitle, {
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
          }]}>
            GOLDRUSH ARENA
          </Animated.Text>
          <Text style={styles.gameSubtitle}>4-PLAYER AIR HOCKEY · LAST ONE STANDING WINS</Text>
        </View>

        {/* Play button */}
        <View style={styles.playWrap}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable onPress={handlePlay} style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.88 }]}>
              <LinearGradient colors={['#FFE233', '#FFAA00']} style={styles.playBtnGrad}>
                <Feather name="play" size={28} color="#080814" />
                <Text style={styles.playBtnText}>PLAY NOW</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Mode info cards */}
        <View style={styles.modeRow}>
          {[
            { icon: 'grid', label: '4-PLAYER', desc: 'All 4 sides active', color: '#FFD700' },
            { icon: 'triangle', label: 'TRIANGLE', desc: '3 survive → new shape', color: '#00FF88' },
            { icon: 'zap', label: '1v1 DUEL', desc: 'Final 2 go head-to-head', color: '#FF4757' },
          ].map(m => (
            <View key={m.label} style={[styles.modeCard, { borderColor: m.color + '44', backgroundColor: m.color + '0F' }]}>
              <Feather name={m.icon as never} size={18} color={m.color} />
              <Text style={[styles.modeLabel, { color: m.color }]}>{m.label}</Text>
              <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'WINS', value: String(profile.wins), icon: 'award' },
            { label: 'WIN RATE', value: profile.totalGames > 0 ? `${Math.round(profile.wins / profile.totalGames * 100)}%` : '—', icon: 'percent' },
            { label: 'STREAK', value: String(profile.winStreak), icon: 'zap' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: '#FFFFFF0A', borderColor: '#FFFFFF18' }]}>
              <Feather name={stat.icon as never} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: '#F0F0FF' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily challenge */}
        <View style={[styles.challengeCard, { backgroundColor: '#FFD70015', borderColor: '#FFD70044' }]}>
          <View style={styles.challengeHeader}>
            <Feather name="sun" size={15} color="#FFD700" />
            <Text style={styles.challengeTitle}>DAILY CHALLENGE</Text>
          </View>
          <Text style={styles.challengeDesc}>Win 3 matches today</Text>
          <View style={styles.challengeProgress}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.challengeDot, {
                backgroundColor: i < (profile.wins % 3) ? '#FFD700' : '#FFFFFF22'
              }]} />
            ))}
            <Text style={[styles.challengeReward, { color: colors.mutedForeground }]}>+100 coins reward</Text>
          </View>
        </View>

        {/* Season banner */}
        <View style={[styles.seasonCard, { backgroundColor: '#FF475715', borderColor: '#FF475744' }]}>
          <Feather name="calendar" size={13} color="#FF4757" />
          <Text style={[styles.seasonText, { color: '#F0F0FF' }]}>Season 7 · Ranked is LIVE</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const mini = StyleSheet.create({
  arena: { width: 150, height: 120, overflow: 'hidden', borderRadius: 10 },
  wallH: { position: 'absolute', left: 0, right: 0, height: 4 },
  wallV: { position: 'absolute', top: 0, bottom: 0, width: 4 },
  paddleH: { position: 'absolute', width: 44, height: 7, borderRadius: 3.5 },
  paddleV: { position: 'absolute', width: 7, height: 40, borderRadius: 3.5 },
  ball: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  border: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.5, borderColor: '#FFFFFF30', borderRadius: 10 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#F0F0FF' },
  levelText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70022', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  coinText: { color: '#FFD700', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  xpBar: { paddingHorizontal: 20, marginBottom: 16, gap: 4 },
  xpTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  xpText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  arenaWrap: { alignItems: 'center', marginBottom: 12 },
  titleWrap: { alignItems: 'center', gap: 4, marginBottom: 20, paddingHorizontal: 20 },
  gameTitle: {
    color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: 3.5,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
    textAlign: 'center',
  },
  gameSubtitle: { color: '#FFFFFF66', fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1.5, textAlign: 'center' },
  playWrap: { paddingHorizontal: 24, marginBottom: 20 },
  playBtn: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 8,
  },
  playBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  playBtnText: { color: '#080814', fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 2 },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  modeCard: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  modeLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  modeDesc: { fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', lineHeight: 13 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1 },
  challengeCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 7 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeTitle: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  challengeDesc: { color: '#F0F0FF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeDot: { width: 10, height: 10, borderRadius: 5 },
  challengeReward: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 4 },
  seasonCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  activeBadge: { backgroundColor: '#FF475733', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
});
