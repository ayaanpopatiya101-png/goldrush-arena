// Manual editor building blocks: stamped plate buttons, motif/texture grids, density stepper.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MOTIFS, TEXTURES, type Artwork } from '@workspace/goldrush-catalog/cosmetics';

import { palette, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { MOTIF_LABEL, PaddleArt, TEXTURE_LABEL } from '@/components/cosmetics/PaddleArt';

type Tone = 'orange' | 'gold' | 'navy' | 'plain';
export function PlateButton({ label, onPress, tone = 'plain', disabled, busy, testID, a11yHint, style }: {
  label: string; onPress: () => void; tone?: Tone; disabled?: boolean; busy?: boolean; testID?: string; a11yHint?: string; style?: StyleProp<ViewStyle>;
}) {
  const bg = tone === 'orange' ? palette.orange : tone === 'gold' ? palette.gold : tone === 'navy' ? palette.inset : palette.surface;
  const fg = tone === 'orange' || tone === 'gold' ? palette.onAccent : palette.foreground;
  const off = disabled || busy;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={off} accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }} accessibilityHint={a11yHint}
      style={({ pressed }) => [s.plate, { backgroundColor: bg }, pressed && s.platePressed, off && s.dim, style]}>
      <Text style={[s.plateText, { color: fg }]}>{busy ? 'Working' : label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children, aside }: { children: string; aside?: string }) {
  return (
    <View style={s.labelRow}>
      <Text style={s.label} accessibilityRole="header">{children}</Text>
      {aside ? <Text style={s.aside}>{aside}</Text> : null}
    </View>
  );
}

export function MotifGrid({ draft, onPick }: { draft: Artwork; onPick: (m: Artwork['motif']) => void }) {
  return (
    <View style={s.grid} accessibilityRole="radiogroup" accessibilityLabel="Motif">
      {MOTIFS.map(m => {
        const on = draft.motif === m;
        return (
          <Pressable key={m} testID={`motif-${m}`} onPress={() => onPick(m)} accessibilityRole="radio"
            accessibilityState={{ checked: on }} accessibilityLabel={MOTIF_LABEL[m]}
            style={({ pressed }) => [s.motif, on && s.motifOn, pressed && s.platePressed]}>
            <View style={s.motifArt}><PaddleArt design={{ ...draft, motif: m }} width={64} height={18} /></View>
            <Text style={s.motifText} numberOfLines={1}>{MOTIF_LABEL[m]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TextureRow({ value, onPick }: { value: Artwork['texture']; onPick: (t: Artwork['texture']) => void }) {
  return (
    <View style={s.row} accessibilityRole="radiogroup" accessibilityLabel="Texture">
      {TEXTURES.map(t => {
        const on = value === t;
        return (
          <Pressable key={t} testID={`texture-${t}`} onPress={() => onPick(t)} accessibilityRole="radio"
            accessibilityState={{ checked: on }} style={({ pressed }) => [s.seg, on && s.segOn, pressed && s.platePressed]}>
            <Text style={[s.segText, on && { color: palette.foreground }]}>{TEXTURE_LABEL[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DensityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={s.row} accessibilityRole="adjustable" accessibilityLabel="Pattern density" accessibilityValue={{ min: 2, max: 8, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => onChange(Math.max(2, Math.min(8, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
      <PlateButton label="Less" testID="density-down" disabled={value <= 2} onPress={() => onChange(value - 1)} style={s.stepBtn} />
      <View style={s.ticks}>
        {[2, 3, 4, 5, 6, 7, 8].map(n => (
          <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`Density ${n}`}
            accessibilityState={{ selected: n === value }} style={s.tickHit}>
            <View style={[s.tick, { height: 8 + n * 3 }, n <= value && s.tickOn]} />
          </Pressable>
        ))}
      </View>
      <PlateButton label="More" testID="density-up" disabled={value >= 8} onPress={() => onChange(value + 1)} style={s.stepBtn} />
    </View>
  );
}

export type ColorSlot = 'base' | 'ink' | 'accent';
const SLOT_LABEL: Record<ColorSlot, string> = { base: 'Base', ink: 'Ink', accent: 'Accent' };
export function ColorSlotTabs({ draft, slot, onSlot }: { draft: Artwork; slot: ColorSlot; onSlot: (s: ColorSlot) => void }) {
  return (
    <View style={s.row} accessibilityRole="tablist">
      {(['base', 'ink', 'accent'] as const).map(k => {
        const on = slot === k;
        return (
          <Pressable key={k} testID={`slot-${k}`} onPress={() => onSlot(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={`${SLOT_LABEL[k]} colour ${draft[k]}`} style={({ pressed }) => [s.slot, on && s.slotOn, pressed && s.platePressed]}>
            <View style={[s.swatch, { backgroundColor: draft[k] }]} />
            <View>
              <Text style={s.slotName}>{SLOT_LABEL[k]}</Text>
              <Text style={s.slotHex}>{draft[k].toUpperCase()}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Notice({ tone, text, action, onAction }: { tone: 'error' | 'info'; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={[s.notice, tone === 'error' ? s.noticeErr : s.noticeInfo]} accessibilityRole={tone === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite">
      <Text style={[s.noticeText, tone === 'info' && { color: palette.foreground }]}>{text}</Text>
      {action && onAction ? <PlateButton label={action} onPress={onAction} tone={tone === 'error' ? 'plain' : 'gold'} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  plate: { minHeight: 48, minWidth: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, borderRadius: 3 },
  platePressed: { transform: [{ translateY: 2 }] },
  plateText: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase' },
  dim: { opacity: 0.45 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1.5, color: palette.foreground, textTransform: 'uppercase' },
  aside: { fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.supporting },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motif: { width: '23%', minWidth: 76, flexGrow: 1, minHeight: 64, padding: 6, gap: 6, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background, borderRadius: 3, alignItems: 'center' },
  motifOn: { borderColor: palette.edge, borderBottomWidth: 5, backgroundColor: palette.gold },
  motifArt: { borderWidth: 1, borderColor: palette.edge },
  motifText: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.foreground },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  seg: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.background, borderRadius: 3 },
  segOn: { backgroundColor: palette.inset },
  segText: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.foreground },
  stepBtn: { paddingHorizontal: 10 },
  ticks: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 48, paddingHorizontal: 4 },
  tickHit: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'flex-end' },
  tick: { width: 8, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.edge },
  tickOn: { backgroundColor: palette.primary },
  slot: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background, borderRadius: 3 },
  slotOn: { borderColor: palette.edge, borderBottomWidth: 5, backgroundColor: palette.surface },
  swatch: { width: 26, height: 26, borderWidth: 2, borderColor: palette.edge },
  slotName: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 1 },
  slotHex: { fontFamily: fonts.displayMedium, fontSize: 14, color: palette.supporting },
  notice: { padding: 12, gap: 10, borderWidth: 2, borderColor: palette.edge, borderRadius: 3 },
  noticeErr: { backgroundColor: palette.background, borderLeftWidth: 8, borderLeftColor: palette.primary },
  noticeInfo: { backgroundColor: palette.inset },
  noticeText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: palette.foreground },
});
