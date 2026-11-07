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
              ? (isPlayer ? '#F0B429' : '#E04A2F')
              : '#F3EAD318',
            borderWidth: 1,
            borderColor: i < wins
              ? (isPlayer ? '#F0B42999' : '#E04A2F88')
              : '#F3EAD328',
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
      <LinearGradient colors={['#0E2621', '#0E2621', '#0E2621']} style={StyleSheet.absoluteFill} />

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
            ? { backgroundColor: '#9CC93E12', borderColor: '#9CC93E50' }
            : { backgroundColor: '#E04A2F12', borderColor: '#E04A2F50' },
          { transform: [{ scale: bannerScale }] },
        ]}>
          <Glyph style={s.resultEmoji} value={roundWon ? '🥇' : '💀'} />
          <Text style={[s.resultLabel, { color: roundWon ? '#9CC93E' : '#E04A2F' }]}>
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
          <View style={[s.playerRow, { borderColor: '#F0B42944', backgroundColor: '#F0B42910' }]}>
            <View style={s.playerInfo}>
              <Text style={[s.playerName, { color: '#F0B429' }]}>{profile.name}</Text>
              <Text style={s.playerTag}>YOU</Text>
            </View>
            <WinDots wins={state.playerWins} isPlayer />
            <Text style={[s.winCount, { color: '#F0B429' }]}>{state.playerWins}</Text>
          </View>
          {/* Bots */}
          {state.bots.map((bot, i) => (
            <View key={bot.name} style={[s.playerRow, { borderColor: '#F3EAD318', backgroundColor: '#F3EAD305' }]}>
              <View style={s.playerInfo}>
                <Text style={[s.playerName, { color: bot.color }]}>{bot.name}</Text>
                <Text style={s.playerTag}>BOT</Text>
              </View>
              <WinDots wins={state.botWins[i]} isPlayer={false} />
              <Text style={[s.winCount, { color: '#F3EAD377' }]}>{state.botWins[i]}</Text>
            </View>
          ))}
        </View>

        {/* ── End state OR next round ── */}
        {gauntletOver ? (
          <View style={s.endState}>
            {gauntletWon ? (
              <>
                <Glyph style={s.endEmoji} value="🏆" />
                <Text style={[s.endTitle, { color: '#F0B429' }]}>CHAMPION!</Text>
                <Text style={[s.endSub, { color: '#F0B429' }]}>You dominated the gauntlet!</Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#F0B429' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#F0B429' }]}>{state.totalCoins}</Text>
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
                <Text style={[s.endTitle, { color: '#E04A2F' }]}>DEFEATED</Text>
                <Text style={[s.endSub, { color: '#E04A2F88' }]}>
                  The gauntlet claims another challenger.
                </Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#F0B429' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#F0B429' }]}>{state.totalCoins}</Text>
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
                colors={['#F0B429', '#F0B429', '#C98E12']}
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
  root: { flex: 1, backgroundColor: '#0E2621' },

  header: { alignItems: 'center', marginBottom: 20 },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 3, color: '#F0B429',
    fontFamily: 'SourceSans3_700Bold', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24, fontFamily: 'SourceSans3_700Bold', color: '#F0B429', letterSpacing: 1,
  },

  resultBanner: {
    borderRadius: 3, borderWidth: 1.5,
    padding: 20, alignItems: 'center', marginBottom: 24,
  },
  resultEmoji:   { fontSize: 40, marginBottom: 6 },
  resultLabel:   { fontSize: 20, fontFamily: 'SourceSans3_700Bold', letterSpacing: 1.5 },
  resultRewards: { flexDirection: 'row', gap: 24, marginTop: 10 },
  rewardXP:      { color: '#F0B429', fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  rewardCoins:   { color: '#F0B429', fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  bonusNote:     { color: '#F0B42977', fontSize: 11, marginTop: 6, fontFamily: 'SourceSans3_600SemiBold', letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 10, letterSpacing: 3, color: '#F3EAD344',
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
  playerTag:  { color: '#F3EAD344', fontSize: 11, marginTop: 2 },
  winCount:   { fontFamily: 'SourceSans3_700Bold', fontSize: 20, minWidth: 22, textAlign: 'right' },

  endState: { alignItems: 'center', paddingTop: 8 },
  endEmoji: { fontSize: 64, marginBottom: 12 },
  endTitle: { fontSize: 28, fontFamily: 'SourceSans3_700Bold', letterSpacing: 2, marginBottom: 6 },
  endSub:   { fontSize: 14, marginBottom: 24 },

  totalRewards: { flexDirection: 'row', gap: 28, marginBottom: 20 },
  rewardPill:   { alignItems: 'center' },
  rewardPillNum:   { fontFamily: 'SourceSans3_700Bold', fontSize: 24 },
  rewardPillLabel: { color: '#F3EAD355', fontSize: 11, marginTop: 2 },
  rewardDivider:   { width: 1, backgroundColor: '#F3EAD322' },

  championBonus: {
    backgroundColor: '#F0B42918', borderColor: '#F0B42944',
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28,
  },
  championBonusText: { color: '#F0B429', fontSize: 13, fontFamily: 'SourceSans3_700Bold' },

  homeBtn: {
    backgroundColor: '#F0B429', borderRadius: 3,
    paddingVertical: 16, paddingHorizontal: 52,
  },
  homeBtnText: {
    color: '#0E2621', fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 1.5,
  },

  nextRoundCard: {
    borderRadius: 3, borderWidth: 1.5,
    padding: 22, alignItems: 'center', marginBottom: 20,
  },
  nextRoundEmoji: { fontSize: 48, marginBottom: 10 },
  nextRoundName:  { fontSize: 22, fontFamily: 'SourceSans3_700Bold', letterSpacing: 1 },
  nextRoundSub:   { color: '#F3EAD366', fontSize: 14, marginTop: 6 },

  startBtn: { borderRadius: 3, overflow: 'hidden' },
  startBtnGrad: {
    paddingVertical: 18, alignItems: 'center',
  },
  startBtnText: {
    color: '#0E2621', fontFamily: 'SourceSans3_700Bold', fontSize: 18, letterSpacing: 1.5,
  },
});
