// Glyph: renders an icon for a stored emoji value.
// Saved data (avatars, cosmetics, reward icons) still holds the original emoji
// strings; the UI shows a line icon instead so no emoji is ever drawn.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const MAP: Record<string, IconName> = {
  '👑': 'crown-outline', '🏆': 'trophy-outline', '🥇': 'medal-outline', '🥈': 'medal-outline', '🥉': 'medal-outline', '🏅': 'medal-outline',
  '⚡': 'lightning-bolt-outline', '🔥': 'fire', '💎': 'diamond-stone', '🪙': 'circle-multiple-outline', '💰': 'cash-multiple',
  '🛡': 'shield-outline', '⚔': 'sword-cross', '🗡': 'sword', '🏹': 'bow-arrow', '🔮': 'crystal-ball', '🌀': 'rotate-orbit',
  '💥': 'flare', '🎯': 'bullseye-arrow', '🎮': 'gamepad-variant-outline', '🧠': 'head-cog-outline', '🎨': 'palette-outline',
  '🎁': 'gift-outline', '🎫': 'ticket-outline', '📋': 'clipboard-list-outline', '🗺': 'map-outline', '☀': 'weather-sunny',
  '📅': 'calendar-outline', '🔒': 'lock-outline', '🔓': 'lock-open-outline', '✅': 'check', '✓': 'check', '✕': 'close', '❌': 'close', '❤': 'heart-outline',
  '💔': 'heart-broken-outline', '⭐': 'star-outline', '★': 'star-outline', '🌟': 'star-outline', '✦': 'star-four-points-outline', '👤': 'account-outline',
  '📤': 'export-variant', '🎉': 'flag-checkered', '🏟': 'stadium', '🔑': 'key-outline', '📹': 'video-outline', '🎬': 'movie-open-outline',
  '📸': 'camera-outline', '🎥': 'video-outline', '▶': 'play', '⏸': 'pause', '🔊': 'volume-high', '🔇': 'volume-off', '🎵': 'music-note',
  '⏱': 'timer-outline', '⏰': 'timer-outline', '💀': 'skull-outline', '☠': 'skull-outline', '🤖': 'robot-outline', '👥': 'account-group-outline',
  '🧊': 'cube-outline', '🌋': 'volcano', '🏔': 'image-filter-hdr', '🌵': 'cactus', '⛏': 'pickaxe', '🎲': 'dice-5-outline', '🧲': 'magnet',
  '🐢': 'tortoise', '🚀': 'rocket-launch-outline', '💪': 'arm-flex-outline', '😎': 'emoticon-cool-outline', '😤': 'emoticon-angry-outline',
  '🦁': 'paw', '🐉': 'paw', '🦅': 'bird', '🐺': 'paw', '🦊': 'paw', '🐯': 'paw', '👻': 'ghost-outline', '🤡': 'drama-masks',
  '🌊': 'waves', '❄': 'snowflake', '🌙': 'weather-night', '🎪': 'tent', '🃏': 'cards-playing-outline', '♠': 'cards-spade-outline',
  '📦': 'package-variant-closed', '🧱': 'wall', '🏰': 'castle', '⚙': 'cog-outline', '🔔': 'bell-outline', '📊': 'chart-bar', '📈': 'chart-line',
};

function firstEmoji(v: string): string | null {
  for (const ch of Array.from(v)) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x2600 && cp <= 0x27bf) || cp >= 0x1f000 || cp === 0x2b50) return ch;
  }
  return null;
}

export function stripEmoji(v: string): string {
  return Array.from(v)
    .filter(ch => { const cp = ch.codePointAt(0) ?? 0; return !(cp >= 0x2600 && cp <= 0x27bf) && !(cp >= 0x1f000) && cp !== 0xfe0f && cp !== 0x200d && cp !== 0x20e3 && cp !== 0x2b50; })
    .join('').replace(/\s{2,}/g, ' ').trim();
}

export function hasEmoji(v: unknown): boolean {
  return typeof v === 'string' && firstEmoji(v) !== null;
}

export function iconForEmoji(v: string): IconName {
  const e = firstEmoji(v);
  return (e && MAP[e]) || 'checkbox-blank-outline';
}

type Props = {
  value?: unknown;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: React.ReactNode;
};

export function Glyph({ value, size, color, style, children }: Props) {
  const v = value ?? children;
  const flat = StyleSheet.flatten(style) ?? {};
  const s = size ?? (typeof flat.fontSize === 'number' ? flat.fontSize : 18);
  const c = color ?? (typeof flat.color === 'string' ? flat.color : '#EEE7D7');
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const str = String(v);
  if (!hasEmoji(str)) return <Text style={style}>{str.replace(/[\uFE0F\u20E3]/g, '')}</Text>;
  // Mixed emoji + words: keep the words, drop the emoji.
  const words = stripEmoji(str);
  if (/[A-Za-z0-9]/.test(words)) return <Text style={style}>{words}</Text>;
  return (
    <MaterialCommunityIcons
      name={iconForEmoji(str)}
      size={s}
      color={c}
      style={{ opacity: flat.opacity as number | undefined, marginTop: flat.marginTop as number | undefined, marginRight: flat.marginRight as number | undefined, marginLeft: flat.marginLeft as number | undefined }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
