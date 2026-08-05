/**
 * LiveEventBanner
 *
 * Primary row  : Active featured mode — name, descriptor, live D/H/M/S countdown,
 *                theme-coloured accent that shifts per mode.
 * Secondary row: Rotating news ticker (existing behaviour, unchanged).
 */
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { GlowText } from '@/components/effects';
import { useFeaturedModeCountdown } from '@/utils/featuredModes';

// ── News ticker ──────────────────────────────────────────────────────────────
const NEWS_ITEMS = [
  '🔥 Season 7 now live — earn exclusive Gold Rush skins!',
  '⚡ Double XP weekend: Friday – Sunday',
  '🏆 Tournament finals this Saturday — top 8 compete live',
  '🎯 New arena skin "Neon Storm" available in Shop',
  '🌍 Regional leaderboards reset every Monday at 00:00 UTC',
  '💎 Diamond players: exclusive Diamond Clash event starts soon',
];

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

// ── Countdown unit ────────────────────────────────────────────────────────────
function CountdownUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={cd.unit}>
      <Text style={[cd.value, { color }]}>{String(value).padStart(2, '0')}</Text>
      <Text style={cd.label}>{label}</Text>
    </View>
  );
}

// ── Main banner ───────────────────────────────────────────────────────────────
export function LiveEventBanner() {
  const { mode, timeLeft } = useFeaturedModeCountdown();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  // Gentle pulse on the card
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.02, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1100, useNativeDriver: true }),
    ])).start();
  }, []);

  // Fade color anim when mode changes
  useEffect(() => {
    Animated.timing(colorAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    colorAnim.setValue(0);
  }, [mode?.id]);

  const color       = mode?.color       ?? '#C8820A';
  const gradient    = mode?.gradient    ?? (['#1A0060', '#2A0085'] as [string, string]);
  const name        = mode?.name        ?? 'Gold Rush Championship';
  const descriptor  = mode?.descriptor  ?? 'Exclusive summer event — earn bonus rewards';
  const emoji       = mode?.emoji       ?? '⚡';

  const { d, h, m, s } = timeLeft;

  return (
    <View style={styles.container}>
      {/* Secondary: news ticker */}
      <NewsTicker />

      {/* Primary: featured mode card */}
      <Animated.View style={[styles.card, { borderColor: color + '55', transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={[gradient[0], gradient[1], gradient[0]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Corner glow */}
        <View style={[styles.cornerGlow, { backgroundColor: color + '18' }]} />

        {/* Top row: badge + "FEATURED" label */}
        <View style={styles.topRow}>
          <View style={[styles.modeBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={{ fontSize: 12 }}>{emoji}</Text>
            <Text style={[styles.modeBadgeText, { color }]}>FEATURED MODE</Text>
          </View>
          <View style={[styles.liveChip]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ACTIVE NOW</Text>
          </View>
        </View>

        {/* Name + descriptor */}
        <View style={styles.midRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <GlowText intensity="soft" color={color} style={[styles.eventTitle, { color }]}>{name}</GlowText>
            <Text style={styles.eventSub}>{descriptor}</Text>
          </View>
          <Feather name="zap" size={28} color={color} style={{ opacity: 0.85 }} />
        </View>

        {/* Countdown */}
        <View style={styles.countdownRow}>
          <Text style={styles.endsIn}>ENDS IN</Text>
          <View style={styles.countdown}>
            <CountdownUnit value={d} label="D" color={color} />
            <Text style={[cd.sep, { color: color + '88' }]}>:</Text>
            <CountdownUnit value={h} label="H" color={color} />
            <Text style={[cd.sep, { color: color + '88' }]}>:</Text>
            <CountdownUnit value={m} label="M" color={color} />
            <Text style={[cd.sep, { color: color + '88' }]}>:</Text>
            <CountdownUnit value={s} label="S" color={color} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cd = StyleSheet.create({
  unit:  { alignItems: 'center', minWidth: 26 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 20 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 8, color: '#FFFFFF55', letterSpacing: 0.5 },
  sep:   { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 20, marginBottom: 10 },
});

const tk = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF08', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  liveBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF475722', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757' },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FF4757', letterSpacing: 1 },
  news:     { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFFCC' },
});

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 16, marginBottom: 14, gap: 0 },
  card:         { borderRadius: 18, overflow: 'hidden', padding: 16, borderWidth: 1, gap: 10 },
  cornerGlow:   { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50 },

  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  modeBadgeText:{ fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  liveChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00FF8818', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#00FF8833' },
  liveDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00FF88' },
  liveText:     { fontFamily: 'Inter_700Bold', fontSize: 8, color: '#00FF88', letterSpacing: 0.8 },

  midRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventTitle:   { fontFamily: 'Inter_700Bold', fontSize: 16 },
  eventSub:     { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF88', lineHeight: 16 },

  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endsIn:       { fontFamily: 'Inter_500Medium', fontSize: 9, color: '#FFFFFF55', letterSpacing: 1.5 },
  countdown:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
