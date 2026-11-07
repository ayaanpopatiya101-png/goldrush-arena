// Shared flat primitives for GoldRush Arena: sandstone plates, charcoal type, orange action.
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { palette, tactile } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import { BrandMark } from '@/components/ui/BrandMark';

export const ui = palette;
export const R = 0;

export function Panel({ children, style, tone = 'base' }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'base' | 'raised' | 'outline' | 'paper' | 'brass' }) {
  return (
    <View style={[
      p.panel,
      tone === 'raised' && { backgroundColor: palette.graphite2 },
      tone === 'outline' && { backgroundColor: 'transparent' },
      tone === 'paper' && { backgroundColor: tactile.paperPanel, borderColor: tactile.brassEdge },
      tone === 'brass' && { backgroundColor: tactile.brass, borderColor: tactile.brassEdge },
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  loading?: boolean;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, size = 'md', style, testID, accessibilityHint }: BtnProps) {
  const fg = disabled && !loading ? palette.muted : variant === 'primary' ? palette.charcoal : variant === 'danger' ? palette.slate : palette.charcoal;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
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
        variant === 'primary' && { backgroundColor: palette.orange, borderColor: palette.orange, borderWidth: 2 },
        pressed && variant === 'primary' && { borderColor: palette.charcoal },
        variant === 'secondary' && { backgroundColor: pressed ? palette.stone : palette.graphite2, borderColor: palette.line },
        variant === 'ghost' && { backgroundColor: pressed ? palette.graphite2 : 'transparent', borderColor: palette.line },
        variant === 'danger' && { backgroundColor: pressed ? palette.graphite2 : 'transparent', borderColor: palette.clay },
        (disabled && !loading) && { backgroundColor: palette.graphite, borderColor: palette.line },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Feather name={icon} size={size === 'lg' ? 20 : 15} color={fg} /> : null}
      <Text style={[p.btnText, size === 'lg' && p.btnTextLg, size === 'sm' && p.btnTextSm, { color: disabled && !loading ? palette.muted : fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, tone = 'neutral', style }: { label: string; tone?: 'neutral' | 'ochre' | 'moss' | 'clay'; style?: StyleProp<ViewStyle> }) {
  const c = tone === 'ochre' ? palette.ochre : tone === 'moss' ? palette.moss : tone === 'clay' ? palette.clay : palette.slate;
  return (
    <View style={[p.chip, { borderColor: c }, (tone === 'ochre' || tone === 'moss') && { backgroundColor: c }, style]}>
      <Text style={[p.chipText, { color: tone === 'ochre' || tone === 'moss' ? palette.charcoal : c }]}>{label}</Text>
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={0}
      style={({ pressed }) => [p.iconBtn, pressed && { backgroundColor: palette.graphite2 }, style]}
    >
      <Feather name={icon} size={18} color={palette.paperDim} />
    </Pressable>
  );
}

const p = StyleSheet.create({
  panel: { backgroundColor: palette.sandstone, borderWidth: 2, borderColor: palette.slate, borderRadius: R },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1.6, color: palette.paperDim, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: palette.line },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: R, minHeight: 44, paddingHorizontal: 16 },
  btnLg: { minHeight: 60, paddingHorizontal: 20 },
  btnSm: { minHeight: 44, paddingHorizontal: 10 },
  btnText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.2, textTransform: 'uppercase' },
  btnTextLg: { fontSize: 26, letterSpacing: 2 },
  btnTextSm: { fontSize: 14, letterSpacing: 1 },
  chip: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: palette.line },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: palette.paper, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.muted, textTransform: 'uppercase' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: R, borderWidth: 1, borderColor: palette.line },
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
export function ScreenTitle({ title, kicker, right, style }: { title: string; kicker?: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ transform: [{ rotate: '-4deg' }] }}>
        <BrandMark size={36} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker ? <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.muted, textTransform: 'uppercase' }}>{kicker}</Text> : null}
        <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.5, color: palette.paper, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Paper-panel text colors for dark readable copy on cream panels. */
export const paperText = { ink: tactile.paperInk, muted: tactile.paperMuted } as const;
