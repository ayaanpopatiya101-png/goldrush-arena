import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '@/components/ui/Flat';
import { getStreakReward } from '@/context/PlayerContext';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

interface Props {
  visible: boolean;
  streak: number;
  onClaim: () => void;
  onDismiss: () => void;
}

const DAY_LABELS = ['1', '2', '3', '4', '5', '6', '7+'];
const WEEK_REWARDS = [50, 100, 150, 200, 250, 300, 500];

export function DailyStreakModal({ visible, streak, onClaim, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const coinAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      staticLoop(
        Animated.sequence([
          Animated.timing(coinAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(coinAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.7);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const reward    = getStreakReward(streak);
  const dayIndex  = Math.min(streak - 1, 6);
  const streakMsg = streak >= 7 ? 'LEGENDARY STREAK!' : streak >= 3 ? 'ON FIRE!' : 'WELCOME BACK!';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#2A2C31', '#16171A']} style={StyleSheet.absoluteFill} />
          <View style={s.border} />

          {/* Streak flame */}
          <Glyph style={[s.flame, {
            transform: [{ scale: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          }]} value={streak >= 7 ? '💎' : streak >= 5 ? '🔥' : streak >= 3 ? '⚡' : '🌟'} />

          <Text style={s.streakMsg}>{streakMsg}</Text>
          <Text style={s.streakSub}>Day {streak} Login Streak</Text>

          {/* 7-day calendar */}
          <View style={s.calendar}>
            {DAY_LABELS.map((label, i) => {
              const claimed  = i < dayIndex;
              const isToday  = i === dayIndex;
              const upcoming = i > dayIndex;
              return (
                <View key={i} style={s.dayCol}>
                  <View style={[
                    s.dayCircle,
                    claimed  && { backgroundColor: '#C99A2E33', borderColor: '#C99A2E' },
                    isToday  && { backgroundColor: '#C99A2E',   borderColor: '#C99A2E' },
                    upcoming && { backgroundColor: '#ECE7DC08', borderColor: '#ECE7DC22' },
                  ]}>
                    <Glyph style={[s.dayIcon, { color: isToday ? '#16171A' : claimed ? '#C99A2E' : '#ECE7DC44' }]} value={claimed ? '✓' : isToday ? '★' : label} />
                  </View>
                  <Text style={[s.dayReward, { color: isToday ? '#C99A2E' : upcoming ? '#ECE7DC33' : '#ECE7DC66' }]}>
                    {WEEK_REWARDS[i]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Today's reward */}
          <View style={s.rewardBox}>
            <Text style={s.rewardLabel}>TODAY'S REWARD</Text>
            <View style={s.rewardCoins}>
              <Glyph style={s.coinEmoji} value="🪙" />
              <Text style={s.coinAmount}>+{reward} COINS</Text>
            </View>
          </View>

          {/* Claim button */}
          <Pressable onPress={onClaim} style={({ pressed }) => [s.claimBtn, pressed && { opacity: 0.85 }]}>
            <LinearGradient colors={['#C99A2E', '#C99A2E']} style={s.claimGrad}>
              <Text style={s.claimText}>CLAIM REWARD</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDismiss} style={s.skipBtn}>
            <Text style={s.skipText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#16171ABB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 360, borderRadius: 3, overflow: 'hidden', padding: 24, alignItems: 'center', gap: 12 },
  border: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3, borderWidth: 1.5, borderColor: '#C99A2E33' },
  flame: { fontSize: 56, marginBottom: 4 },
  streakMsg: { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold', fontSize: 22, letterSpacing: 2, textAlign: 'center', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  streakSub: { color: '#ECE7DC88', fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, marginBottom: 4 },
  calendar: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayCircle: { width: 36, height: 36, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayIcon: { fontFamily: 'SourceSans3_700Bold', fontSize: 12 },
  dayReward: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 8 },
  rewardBox: { backgroundColor: '#C99A2E15', borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E33', padding: 16, width: '100%', alignItems: 'center', gap: 6 },
  rewardLabel: { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 2 },
  rewardCoins: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinEmoji: { fontSize: 28 },
  coinAmount: { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold', fontSize: 28 },
  claimBtn: { width: '100%', borderRadius: 3, overflow: 'hidden', shadowColor: '#C99A2E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  claimGrad: { paddingVertical: 16, alignItems: 'center' },
  claimText: { color: '#16171A', fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 1.5 },
  skipBtn: { paddingVertical: 6 },
  skipText: { color: '#ECE7DC44', fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
});
