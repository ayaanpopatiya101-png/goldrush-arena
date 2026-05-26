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
import { RankBadge } from '@/components/RankBadge';
import { RANKS, SKINS, usePlayer, xpForNextRank, xpToLevel } from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';
import { useColors } from '@/hooks/useColors';

const BOT_NAMES = ['Blaze_99', 'IceQueen', 'Venom_X', 'ShadowFX', 'NeonBlitz', 'DarkMatter'];
const BOT_RANKS = ['Platinum', 'Diamond', 'Master', 'Gold', 'Platinum', 'Silver'];

function MiniArena() {
  const ballX = useRef(new Animated.Value(60)).current;
  const ballY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ballX, { toValue: 110, duration: 900, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 20, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 20, duration: 700, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 90, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 100, duration: 800, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 60, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 60, duration: 600, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 100, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={mini.arena}>
      <LinearGradient colors={['#06061A', '#0A0A20']} style={StyleSheet.absoluteFill} />
      <View style={[mini.paddleH, { bottom: 8, left: 30, backgroundColor: '#FFD700' }]} />
      <View style={[mini.paddleH, { top: 8, left: 50, backgroundColor: '#FF4757' }]} />
      <View style={[mini.paddleV, { left: 8, top: 35, backgroundColor: '#00BFFF' }]} />
      <View style={[mini.paddleV, { right: 8, top: 50, backgroundColor: '#00FF88' }]} />
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

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
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
  const xpProgress = rankInfo.progress;
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#080812' }} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#080814', '#0C0C22', '#080814']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.playerInfo}>
            <View style={[styles.avatar, { borderColor: rankData.color, backgroundColor: rankData.color + '22' }]}>
              <Text style={[styles.avatarText, { color: rankData.color }]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.playerName, { color: colors.foreground }]}>{profile.name}</Text>
              <Text style={[styles.levelText, { color: colors.mutedForeground }]}>Level {xpToLevel(profile.xp)}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <RankBadge rank={profile.rank} size="sm" showLabel={false} />
            <View style={styles.coinBadge}>
              <Feather name="circle" size={12} color="#FFD700" />
              <Text style={styles.coinText}>{profile.coins}</Text>
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBar}>
          <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
            <Animated.View style={[styles.xpFill, { width: `${xpProgress * 100}%` as never, backgroundColor: rankData.color }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
            {rankInfo.next ? `${rankInfo.remaining} XP to ${rankInfo.next}` : 'MAX RANK'}
          </Text>
        </View>

        {/* Mini arena preview */}
        <View style={styles.arenaPreviewWrap}>
          <MiniArena />
          <Text style={styles.gameTitle}>GOLDRUSH ARENA</Text>
          <Text style={[styles.gameSubtitle, { color: colors.mutedForeground }]}>4-PLAYER AIR HOCKEY · SURVIVE TO WIN</Text>
        </View>

        {/* Play button */}
        <View style={styles.playWrap}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable onPress={handlePlay} style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={['#FFE020', '#FFB800']} style={styles.playBtnGrad}>
                <Feather name="play" size={28} color="#080814" />
                <Text style={styles.playBtnText}>PLAY NOW</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'WINS', value: String(profile.wins), icon: 'award' },
            { label: 'WIN RATE', value: profile.totalGames > 0 ? `${Math.round(profile.wins / profile.totalGames * 100)}%` : '—', icon: 'percent' },
            { label: 'STREAK', value: String(profile.winStreak), icon: 'zap' },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={stat.icon as never} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily challenge */}
        <View style={[styles.challengeCard, { backgroundColor: colors.card, borderColor: '#FFD70044' }]}>
          <View style={styles.challengeHeader}>
            <Feather name="sun" size={16} color="#FFD700" />
            <Text style={[styles.challengeTitle, { color: '#FFD700' }]}>DAILY CHALLENGE</Text>
          </View>
          <Text style={[styles.challengeDesc, { color: colors.foreground }]}>Win 3 matches today</Text>
          <View style={styles.challengeProgress}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.challengeDot, {
                backgroundColor: i < (profile.wins % 3) ? '#FFD700' : colors.muted
              }]} />
            ))}
            <Text style={[styles.challengeReward, { color: colors.mutedForeground }]}>+100 coins</Text>
          </View>
        </View>

        {/* Season info */}
        <View style={[styles.seasonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={['#FF450011', '#FF450000']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <Feather name="calendar" size={14} color="#FF4757" />
          <Text style={[styles.seasonText, { color: colors.foreground }]}>Season 7 · Ranked is LIVE</Text>
          <View style={[styles.seasonBadge, { backgroundColor: '#FF475722', borderColor: '#FF475755' }]}>
            <Text style={[styles.seasonBadgeText, { color: '#FF4757' }]}>ACTIVE</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const mini = StyleSheet.create({
  arena: { width: 140, height: 120, overflow: 'hidden', borderRadius: 8 },
  paddleH: { position: 'absolute', width: 40, height: 7, borderRadius: 3.5 },
  paddleV: { position: 'absolute', width: 7, height: 40, borderRadius: 3.5 },
  ball: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  border: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 8 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  levelText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70022', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  coinText: { color: '#FFD700', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  xpBar: { paddingHorizontal: 20, marginBottom: 20, gap: 4 },
  xpTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 2 },
  xpText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  arenaPreviewWrap: { alignItems: 'center', paddingVertical: 12, gap: 10 },
  gameTitle: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: 3, textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  gameSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1.5 },
  playWrap: { paddingHorizontal: 24, marginBottom: 24 },
  playBtn: { borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16 },
  playBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  playBtnText: { color: '#080814', fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1 },
  challengeCard: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  challengeDesc: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeDot: { width: 10, height: 10, borderRadius: 5 },
  challengeReward: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 4 },
  seasonCard: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' },
  seasonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  seasonBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seasonBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
});
