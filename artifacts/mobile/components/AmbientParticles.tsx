import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Floating emoji sparkles ──────────────────────────────────────────────────
interface SparkCfg { x: number; y: number; emoji: string; size: number; delay: number; dur: number }

const SPARKS: SparkCfg[] = [
  { x: SW * 0.05, y: SH * 0.88, emoji: '⭐', size: 12, delay: 0,    dur: 7200 },
  { x: SW * 0.15, y: SH * 0.82, emoji: '🪙', size: 11, delay: 800,  dur: 9000 },
  { x: SW * 0.25, y: SH * 0.91, emoji: '⚡', size: 10, delay: 300,  dur: 8200 },
  { x: SW * 0.37, y: SH * 0.86, emoji: '⭐', size: 9,  delay: 1400, dur: 7500 },
  { x: SW * 0.47, y: SH * 0.93, emoji: '🪙', size: 12, delay: 600,  dur: 9400 },
  { x: SW * 0.58, y: SH * 0.79, emoji: '💥', size: 10, delay: 1100, dur: 8600 },
  { x: SW * 0.68, y: SH * 0.89, emoji: '⭐', size: 11, delay: 400,  dur: 7800 },
  { x: SW * 0.78, y: SH * 0.83, emoji: '⚡', size: 9,  delay: 2000, dur: 8000 },
  { x: SW * 0.89, y: SH * 0.94, emoji: '🪙', size: 12, delay: 700,  dur: 9200 },
  { x: SW * 0.11, y: SH * 0.70, emoji: '💥', size: 8,  delay: 1700, dur: 7000 },
  { x: SW * 0.52, y: SH * 0.75, emoji: '⭐', size: 10, delay: 900,  dur: 8800 },
  { x: SW * 0.83, y: SH * 0.72, emoji: '🪙', size: 9,  delay: 1500, dur: 7600 },
];

function SparkDot({ cfg }: { cfg: SparkCfg }) {
  const anim = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: cfg.dur, useNativeDriver: true, easing: Easing.linear })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobble, { toValue: 1, duration: cfg.dur * 0.4, useNativeDriver: true }),
          Animated.timing(wobble, { toValue: -1, duration: cfg.dur * 0.4, useNativeDriver: true }),
          Animated.timing(wobble, { toValue: 0, duration: cfg.dur * 0.2, useNativeDriver: true }),
        ])
      ).start();
    }, cfg.delay);
    return () => clearTimeout(t);
  }, []);

  const opacity  = anim.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 0.9, 0.7, 0] });
  const ty       = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(cfg.y + 40)] });
  const tx       = wobble.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] });
  const scale    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.1, 0.4] });
  const rotate   = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: cfg.x, top: cfg.y,
      opacity, transform: [{ translateY: ty }, { translateX: tx }, { scale }, { rotate }],
    }}>
      <Text style={{ fontSize: cfg.size }}>{cfg.emoji}</Text>
    </Animated.View>
  );
}

// ─── Glowing orbs ─────────────────────────────────────────────────────────────
interface OrbCfg { x: number; y: number; r: number; color: string; dur: number; delay: number; dy: number }

const ORBS: OrbCfg[] = [
  { x: SW * 0.1,  y: SH * 0.25, r: 90,  color: '#C8820A', dur: 8000,  delay: 0,    dy: 40 },
  { x: SW * 0.75, y: SH * 0.15, r: 110, color: '#3B88C3', dur: 11000, delay: 2000, dy: -30 },
  { x: SW * 0.5,  y: SH * 0.55, r: 80,  color: '#BF5FFF', dur: 9500,  delay: 1000, dy: 50 },
  { x: SW * 0.85, y: SH * 0.6,  r: 70,  color: '#FF4757', dur: 7500,  delay: 3000, dy: -40 },
  { x: SW * 0.2,  y: SH * 0.7,  r: 100, color: '#00E5FF', dur: 10000, delay: 500,  dy: 35  },
];

function GlowOrb({ cfg }: { cfg: OrbCfg }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: cfg.dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: cfg.dur, useNativeDriver: true }),
        ])
      ).start();
    }, cfg.delay);
    return () => clearTimeout(t);
  }, []);

  const ty      = anim.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dy] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.04, 0.10, 0.04] });

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute',
      left: cfg.x - cfg.r, top: cfg.y - cfg.r,
      width: cfg.r * 2, height: cfg.r * 2,
      borderRadius: cfg.r,
      backgroundColor: cfg.color,
      opacity, transform: [{ translateY: ty }],
    }} />
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function AmbientParticles() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((o, i)  => <GlowOrb  key={`o${i}`} cfg={o} />)}
      {SPARKS.map((s, i) => <SparkDot key={`s${i}`} cfg={s} />)}
    </View>
  );
}
