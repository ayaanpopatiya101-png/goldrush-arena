// Reusable full HSV colour picker: presets, shade plane, hue strip, numeric + hex entry.
// Touch and mouse via PanResponder; keyboard users use the labelled numeric fields.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { tactile, palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { AVATAR_COLORS } from '@/context/PlayerContext';
import { clamp, hexToHsv, hsvToHex, inkOn, normalizeHex, type HSV } from '@/utils/color';

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  presets?: readonly string[];
  testID?: string;
}

const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360];
const PLANE_H = 168;
const STRIP_H = 30;

function useDrag(onPoint: (x: number, y: number) => void, disabled: boolean) {
  const cb = useRef(onPoint); cb.current = onPoint;
  const dis = useRef(disabled); dis.current = disabled;
  return useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !dis.current,
    onMoveShouldSetPanResponder: () => !dis.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => cb.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: e => cb.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
  }), []);
}

function NumField({ label, max, value, onCommit, disabled, testID }: {
  label: string; max: number; value: number; onCommit: (n: number) => void; disabled: boolean; testID: string;
}) {
  const [text, setText] = useState(String(Math.round(value)));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(String(Math.round(value))); }, [value, focused]);
  const n = Number(text);
  const err = text.trim() === '' || !Number.isFinite(n) || n < 0 || n > max ? `0 to ${max}` : null;
  return (
    <View style={s.numWrap}>
      <Text style={s.fieldLabel} nativeID={`${testID}-label`}>{label}</Text>
      <TextInput
        testID={testID}
        style={[s.numInput, err ? s.inputErr : null, disabled && s.dim]}
        value={text}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={3}
        accessibilityLabel={`${label}, 0 to ${max}`}
        aria-invalid={!!err}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (err) setText(String(Math.round(value))); }}
        onChangeText={t => {
          setText(t);
          const v = Number(t);
          if (t.trim() !== '' && Number.isFinite(v) && v >= 0 && v <= max) onCommit(v);
        }}
      />
      <Text style={[s.hint, err ? s.errText : null]}>{err ?? `0–${max}`}</Text>
    </View>
  );
}

export function ColorPicker({ value, onChange, disabled = false, presets = AVATAR_COLORS, testID = 'color-picker' }: ColorPickerProps) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 0 });
  const lastEmitted = useRef<string | null>(normalizeHex(value));
  const [planeW, setPlaneW] = useState(0);
  const [hexText, setHexText] = useState(normalizeHex(value) ?? value);
  const [hexFocused, setHexFocused] = useState(false);

  // Sync from external value changes while preserving hue/sat for greys.
  useEffect(() => {
    const n = normalizeHex(value);
    if (!n || n === lastEmitted.current) return;
    lastEmitted.current = n;
    setHsv(prev => hexToHsv(n, prev.h, prev.s) ?? prev);
  }, [value]);

  const hex = hsvToHex(hsv);
  useEffect(() => { if (!hexFocused) setHexText(hex); }, [hex, hexFocused]);

  const hsvRef = useRef(hsv); hsvRef.current = hsv;
  const apply = (next: HSV) => {
    const c = { h: clamp(next.h, 0, 360), s: clamp(next.s, 0, 100), v: clamp(next.v, 0, 100) };
    setHsv(c);
    const out = hsvToHex(c);
    lastEmitted.current = out;
    onChange(out);
  };
  const applyRef = useRef(apply); applyRef.current = apply;
  const wRef = useRef(planeW); wRef.current = planeW;

  const plane = useDrag((x, y) => {
    const w = wRef.current || 1;
    applyRef.current({ ...hsvRef.current, s: (x / w) * 100, v: 100 - (y / PLANE_H) * 100 });
  }, disabled);
  const strip = useDrag(x => {
    const w = wRef.current || 1;
    applyRef.current({ ...hsvRef.current, h: (x / w) * 360 });
  }, disabled);

  const pickHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (!n) return;
    const next = hexToHsv(n, hsvRef.current.h, hsvRef.current.s);
    if (!next) return;
    setHsv(next);
    lastEmitted.current = n;
    onChange(n); // exact hex persisted, not round-tripped
  };

  const hexErr = normalizeHex(hexText) ? null : 'Use 6 hex digits, like #F36B3F';
  const pure = hsvToHex({ h: hsv.h, s: 100, v: 100 });
  const onLayout = (e: LayoutChangeEvent) => setPlaneW(e.nativeEvent.layout.width);
  const selectedHex = normalizeHex(value) ?? hex;

  return (
    <View testID={testID} style={[s.root, disabled && s.dim]} pointerEvents={disabled ? 'none' : 'auto'}>
      {/* Preview */}
      <View style={s.previewRow}>
        <View style={[s.preview, { backgroundColor: selectedHex }]} accessibilityLabel={`Selected colour ${selectedHex}`}>
          <Text style={[s.previewHex, { color: inkOn(selectedHex) }]}>{selectedHex}</Text>
        </View>
      </View>

      {/* Presets */}
      <View style={{ gap: 6 }}>
        <Text style={s.fieldLabel}>Presets</Text>
        <View style={s.presets} accessibilityRole="radiogroup" accessibilityLabel="Preset colours">
          {presets.map(p => {
            const on = normalizeHex(p) === selectedHex;
            return (
              <Pressable key={p} testID={`${testID}-preset-${p.replace('#', '').toLowerCase()}`}
                onPress={() => pickHex(p)} disabled={disabled} hitSlop={4}
                accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} accessibilityLabel={`Preset ${p}`}
                style={[s.preset, on && s.presetOn]}>
                <View style={[s.presetFill, { backgroundColor: p }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Shade plane */}
      <View style={{ gap: 6 }}>
        <Text style={s.fieldLabel}>Shade · drag for saturation and brightness</Text>
        <View testID={`${testID}-plane`} style={[s.plane, { height: PLANE_H }]} onLayout={onLayout} {...plane.panHandlers}
          accessibilityLabel={`Shade plane, saturation ${Math.round(hsv.s)}, value ${Math.round(hsv.v)}. Use the number fields below for keyboard entry.`}>
          {planeW > 0 && (
            <Svg width={planeW} height={PLANE_H} pointerEvents="none">
              <Defs>
                <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="1" stopColor={pure} stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={planeW} height={PLANE_H} fill="url(#sat)" />
              <Rect x="0" y="0" width={planeW} height={PLANE_H} fill="url(#val)" />
            </Svg>
          )}
          <View pointerEvents="none" style={[s.knob, {
            left: (hsv.s / 100) * planeW - 11, top: (1 - hsv.v / 100) * PLANE_H - 11, backgroundColor: hex,
          }]} />
        </View>
      </View>

      {/* Hue strip */}
      <View style={{ gap: 6 }}>
        <Text style={s.fieldLabel}>Hue</Text>
        <View testID={`${testID}-hue`} style={[s.plane, { height: STRIP_H }]} {...strip.panHandlers}
          accessibilityLabel={`Hue strip, ${Math.round(hsv.h)} degrees`}>
          {planeW > 0 && (
            <Svg width={planeW} height={STRIP_H} pointerEvents="none">
              <Defs>
                <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
                  {HUE_STOPS.map(h => <Stop key={h} offset={String(h / 360)} stopColor={hsvToHex({ h, s: 100, v: 100 })} stopOpacity="1" />)}
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={planeW} height={STRIP_H} fill="url(#hue)" />
            </Svg>
          )}
          <View pointerEvents="none" style={[s.hueThumb, { left: (hsv.h / 360) * planeW - 5, backgroundColor: pure }]} />
        </View>
      </View>

      {/* Keyboard entry */}
      <View style={s.numRow}>
        <NumField testID={`${testID}-h`} label="Hue" max={360} value={hsv.h} disabled={disabled} onCommit={n => apply({ ...hsvRef.current, h: n })} />
        <NumField testID={`${testID}-s`} label="Sat" max={100} value={hsv.s} disabled={disabled} onCommit={n => apply({ ...hsvRef.current, s: n })} />
        <NumField testID={`${testID}-v`} label="Value" max={100} value={hsv.v} disabled={disabled} onCommit={n => apply({ ...hsvRef.current, v: n })} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={s.fieldLabel}>Hex code</Text>
        <TextInput
          testID={`${testID}-hex`}
          style={[s.hexInput, hexErr ? s.inputErr : null]}
          value={hexText}
          editable={!disabled}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          accessibilityLabel="Hex colour code"
          aria-invalid={!!hexErr}
          onFocus={() => setHexFocused(true)}
          onBlur={() => { setHexFocused(false); setHexText(hex); }}
          onChangeText={t => { setHexText(t); if (normalizeHex(t) && t.replace('#', '').length === 6) pickHex(t); }}
        />
        <Text style={[s.hint, hexErr ? s.errText : null]} accessibilityLiveRegion="polite">{hexErr ?? 'Six digits, # optional.'}</Text>
      </View>
    </View>
  );
}

export default ColorPicker;

const s = StyleSheet.create({
  root: { gap: 14 },
  dim: { opacity: 0.5 },
  previewRow: { flexDirection: 'row' },
  preview: { flex: 1, height: 52, borderWidth: 3, borderColor: palette.edge, borderBottomWidth: 6, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8 },
  previewHex: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 2 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: palette.foreground, textTransform: 'uppercase' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { width: 44, height: 44, padding: 4, borderWidth: 2, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  presetOn: { borderColor: palette.edge, borderRadius: 10, borderWidth: 3, borderBottomWidth: 5 },
  presetFill: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: palette.edge },
  plane: { width: '100%', borderRadius: 10, borderWidth: 2, borderColor: palette.edge, overflow: 'hidden', backgroundColor: palette.surface },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: palette.border, outlineColor: tactile.paperInk } as object,
  hueThumb: { position: 'absolute', top: -2, width: 10, height: STRIP_H, borderRadius: 10, borderWidth: 2, borderColor: palette.edge },
  numRow: { flexDirection: 'row', gap: 10 },
  numWrap: { flex: 1, gap: 4 },
  numInput: { minHeight: 48, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface, color: palette.foreground, fontFamily: fonts.display, fontSize: 22, paddingHorizontal: 10, borderRadius: 8 },
  hexInput: { minHeight: 48, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface, color: palette.foreground, fontFamily: fonts.display, fontSize: 22, letterSpacing: 2, paddingHorizontal: 12, borderRadius: 8 },
  inputErr: { borderColor: palette.primary, borderRadius: 10, borderWidth: 3 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: palette.supporting },
  errText: { color: palette.foreground, fontFamily: fonts.bodyBold, textDecorationLine: 'underline', textDecorationColor: tactile.coral },
});
