/**
 * SparkBurst — particle explosion triggered imperatively.
 * Call ref.current.burst(x, y, color) to fire sparks from a point.
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export interface SparkBurstRef {
  burst: (x?: number, y?: number, color?: string) => void;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
  size: number;
  color: string;
  anim: Animated.Value;
}

let _id = 0;

export const SparkBurst = forwardRef<SparkBurstRef, object>(function SparkBurst(_, ref) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useImperativeHandle(ref, () => ({
    burst(cx = 200, cy = 300, color = '#FFD700') {
      const count = 14;
      const newSparks: Spark[] = Array.from({ length: count }, (_, i) => ({
        id: ++_id,
        x: cx,
        y: cy,
        angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
        dist: 40 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        color: i % 3 === 0 ? '#FFFFFF' : color,
        anim: new Animated.Value(0),
      }));

      setSparks(prev => [...prev, ...newSparks]);

      newSparks.forEach(s => {
        Animated.timing(s.anim, {
          toValue: 1,
          duration: 500 + Math.random() * 300,
          useNativeDriver: true,
        }).start(() => {
          setSparks(prev => prev.filter(p => p.id !== s.id));
        });
      });
    },
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparks.map(s => {
        const tx = s.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist] });
        const ty = s.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.dist] });
        const op = s.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0.8, 0] });
        const sc = s.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.2, 0.2] });

        return (
          <Animated.View
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x - s.size / 2,
              top:  s.y - s.size / 2,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.color,
              shadowColor: s.color,
              shadowOpacity: 1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
              opacity: op,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
            }}
          />
        );
      })}
    </View>
  );
});
