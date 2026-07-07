import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

interface DotConfig { x: number; startY: number; size: number; delay: number; dur: number; color: string }

const DOTS: DotConfig[] = [
  { x: SW * 0.04,  startY: SH * 0.92, size: 3, delay: 0,    dur: 7000, color: '#C8820A44' },
  { x: SW * 0.12,  startY: SH * 0.80, size: 2, delay: 900,  dur: 9000, color: '#C0382033' },
  { x: SW * 0.22,  startY: SH * 0.95, size: 4, delay: 300,  dur: 8000, color: '#C8820A33' },
  { x: SW * 0.35,  startY: SH * 0.85, size: 2, delay: 1500, dur: 6500, color: '#1E8AAA33' },
  { x: SW * 0.46,  startY: SH * 0.90, size: 3, delay: 600,  dur: 8500, color: '#4A8A3833' },
  { x: SW * 0.57,  startY: SH * 0.78, size: 2, delay: 1200, dur: 7500, color: '#C8820A22' },
  { x: SW * 0.67,  startY: SH * 0.93, size: 4, delay: 400,  dur: 9500, color: '#D0701833' },
  { x: SW * 0.78,  startY: SH * 0.82, size: 2, delay: 800,  dur: 7000, color: '#7A50A022' },
  { x: SW * 0.88,  startY: SH * 0.97, size: 3, delay: 1700, dur: 8200, color: '#C8820A44' },
  { x: SW * 0.94,  startY: SH * 0.75, size: 2, delay: 200,  dur: 6800, color: '#1E8AAA22' },
  { x: SW * 0.30,  startY: SH * 0.70, size: 2, delay: 2000, dur: 9000, color: '#C8820A33' },
  { x: SW * 0.72,  startY: SH * 0.65, size: 3, delay: 1100, dur: 7800, color: '#C0382022' },
];

function AmbientDot({ cfg }: { cfg: DotConfig }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: cfg.dur, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }, cfg.delay);
    return () => clearTimeout(id);
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.8, 0] });
  const ty      = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -cfg.startY * 1.1] });
  const scale   = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute',
      left: cfg.x,
      top: cfg.startY,
      width: cfg.size,
      height: cfg.size,
      borderRadius: cfg.size / 2,
      backgroundColor: cfg.color,
      opacity,
      transform: [{ translateY: ty }, { scale }],
    }} />
  );
}

export function AmbientParticles() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {DOTS.map((d, i) => <AmbientDot key={i} cfg={d} />)}
    </View>
  );
}
