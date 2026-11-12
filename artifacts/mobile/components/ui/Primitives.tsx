// Shared flat primitives for GoldRush Arena: moss plates on carbon, light type, lime action with dark ink.
import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { palette, tactile } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import { BrandMark } from '@/components/ui/BrandMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const OUTER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'maxWidth', 'minWidth', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'position', 'top', 'left', 'right', 'bottom', 'zIndex'] as const;
/** Layout props go to the animated wrapper; visual props stay on the plate. */
function splitLayout(style?: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const k of Object.keys(flat)) ((OUTER_KEYS as readonly string[]).includes(k) ? outer : inner)[k] = flat[k];
  if (outer.width != null || outer.flex != null || outer.flexGrow != null || outer.alignSelf === 'stretch') inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/** Short physical press: plate sinks into its edge (90ms in, 140ms out). Instant under reduced motion. */
export function usePressSink(depth = 3) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  const to = (n: number, ms: number) => {
    if (reduced) { v.setValue(n); return; }
    Animated.timing(v, { toValue: n, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  return {
    onPressIn: () => to(1, 90),
    onPressOut: () => to(0, 140),
    style: { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }] },
  };
}

export const ui = palette;
export const R = 14;

export function Panel({ children, style, tone = 'base' }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'base' | 'raised' | 'outline' | 'paper' | 'brass' }) {
  return (
    <View style={[
      p.panel,
      tone === 'raised' && { backgroundColor: palette.raised },
      tone === 'outline' && { backgroundColor: 'transparent' },
      tone === 'paper' && { backgroundColor: palette.inset, borderColor: palette.edge },
      tone === 'brass' && { backgroundColor: tactile.brass, borderColor: tactile.brass, borderBottomColor: palette.goldEdge },
      style,
    ]}>
      {children}
    </View>
  );
}

export function SectionLabel({ title, right, style }: { title: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[p.sectionRow, style]}>
      <Text style={p.sectionTitle} accessibilityRole="header">{title}</Text>
      <View style={p.sectionRule} />
      {right}
    </View>
  );
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  icon?: React.ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  loading?: boolean;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, size = 'md', style, testID, accessibilityHint }: BtnProps) {
  const sink = usePressSink(3);
  const { outer, inner } = splitLayout(style);
  const fg = disabled && !loading ? palette.muted : variant === 'primary' || variant === 'gold' ? palette.onAccent : variant === 'secondary' ? palette.foreground : variant === 'danger' ? palette.gold : palette.foreground;
  return (
    <Animated.View style={[outer, sink.style]}>
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={sink.onPressIn}
      onPressOut={sink.onPressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      aria-disabled={!!(disabled || loading)}
      aria-busy={!!loading}
      style={({ pressed }) => [
        p.btn,
        size === 'lg' && p.btnLg,
        size === 'sm' && p.btnSm,
        variant === 'primary' && { backgroundColor: palette.primary, borderColor: palette.primary, borderBottomColor: palette.primaryEdge },
        variant === 'gold' && { backgroundColor: palette.gold, borderColor: palette.gold, borderBottomColor: palette.goldEdge },
        pressed && !(disabled || loading) && p.btnPressed,
        variant === 'secondary' && { backgroundColor: pressed ? palette.surface : palette.raised, borderColor: palette.border, borderBottomColor: palette.edge },
        variant === 'ghost' && { backgroundColor: pressed ? palette.raised : 'transparent', borderColor: palette.border },
        variant === 'danger' && { backgroundColor: pressed ? palette.raised : palette.inset, borderColor: palette.gold },
        (disabled && !loading) && { backgroundColor: palette.inset, borderColor: palette.border, borderBottomWidth: 2 },
        inner,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Feather name={icon} size={size === 'lg' ? 20 : 15} color={fg} /> : null}
      <Text style={[p.btnText, size === 'lg' && p.btnTextLg, size === 'sm' && p.btnTextSm, { color: disabled && !loading ? palette.muted : fg }]}>{label}</Text>
    </Pressable>
    </Animated.View>
  );
}

export function Chip({ label, tone = 'neutral', style }: { label: string; tone?: 'neutral' | 'ochre' | 'moss' | 'clay'; style?: StyleProp<ViewStyle> }) {
  const c = tone === 'ochre' ? palette.gold : tone === 'moss' ? palette.primary : tone === 'clay' ? palette.supporting : palette.border;
  return (
    <View style={[p.chip, { borderColor: c }, (tone === 'ochre' || tone === 'moss') && { backgroundColor: c }, style]}>
      <Text style={[p.chipText, { color: tone === 'ochre' || tone === 'moss' ? palette.onAccent : tone === 'neutral' ? palette.supporting : c }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, style, valueStyle }: { label: string; value: string; style?: StyleProp<ViewStyle>; valueStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[p.stat, style]} accessibilityLabel={`${label} ${value}`}>
      <Text style={[p.statValue, valueStyle]}>{value}</Text>
      <Text style={p.statLabel}>{label}</Text>
    </View>
  );
}

export function IconButton({ icon, onPress, label, style }: { icon: React.ComponentProps<typeof Feather>['name']; onPress?: () => void; label: string; style?: StyleProp<ViewStyle> }) {
  const sink = usePressSink(2);
  return (
    <Animated.View style={sink.style}>
    <Pressable
      onPress={onPress}
      onPressIn={sink.onPressIn}
      onPressOut={sink.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={0}
      style={({ pressed }) => [p.iconBtn, pressed && { backgroundColor: palette.surface, borderBottomWidth: 2 }, style]}
    >
      <Feather name={icon} size={18} color={palette.foreground} />
    </Pressable>
    </Animated.View>
  );
}

const p = StyleSheet.create({
  panel: { backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, borderRadius: R + 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.4, color: palette.foreground, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: palette.line },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderBottomWidth: 5, borderRadius: 999, minHeight: 48, paddingHorizontal: 16 },
  // Instant press feedback, without an animated transition.
  btnPressed: { borderBottomWidth: 2 },
  btnLg: { minHeight: 60, paddingHorizontal: 20, borderRadius: R + 4 },
  btnSm: { minHeight: 44, paddingHorizontal: 10 },
  btnText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.2, textTransform: 'uppercase' },
  btnTextLg: { fontSize: 26, letterSpacing: 2 },
  btnTextSm: { fontSize: 14, letterSpacing: 1 },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: palette.line },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: palette.foreground, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.supporting, textTransform: 'uppercase' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, backgroundColor: palette.raised },
});

// Responsive shell: centers content at 1160 (wide) or 720 (prose) with 16-20 phone gutters.
export function Shell({ children, variant = 'wide', style }: { children?: React.ReactNode; variant?: 'wide' | 'prose'; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: '100%', alignSelf: 'center', maxWidth: variant === 'prose' ? 720 : 1160, paddingHorizontal: 18 }, style]}>
      {children}
    </View>
  );
}

// Explicit responsive card width for grids: avoids collapsed or stretched last-row cards.
export function gridItemWidth(available: number, minCard = 150, gap = 10): number {
  const cols = Math.max(2, Math.floor((available + gap) / (minCard + gap)));
  return Math.floor((available - gap * (cols - 1)) / cols);
}

/** Stamped condensed screen title used on every non-Home destination. */
export function ScreenTitle({ title, kicker, right, style, tone = 'light' }: { title: string; kicker?: string; right?: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'light' | 'dark' }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ transform: [{ rotate: '-4deg' }] }}>
        <BrandMark size={36} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.supporting, textTransform: 'uppercase' }}>{kicker}</Text> : null}
        <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 34, letterSpacing: 0.4, color: palette.foreground, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Paper-panel text colors for dark readable copy on cream panels. */
export const paperText = { ink: palette.foreground, muted: palette.supporting } as const;
