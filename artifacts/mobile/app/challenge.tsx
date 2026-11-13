import { idleAnimation } from "@/components/ui/idleAnimation";
import { Text } from '@/components/ui/Text';
/**
 * Incoming challenge (deep link): goldrush://challenge?seed=YYYYMMDD&score=47&player=Alex
 * Validates the link, checks it against today's server seed, and never silently
 * substitutes a different run.
 */
import * as Haptics from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button, Panel, Shell, ScreenTitle } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';
import { fetchTodayChallenge } from '@/utils/dailyChallenge';
import { getDeviceId } from '@/utils/deviceId';

type Phase = 'ready' | 'loading' | 'error' | 'expired';

function formatSeed(seed: string): string {
  if (!/^\d{8}$/.test(seed)) return seed;
  return `${seed.slice(0, 4)}-${seed.slice(4, 6)}-${seed.slice(6, 8)}`;
}

export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const params = useLocalSearchParams<{ seed?: string; score?: string; player?: string }>();

  const seed = typeof params.seed === 'string' ? params.seed : '';
  const rawScore = typeof params.score === 'string' ? params.score : '';
  const targetScore = /^\d{1,5}$/.test(rawScore) ? parseInt(rawScore, 10) : NaN;
  let challenger = 'A player';
  try { if (typeof params.player === 'string' && params.player.trim()) challenger = decodeURIComponent(params.player).slice(0, 24); } catch { /* malformed name */ }
  const valid = /^\d{8}$/.test(seed) && Number.isFinite(targetScore) && targetScore > 0;

  const [phase, setPhase] = useState<Phase>('ready');
  const [todaySeed, setTodaySeed] = useState<string | null>(null);

  async function launch(useToday: boolean) {
    if (phase === 'loading') return;
    setPhase('loading');
    try {
      const deviceId = await getDeviceId();
      const challenge = await fetchTodayChallenge(deviceId);
      if (!challenge?.matchNonce || !challenge?.seedHash) { setPhase('error'); return; }
      if (!useToday && challenge.seed && challenge.seed !== seed) {
        setTodaySeed(challenge.seed); setPhase('expired'); return;
      }
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]!;
      setGameConfig({
        playerName: profile.name, playerSkinId: skin.id,
        playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: 'none',
        matchType: 'casual', variant: 'survival',
        challengeSeed: challenge.seed ?? seed,
        matchNonce: challenge.matchNonce ?? '',
        challengeSeedHash: challenge.seedHash ?? '',
        challengeStartSpeedMult: challenge.startSpeedMult,
        challengeRampRate: challenge.rampRate,
        challengeTargetScore: useToday ? undefined : targetScore,
        bankLivesUsed: 0,
      });
      router.push('/game');
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }

  const goHome = () => router.replace('/');

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <Shell variant="prose" style={{ gap: 16, maxWidth: 520 }}>
          <ScreenTitle title="Challenge" kicker="GoldRush Arena" />
          {!valid ? (
            <>
              <Text style={s.title} accessibilityRole="header">This challenge link is not valid</Text>
              <Text style={s.body}>The link is missing its date or target score, or it was changed. Ask the sender for a new link, or play today&apos;s challenge from Home.</Text>
              <Button label="Return home" size="lg" onPress={goHome} />
            </>
          ) : (
            <>
              <Text style={s.kicker}>Challenge from {challenger}</Text>
              <Text style={s.title} accessibilityRole="header">Beat {targetScore} hits</Text>
              <Panel tone="paper" style={s.rules}>
                <Row k="Mode" v="Daily Challenge, solo survival" />
                <Row k="Date" v={formatSeed(seed)} />
                <Row k="Rules" v="Same speed pattern for every player that day. One miss ends the run." />
                <Row k="Counts toward" v="Daily challenge score only. No rank change." last />
              </Panel>

              {phase === 'expired' ? (
                <>
                  <Text style={s.error}>This challenge was for {formatSeed(seed)}. Today&apos;s seed is {formatSeed(todaySeed ?? '')}, so the target no longer applies.</Text>
                  <Button label="Play today's challenge instead" size="lg" onPress={() => void launch(true)} />
                  <Button label="Return home" variant="ghost" onPress={goHome} />
                </>
              ) : (
                <>
                  {phase === 'error' ? (
                    <Text style={s.error} accessibilityLiveRegion="polite">The challenge could not be loaded from the server. Check your connection and try again.</Text>
                  ) : null}
                  <Button
                    label={phase === 'error' ? 'Try again' : 'Accept challenge'}
                    size="lg"
                    loading={phase === 'loading'}
                    onPress={() => void launch(false)}
                  />
                  <Button label="Not now" variant="ghost" onPress={goHome} />
                </>
              )}
            </>
          )}
        </Shell>
      </ScrollView>
    </View>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowLine]}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  kicker: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.supporting },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.foreground },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: palette.supporting },
  rules: { paddingHorizontal: 14 },
  row: { paddingVertical: 10, gap: 2 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: palette.border },
  k: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.supporting },
  v: { fontFamily: fonts.body, fontSize: 16, color: palette.foreground, lineHeight: 22 },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.supporting, lineHeight: 21 },
});
