import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/context/PlayerContext';
import {
  getGauntletState, getCurrentRoundVariant,
  GAUNTLET_VARIANT_META, GAUNTLET_TARGET_WINS,
} from '@/store/gauntletSession';
import { updateGameConfig } from '@/store/gameSession';
import { useColors } from '@/hooks/useColors';

// ─── Win-dot row for a player ─────────────────────────────────────────────────
function WinDots({ wins, isPlayer }: { wins: number; isPlayer: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: GAUNTLET_TARGET_WINS }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 13, height: 13, borderRadius: 7,
            backgroundColor: i < wins
              ? (isPlayer ? '#FFD700' : '#FF4757')
              : '#FFFFFF18',
            borderWidth: 1,
            borderColor: i < wins
              ? (isPlayer ? '#FFD70099' : '#FF475788')
              : '#FFFFFF28',
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
    <View style={s.root}>
      <LinearGradient colors={['#1A1000', '#0C0800', '#0A0600']} style={StyleSheet.absoluteFill} />

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
          <Text style={s.headerTitle}>⚔️ ROUND {completedRound} COMPLETE</Text>
        </View>

        {/* ── Round result banner ── */}
        <Animated.View style={[
          s.resultBanner,
          roundWon
            ? { backgroundColor: '#00FF8812', borderColor: '#00FF8850' }
            : { backgroundColor: '#FF475712', borderColor: '#FF475750' },
          { transform: [{ scale: bannerScale }] },
        ]}>
          <Text style={s.resultEmoji}>{roundWon ? '🥇' : '💀'}</Text>
          <Text style={[s.resultLabel, { color: roundWon ? '#00FF88' : '#FF4757' }]}>
            {roundWon ? 'ROUND WIN!' : 'ELIMINATED'}
          </Text>
          <View style={s.resultRewards}>
            <Text style={s.rewardXP}>+{xpEarned} XP</Text>
            <Text style={s.rewardCoins}>+{coinsEarned} 🪙</Text>
          </View>
          <Text style={s.bonusNote}>3× GAUNTLET BONUS APPLIED</Text>
        </Animated.View>

        {/* ── Scoreboard ── */}
        <Text style={s.sectionLabel}>STANDINGS · FIRST TO {GAUNTLET_TARGET_WINS}</Text>
        <View style={s.scoreboard}>
          {/* Human player */}
          <View style={[s.playerRow, { borderColor: '#FFD70044', backgroundColor: '#FFD70010' }]}>
            <View style={s.playerInfo}>
              <Text style={[s.playerName, { color: '#FFD700' }]}>{profile.name}</Text>
              <Text style={s.playerTag}>YOU</Text>
            </View>
            <WinDots wins={state.playerWins} isPlayer />
            <Text style={[s.winCount, { color: '#FFD700' }]}>{state.playerWins}</Text>
          </View>
          {/* Bots */}
          {state.bots.map((bot, i) => (
            <View key={bot.name} style={[s.playerRow, { borderColor: '#FFFFFF18', backgroundColor: '#FFFFFF05' }]}>
              <View style={s.playerInfo}>
                <Text style={[s.playerName, { color: bot.color }]}>{bot.name}</Text>
                <Text style={s.playerTag}>BOT</Text>
              </View>
              <WinDots wins={state.botWins[i]} isPlayer={false} />
              <Text style={[s.winCount, { color: '#FFFFFF77' }]}>{state.botWins[i]}</Text>
            </View>
          ))}
        </View>

        {/* ── End state OR next round ── */}
        {gauntletOver ? (
          <View style={s.endState}>
            {gauntletWon ? (
              <>
                <Text style={s.endEmoji}>🏆</Text>
                <Text style={[s.endTitle, { color: '#FFD700' }]}>CHAMPION!</Text>
                <Text style={[s.endSub, { color: '#C8820A' }]}>You dominated the gauntlet!</Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#FFD700' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C8820A' }]}>{state.totalCoins}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL COINS</Text>
                  </View>
                </View>
                <View style={s.championBonus}>
                  <Text style={s.championBonusText}>🎖️ +1500 CHAMPION BONUS XP AWARDED</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={s.endEmoji}>💀</Text>
                <Text style={[s.endTitle, { color: '#FF4757' }]}>DEFEATED</Text>
                <Text style={[s.endSub, { color: '#FF475788' }]}>
                  The gauntlet claims another challenger.
                </Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#FFD700' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#C8820A' }]}>{state.totalCoins}</Text>
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
              <Text style={s.nextRoundEmoji}>{nextMeta.emoji}</Text>
              <Text style={[s.nextRoundName, { color: nextMeta.color }]}>{nextMeta.name}</Text>
              <Text style={s.nextRoundSub}>{nextMeta.sub}</Text>
            </View>
            <Pressable
              onPress={handleStartNextRound}
              style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#E09620', '#C8820A', '#A86008']}
                style={s.startBtnGrad}
              >
                <Text style={s.startBtnText}>⚔️  START ROUND {state.roundNumber}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0600' },

  header: { alignItems: 'center', marginBottom: 20 },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 3, color: '#C8820A',
    fontWeight: '700', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '900', color: '#FFD700', letterSpacing: 1,
  },

  resultBanner: {
    borderRadius: 18, borderWidth: 1.5,
    padding: 20, alignItems: 'center', marginBottom: 24,
  },
  resultEmoji:   { fontSize: 40, marginBottom: 6 },
  resultLabel:   { fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  resultRewards: { flexDirection: 'row', gap: 24, marginTop: 10 },
  rewardXP:      { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  rewardCoins:   { color: '#C8820A', fontWeight: '700', fontSize: 14 },
  bonusNote:     { color: '#FFD70077', fontSize: 11, marginTop: 6, fontWeight: '600', letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 10, letterSpacing: 3, color: '#FFFFFF44',
    fontWeight: '700', marginBottom: 10,
  },

  scoreboard: { gap: 8, marginBottom: 24 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 12,
  },
  playerInfo: { flex: 1 },
  playerName: { fontWeight: '800', fontSize: 14 },
  playerTag:  { color: '#FFFFFF44', fontSize: 11, marginTop: 2 },
  winCount:   { fontWeight: '900', fontSize: 20, minWidth: 22, textAlign: 'right' },

  endState: { alignItems: 'center', paddingTop: 8 },
  endEmoji: { fontSize: 64, marginBottom: 12 },
  endTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  endSub:   { fontSize: 14, marginBottom: 24 },

  totalRewards: { flexDirection: 'row', gap: 28, marginBottom: 20 },
  rewardPill:   { alignItems: 'center' },
  rewardPillNum:   { fontWeight: '900', fontSize: 24 },
  rewardPillLabel: { color: '#FFFFFF55', fontSize: 11, marginTop: 2 },
  rewardDivider:   { width: 1, backgroundColor: '#FFFFFF22' },

  championBonus: {
    backgroundColor: '#FFD70018', borderColor: '#FFD70044',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28,
  },
  championBonusText: { color: '#FFD700', fontSize: 13, fontWeight: '700' },

  homeBtn: {
    backgroundColor: '#C8820A', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 52,
  },
  homeBtnText: {
    color: '#0A0500', fontWeight: '900', fontSize: 16, letterSpacing: 1.5,
  },

  nextRoundCard: {
    borderRadius: 18, borderWidth: 1.5,
    padding: 22, alignItems: 'center', marginBottom: 20,
  },
  nextRoundEmoji: { fontSize: 48, marginBottom: 10 },
  nextRoundName:  { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  nextRoundSub:   { color: '#FFFFFF66', fontSize: 14, marginTop: 6 },

  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startBtnGrad: {
    paddingVertical: 18, alignItems: 'center',
  },
  startBtnText: {
    color: '#0A0500', fontWeight: '900', fontSize: 18, letterSpacing: 1.5,
  },
});
