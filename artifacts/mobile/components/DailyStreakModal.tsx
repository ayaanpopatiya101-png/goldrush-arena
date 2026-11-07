import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '@/components/ui/Flat';
import { getStreakReward } from '@/context/PlayerContext';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';
import { useBlockingOverlay } from '@/context/OverlayQueue';

interface Props {
  visible: boolean;
  streak: number;
  onClaim: () => void;
  onDismiss: () => void;
}

const DAY_LABELS = ['1', '2', '3', '4', '5', '6', '7+'];
const WEEK_REWARDS = [50, 100, 150, 200, 250, 300, 500];

export function DailyStreakModal({ visible: requested, streak, onClaim, onDismiss }: Props) {
  const visible = useBlockingOverlay(requested);
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
  const streakMsg = streak >= 7 ? 'Seven-day streak' : streak >= 3 ? 'Streak reward' : streak <= 1 ? 'Your daily reward' : 'Welcome back';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#294942' }]} />
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
                    claimed  && { backgroundColor: '#EFBD3C33', borderColor: '#EFBD3C' },
                    isToday  && { backgroundColor: '#EFBD3C',   borderColor: '#EFBD3C' },
                    upcoming && { backgroundColor: '#F5E7C408', borderColor: '#F5E7C422' },
                  ]}>
                    <Glyph style={[s.dayIcon, { color: isToday ? '#213D39' : claimed ? '#EFBD3C' : '#F5E7C444' }]} value={claimed ? '✓' : isToday ? '★' : label} />
                  </View>
                  <Text style={[s.dayReward, { color: isToday ? '#EFBD3C' : upcoming ? '#F5E7C433' : '#F5E7C466' }]}>
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
            <LinearGradient colors={['#EFBD3C', '#EFBD3C']} style={s.claimGrad}>
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
  overlay: { flex: 1, backgroundColor: '#172E2AEE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 360, borderRadius: 0, overflow: 'hidden', padding: 24, alignItems: 'center', gap: 12 },
  border: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0, borderWidth: 3, borderColor: '#CCAD6A' },
  flame: { fontSize: 56, marginBottom: 4 },
  streakMsg: { color: '#EFBD3C', fontFamily: 'SourceSans3_700Bold', fontSize: 22, letterSpacing: 2, textAlign: 'center', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  streakSub: { color: '#F5E7C488', fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, marginBottom: 4 },
  calendar: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayCircle: { width: 36, height: 36, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayIcon: { fontFamily: 'SourceSans3_700Bold', fontSize: 12 },
  dayReward: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 8 },
  rewardBox: { backgroundColor: '#E8D6A8', borderRadius: 0, borderWidth: 2, borderColor: '#E7D6AC', padding: 16, width: '100%', alignItems: 'center', gap: 6 },
  rewardLabel: { color: '#273D36', fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 2 },
  rewardCoins: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinEmoji: { fontSize: 28 },
  coinAmount: { color: '#EFBD3C', fontFamily: 'SourceSans3_700Bold', fontSize: 28 },
  claimBtn: { width: '100%', borderRadius: 3, overflow: 'hidden', shadowColor: '#EFBD3C', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  claimGrad: { paddingVertical: 16, alignItems: 'center' },
  claimText: { color: '#213D39', fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 1.5 },
  skipBtn: { paddingVertical: 6 },
  skipText: { color: '#F5E7C444', fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
});
