import { idleAnimation } from "@/components/ui/idleAnimation";
/**
 * ParticleField — 60-particle animated starfield / ember field.
 * Drop-in upgrade of AmbientParticles with more particles, twinkling, and color variety.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

export type ParticleMode = 'stars' | 'embers' | 'sparks' | 'snow';

interface ParticleConfig {
  id: number;
  x: number;
  startY: number;
  size: number;
  delay: number;
  dur: number;
  color: string;
  twinkle: boolean;
}

function makeParticles(count: number, mode: ParticleMode): ParticleConfig[] {
  const palette: Record<ParticleMode, string[]> = {
    stars:  ['#BB786544', '#A6AEA733', '#BB786533', '#EEE7D833', '#EEE7D822', '#98A58133'],
    embers: ['#BB7865cc', '#BB7865aa', '#D0AF6688', '#BB7865bb', '#BB786599'],
    sparks: ['#D0AF6699', '#D0AF6688', '#D0AF6688', '#EEE7D877'],
    snow:   ['#EEE7D855', '#EEE7D844', '#A6AEA733'],
  };
  const colors = palette[mode];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SW,
    startY: mode === 'embers' ? SH * (0.6 + Math.random() * 0.4) : Math.random() * SH,
    size: mode === 'stars' ? (Math.random() * 2.5 + 0.8) :
          mode === 'embers' ? (Math.random() * 4 + 1.5) :
          (Math.random() * 3 + 1),
    delay: Math.random() * 8000,
    dur: mode === 'embers' ? (Math.random() * 3000 + 2500) : (Math.random() * 6000 + 5000),
    color: colors[Math.floor(Math.random() * colors.length)],
    twinkle: mode === 'stars' || mode === 'snow',
  }));
}

function Particle({ cfg, mode }: { cfg: ParticleConfig; mode: ParticleMode }) {
  const riseAnim    = useRef(new Animated.Value(0)).current;
  const twinkleAnim = useRef(new Animated.Value(0.6)).current;
  const driftX = (Math.random() - 0.5) * 60;

  useEffect(() => {
    const t = setTimeout(() => {
      idleAnimation(
        Animated.timing(riseAnim, { toValue: 1, duration: cfg.dur, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }, cfg.delay);

    let twinkleLoop: Animated.CompositeAnimation | null = null;
    if (cfg.twinkle) {
      const twDelay = setTimeout(() => {
        twinkleLoop = idleAnimation(
          Animated.sequence([
            Animated.timing(twinkleAnim, { toValue: 1,   duration: 800 + Math.random() * 1200, useNativeDriver: true }),
            Animated.timing(twinkleAnim, { toValue: 0.2, duration: 800 + Math.random() * 1200, useNativeDriver: true }),
          ])
        );
        twinkleLoop.start();
      }, Math.random() * 3000);
      return () => { clearTimeout(t); clearTimeout(twDelay); twinkleLoop?.stop(); };
    }
    return () => clearTimeout(t);
  }, []);

  const travelDist = mode === 'embers'
    ? -(SH * 0.9)
    : mode === 'snow'
    ? SH * 0.8
    : -(cfg.startY + 50);

  const opacity = riseAnim.interpolate({
    inputRange: [0, 0.08, 0.75, 1],
    outputRange: [0, 1, 0.8, 0],
  });
  const translateY = riseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDist],
  });
  const translateX = riseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, driftX * 0.5, driftX],
  });
  const scale = riseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, mode === 'embers' ? 0.2 : 0.6],
  });

  const finalOpacity = cfg.twinkle
    ? Animated.multiply(opacity, twinkleAnim)
    : opacity;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cfg.x,
        top:  cfg.startY,
        width:  cfg.size,
        height: cfg.size,
        borderRadius: cfg.size / 2,
        backgroundColor: cfg.color,
        shadowColor: cfg.color.substring(0, 7),
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        opacity: finalOpacity as any,
        transform: [{ translateY }, { translateX }, { scale }],
      }}
    />
  );
}

interface ParticleFieldProps {
  count?: number;
  mode?: ParticleMode;
}

export function ParticleField({ count = 55, mode = 'stars' }: ParticleFieldProps) {
  const particles = useRef(makeParticles(count, mode)).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => <Particle key={p.id} cfg={p} mode={mode} />)}
    </View>
  );
}
