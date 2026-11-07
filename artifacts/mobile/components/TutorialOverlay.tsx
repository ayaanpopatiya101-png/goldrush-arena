import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameArena } from '@/components/GameArena';
import { Button } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { usePlayer } from '@/context/PlayerContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const LESSONS = [
  { title: 'Move your paddle', body: 'Your paddle is at the bottom. Drag along your edge to move it. On desktop, move the pointer along the court. Try it in the practice court below.' },
  { title: 'Deflect and protect your lives', body: 'Meet the ball with your paddle to return it. A ball that passes your edge costs a life. In a standard match you start with five lives.' },
  { title: 'Survive to win', body: 'The last paddle standing wins. Power-ups appear on the court, and your selected ability charges as you block. This practice court uses local bots and gives no rank or rewards.' },
] as const;

/** First-run and Settings replay share the same lessons and profile completion flag. */
export function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const { profile, completeTutorial } = usePlayer();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [practiceRunning, setPracticeRunning] = useState(!reducedMotion);
  const arenaSize = Math.max(160, Math.min(width - 64, height * .32, 280));
  async function finish() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await completeTutorial();
      onComplete();
    } catch {
      setError('Could not save tutorial progress. Your player data is unchanged. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={[s.root, { paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.heading}>
          <Text style={s.step}>Learn to play · {step + 1} of {LESSONS.length}</Text>
          <Button label="Skip tutorial" variant="ghost" onPress={finish} disabled={busy} />
        </View>
        <Text accessibilityRole="header" style={s.title}>{LESSONS[step].title}</Text>
        <Text style={s.body}>{LESSONS[step].body}</Text>
        <View style={{ alignSelf: 'center', width: arenaSize, height: arenaSize }}>
          <GameArena arenaSize={arenaSize} playerName="You" playerColor={palette.ochre}
            playerGlowColor={palette.ochre} botNames={['North bot', 'West bot', 'East bot']}
            botRanks={['Bronze 1', 'Bronze 1', 'Bronze 1']} practice
            botDifficulty="easy" soundEnabled={false} paused={!practiceRunning} onGameOver={() => {}} />
        </View>
        <Text style={s.note}>You · bottom paddle · Practice only</Text>
        <Button label={practiceRunning ? 'Pause practice' : 'Run practice'} variant="secondary" onPress={() => setPracticeRunning(value => !value)} />
        {error && <Text accessibilityRole="alert" style={[s.body, { color: palette.clay }]}>{error}</Text>}
        <View style={s.actions}>
          {step > 0 && <Button label="Back" variant="secondary" disabled={busy} onPress={() => setStep(n => n - 1)} />}
          <Button label={step === LESSONS.length - 1 ? 'Finish tutorial' : 'Next lesson'}
            style={{ flex: 1 }} loading={busy}
            onPress={step === LESSONS.length - 1 ? finish : () => setStep(n => n + 1)} />
        </View>
        <Text style={s.note}>Replay these lessons anytime from Settings</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, gap: 20 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  step: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.paperDim },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.paper },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: palette.paperDim },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
});
