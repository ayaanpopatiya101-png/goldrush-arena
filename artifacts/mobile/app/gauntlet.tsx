import { Text } from '@/components/ui/Text';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/FlatSurface';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
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
            width: 13, height: 13, borderRadius: 2,
            backgroundColor: i < wins
              ? (isPlayer ? '#D0AF66' : '#BB7865')
              : '#EEE7D818',
            borderWidth: 1,
            borderColor: i < wins
              ? (isPlayer ? '#D0AF6699' : '#BB786588')
              : '#EEE7D828',
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
      <LinearGradient colors={['#191B19', '#191B19', '#191B19']} style={StyleSheet.absoluteFill} />

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
            ? { backgroundColor: '#98A58112', borderColor: '#98A58150' }
            : { backgroundColor: '#BB786512', borderColor: '#BB786550' },
          { transform: [{ scale: bannerScale }] },
        ]}>
          <Text style={s.resultEmoji}>{roundWon ? '🥇' : '💀'}</Text>
          <Text style={[s.resultLabel, { color: roundWon ? '#98A581' : '#BB7865' }]}>
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
          <View style={[s.playerRow, { borderColor: '#D0AF6644', backgroundColor: '#D0AF6610' }]}>
            <View style={s.playerInfo}>
              <Text style={[s.playerName, { color: '#D0AF66' }]}>{profile.name}</Text>
              <Text style={s.playerTag}>YOU</Text>
            </View>
            <WinDots wins={state.playerWins} isPlayer />
            <Text style={[s.winCount, { color: '#D0AF66' }]}>{state.playerWins}</Text>
          </View>
          {/* Bots */}
          {state.bots.map((bot, i) => (
            <View key={bot.name} style={[s.playerRow, { borderColor: '#EEE7D818', backgroundColor: '#EEE7D805' }]}>
              <View style={s.playerInfo}>
                <Text style={[s.playerName, { color: bot.color }]}>{bot.name}</Text>
                <Text style={s.playerTag}>BOT</Text>
              </View>
              <WinDots wins={state.botWins[i]} isPlayer={false} />
              <Text style={[s.winCount, { color: '#EEE7D877' }]}>{state.botWins[i]}</Text>
            </View>
          ))}
        </View>

        {/* ── End state OR next round ── */}
        {gauntletOver ? (
          <View style={s.endState}>
            {gauntletWon ? (
              <>
                <Text style={s.endEmoji}>🏆</Text>
                <Text style={[s.endTitle, { color: '#D0AF66' }]}>CHAMPION!</Text>
                <Text style={[s.endSub, { color: '#BB7865' }]}>You dominated the gauntlet!</Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#D0AF66' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#BB7865' }]}>{state.totalCoins}</Text>
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
                <Text style={[s.endTitle, { color: '#BB7865' }]}>DEFEATED</Text>
                <Text style={[s.endSub, { color: '#BB786588' }]}>
                  The gauntlet claims another challenger.
                </Text>
                <View style={s.totalRewards}>
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#D0AF66' }]}>{state.totalXP}</Text>
                    <Text style={s.rewardPillLabel}>TOTAL XP</Text>
                  </View>
                  <View style={s.rewardDivider} />
                  <View style={s.rewardPill}>
                    <Text style={[s.rewardPillNum, { color: '#BB7865' }]}>{state.totalCoins}</Text>
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
                colors={['#BB7865', '#BB7865', '#BB7865']}
                style={s.startBtnGrad}
              >
                <Text style={s.startBtnText}>⚔️  START ROUND {state.roundNumber}</Text>
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
  root: { flex: 1, backgroundColor: '#191B19' },

  header: { alignItems: 'center', marginBottom: 20 },
  headerEyebrow: {
    fontSize: 11, letterSpacing: 3, color: '#BB7865',
    fontFamily: 'System', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24, fontFamily: 'System', color: '#D0AF66', letterSpacing: 1,
  },

  resultBanner: {
    borderRadius: 2, borderWidth: 1.5,
    padding: 20, alignItems: 'center', marginBottom: 24,
  },
  resultEmoji:   { fontSize: 40, marginBottom: 6 },
  resultLabel:   { fontSize: 20, fontFamily: 'System', letterSpacing: 1.5 },
  resultRewards: { flexDirection: 'row', gap: 24, marginTop: 10 },
  rewardXP:      { color: '#D0AF66', fontFamily: 'System', fontSize: 14 },
  rewardCoins:   { color: '#BB7865', fontFamily: 'System', fontSize: 14 },
  bonusNote:     { color: '#D0AF6677', fontSize: 11, marginTop: 6, fontFamily: 'System', letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 10, letterSpacing: 3, color: '#EEE7D844',
    fontFamily: 'System', marginBottom: 10,
  },

  scoreboard: { gap: 8, marginBottom: 24 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 2,
    padding: 14, gap: 12,
  },
  playerInfo: { flex: 1 },
  playerName: { fontFamily: 'System', fontSize: 14 },
  playerTag:  { color: '#EEE7D844', fontSize: 11, marginTop: 2 },
  winCount:   { fontFamily: 'System', fontSize: 20, minWidth: 22, textAlign: 'right' },

  endState: { alignItems: 'center', paddingTop: 8 },
  endEmoji: { fontSize: 64, marginBottom: 12 },
  endTitle: { fontSize: 28, fontFamily: 'System', letterSpacing: 2, marginBottom: 6 },
  endSub:   { fontSize: 14, marginBottom: 24 },

  totalRewards: { flexDirection: 'row', gap: 28, marginBottom: 20 },
  rewardPill:   { alignItems: 'center' },
  rewardPillNum:   { fontFamily: 'System', fontSize: 24 },
  rewardPillLabel: { color: '#EEE7D855', fontSize: 11, marginTop: 2 },
  rewardDivider:   { width: 1, backgroundColor: '#EEE7D822' },

  championBonus: {
    backgroundColor: '#D0AF6618', borderColor: '#D0AF6644',
    borderWidth: 1, borderRadius: 2,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28,
  },
  championBonusText: { color: '#D0AF66', fontSize: 13, fontFamily: 'System' },

  homeBtn: {
    backgroundColor: '#BB7865', borderRadius: 2,
    paddingVertical: 16, paddingHorizontal: 52,
  },
  homeBtnText: {
    color: '#191B19', fontFamily: 'System', fontSize: 16, letterSpacing: 1.5,
  },

  nextRoundCard: {
    borderRadius: 2, borderWidth: 1.5,
    padding: 22, alignItems: 'center', marginBottom: 20,
  },
  nextRoundEmoji: { fontSize: 48, marginBottom: 10 },
  nextRoundName:  { fontSize: 22, fontFamily: 'System', letterSpacing: 1 },
  nextRoundSub:   { color: '#EEE7D866', fontSize: 14, marginTop: 6 },

  startBtn: { borderRadius: 2, overflow: 'hidden' },
  startBtnGrad: {
    paddingVertical: 18, alignItems: 'center',
  },
  startBtnText: {
    color: '#191B19', fontFamily: 'System', fontSize: 18, letterSpacing: 1.5,
  },
});
