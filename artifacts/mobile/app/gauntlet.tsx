import * as Haptics from '@/utils/haptics';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/context/PlayerContext';
import {
  getGauntletState, getCurrentRoundVariant,
  GAUNTLET_VARIANT_META, GAUNTLET_TARGET_WINS,
} from '@/store/gauntletSession';
import { updateGameConfig } from '@/store/gameSession';
import { palette, tactile } from '@/constants/colors';
import { ScreenTitle } from '@/components/ui/Primitives';

// ─── Win-dot row for a player ─────────────────────────────────────────────────
function WinDots({ wins, isPlayer }: { wins: number; isPlayer: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${wins} of ${GAUNTLET_TARGET_WINS} round wins`}>
      {Array.from({ length: GAUNTLET_TARGET_WINS }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 12, height: 12, borderRadius: 2,
            backgroundColor: i < wins ? (isPlayer ? palette.ochre : palette.paperDim) : 'transparent',
            borderWidth: 1,
            borderColor: i < wins ? (isPlayer ? palette.ochre : palette.paperDim) : palette.lineStrong,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function GauntletScreen() {
  const insets  = useSafeAreaInsets();
  const { profile } = usePlayer();
  const params  = useLocalSearchParams<{
    roundWon: string; gauntletWon: string; gauntletOver: string;
    xpEarned: string; coinsEarned: string; completedRound: string;
  }>();

  const state        = getGauntletState();
  const roundWon     = params.roundWon    === '1';
  const gauntletWon  = params.gauntletWon === '1';
  const gauntletOver = params.gauntletOver === '1';
  const xpEarned     = Number(params.xpEarned   ?? 0);
  const coinsEarned  = Number(params.coinsEarned ?? 0);
  const completedRound = Number(params.completedRound ?? 1);

  // Next variant (roundNumber already incremented by recordRoundResult)
  const nextVariant = gauntletOver ? 'classic' : getCurrentRoundVariant();
  const nextMeta    = GAUNTLET_VARIANT_META[nextVariant] ?? GAUNTLET_VARIANT_META['classic'];

  const bannerScale = useRef(new Animated.Value(0.88)).current;
  useEffect(() => {
    Animated.spring(bannerScale, {
      toValue: 1, friction: 5, tension: 130, useNativeDriver: true,
    }).start();
  }, []);

  function handleStartNextRound() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateGameConfig({ variant: nextVariant, matchId: Date.now().toString(36) + Math.random().toString(36).slice(2) });
    router.replace('/lobby');
  }

  function handleGoHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/');
  }

  if (state.lastRoundWon === null || state.roundNumber < 2) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <View style={[s.column, { gap: 16 }]}>
          <Text accessibilityRole="header" style={[s.title, { color: palette.paper }]}>No completed Gauntlet round</Text>
          <Text style={s.body}>This link has no saved round to display. Gauntlet runs live in memory, so a refresh clears them. Return to Play to begin a new run. No rewards were created.</Text>
          <Pressable accessibilityRole="button" onPress={handleGoHome} style={s.primaryBtn}>
            <Text style={s.primaryText}>Return to Play</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const leaderWins = Math.max(state.playerWins, ...state.botWins);
  const playerNeeds = GAUNTLET_TARGET_WINS - state.playerWins;
  const rows = [
    { key: 'you', name: profile.name, tag: 'YOU', wins: state.playerWins, isPlayer: true },
    ...state.bots.map((b, i) => ({ key: b.name, name: b.name, tag: 'BOT', wins: state.botWins[i], isPlayer: false })),
  ];

  return (
    <Reanimated.View entering={FadeIn.duration(250)} style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 18, alignItems: 'center' }}
      >
        <View style={s.column}>
          {/* ── Round result ── */}
          <Animated.View style={[s.card, { transform: [{ scale: bannerScale }] }, roundWon && { borderColor: palette.ochre }]}>
            <ScreenTitle title="Gauntlet" kicker={`Round ${completedRound}`} />
            <Text accessibilityRole="header" style={[s.title, { color: roundWon ? palette.charcoal : palette.paper }]}>
              {gauntletOver ? (gauntletWon ? 'Gauntlet won' : 'Gauntlet over') : roundWon ? 'Round won' : 'Round lost'}
            </Text>
            <Text style={s.body}>
              {gauntletOver
                ? (gauntletWon ? `You reached ${GAUNTLET_TARGET_WINS} round wins first.` : `A bot reached ${GAUNTLET_TARGET_WINS} round wins first. The run has ended.`)
                : roundWon
                  ? `You need ${playerNeeds} more round win${playerNeeds === 1 ? '' : 's'}.`
                  : `The run continues. This round's win went to one of the bots. You need ${playerNeeds} more round win${playerNeeds === 1 ? '' : 's'}.`}
            </Text>
            <View style={s.statsRow}>
              <View style={s.stat}><Text style={s.statVal}>+{xpEarned}</Text><Text style={s.statLbl}>Account XP this round</Text></View>
              <View style={s.stat}><Text style={s.statVal}>+{coinsEarned}</Text><Text style={s.statLbl}>Coins this round</Text></View>
            </View>
            <Text style={s.note}>Gauntlet rounds use a 3× reward multiplier and are saved as ranked matches.</Text>
          </Animated.View>

          {/* ── Next action, above the fold ── */}
          {gauntletOver ? (
            <Pressable onPress={handleGoHome} accessibilityRole="button" style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}>
              <Text style={s.primaryText}>Return to Play</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <View style={s.nextRow}>
                <Feather name={VARIANT_ICON[nextVariant] ?? 'circle'} size={22} color={tactile.paperInk} />
                <View style={{ flex: 1 }}>
                  <Text style={s.nextLabel}>Next: round {state.roundNumber}</Text>
                  <Text style={s.nextName}>{nextMeta.name}</Text>
                  <Text style={[s.body, { color: tactile.paperMuted }]}>{nextMeta.sub}</Text>
                </View>
              </View>
              <Pressable onPress={handleStartNextRound} accessibilityRole="button" style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}>
                <Feather name="play" size={18} color={palette.ochreInk} />
                <Text style={s.primaryText}>Start round {state.roundNumber}</Text>
              </Pressable>
              <Pressable onPress={handleGoHome} accessibilityRole="button" style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.8 }]}>
                <Text style={s.secondaryText}>Leave for now</Text>
              </Pressable>
              <Text style={s.note}>Leaving keeps this run in memory until the app is closed or refreshed.</Text>
            </View>
          )}

          {/* ── Run standings ── */}
          <View style={s.card}>
            <Text style={s.kicker}>Run standings · first to {GAUNTLET_TARGET_WINS} round wins</Text>
            {rows.map(r => (
              <View key={r.key} style={[s.playerRow, r.isPlayer && s.playerRowYou]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.playerName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.playerTag}>{r.tag}{r.wins === leaderWins && leaderWins > 0 ? ' · leading' : ''}</Text>
                </View>
                <WinDots wins={r.wins} isPlayer={r.isPlayer} />
                <Text style={s.winCount}>{r.wins}/{GAUNTLET_TARGET_WINS}</Text>
              </View>
            ))}
          </View>

          {/* ── Run totals ── */}
          <View style={s.card}>
            <Text style={s.kicker}>Run totals so far</Text>
            <View style={s.statsRow}>
              <View style={s.stat}><Text style={s.statVal}>{state.totalXP}</Text><Text style={s.statLbl}>Account XP</Text></View>
              <View style={s.stat}><Text style={s.statVal}>{state.totalCoins}</Text><Text style={s.statLbl}>Coins</Text></View>
            </View>
            {gauntletWon && <Text style={[s.body, { color: palette.charcoal }]}>Champion bonus included: +1500 account XP and +300 coins.</Text>}
          </View>
        </View>
      </ScrollView>
    </Reanimated.View>
  );
}

const VARIANT_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  blitz: 'zap', chaos: 'shuffle', turbo: 'fast-forward', sudden_death: 'alert-octagon',
  survival: 'shield', pinball: 'target', classic: 'square',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  column: { width: '100%', maxWidth: 640, gap: 12 },
  card: { borderWidth: 2, borderColor: palette.lineStrong, backgroundColor: palette.graphite, borderRadius: 0, padding: 16, gap: 8 },
  kicker: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: palette.muted, letterSpacing: 0.5 },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 40, lineHeight: 44 },
  body: { fontFamily: 'SourceSans3_400Regular', fontSize: 15, lineHeight: 21, color: palette.paperDim },
  note: { fontFamily: 'SourceSans3_400Regular', fontSize: 13, lineHeight: 18, color: palette.muted },
  statsRow: { flexDirection: 'row', gap: 16, borderWidth: 2, borderColor: tactile.brassEdge, backgroundColor: tactile.brass, padding: 12 },
  stat: { flex: 1 },
  statVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, color: tactile.paperInk },
  statLbl: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: tactile.paperMuted },
  nextRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 2, borderColor: tactile.brassEdge, borderRadius: 0, padding: 14, backgroundColor: tactile.paperPanel },
  nextLabel: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: tactile.paperMuted },
  nextName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: tactile.paperInk },
  primaryBtn: { flexDirection: 'row', gap: 8, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 3, backgroundColor: palette.ochre },
  primaryText: { fontFamily: 'SourceSans3_700Bold', fontSize: 17, color: palette.ochreInk },
  secondaryBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 3, borderWidth: 1, borderColor: palette.line },
  secondaryText: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: palette.line, borderRadius: 3 },
  playerRowYou: { borderColor: palette.ochre },
  playerName: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },
  playerTag: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.muted },
  winCount: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, color: palette.paper, minWidth: 34, textAlign: 'right' },
});
