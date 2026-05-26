import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { ACHIEVEMENTS, RANKS, usePlayer, xpForNextRank, xpToLevel } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

export default function PostGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    won: string; position: string; deflections: string;
    goalsAgainst: string; xpEarned: string; coinsEarned: string;
  }>();
  const { profile, unlockAchievement } = usePlayer();

  const won = params.won === '1';
  const position = parseInt(params.position ?? '4', 10);
  const deflections = parseInt(params.deflections ?? '0', 10);
  const goalsAgainst = parseInt(params.goalsAgainst ?? '0', 10);
  const xpEarned = parseInt(params.xpEarned ?? '50', 10);
  const coinsEarned = parseInt(params.coinsEarned ?? '15', 10);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showXP, setShowXP] = useState(false);

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const newXP = profile.xp + xpEarned;
  const newRank = (() => {
    let r = RANKS[0];
    for (const rank of RANKS) { if (newXP >= rank.minXP) r = rank; }
    return r;
  })();
  const promoted = newRank.name !== profile.rank;

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    if (Platform.OS !== 'web') {
      if (won) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      setShowXP(true);
      const prevProgress = rankInfo.progress;
      Animated.timing(xpBarAnim, { toValue: prevProgress, duration: 0, useNativeDriver: false }).start(() => {
        const newProgress = xpForNextRank(newXP).progress;
        Animated.timing(xpBarAnim, { toValue: newProgress, duration: 1200, useNativeDriver: false }).start();
      });
    }, 600);

    // Check achievements
    async function checkAchievements() {
      if (won) {
        const name = await unlockAchievement('first_win');
        if (name) { setNewAchievement(name); return; }
      }
      if (deflections >= 10) {
        const name = await unlockAchievement('hat_trick');
        if (name) { setNewAchievement(name); return; }
      }
      if (profile.totalGames >= 99) {
        const name = await unlockAchievement('century');
        if (name) { setNewAchievement(name); return; }
      }
    }
    checkAchievements();
  }, []);

  const positionLabels = ['', '1ST', '2ND', '3RD', '4TH'];
  const positionColors = ['', '#FFD700', '#C0C0C0', '#CD7F32', '#8B8B8B'];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={won ? ['#0A140A', '#0A1A0A', '#0A0A14'] : ['#140A0A', '#1A0A0A', '#0A0A14']}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars/particles background */}
      {won && Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={[styles.star, {
          top: `${10 + i * 11}%` as never, left: `${5 + i * 12}%` as never,
          backgroundColor: '#FFD700', opacity: 0.15 + i * 0.05,
        }]} />
      ))}

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingTop: topPad + 10 }]}>
        {/* Result banner */}
        <Animated.View style={[styles.resultBanner, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={won ? ['#FFD70033', '#FFD70011'] : ['#FF475733', '#FF475711']}
            style={styles.bannerGrad}
          >
            <Text style={[styles.positionText, { color: positionColors[position] ?? '#8B8B8B' }]}>
              {positionLabels[position] ?? '4TH'}
            </Text>
            <Text style={[styles.resultText, { color: won ? '#FFD700' : '#FF4757' }]}>
              {won ? 'VICTORY!' : position === 2 ? 'RUNNER-UP' : position === 3 ? 'THIRD PLACE' : 'ELIMINATED'}
            </Text>
            {won && <Text style={styles.victoryEmoji}>🏆</Text>}
          </LinearGradient>
        </Animated.View>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.mutedForeground }]}>MATCH STATS</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Deflections', value: String(deflections), color: '#00FF88' },
              { label: 'Goals Against', value: String(goalsAgainst), color: '#FF4757' },
              { label: 'XP Earned', value: `+${xpEarned}`, color: rankData.color },
              { label: 'Coins', value: `+${coinsEarned}`, color: '#FFD700' },
            ].map(stat => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* XP Progress */}
        {showXP && (
          <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.xpHeader}>
              <RankBadge rank={profile.rank} size="sm" showLabel={false} />
              <Text style={[styles.xpLabel, { color: colors.foreground }]}>
                {promoted ? `RANK UP! → ${newRank.name}` : `${profile.rank} Rank`}
              </Text>
              {promoted && <Text style={[styles.rankUpBadge, { color: '#00FF88', borderColor: '#00FF88' }]}>↑ PROMOTED</Text>}
            </View>
            <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
              <Animated.View style={[styles.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: rankData.color,
              }]} />
            </View>
            <Text style={[styles.xpSub, { color: colors.mutedForeground }]}>
              Level {xpToLevel(profile.xp)} → {xpToLevel(newXP)} · Total: {newXP} XP
            </Text>
          </View>
        )}

        {/* Achievement unlock */}
        {newAchievement && (
          <View style={[styles.achieveCard, { borderColor: '#FFD700' }]}>
            <LinearGradient colors={['#FFD70022', '#FFD70008']} style={StyleSheet.absoluteFill} />
            <Feather name="award" size={20} color="#FFD700" />
            <View style={{ flex: 1 }}>
              <Text style={styles.achieveTitle}>Achievement Unlocked!</Text>
              <Text style={[styles.achieveName, { color: '#FFD700' }]}>{newAchievement}</Text>
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable
            onPress={() => router.replace('/lobby')}
            style={({ pressed }) => [styles.playAgainBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient colors={['#FFE020', '#FFB800']} style={styles.playAgainGrad}>
              <Feather name="refresh-cw" size={18} color="#080814" />
              <Text style={styles.playAgainText}>PLAY AGAIN</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.homeBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Feather name="home" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Win streak */}
        {profile.winStreak > 1 && (
          <Text style={[styles.streakText, { color: '#FF6B35' }]}>
            🔥 {profile.winStreak} win streak
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  content: { flex: 1, paddingHorizontal: 20, gap: 14, alignItems: 'stretch' },
  resultBanner: { alignItems: 'center', overflow: 'hidden', borderRadius: 20 },
  bannerGrad: { width: '100%', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, gap: 4, borderRadius: 20 },
  positionText: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 3 },
  resultText: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: 4 },
  victoryEmoji: { fontSize: 40, marginTop: 4 },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  statsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', gap: 2 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  xpCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  xpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  rankUpBadge: { fontFamily: 'Inter_700Bold', fontSize: 10, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  xpSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  achieveCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  achieveTitle: { color: '#FFFFFF88', fontFamily: 'Inter_500Medium', fontSize: 11 },
  achieveName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 10 },
  playAgainBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', elevation: 4, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 },
  playAgainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  playAgainText: { color: '#080814', fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1 },
  homeBtn: { width: 54, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  streakText: { textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
