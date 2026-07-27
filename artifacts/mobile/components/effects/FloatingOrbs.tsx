/**
 * FloatingOrbs — large, slow-pulsing gradient blobs used as ambient background.
 * Place behind all other content with pointerEvents="none" / zIndex: 0.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

interface OrbConfig {
  x: number; y: number;
  size: number;
  color: string;
  dur: number;
  delay: number;
  /** scale range low/high */
  scaleRange: [number, number];
}

const DEFAULT_ORBS: OrbConfig[] = [
  { x: -SW * 0.25, y: -SH * 0.1,  size: SW * 0.8, color: '#C8820A', dur: 8000,  delay: 0,    scaleRange: [0.9, 1.1] },
  { x:  SW * 0.5,  y:  SH * 0.25, size: SW * 0.7, color: '#1E8AAA', dur: 11000, delay: 2000, scaleRange: [0.85, 1.05] },
  { x: -SW * 0.1,  y:  SH * 0.5,  size: SW * 0.6, color: '#C03820', dur: 9500,  delay: 4000, scaleRange: [0.9, 1.08] },
  { x:  SW * 0.3,  y:  SH * 0.7,  size: SW * 0.55,color: '#4A8A38', dur: 13000, delay: 1000, scaleRange: [0.88, 1.06] },
];

function Orb({ cfg }: { cfg: OrbConfig }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: cfg.dur,     useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(anim, { toValue: 0, duration: cfg.dur,     useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    }, cfg.delay);
    return () => clearTimeout(timeout);
  }, []);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: cfg.scaleRange,
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.07, 0.14, 0.07],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cfg.x - cfg.size / 2,
        top:  cfg.y - cfg.size / 2,
        width:  cfg.size,
        height: cfg.size,
        transform: [{ scale }],
        opacity,
      }}
    >
      <LinearGradient
        colors={[cfg.color + 'FF', cfg.color + '00']}
        style={[StyleSheet.absoluteFill, { borderRadius: cfg.size / 2 }]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

interface FloatingOrbsProps {
  /** Override default orb set (e.g. for tinted screens) */
  orbs?: OrbConfig[];
  /** Base opacity multiplier 0-1 */
  opacity?: number;
}

export function FloatingOrbs({ orbs = DEFAULT_ORBS, opacity = 1 }: FloatingOrbsProps) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity }]}
      pointerEvents="none"
    >
      {orbs.map((o, i) => <Orb key={i} cfg={o} />)}
    </View>
  );
}

/** Preset for purple/arcane screens (Battle Pass, Inventory premium) */
export const ORBS_ARCANE: OrbConfig[] = [
  { x: -SW * 0.2,  y: -SH * 0.05, size: SW * 0.8, color: '#7C3AED', dur: 8000,  delay: 0,    scaleRange: [0.9, 1.1] },
  { x:  SW * 0.55, y:  SH * 0.3,  size: SW * 0.65,color: '#4F46E5', dur: 11000, delay: 2500, scaleRange: [0.85, 1.05] },
  { x:  SW * 0.1,  y:  SH * 0.6,  size: SW * 0.55,color: '#EC4899', dur: 9500,  delay: 4500, scaleRange: [0.9, 1.08] },
  { x:  SW * 0.7,  y:  SH * 0.75, size: SW * 0.5, color: '#06B6D4', dur: 12000, delay: 1500, scaleRange: [0.88, 1.06] },
];

/** Preset for gold/shop screens */
export const ORBS_GOLD: OrbConfig[] = [
  { x: -SW * 0.15, y: -SH * 0.08, size: SW * 0.75,color: '#F59E0B', dur: 9000,  delay: 0,    scaleRange: [0.88, 1.12] },
  { x:  SW * 0.6,  y:  SH * 0.2,  size: SW * 0.6, color: '#C8820A', dur: 12000, delay: 2000, scaleRange: [0.85, 1.05] },
  { x:  SW * 0.2,  y:  SH * 0.55, size: SW * 0.5, color: '#EF4444', dur: 10500, delay: 3500, scaleRange: [0.9, 1.08] },
  { x:  SW * 0.75, y:  SH * 0.7,  size: SW * 0.45,color: '#D97706', dur: 13000, delay: 1000, scaleRange: [0.88, 1.06] },
];

export type { OrbConfig };
