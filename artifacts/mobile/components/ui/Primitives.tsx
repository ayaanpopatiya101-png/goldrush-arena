// Shared flat primitives for GoldRush Arena: scoreboard panels, labels, buttons.
// Rules: graphite surfaces, off-white text, ochre action, 0-4 radius, no shadows.
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export const ui = palette;
export const R = 3;

export function Panel({ children, style, tone = 'base' }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'base' | 'raised' | 'outline' }) {
  return (
    <View style={[
      p.panel,
      tone === 'raised' && { backgroundColor: palette.graphite2 },
      tone === 'outline' && { backgroundColor: 'transparent' },
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
  const fg = variant === 'primary' ? palette.ochreInk : variant === 'danger' ? palette.clay : palette.paper;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        p.btn,
        size === 'lg' && p.btnLg,
        size === 'sm' && p.btnSm,
        variant === 'primary' && { backgroundColor: pressed ? palette.ochreDeep : palette.ochre, borderColor: palette.ochre },
        variant === 'secondary' && { backgroundColor: pressed ? palette.line : palette.graphite2, borderColor: palette.line },
        variant === 'ghost' && { backgroundColor: pressed ? palette.graphite2 : 'transparent', borderColor: palette.line },
        variant === 'danger' && { backgroundColor: pressed ? palette.graphite2 : 'transparent', borderColor: palette.clay },
        (disabled && !loading) && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Feather name={icon} size={size === 'lg' ? 20 : 15} color={fg} /> : null}
      <Text style={[p.btnText, size === 'lg' && p.btnTextLg, size === 'sm' && p.btnTextSm, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, tone = 'neutral', style }: { label: string; tone?: 'neutral' | 'ochre' | 'moss' | 'clay'; style?: StyleProp<ViewStyle> }) {
  const c = tone === 'ochre' ? palette.ochre : tone === 'moss' ? palette.moss : tone === 'clay' ? palette.clay : palette.paperDim;
  return (
    <View style={[p.chip, { borderColor: c }, style]}>
      <Text style={[p.chipText, { color: c }]}>{label}</Text>
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
      hitSlop={6}
      style={({ pressed }) => [p.iconBtn, pressed && { backgroundColor: palette.graphite2 }, style]}
    >
      <Feather name={icon} size={18} color={palette.paperDim} />
    </Pressable>
  );
}

const p = StyleSheet.create({
  panel: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderRadius: R },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1.6, color: palette.paperDim, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: palette.line },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: R, minHeight: 44, paddingHorizontal: 16 },
  btnLg: { minHeight: 60, paddingHorizontal: 20 },
  btnSm: { minHeight: 34, paddingHorizontal: 10 },
  btnText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.2, textTransform: 'uppercase' },
  btnTextLg: { fontSize: 26, letterSpacing: 2 },
  btnTextSm: { fontSize: 14, letterSpacing: 1 },
  chip: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: palette.line },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: palette.paper, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1, color: palette.muted, textTransform: 'uppercase' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R, borderWidth: 1, borderColor: palette.line },
});
