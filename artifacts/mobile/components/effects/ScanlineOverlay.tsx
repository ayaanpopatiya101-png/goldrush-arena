/**
 * ScanlineOverlay — subtle CRT scanline texture over a screen.
 * Web: CSS repeating linear-gradient (crisp, zero cost).
 * Native: stack of thin Views (fewer lines to keep performance OK).
 * Always rendered with pointerEvents="none" — purely decorative.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

interface ScanlineOverlayProps {
  /** Line spacing in px (default 4) */
  spacing?: number;
  /** Opacity of each scanline (default 0.07) */
  lineOpacity?: number;
  /** Scanline color */
  color?: string;
}

export function ScanlineOverlay({
  spacing = 4,
  lineOpacity = 0.07,
  color = '#000000',
}: ScanlineOverlayProps) {
  if (Platform.OS === 'web') {
    // Web: CSS gradient — no JS overhead at all
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundImage:
              `repeating-linear-gradient(0deg, ${color + Math.round(lineOpacity * 255).toString(16).padStart(2, '0')} 0px, ${color + Math.round(lineOpacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px, transparent ${spacing}px)`,
            zIndex: 9999,
          } as any,
        ]}
      />
    );
  }

  // Native: render a few dozen thin lines
  const lines = Math.ceil(1200 / spacing);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: Math.min(lines, 200) }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * spacing,
            height: 1,
            backgroundColor: color,
            opacity: lineOpacity,
          }}
        />
      ))}
    </View>
  );
}
