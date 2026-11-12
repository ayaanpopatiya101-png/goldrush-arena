// The four creation-path steps: welcome, how a match works, name, look.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { GameArena } from '@/components/GameArena';
import { Glyph } from '@/components/ui/Glyph';
import { Button } from '@/components/ui/Primitives';
import { diagram, palette, PLAYER_COLORS } from '@/constants/colors';
import { DEFAULT_LIVES } from '@/components/GameArena';
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

/** Lives are read from the engine default so the rule chips never drift from real play. */
const WELCOME_RULES: { icon: React.ComponentProps<typeof Feather>['name']; label: string; color: string }[] = [
  { icon: 'heart', label: `${DEFAULT_LIVES} lives`, color: diagram.rivalLeft },
  { icon: 'users', label: '4 players', color: diagram.rivalRight },
  { icon: 'award', label: '1 winner', color: diagram.rivalTop },
];

export function WelcomeStep({ onNew, onSaved, savedCount, onLegal }: {
  onNew: () => void; onSaved: () => void; savedCount: number; onLegal: (d: 'terms' | 'privacy') => void;
}) {
  const ins = useEntryInsets();
  const { width, height } = useWindowDimensions();
  const court = Math.max(170, Math.min(width - 88, height * 0.33, 300));
  return (
    <View testID="entry-welcome" style={[k.root, { paddingTop: ins.top + 10, paddingBottom: ins.bottom + 12 }]}>
      <ScrollView contentContainerStyle={w.welcomeScroll} showsVerticalScrollIndicator={false}>
        <View style={w.topBar}>
          <View style={w.statusPill} accessible accessibilityLabel={savedCount > 0 ? `${savedCount} saved players on this device` : 'Progress saves on this device'}>
            <View style={w.statusDot} />
            <Text style={w.statusTxt}>{savedCount > 0 ? `${savedCount} SAVED ON DEVICE` : 'SAVES ON THIS DEVICE'}</Text>
          </View>
          <Pressable testID="entry-top-privacy" onPress={() => onLegal('privacy')} accessibilityRole="button" accessibilityLabel="Privacy Policy"
            style={({ pressed }) => [w.roundBtn, pressed && w.roundBtnOn]}>
            <Feather name="shield" size={18} color={palette.supporting} />
          </Pressable>
        </View>

        <View style={w.marquee}>
          <View style={w.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={w.logoCore}>
              <View style={[w.logoBar, { top: 5, left: 9, right: 9, height: 4, backgroundColor: diagram.rivalTop }]} />
              <View style={[w.logoBar, { left: 5, top: 9, bottom: 9, width: 4, backgroundColor: diagram.rivalLeft }]} />
              <View style={[w.logoBar, { right: 5, top: 9, bottom: 9, width: 4, backgroundColor: diagram.rivalRight }]} />
              <View style={[w.logoBar, { bottom: 5, left: 9, right: 9, height: 4, backgroundColor: diagram.you }]} />
              <View style={w.logoPuck} />
            </View>
          </View>
          <Text style={w.brand} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            GOLDRUSH <Text style={{ color: palette.gold }}>ARENA</Text>
          </Text>
          <Text style={w.tag}>Four paddles. One court.</Text>
          <Text style={[w.tag, { color: palette.primary, fontFamily: fonts.bodyBold }]}>Guard your edge!</Text>
        </View>

        <WelcomeCourt size={court} />

        <View style={w.ruleRow}>
          {WELCOME_RULES.map(r => (
            <View key={r.label} style={w.ruleChip} accessible accessibilityLabel={r.label}>
              <Feather name={r.icon} size={18} color={r.color} />
              <Text style={[w.ruleChipTxt, { color: r.color === diagram.rivalLeft ? palette.foreground : r.color }]}>{r.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={w.actions}>
          <Button testID="entry-start" label="Step up to the court" icon="play" size="lg" onPress={onNew} />
          <Button
            testID="entry-saved"
            label={savedCount > 0 ? `Saved players on this device (${savedCount})` : 'Saved players on this device'}
            icon="users" size="lg" variant="secondary" onPress={onSaved}
          />
          <LegalLinks onOpen={onLegal} />
        </View>
      </ScrollView>
    </View>
  );
}

/** Static illustration of the four-seat court; the real engine demo lives in the intro step. */
function WelcomeCourt({ size }: { size: number }) {
  const t = Math.max(8, size * 0.045);
  const len = size * 0.3;
  const lbl = { position: 'absolute' as const, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1 };
  return (
    <View style={w.courtOuter} accessible accessibilityLabel="Square court with four paddles. Three rivals on the top, left and right edges; your paddle on the bottom edge.">
      <View style={[w.court, { width: size, height: size }]}>
        <View style={[w.courtLine, { left: 0, right: 0, top: '50%', height: 1.5 }]} />
        <View style={[w.courtLine, { top: 0, bottom: 0, left: '50%', width: 1.5 }]} />
        <View style={[w.courtRing, { width: size * 0.32, height: size * 0.32, right: -size * 0.12, top: size / 2 - size * 0.16 }]} />
        <View style={[w.pad, { backgroundColor: diagram.rivalTop, width: len, height: t, top: t * 2.2, left: (size - len) / 2 }]} />
        <Text style={[lbl, { color: diagram.rivalTop, top: 4, alignSelf: 'center' }]}>RIVAL 1</Text>
        <View style={[w.pad, { backgroundColor: diagram.rivalLeft, width: t, height: len, left: t * 1.6, top: (size - len) / 2 }]} />
        <View style={[w.pad, { backgroundColor: diagram.rivalRight, width: t, height: len, right: t * 1.6, top: (size - len) / 2 }]} />
        <View style={[w.puck, { width: t * 2, height: t * 2, left: size / 2 - t, top: size / 2 - t }]} />
        <Text style={[lbl, { color: palette.muted, bottom: t * 5.6, alignSelf: 'center' }]}>DRAG TO DEFLECT</Text>
        <View style={[w.pad, { backgroundColor: diagram.you, width: len * 1.15, height: t * 1.3, bottom: t * 3, left: (size - len * 1.15) / 2, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: t * 0.9, height: t * 0.9, borderRadius: t, backgroundColor: palette.foreground }} />
        </View>
        <View style={[w.youTag, { bottom: 6 }]}><Text style={w.youTagTxt}>YOUR PADDLE</Text></View>
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
  welcomeScroll: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20, justifyContent: 'space-between', gap: 18 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 34, borderRadius: 17, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 3, borderColor: palette.border, borderBottomColor: palette.edge },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.primary },
  statusTxt: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: palette.supporting },
  roundBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge },
  roundBtnOn: { borderBottomWidth: 1.5, transform: [{ translateY: 2 }] },
  marquee: { alignItems: 'center', gap: 6 },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: palette.gold, borderBottomWidth: 5, borderBottomColor: palette.goldEdge, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoCore: { width: 34, height: 34, borderRadius: 9, backgroundColor: palette.deepest },
  logoBar: { position: 'absolute', borderRadius: 2 },
  logoPuck: { position: 'absolute', left: 14, top: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.foreground },
  brand: { fontFamily: fonts.display, fontSize: 38, color: palette.foreground, textAlign: 'center', letterSpacing: 0.5 },
  tag: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 21, color: palette.supporting, textAlign: 'center' },
  courtOuter: { alignSelf: 'center', padding: 14, borderRadius: 26, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 5, borderColor: palette.border, borderBottomColor: palette.edge },
  court: { borderRadius: 16, backgroundColor: palette.inset, borderWidth: 1.5, borderColor: palette.border, overflow: 'hidden' },
  courtLine: { position: 'absolute', backgroundColor: palette.border },
  courtRing: { position: 'absolute', borderWidth: 1.5, borderColor: palette.border, borderRadius: 999 },
  pad: { position: 'absolute', borderRadius: 999 },
  puck: { position: 'absolute', borderRadius: 999, backgroundColor: palette.foreground, borderBottomWidth: 2, borderBottomColor: palette.muted },
  youTag: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: diagram.you },
  youTagTxt: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: palette.onAccent },
  ruleRow: { flexDirection: 'row', gap: 10 },
  ruleChip: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge },
  ruleChipTxt: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.5 },
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
