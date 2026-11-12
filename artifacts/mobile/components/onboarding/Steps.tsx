// The four creation-path steps: welcome, how a match works, name, look.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { GameArena } from '@/components/GameArena';
import { BrandMark } from '@/components/ui/BrandMark';
import { Glyph } from '@/components/ui/Glyph';
import { Button } from '@/components/ui/Primitives';
import { palette, tactile , PLAYER_COLORS } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { ColorPicker } from '@/components/appearance/ColorPicker';
import { AvatarPhoto } from '@/components/appearance/PhotoAvatarEditor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ChoiceTile, CourtPlate, EMBLEMS, Heading, StepFrame, k, useEntryInsets } from './kit';

const TOTAL = 3;

export function LegalLinks({ onOpen }: { onOpen: (d: 'terms' | 'privacy') => void }) {
  return (
    <View style={w.legalRow}>
      <Pressable testID="entry-terms" onPress={() => onOpen('terms')} accessibilityRole="link" style={w.legalLink}>
        <Text style={w.legalText}>Terms of Service</Text>
      </Pressable>
      <Pressable testID="entry-privacy" onPress={() => onOpen('privacy')} accessibilityRole="link" style={w.legalLink}>
        <Text style={w.legalText}>Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

export function WelcomeStep({ onNew, onSaved, savedCount, onLegal }: {
  onNew: () => void; onSaved: () => void; savedCount: number; onLegal: (d: 'terms' | 'privacy') => void;
}) {
  const ins = useEntryInsets();
  const { width, height } = useWindowDimensions();
  const plate = Math.max(150, Math.min(width - 96, height * 0.32, 300));
  return (
    <View testID="entry-welcome" style={[k.root, { paddingTop: ins.top + 12, paddingBottom: ins.bottom + 12 }]}>
      <View style={w.welcomeScroll}>
        <View style={w.marquee}>
          <BrandMark size={56} />
          <Text style={w.brand} accessibilityRole="header">GoldRush{'\n'}Arena</Text>
          <Text style={w.tag}>Four paddles. One court.{'\n'}Guard your edge.</Text>
        </View>
        <CourtPlate size={plate} />
        <View style={w.actions}>
          <Button testID="entry-start" label="Step up to the court" icon="play" size="lg" onPress={onNew} />
          <Button
            testID="entry-saved"
            label={savedCount > 0 ? `Saved players on this device (${savedCount})` : 'Saved players on this device'}
            icon="users" size="lg" variant="secondary" onPress={onSaved}
          />
          <LegalLinks onOpen={onLegal} />
        </View>
      </View>
    </View>
  );
}

function Demo({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  if (!on) {
    return (
      <View style={{ gap: 10 }}>
        <Button testID="entry-demo-start" label="Watch a live demo match" icon="eye" variant="secondary" onPress={() => setOn(true)} />
        <Text style={k.help}>{reduced ? 'Reduce Motion is on, so the demo only runs if you start it.' : 'Optional. Runs the real engine with three local bots.'}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={[w.demoFrame, { width: size, height: size }]}>
        <GameArena key={run} arenaSize={size - 4} playerName="You" playerColor={PLAYER_COLORS[0]} playerGlowColor={PLAYER_COLORS[0]}
          botNames={['Bot North', 'Bot West', 'Bot East']} botRanks={['Gold', 'Gold', 'Gold']}
          onGameOver={() => setRun(r => r + 1)} practice soundEnabled={false} colorBoard={false} botDifficulty="easy" paused={paused} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button testID="entry-demo-pause" label={paused ? 'Resume' : 'Pause'} icon={paused ? 'play' : 'pause'} size="sm" variant="ghost" onPress={() => setPaused(p => !p)} />
        <Button testID="entry-demo-close" label="Close demo" icon="x" size="sm" variant="ghost" onPress={() => { setOn(false); setPaused(false); }} />
      </View>
    </View>
  );
}

const RULES: [string, string][] = [
  ['01', 'Your paddle rides the bottom edge. Drag to slide it.'],
  ['02', 'A puck past your edge costs one life.'],
  ['03', 'Last paddle standing takes the match. Your first rounds are against three local bots.'],
];

export function IntroStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { width, height } = useWindowDimensions();
  const plate = Math.max(140, Math.min(width - 96, height * 0.28, 260));
  return (
    <StepFrame testID="entry-intro" onBack={onBack} progress={{ step: 1, total: TOTAL, label: 'The game' }}
      footer={<Button testID="entry-intro-next" label="Got it, pick a name" size="lg" onPress={onNext} />}>
      <Heading kicker="How a match works" title="Guard the bottom edge" />
      <CourtPlate size={plate} highlight="you" />
      <View style={w.rules}>
        {RULES.map(([n, t]) => (
          <View key={n} style={w.rule}>
            <Text style={w.ruleNum}>{n}</Text>
            <Text style={w.ruleText}>{t}</Text>
          </View>
        ))}
      </View>
      <Demo size={Math.min(width - 48, 320)} />
    </StepFrame>
  );
}

interface NameProps {
  value: string; onChange: (v: string) => void; error: string | null; touched: boolean; onBlur: () => void;
  onBack: () => void; onNext: () => void; duplicate: boolean; onOpenSaved: () => void;
}
export function NameStep({ value, onChange, error, touched, onBlur, onBack, onNext, duplicate, onOpenSaved }: NameProps) {
  const trimmed = value.trim();
  const showErr = touched && (error || duplicate);
  return (
    <StepFrame testID="entry-name-step" onBack={onBack} progress={{ step: 2, total: TOTAL, label: 'Name' }}
      footer={<Button testID="entry-name-next" label="Next: your look" size="lg" disabled={!!error || duplicate} onPress={onNext} />}>
      <Heading kicker="Player name" title="What goes on the scoreboard?" body="Bots and party members see this name. You can only use it once on this device." />
      <View style={{ gap: 6 }}>
        <TextInput
          testID="entry-name"
          style={[w.input, showErr ? w.inputErr : null]}
          placeholder="2 to 16 letters, numbers or _"
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          maxLength={16}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={onNext}
          accessibilityLabel="Player name"
          aria-invalid={!!showErr}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[k.help, showErr ? { color: palette.supporting } : null]} accessibilityLiveRegion="polite">
            {touched && error ? error : duplicate ? `${trimmed} is already saved on this device.` : trimmed && !error ? 'Name is free.' : 'Letters, numbers and underscores.'}
          </Text>
          <Text style={k.help}>{value.length}/16</Text>
        </View>
        {duplicate ? (
          <Button testID="entry-name-open-saved" label={`Open saved player ${trimmed}`} size="sm" variant="ghost" onPress={onOpenSaved} />
        ) : null}
      </View>
    </StepFrame>
  );
}

interface StyleProps {
  name: string; emoji: string; color: string; onEmoji: (v: string) => void; onColor: (v: string) => void;
  onBack: () => void; onCreate: () => void; loading: boolean; error: string; onLegal: (d: 'terms' | 'privacy') => void;
}
export function StyleStep({ name, emoji, color, onEmoji, onColor, onBack, onCreate, loading, error, onLegal }: StyleProps) {
  const [defaultColor] = useState(color);
  const [custom, setCustom] = useState(false);
  return (
    <StepFrame testID="entry-style-step" onBack={onBack} progress={{ step: 3, total: TOTAL, label: 'Look' }}
      footer={
        <View style={{ gap: 8 }}>
          {error ? <Text style={k.error} accessibilityRole="alert">{error}</Text> : null}
          <Button testID="entry-create" label={error ? 'Retry save' : 'Create player on this device'} size="lg" loading={loading} onPress={onCreate} />
        </View>
      }>
      <Heading kicker="Emblem and frame colour" title="Mark your seat" />
      <View style={w.card} accessibilityLabel={`Preview: ${name}`}>
        <View style={[w.cardAvatar, { borderColor: color, overflow: 'hidden' }]}>
          <AvatarPhoto username={name} size={60}>
            <Glyph value={emoji} size={34} color={palette.foreground} />
          </AvatarPhoto>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={w.cardName} numberOfLines={1}>{name}</Text>
          <Text style={w.cardMeta}>Level 1 · Bronze</Text>
          <View style={[w.cardPaddle, { backgroundColor: color }]} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={k.label}>Emblem</Text>
        <View style={w.choices} accessibilityRole="radiogroup" accessibilityLabel="Emblem">
          {EMBLEMS.map(e => (
            <ChoiceTile key={e.value} testID={`entry-emblem-${e.name.toLowerCase()}`} label={`${e.name} emblem`} selected={emoji === e.value} onPress={() => onEmoji(e.value)}>
              <Glyph value={e.value} size={26} color={emoji === e.value ? palette.onAccent : palette.supporting} />
            </ChoiceTile>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={k.label}>Frame colour</Text>
        <Text style={k.help}>{custom ? 'Pick any colour. Your choice shows in the preview right away.' : 'Optional. The default frame colour is already set.'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button testID="entry-color-default" label="Use default" size="sm" variant={custom ? 'ghost' : 'secondary'}
            onPress={() => { setCustom(false); onColor(defaultColor); }} />
          <Button testID="entry-color-create" label="Create my colour" size="sm" variant={custom ? 'secondary' : 'ghost'}
            onPress={() => setCustom(true)} />
        </View>
        {custom ? <ColorPicker testID="entry-color-picker" value={color} onChange={onColor} /> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={k.label}>Photo (optional)</Text>
        <Text style={k.help}>Start with your emblem. After creating your player, add an optional photo in Profile. No photo is uploaded during setup.</Text>
      </View>
      <Text style={k.help}>Progress stays on this device and cannot be recovered if app data is removed. Optional saved photos use cloud storage under your guest identity; they stay private unless you publish them.</Text>
      <LegalLinks onOpen={onLegal} />
    </StepFrame>
  );
}

const w = StyleSheet.create({
  welcomeScroll: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, justifyContent: 'space-between', gap: 16 },
  marquee: { alignItems: 'center', gap: 10, paddingTop: 8 },
  brand: { fontFamily: fonts.display, fontSize: 52, lineHeight: 50, color: palette.foreground, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  tag: { fontFamily: fonts.bodySemiBold, fontSize: 17, lineHeight: 23, color: palette.supporting, textAlign: 'center' },
  actions: { gap: 10 },
  legalRow: { flexDirection: 'row', gap: 18, flexWrap: 'wrap', justifyContent: 'center' },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.supporting, textDecorationLine: 'underline' },
  rules: { gap: 10 },
  rule: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.background, alignItems: 'center' },
  ruleNum: { fontFamily: fonts.display, fontSize: 22, color: palette.onAccent, width: 34, height: 34, textAlign: 'center', lineHeight: 30, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.gold },
  ruleText: { fontFamily: fonts.bodySemiBold, fontSize: 17, lineHeight: 23, color: palette.foreground, flex: 1 },
  demoFrame: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, backgroundColor: palette.background, overflow: 'hidden' },
  input: { minHeight: 60, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.surface, color: palette.foreground, fontFamily: fonts.display, fontSize: 28, paddingHorizontal: 16, borderRadius: 10 },
  inputErr: { borderColor: palette.primary, borderRadius: 10, borderWidth: 3, borderBottomWidth: 5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, borderBottomWidth: 6 },
  cardAvatar: { width: 68, height: 68, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.deepest, borderRadius: 10 },
  cardName: { fontFamily: fonts.display, fontSize: 30, color: palette.foreground, textTransform: 'uppercase' },
  cardMeta: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.supporting },
  cardPaddle: { marginTop: 8, width: 64, height: 8, borderRadius: 10, borderWidth: 1, borderColor: palette.edge },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
