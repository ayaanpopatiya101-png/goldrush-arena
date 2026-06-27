import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const CONFETTI_EMOJIS = ['🏆','⭐','✨','🎉','💫','🪙','🔥','💥','⚡','🎊'];
const CONFETTI_COLORS = ['#C8820A','#C03820','#1E8AAA','#4A8A38','#D07018','#7A50A0','#FFFFFF'];

interface PieceConfig {
  x: number; delay: number; dur: number;
  isEmoji: boolean; emoji: string; color: string;
  size: number; rotateDir: number;
}

function makePieces(count: number): PieceConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * SW,
    delay: Math.random() * 600,
    dur: 1600 + Math.random() * 1200,
    isEmoji: Math.random() < 0.4,
    emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 8 + Math.random() * 8,
    rotateDir: Math.random() > 0.5 ? 1 : -1,
  }));
}

function ConfettiPiece({ cfg, startX }: { cfg: PieceConfig; startX: number }) {
  const fall  = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(startX)).current;

  useEffect(() => {
    const id = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fall, {
          toValue: SH + 60,
          duration: cfg.dur,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(drift, { toValue: startX + (Math.random() > 0.5 ? 30 : -30), duration: cfg.dur / 2, useNativeDriver: true }),
          Animated.timing(drift, { toValue: startX + (Math.random() > 0.5 ? 60 : -60), duration: cfg.dur / 2, useNativeDriver: true }),
        ]),
      ]).start();
    }, cfg.delay);
    return () => clearTimeout(id);
  }, []);

  const opacity = fall.interpolate({
    inputRange: [0, SH * 0.6, SH + 60],
    outputRange: [1, 0.8, 0],
  });
  const rotate = fall.interpolate({
    inputRange: [0, SH + 60],
    outputRange: ['0deg', `${cfg.rotateDir * 540}deg`],
  });

  if (cfg.isEmoji) {
    return (
      <Animated.Text pointerEvents="none" style={{
        position: 'absolute',
        top: -30,
        fontSize: cfg.size + 4,
        opacity,
        transform: [{ translateY: fall }, { translateX: drift }, { rotate }],
      }}>
        {cfg.emoji}
      </Animated.Text>
    );
  }

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute',
      top: -cfg.size,
      width: cfg.size,
      height: cfg.size * 0.55,
      backgroundColor: cfg.color,
      borderRadius: 2,
      opacity,
      transform: [{ translateY: fall }, { translateX: drift }, { rotate }],
    }} />
  );
}

interface Props { active: boolean }

export function ConfettiRain({ active }: Props) {
  const pieces = useRef(makePieces(40)).current;
  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((cfg, i) => (
        <ConfettiPiece key={i} cfg={cfg} startX={cfg.x} />
      ))}
    </View>
  );
}
