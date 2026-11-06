import { LinearGradient } from '@/components/ui/Flat';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { staticLoop } from '@/components/ui/motion';

const { width: SW, height: SH } = Dimensions.get('window');
const TITLE = 'GOLDRUSH ARENA';

let _shown = false;
export function cinemaHasShown() { return _shown; }

// ─── Floating gold particle ───────────────────────────────────────────────────
function GoldParticle({ x, delay, size, dur }: { x: number; delay: number; size: number; dur: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      staticLoop(
        Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }, delay);
    return () => clearTimeout(id);
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.9, 0.6, 0] });
  const ty      = anim.interpolate({ inputRange: [0, 1], outputRange: [SH * 0.1, -SH * 0.9] });
  return (
    <Animated.View pointerEvents="none" style={[
      styles.particle,
      { left: x, width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateY: ty }] },
    ]} />
  );
}

interface Props { onDone: () => void }

export function CinematicSplash({ onDone }: Props) {
  _shown = true;

  const masterFade  = useRef(new Animated.Value(1)).current;
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const lineW       = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtextOpacity = useRef(new Animated.Value(0)).current;
  const [letterIndex, setLetterIndex] = useState(-1);

  useEffect(() => {
    // Phase 1: Logo appears (0–600ms)
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Phase 2: Glow pulse starts (200ms)
    setTimeout(() => {
      staticLoop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])).start();
    }, 200);

    // Phase 3: Line draws in (700ms)
    setTimeout(() => {
      Animated.timing(lineW, { toValue: 1, duration: 450, useNativeDriver: false, easing: Easing.out(Easing.cubic) }).start();
    }, 700);

    // Phase 4: Letter-by-letter title (900ms → 900 + 50*len)
    const letterDelay = 900;
    TITLE.split('').forEach((_, i) => {
      setTimeout(() => setLetterIndex(i), letterDelay + i * 65);
    });

    // Phase 5: Subtitle fades in
    const textStart = letterDelay + TITLE.length * 65 + 100;
    setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, textStart);
    setTimeout(() => {
      Animated.timing(subtextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, textStart + 200);

    // Phase 6: Fade out the whole splash
    const totalDur = textStart + 900;
    setTimeout(() => {
      Animated.timing(masterFade, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.in(Easing.quad) })
        .start(() => onDone());
    }, totalDur);
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const glowRadius  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 40] });

  const particles = [
    { x: SW * 0.05, delay: 0,    size: 4, dur: 3200 },
    { x: SW * 0.15, delay: 400,  size: 3, dur: 2800 },
    { x: SW * 0.28, delay: 100,  size: 5, dur: 3600 },
    { x: SW * 0.42, delay: 700,  size: 3, dur: 2400 },
    { x: SW * 0.55, delay: 250,  size: 6, dur: 3000 },
    { x: SW * 0.68, delay: 550,  size: 4, dur: 2700 },
    { x: SW * 0.80, delay: 150,  size: 3, dur: 3400 },
    { x: SW * 0.92, delay: 800,  size: 5, dur: 2900 },
    { x: SW * 0.22, delay: 950,  size: 4, dur: 3100 },
    { x: SW * 0.75, delay: 320,  size: 3, dur: 2600 },
    { x: SW * 0.48, delay: 600,  size: 6, dur: 3300 },
    { x: SW * 0.60, delay: 450,  size: 3, dur: 2500 },
  ];

  return (
    <Animated.View style={[styles.root, { opacity: masterFade }]} pointerEvents="none">
      <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />


      {/* Centre content */}
      <View style={styles.center}>
        {/* GR Logo */}
        <Animated.View style={[styles.logoWrap, {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }]}>
          <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
          <Text style={styles.logoText}>GR</Text>
        </Animated.View>

        {/* Divider line */}
        <Animated.View style={[styles.divider, {
          width: lineW.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }),
        }]} />

        {/* GOLDRUSH ARENA, letter by letter */}
        <View style={styles.titleRow}>
          {TITLE.split('').map((ch, i) => (
            <Text key={i} style={[
              styles.titleLetter,
              ch === ' ' && { width: 10 },
              { opacity: i <= letterIndex ? 1 : 0 },
            ]}>
              {ch}
            </Text>
          ))}
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtextOpacity }]}>
          4-PLAYER AIR HOCKEY · LAST ONE STANDING
        </Animated.Text>

        {/* Season badge */}
        <Animated.View style={[styles.seasonBadge, { opacity: textOpacity }]}>
          <Text style={styles.seasonText}>SEASON 7 ACTIVE</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:         { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  center:       { alignItems: 'center', gap: 16 },
  particle:     { position: 'absolute', backgroundColor: '#C99A2E' },
  logoWrap:     { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  logoGlow:     { position: 'absolute', width: 96, height: 96, borderRadius: 3, backgroundColor: '#C99A2E', shadowColor: '#C99A2E', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  logoText:     { fontFamily: 'BarlowCondensed_700Bold', fontSize: 46, color: '#C99A2E', letterSpacing: 4, zIndex: 1, textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  divider:      { height: 1.5, backgroundColor: '#C99A2E88', borderRadius: 1 },
  titleRow:     { flexDirection: 'row', flexWrap: 'nowrap' },
  titleLetter:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: Platform.OS === 'web' ? 25 : 27, color: '#ECE7DC', letterSpacing: 3, textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  subtitle:     { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: '#ECE7DC66', letterSpacing: 2 },
  seasonBadge:  { marginTop: 4, backgroundColor: '#C99A2E22', borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E55', paddingHorizontal: 14, paddingVertical: 5 },
  seasonText:   { fontFamily: 'BarlowCondensed_700Bold', fontSize: 12, color: '#C99A2E', letterSpacing: 1.5 },
});
