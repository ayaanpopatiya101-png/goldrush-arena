// Shared onboarding pieces: step frame with Back + progress, court illustration, choice tiles.
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { palette, tactile, PLAYER_COLORS } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '@/context/PlayerContext';

export const EMBLEMS: { value: string; name: string }[] = [
  { value: AVATAR_EMOJIS[0]!, name: 'Controller' },
  { value: AVATAR_EMOJIS[1]!, name: 'Bolt' },
  { value: AVATAR_EMOJIS[2]!, name: 'Flame' },
  { value: AVATAR_EMOJIS[3]!, name: 'Skull' },
  { value: AVATAR_EMOJIS[4]!, name: 'Lion' },
  { value: AVATAR_EMOJIS[5]!, name: 'Crown' },
  { value: AVATAR_EMOJIS[7]!, name: 'Diamond' },
];
export const COLORS: { value: string; name: string }[] = [
  { value: AVATAR_COLORS[0]!, name: 'Gold' },
  { value: AVATAR_COLORS[1]!, name: 'Red' },
  { value: AVATAR_COLORS[2]!, name: 'Slate' },
  { value: AVATAR_COLORS[3]!, name: 'Green' },
  { value: AVATAR_COLORS[5]!, name: 'Orange' },
];

export function useEntryInsets() {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  return { top: web ? Math.max(insets.top, 67) : insets.top, bottom: web ? Math.max(insets.bottom, 34) : insets.bottom };
}

/** Tokens of progress: lit brass slots, like credits on a cabinet. */
export function Progress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <View style={k.progress} accessibilityRole="progressbar" accessibilityLabel={`${label}, step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}>
      {/* One continuous progress track, one choice per screen. */}
      <View style={k.track}>
        <View style={[k.trackFill, { width: `${Math.round((step / total) * 100)}%` as never }]} />
        {Array.from({ length: total - 1 }, (_, i) => (
          <View key={i} style={[k.trackTick, { left: `${Math.round(((i + 1) / total) * 100)}%` as never }]} />
        ))}
      </View>
      <Text style={k.stepText}>{`${step} / ${total}  ${label}`}</Text>
    </View>
  );
}

interface FrameProps {
  testID: string;
  onBack?: () => void;
  backLabel?: string;
  progress?: { step: number; total: number; label: string };
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** Keep step content and its action in one scroll flow, including large-text layouts. */
export function StepFrame({ testID, onBack, backLabel = 'Back', progress, footer, children }: FrameProps) {
  const ins = useEntryInsets();
  const { width } = useWindowDimensions();
  const pad = width < 400 ? 18 : 24;
  return (
    <View testID={testID} style={k.root}>
      <View style={[k.top, { paddingTop: ins.top + 8, paddingHorizontal: pad }]}>
        <View style={k.topInner}>
          {onBack ? (
            <Pressable testID={`${testID}-back`} onPress={onBack} style={k.back} accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={6}>
              <Feather name="chevron-left" size={22} color={palette.paper} />
              <Text style={k.backText}>{backLabel}</Text>
            </Pressable>
          ) : <View style={{ height: 44 }} />}
          {progress ? <Progress {...progress} /> : null}
        </View>
      </View>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        bottomOffset={24}
        contentContainerStyle={[k.body, { paddingHorizontal: pad, paddingBottom: ins.bottom + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[k.inner, { flexGrow: 1 }]}>
          <View style={k.inner}>{children}</View>
          <View style={[k.footer, { marginTop: 'auto' }]}>{footer}</View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

export function Heading({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={k.kicker}>{kicker}</Text>
      <Text style={k.title} accessibilityRole="header">{title}</Text>
      {body ? <Text style={k.lede}>{body}</Text> : null}
    </View>
  );
}

/** Stamped court plate: four seats, you on the bottom edge. Static, no looping motion. */
export function CourtPlate({ size, you = PLAYER_COLORS[0], highlight }: { size: number; you?: string; highlight?: 'you' | 'all' }) {
  const t = Math.max(6, size * 0.05);
  const len = size * 0.3;
  const dim = highlight === 'you' ? 0.45 : 1;
  return (
    <View style={[k.plateOuter, { width: size + 20, height: size + 20 }]} accessible accessibilityLabel="Square court with four paddles, yours on the bottom edge">
      <View style={[k.plate, { width: size, height: size }]}>
        <View style={[k.centerLine]} />
        <View style={[k.centerRing, { width: size * 0.3, height: size * 0.3, marginLeft: -size * 0.15, marginTop: -size * 0.15 }]} />
        <View style={[k.puck, { width: t * 1.8, height: t * 1.8, left: size * 0.58, top: size * 0.38 }]} />
        <View style={[k.pad, { opacity: dim, backgroundColor: PLAYER_COLORS[1], width: len, height: t, top: t, left: (size - len) / 2 }]} />
        <View style={[k.pad, { opacity: dim, backgroundColor: PLAYER_COLORS[2], width: t, height: len, left: t, top: (size - len) / 2 }]} />
        <View style={[k.pad, { opacity: dim, backgroundColor: PLAYER_COLORS[3], width: t, height: len, right: t, top: (size - len) / 2 }]} />
        <View style={[k.pad, k.youPad, { backgroundColor: you, width: len, height: t, bottom: t, left: (size - len) / 2 }]} />
      </View>
    </View>
  );
}

interface ChoiceProps {
  testID: string; label: string; selected: boolean; onPress: () => void; children: React.ReactNode; size?: number;
}
/** Radio tile with native and browser selection semantics. */
export function ChoiceTile({ testID, label, selected, onPress, children, size = 56 }: ChoiceProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      aria-selected={selected}
      style={({ pressed }) => [k.tile, { width: size, height: size }, selected && k.tileOn, pressed && { borderBottomWidth: 2, transform: [{ translateY: 3 }] }]}
    >
      {children}
    </Pressable>
  );
}

export const k = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  top: { paddingBottom: 10 },
  topInner: { width: '100%', maxWidth: 560, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 8 },
  backText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: palette.paper },
  progress: { flex: 1, gap: 4, minWidth: 0 },
  track: { height: 16, borderWidth: 2, borderColor: palette.charcoal, backgroundColor: palette.sandstone, padding: 2, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: palette.navy },
  trackTick: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: palette.charcoal, opacity: 0.25 },
  slots: { flexDirection: 'row', gap: 4 },
  slot: { width: 22, height: 8, borderWidth: 1, borderColor: tactile.brass, backgroundColor: palette.ink },
  slotOn: { backgroundColor: palette.ochre, borderColor: palette.ochre },
  stepText: { fontFamily: fonts.displayMedium, fontSize: 13, letterSpacing: 1.2, color: palette.slate, textTransform: 'uppercase' },
  body: { paddingTop: 24, paddingBottom: 24, flexGrow: 1 },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 20 },
  footer: { paddingTop: 14, borderTopWidth: 2, borderTopColor: palette.sandstone, backgroundColor: palette.ink },
  kicker: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 2, color: palette.slate, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: palette.charcoal, textTransform: 'uppercase' },
  lede: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: palette.paperDim },
  plateOuter: { alignSelf: 'center', padding: 8, backgroundColor: palette.navy, borderWidth: 2, borderColor: tactile.brassEdge },
  plate: { backgroundColor: tactile.court, borderWidth: 2, borderColor: tactile.courtLine, overflow: 'hidden' },
  centerLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: tactile.courtLine },
  centerRing: { position: 'absolute', left: '50%', top: '50%', borderWidth: 2, borderColor: tactile.courtLine, borderRadius: 999 },
  puck: { position: 'absolute', backgroundColor: tactile.courtInk, borderRadius: 999 },
  pad: { position: 'absolute', borderRadius: 1 },
  youPad: { borderWidth: 2, borderColor: tactile.courtInk },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, borderColor: palette.slate, backgroundColor: palette.stone, borderRadius: 0 },
  tileOn: { borderColor: palette.charcoal, backgroundColor: palette.orange },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21, color: palette.clay },
  help: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.muted, flexShrink: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.paper },
});
