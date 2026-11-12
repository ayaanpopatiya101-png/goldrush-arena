import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameArena } from '@/components/GameArena';
import { Button, Chip, Panel } from '@/components/ui/Primitives';
import { palette , PLAYER_COLORS } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { usePlayer } from '@/context/PlayerContext';
import { useBlockingOverlay } from '@/context/OverlayQueue';

export type TutorialStep = 'move' | 'block' | 'miss' | 'missDone' | 'match' | 'progress';
type StageEvent = 'move' | 'block' | 'miss';

/** Pure step machine, exported for tests. Events only advance their own stage, once. */
export function nextTutorialStep(step: TutorialStep, event: StageEvent | 'startMatch' | 'gameOver'): TutorialStep {
  if (step === 'move' && event === 'move') return 'block';
  if (step === 'block' && event === 'block') return 'miss';
  if (step === 'miss' && event === 'miss') return 'missDone';
  if (step === 'missDone' && event === 'startMatch') return 'match';
  if (step === 'match' && event === 'gameOver') return 'progress';
  return step;
}

const TRACK: Record<TutorialStep, number> = { move: 20, block: 40, miss: 55, missDone: 65, match: 82, progress: 100 };

const COPY: Record<TutorialStep, { kicker: string; title: string; body: string }> = {
  move: { kicker: 'Step 1 of 4 · Move', title: 'Slide your paddle', body: 'Your paddle sits on the bottom edge, nearest you. Drag along the court. On desktop, click and drag. The ball waits until you move.' },
  block: { kicker: 'Step 2 of 4 · Block', title: 'Meet the slow ball', body: 'A slow ball is heading for your edge. Put your paddle in its path to send it back.' },
  miss: { kicker: 'Step 3 of 4 · Miss', title: 'Now let one through', body: 'Place your paddle, then watch. This ball is aimed away from you on purpose so you can see what a miss looks like.' },
  missDone: { kicker: 'Step 3 of 4 · Miss', title: 'That cost a life', body: 'A ball that crosses your bottom edge removes one life. Lose them all and you are out. Here it was free. Next, a gentle match against three local bots.' },
  match: { kicker: 'Step 4 of 4 · Intro match', title: 'Last paddle standing', body: 'Slow ball, no power-ups, extra lives. Protect the bottom edge. Nothing here affects rank or history.' },
  progress: { kicker: 'Debrief', title: 'How you climb', body: 'Account XP unlocks service ranks and cosmetics. Only real-player Ranked changes seasonal skill. Quest claims earn pass points separately. Practice and this tutorial award nothing.' },
};

/** First-run and Settings replay share this flow and the profile completion flag. */
export function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const active = useBlockingOverlay(true);
  const { completeTutorial } = usePlayer();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState<TutorialStep>('move');
  const [matchKey, setMatchKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Court fits a 390x844 phone alongside heading, copy and one action row.
  const arenaSize = Math.floor(Math.max(200, Math.min(width - 40, height * 0.42, 420)));

  const onEvent = useCallback((e: StageEvent) => setStep(s => nextTutorialStep(s, e)), []);
  const onGameOver = useCallback(() => setStep(s => nextTutorialStep(s, 'gameOver')), []);

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

  const copy = COPY[step];
  const stage: StageEvent | undefined = step === 'move' || step === 'block' || step === 'miss' ? step
    : step === 'missDone' ? 'miss' : undefined;
  const showCourt = step !== 'progress';
  const isMatch = step === 'match';
  const shared = {
    arenaSize, playerName: 'You', playerColor: PLAYER_COLORS[0], playerGlowColor: PLAYER_COLORS[0],
    botNames: ['North bot', 'West bot', 'East bot'], botRanks: ['Bronze 1', 'Bronze 1', 'Bronze 1'],
    practice: true, botDifficulty: 'easy' as const, soundEnabled: false,
  };

  if (!active) return null;
  return (
    <View testID={`tutorial-step-${step}`} style={[s.root, { paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.heading}>
          <Text style={s.kicker}>{copy.kicker}</Text>
          <Button testID="tutorial-skip" label="Skip" size="sm" variant="ghost" onPress={finish} disabled={busy} />
        </View>
        {/* Lesson track: one continuous bar like the entry flow */}
        <View style={s.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[s.trackFill, { width: `${TRACK[step]}%` as never }]} />
        </View>
        <Text accessibilityRole="header" style={s.title}>{copy.title}</Text>
        <Text style={s.body} accessibilityLiveRegion="polite">{copy.body}</Text>

        {showCourt && (
          <View testID="tutorial-court" style={[s.court, { width: arenaSize, height: arenaSize }]}>
            {isMatch ? (
              <GameArena key={`match-${matchKey}`} {...shared} botSkill={0} noPowerups startSpeedMult={0.4}
                initialLives={3} playerBonusLives={3} skipCountdown onGameOver={onGameOver} />
            ) : (
              <GameArena key={stage} {...shared} tutorialStage={stage} onTutorialEvent={onEvent} skipCountdown noPowerups onGameOver={() => {}} />
            )}
          </View>
        )}
        {showCourt && (
          <View style={s.legend}>
            <Chip label="You · bottom edge" tone="ochre" />
            <Chip label={isMatch ? '3 local bots' : 'Lesson court'} />
          </View>
        )}

        {step === 'missDone' && (
          <Button testID="tutorial-start-match" label="Start intro match" icon="play" onPress={() => { setMatchKey(k => k + 1); setStep(st => nextTutorialStep(st, 'startMatch')); }} />
        )}

        {step === 'progress' && (
          <Panel style={s.debrief}>
            {[['Account XP', 'Casual and Ranked earn XP toward cosmetic unlocks.'], ['Season skill', 'Five real-player Ranked placements reveal your division. Casual does not affect skill.'], ['Pass points', 'Claim completed quests to advance the pass.'], ['Ownership', 'Owned cosmetics stay in Collection.']].map(([k, v]) => (
              <View key={k} style={s.row}><Text style={s.rowKey}>{k}</Text><Text style={s.rowVal}>{v}</Text></View>
            ))}
          </Panel>
        )}

        {error && <Text accessibilityRole="alert" style={[s.body, { color: palette.supporting }]}>{error}</Text>}
        {step === 'progress' && (
          <Button testID="tutorial-finish" label={error ? 'Retry save' : 'Finish tutorial'} size="lg" loading={busy} onPress={finish} />
        )}
        <Text style={s.note}>Replay anytime from Settings</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  track: { height: 14, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.surface, padding: 2 },
  trackFill: { height: '100%', backgroundColor: palette.gold },
  kicker: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1.4, color: palette.supporting, textTransform: 'uppercase', flexShrink: 1 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, color: palette.foreground, textTransform: 'uppercase', marginTop: 4 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: palette.supporting },
  court: { alignSelf: 'center', backgroundColor: palette.inset },
  legend: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  debrief: { padding: 4 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  rowKey: { fontFamily: fonts.display, fontSize: 17, color: palette.foreground, width: 90, textTransform: 'uppercase', letterSpacing: 1 },
  rowVal: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.supporting, flex: 1 },
  note: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, textAlign: 'center' },
});
