import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

const NEWS_ITEMS = [
  '🔥 Season 7 now live — earn exclusive Gold Rush skins!',
  '⚡ Double XP weekend: Friday – Sunday',
  '🏆 Tournament finals this Saturday — top 8 compete live',
  '🎯 New arena skin "Neon Storm" available in Shop',
  '🌍 Regional leaderboards reset every Monday at 00:00 UTC',
  '💎 Diamond players: exclusive Diamond Clash event starts soon',
];

// Event end date: last day of current month + next 12 days (simulate "summer event")
function getEventEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d;
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const totalS = Math.max(0, Math.floor(diff / 1000));
  const d = Math.floor(totalS / 86400);
  const h = Math.floor((totalS % 86400) / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  return { d, h, m, s };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={cd.unit}>
      <Text style={cd.value}>{String(value).padStart(2, '0')}</Text>
      <Text style={cd.label}>{label}</Text>
    </View>
  );
}

// ─── Scrolling news ticker ────────────────────────────────────────────────────
function NewsTicker() {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => setIndex(i => (i + 1) % NEWS_ITEMS.length));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={tk.wrap}>
      <View style={tk.liveBadge}>
        <View style={tk.liveDot} />
        <Text style={tk.liveText}>LIVE</Text>
      </View>
      <Animated.Text style={[tk.news, { opacity: fadeAnim }]} numberOfLines={1}>
        {NEWS_ITEMS[index]}
      </Animated.Text>
    </View>
  );
}

// ─── Main banner ─────────────────────────────────────────────────────────────
export function LiveEventBanner() {
  const eventEnd = useRef(getEventEnd()).current;
  const { d, h, m, s } = useCountdown(eventEnd);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* News ticker */}
      <NewsTicker />

      {/* Live event card */}
      <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['#1A0060', '#2A0085', '#1A0060']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Top-right glow */}
        <View style={styles.cornerGlow} />

        <View style={styles.topRow}>
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>☀️ SUMMER EVENT</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+500 🪙 BONUS</Text>
          </View>
        </View>

        <View style={styles.midRow}>
          <View>
            <Text style={styles.eventTitle}>Gold Rush Championship</Text>
            <Text style={styles.eventSub}>Play 10 matches to unlock exclusive Summer Skin</Text>
          </View>
          <Feather name="zap" size={32} color="#FFD700" style={{ opacity: 0.9 }} />
        </View>

        {/* Countdown */}
        <View style={styles.countdownRow}>
          <Text style={styles.endsIn}>EVENT ENDS IN</Text>
          <View style={styles.countdown}>
            <CountdownUnit value={d} label="D" />
            <Text style={cd.sep}>:</Text>
            <CountdownUnit value={h} label="H" />
            <Text style={cd.sep}>:</Text>
            <CountdownUnit value={m} label="M" />
            <Text style={cd.sep}>:</Text>
            <CountdownUnit value={s} label="S" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const cd = StyleSheet.create({
  unit:  { alignItems: 'center', minWidth: 28 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFD700', lineHeight: 20 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 8, color: '#FFFFFF66', letterSpacing: 0.5 },
  sep:   { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFD70066', lineHeight: 20, marginBottom: 10 },
});

const tk = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF08', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF475722', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757' },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FF4757', letterSpacing: 1 },
  news:     { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFFCC' },
});

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 16, marginBottom: 14, gap: 0 },
  card:         { borderRadius: 18, overflow: 'hidden', padding: 16, borderWidth: 1, borderColor: '#6600FF55', gap: 10 },
  cornerGlow:   { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFD70018' },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventBadge:   { backgroundColor: '#FFD70022', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFD70044' },
  eventBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFD700', letterSpacing: 1 },
  rewardBadge:  { backgroundColor: '#00FF8822', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#00FF8844' },
  rewardText:   { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#00FF88', letterSpacing: 0.5 },
  midRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eventTitle:   { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#FFFFFF', marginBottom: 3 },
  eventSub:     { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF88', lineHeight: 15 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endsIn:       { fontFamily: 'Inter_500Medium', fontSize: 9, color: '#FFFFFF66', letterSpacing: 1.5 },
  countdown:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
