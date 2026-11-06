import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/Flat';
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
import { useColors } from '@/hooks/useColors';
import { Glyph } from '@/components/ui/Glyph';

// ─── Win-dot row for a player ─────────────────────────────────────────────────
function WinDots({ wins, isPlayer }: { wins: number; isPlayer: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: GAUNTLET_TARGET_WINS }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 13, height: 13, borderRadius: 3,
            backgroundColor: i < wins
              ? (isPlayer ? '#C99A2E' : '#B4533A')
              : '#ECE7DC18',
            borderWidth: 1,
            borderColor: i < wins
              ? (isPlayer ? '#C99A2E99' : '#B4533A88')
              : '#ECE7DC28',
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
    updateGameConfig({ variant: nextVariant });
    router.replace('/lobby');
  }

  function handleGoHome() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/');
  }

  return (
    <Reanimated.View entering={FadeIn.duration(350)} style={s.root}>
      <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 20,
        }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>CHAMPION'S GAUNTLET</Text>
          <Text style={s.headerTitle}> ROUND {completedRound} COMPLETE</Text>
        </View>

        {/* ── Round result banner ── */}
        <Animated.View style={[
          s.resultBanner,
          roundWon
            ? { backgroundColor: '#6F8A5B12', borderColor: '#6F8A5B50' }
            : { backgroundColor: '#B4533A12', borderColor: '#B4533A50' },
          { transform: [{ scale: bannerScale }] },
        ]}>
          <Glyph style={s.resultEmoji} value={roundWon ? '🥇' : '💀'} />
          <Text style={[s.resultLabel, { color: roundWon ? '#6F8A5B' : '#B4533A' }]}>
            {roundWon ? 'ROUND WIN!' : 'ELIMINATED'}
          </Text>
          <View style={s.resultRewards}>
            <Text style={s.rewardXP}>+{xpEarned} XP</Text>
            <Text style={s.rewardCoins}>+{coinsEarned} </Text>
          </View>
          <Text style={s.bonusNote}>3× GAUNTLET BONUS APPLIED</Text>
        </Animated.View>

        {/* ── Scoreboard ── */}
        <Text style={s.sectionLabel}>STANDINGS · FIRST TO {GAUNTLET_TARGET_WINS}</Text>
        <View style={s.scoreboard}>
          {/* Human player */}
          <View style={[s.playerRow, { borderColor: '#C99A2E44', backgroundColor: '#C99A2E10' }]}>
            <View style={s.playerInfo}>
              <Text style={[s.playerName, { color: '#C99A2E' }]}>{profile.name}</Text>
              <Text style={s.playerTag}>YOU</Text>
            </View>
            <WinDots wins={state.playerWins} isPlayer />
            <Text style={[s.winCount, { color: '#C99A2E' }]}>{state.playerWins}</Text>
          </View>
          {/* Bots */}
          {state.bots.map((bot, i) => (
            <View key={bot.name} style={[s.playerRow, { borderColor: '#ECE7DC18', backgroundColor: '#ECE7DC05' }]}>
              <View style={s.playerInfo}>
                <Text style={[s.playerName, { color: bot.color }]}>{bot.name}</Text>
                <Text style={s.playerTag}>BOT</Text>
              </View>
              <WinDots wins={state.botWins[i]} isPlayer={false} />
              <Text style={[s.winCount, { color: '#ECE7DC77' }]}>{state.botWins[i]}</Text>
            </View>
          ))}
        </View>

        {/* ── End state OR next round ── */}
        {gauntletOver ? (
          <View style={s.endState}>
            {gauntletWon ? (
              <>
                <Glyph style={s.endEmoji} value="🏆" />
                <Text style={[s.endTitle, { color: '#C99A2E' }]}>CHAMPION!</Text>
                <Text style={[s.endSub, { color: '#C99A2E' }]}>You dominated the gauntlet!</Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C99A2E' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C99A2E' }]}>{state.totalCoins}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL COINS</Text>
                  </View>
                </View>
                <View style={s.championBonus}>
                  <Text style={s.championBonusText}>+1500 CHAMPION BONUS XP AWARDED</Text>
                </View>
              </>
            ) : (
              <>
                <Glyph style={s.endEmoji} value="💀" />
                <Text style={[s.endTitle, { color: '#B4533A' }]}>DEFEATED</Text>
                <Text style={[s.endSub, { color: '#B4533A88' }]}>
                  The gauntlet claims another challenger.
                </Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C99A2E' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C99A2E' }]}>{state.totalCoins}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL COINS</Text>
                  </View>
                </View>
              </>
            )}
            <Pressable
              onPress={handleGoHome}
              style={({ pressed }) => [s.homeBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.homeBtnText}>BACK TO HOME</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={s.sectionLabel}>NEXT ROUND</Text>
            <View style={[s.nextRoundCard, {
              borderColor: nextMeta.color + '55',
              backgroundColor: nextMeta.color + '10',
            }]}>
              <Glyph style={s.nextRoundEmoji} value={nextMeta.emoji} />
              <Text style={[s.nextRoundName, { color: nextMeta.color }]}>{nextMeta.name}</Text>
              <Text style={s.nextRoundSub}>{nextMeta.sub}</Text>
            </View>
            <Pressable
              onPress={handleStartNextRound}
              style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#C99A2E', '#C99A2E', '#9E7620']}
                style={s.startBtnGrad}
              >
                <Text style={s.startBtnText}> START ROUND {state.roundNumber}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Reanimated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#16171A' },

  header: { alignItems: 'center', marginBottom: 20 },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 3, color: '#C99A2E',
    fontFamily: 'SourceSans3_700Bold', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24, fontFamily: 'SourceSans3_700Bold', color: '#C99A2E', letterSpacing: 1,
  },

  resultBanner: {
    borderRadius: 3, borderWidth: 1.5,
    padding: 20, alignItems: 'center', marginBottom: 24,
  },
  resultEmoji:   { fontSize: 40, marginBottom: 6 },
  resultLabel:   { fontSize: 20, fontFamily: 'SourceSans3_700Bold', letterSpacing: 1.5 },
  resultRewards: { flexDirection: 'row', gap: 24, marginTop: 10 },
  rewardXP:      { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  rewardCoins:   { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  bonusNote:     { color: '#C99A2E77', fontSize: 11, marginTop: 6, fontFamily: 'SourceSans3_600SemiBold', letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 10, letterSpacing: 3, color: '#ECE7DC44',
    fontFamily: 'SourceSans3_700Bold', marginBottom: 10,
  },

  scoreboard: { gap: 8, marginBottom: 24 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 3,
    padding: 14, gap: 12,
  },
  playerInfo: { flex: 1 },
  playerName: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  playerTag:  { color: '#ECE7DC44', fontSize: 11, marginTop: 2 },
  winCount:   { fontFamily: 'SourceSans3_700Bold', fontSize: 20, minWidth: 22, textAlign: 'right' },

  endState: { alignItems: 'center', paddingTop: 8 },
  endEmoji: { fontSize: 64, marginBottom: 12 },
  endTitle: { fontSize: 28, fontFamily: 'SourceSans3_700Bold', letterSpacing: 2, marginBottom: 6 },
  endSub:   { fontSize: 14, marginBottom: 24 },

  totalRewards: { flexDirection: 'row', gap: 28, marginBottom: 20 },
  rewardPill:   { alignItems: 'center' },
  rewardPillNum:   { fontFamily: 'SourceSans3_700Bold', fontSize: 24 },
  rewardPillLabel: { color: '#ECE7DC55', fontSize: 11, marginTop: 2 },
  rewardDivider:   { width: 1, backgroundColor: '#ECE7DC22' },

  championBonus: {
    backgroundColor: '#C99A2E18', borderColor: '#C99A2E44',
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28,
  },
  championBonusText: { color: '#C99A2E', fontSize: 13, fontFamily: 'SourceSans3_700Bold' },

  homeBtn: {
    backgroundColor: '#C99A2E', borderRadius: 3,
    paddingVertical: 16, paddingHorizontal: 52,
  },
  homeBtnText: {
    color: '#16171A', fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 1.5,
  },

  nextRoundCard: {
    borderRadius: 3, borderWidth: 1.5,
    padding: 22, alignItems: 'center', marginBottom: 20,
  },
  nextRoundEmoji: { fontSize: 48, marginBottom: 10 },
  nextRoundName:  { fontSize: 22, fontFamily: 'SourceSans3_700Bold', letterSpacing: 1 },
  nextRoundSub:   { color: '#ECE7DC66', fontSize: 14, marginTop: 6 },

  startBtn: { borderRadius: 3, overflow: 'hidden' },
  startBtnGrad: {
    paddingVertical: 18, alignItems: 'center',
  },
  startBtnText: {
    color: '#16171A', fontFamily: 'SourceSans3_700Bold', fontSize: 18, letterSpacing: 1.5,
  },
});
