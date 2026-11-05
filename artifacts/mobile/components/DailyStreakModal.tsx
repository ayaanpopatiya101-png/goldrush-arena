import { idleAnimation } from "@/components/ui/idleAnimation";
import { Text, AnimatedText } from '@/components/ui/Text';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from '@/components/ui/FlatSurface';
import { getStreakReward } from '@/context/PlayerContext';

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
      idleAnimation(
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
          <LinearGradient colors={['#A6AEA7', '#191B19']} style={StyleSheet.absoluteFill} />
          <View style={s.border} />

          {/* Streak flame */}
          <AnimatedText style={[s.flame, {
            transform: [{ scale: coinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          }]}>
            {streak >= 7 ? '💎' : streak >= 5 ? '🔥' : streak >= 3 ? '⚡' : '🌟'}
          </AnimatedText>

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
                    claimed  && { backgroundColor: '#BB786533', borderColor: '#BB7865' },
                    isToday  && { backgroundColor: '#BB7865',   borderColor: '#BB7865' },
                    upcoming && { backgroundColor: '#EEE7D808', borderColor: '#EEE7D822' },
                  ]}>
                    <Text style={[s.dayIcon, { color: isToday ? '#191B19' : claimed ? '#BB7865' : '#EEE7D844' }]}>
                      {claimed ? '✓' : isToday ? '★' : label}
                    </Text>
                  </View>
                  <Text style={[s.dayReward, { color: isToday ? '#BB7865' : upcoming ? '#EEE7D833' : '#EEE7D866' }]}>
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
              <Text style={s.coinEmoji}>🪙</Text>
              <Text style={s.coinAmount}>+{reward} COINS</Text>
            </View>
          </View>

          {/* Claim button */}
          <Pressable onPress={onClaim} style={({ pressed }) => [s.claimBtn, pressed && { opacity: 0.85 }]}>
            <LinearGradient colors={['#D0AF66', '#BB7865']} style={s.claimGrad}>
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
  overlay: { flex: 1, backgroundColor: '#191B19BB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 360, borderRadius: 2, overflow: 'hidden', padding: 24, alignItems: 'center', gap: 12 },
  border: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 2, borderWidth: 1.5, borderColor: '#BB786533' },
  flame: { fontSize: 56, marginBottom: 4 },
  streakMsg: { color: '#BB7865', fontFamily: 'System', fontSize: 22, letterSpacing: 2, textAlign: 'center', textShadowColor: '#BB7865', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  streakSub: { color: '#EEE7D888', fontFamily: 'System', fontSize: 13, marginBottom: 4 },
  calendar: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayCircle: { width: 36, height: 36, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayIcon: { fontFamily: 'System', fontSize: 12 },
  dayReward: { fontFamily: 'System', fontSize: 8 },
  rewardBox: { backgroundColor: '#BB786515', borderRadius: 2, borderWidth: 1, borderColor: '#BB786533', padding: 16, width: '100%', alignItems: 'center', gap: 6 },
  rewardLabel: { color: '#BB7865', fontFamily: 'System', fontSize: 10, letterSpacing: 2 },
  rewardCoins: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinEmoji: { fontSize: 28 },
  coinAmount: { color: '#BB7865', fontFamily: 'System', fontSize: 28 },
  claimBtn: { width: '100%', borderRadius: 2, overflow: 'hidden', shadowColor: '#BB7865', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  claimGrad: { paddingVertical: 16, alignItems: 'center' },
  claimText: { color: '#191B19', fontFamily: 'System', fontSize: 16, letterSpacing: 1.5 },
  skipBtn: { paddingVertical: 6 },
  skipText: { color: '#EEE7D844', fontFamily: 'System', fontSize: 12 },
});
