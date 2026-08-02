import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOutDown, SlideInRight, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { ConfettiRain } from '@/components/ConfettiRain';
import { FloatingOrbs, GlowText, PulseRing, ShimmerCard } from '@/components/effects';
import { ACHIEVEMENTS, RANKS, LUCKY_BLOCK_META, getCurrentEvents, usePlayer, xpForNextRank, xpToLevel, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { useColors } from '@/hooks/useColors';

export default function PostGameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ── Guard: if params are missing (e.g. hard-refresh on web), go home ──────
  const rawParams = useLocalSearchParams();
  const paramsMissing = !rawParams.won && !rawParams.xpEarned;
  useEffect(() => { if (paramsMissing) router.replace('/'); }, [paramsMissing]);
  if (paramsMissing) return null;

  const params = useLocalSearchParams<{
    won: string; position: string; deflections: string;
    goalsAgainst: string; xpEarned: string; coinsEarned: string;
    matchType: string; levelBefore: string;
    streakMult: string; diffMult: string; winStreak: string; variant: string;
    evXP: string; evCoins: string; evCredits: string;
    evName: string; evEmoji: string; evColor: string;
    // Qualifier params
    qPeriodKey: string; qRoundIdx: string; qRoundName: string;
    qTotalRounds: string; qThreshold: string;
    qpFor1: string; qpFor2: string; qpFor3: string; qpFor4: string;
    qEventName: string; qEventEmoji: string; qEventColor: string;
  }>();
  const { profile, unlockAchievement, claimEventBonus, earnQualifierPoints } = usePlayer();

  const won = params.won === '1';
  const position = parseInt(params.position ?? '4', 10);
  const deflections = parseInt(params.deflections ?? '0', 10);
  const goalsAgainst = parseInt(params.goalsAgainst ?? '0', 10);
  const xpEarned = parseInt(params.xpEarned ?? '50', 10);
  const coinsEarned = parseInt(params.coinsEarned ?? '15', 10);
  const matchType   = params.matchType ?? 'casual';
  const levelBefore = parseInt(params.levelBefore ?? String(profile.competitiveLevel ?? 1), 10);
  const streakMult  = parseFloat(params.streakMult ?? '1');
  const diffMult    = parseFloat(params.diffMult ?? '1');
  const winStreak   = parseInt(params.winStreak ?? '0', 10);
  const variant     = params.variant ?? 'classic';
  const hasBonus    = streakMult > 1.0 || diffMult !== 1.0;
  const evXP      = parseInt(params.evXP ?? '0', 10);
  const evCoins   = parseInt(params.evCoins ?? '0', 10);
  const evCredits = parseInt(params.evCredits ?? '0', 10);
  const evName    = params.evName ?? '';
  const evEmoji   = params.evEmoji ?? '';
  const evColor   = params.evColor ?? '#FFD700';
  const hasEvent  = evXP > 0 || evCoins > 0 || evCredits > 0;

  // Qualifier params
  const qPeriodKey   = params.qPeriodKey   ?? '';
  const qRoundIdx    = parseInt(params.qRoundIdx   ?? '-1', 10);
  const qRoundName   = params.qRoundName   ?? '';
  const qTotalRounds = parseInt(params.qTotalRounds ?? '0', 10);
  const qThreshold   = parseInt(params.qThreshold   ?? '0', 10);
  const qpPerPlace: [number,number,number,number] = [
    parseInt(params.qpFor1 ?? '0', 10),
    parseInt(params.qpFor2 ?? '0', 10),
    parseInt(params.qpFor3 ?? '0', 10),
    parseInt(params.qpFor4 ?? '0', 10),
  ];
  const qEventName  = params.qEventName  ?? '';
  const qEventEmoji = params.qEventEmoji ?? '';
  const qEventColor = params.qEventColor ?? '#FFD700';
  const isQualifier = qPeriodKey.length > 0 && qRoundIdx >= 0;
  const qpEarnedThisMatch = isQualifier ? (qpPerPlace[Math.min(Math.max(position - 1, 0), 3)] ?? 0) : 0;

  const levelAfter  = profile.competitiveLevel ?? 1;
  const levelDelta  = levelAfter - levelBefore;

  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const scaleAnim       = useRef(new Animated.Value(0.7)).current;
  const xpBarAnim       = useRef(new Animated.Value(0)).current;
  const card1Anim       = useRef(new Animated.Value(0)).current; // stats card
  const card2Anim       = useRef(new Animated.Value(0)).current; // xp / level card
  const card3Anim       = useRef(new Animated.Value(0)).current; // buttons row
  const promotedFlashAnim = useRef(new Animated.Value(0)).current;
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showXP, setShowXP] = useState(false);
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);
  const [qualResult, setQualResult] = useState<{ qpEarned: number; totalQP: number; advanced: boolean; nextRoundName: string } | null>(null);

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const newXP = profile.xp + xpEarned;
  const newRank = (() => {
    let r = RANKS[0];
    for (const rank of RANKS) { if (newXP >= rank.minXP) r = rank; }
    return r;
  })();
  const promoted = newRank.name !== profile.rank;

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  async function handleShare() {
    const posLabel = positionLabels[position] ?? '4TH';
    const msg = won
      ? `🏆 VICTORY! I won a match in GoldRush Arena with ${deflections} deflections and earned +${xpEarned} XP. Think you can beat me?`
      : `I finished ${posLabel} in GoldRush Arena — ${deflections} deflections, +${xpEarned} XP. Download and challenge me!`;
    try { await Share.share({ message: msg }); } catch { /* user cancelled */ }
  }

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    [card1Anim, card2Anim, card3Anim].forEach((anim, i) => {
      Animated.timing(anim, { toValue: 1, duration: 380, delay: 350 + i * 150, useNativeDriver: true }).start();
    });

    if (Platform.OS !== 'web') {
      if (won) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Rank-up full-screen glow flash
    if (promoted) {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(promotedFlashAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(promotedFlashAnim, { toValue: 0.6, duration: 180, useNativeDriver: true }),
          Animated.timing(promotedFlashAnim, { toValue: 0.9, duration: 160, useNativeDriver: true }),
          Animated.timing(promotedFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 750);
    }

    setTimeout(() => {
      setShowXP(true);
      const prevProgress = rankInfo.progress;
      Animated.timing(xpBarAnim, { toValue: prevProgress, duration: 0, useNativeDriver: false }).start(() => {
        const newProgress = xpForNextRank(newXP).progress;
        Animated.timing(xpBarAnim, { toValue: newProgress, duration: 1200, useNativeDriver: false }).start();
      });
    }, 600);

    // Apply event bonus (XP + coins + credits on top of match result)
    if (hasEvent) {
      claimEventBonus({ xp: evXP, coins: evCoins, credits: evCredits });
    }

    // Award qualifier points if this was a qualifier match
    if (isQualifier) {
      const allEvents = getCurrentEvents();
      const qEvent = [allEvents.weekly, allEvents.monthly, allEvents.annual].find(e => e.periodKey === qPeriodKey);
      if (qEvent?.rounds) {
        earnQualifierPoints(qPeriodKey, qRoundIdx, position, qEvent.rounds).then(setQualResult);
      }
    }

    // Check achievements
    async function checkAchievements() {
      if (won) {
        const name = await unlockAchievement('first_win');
        if (name) { setNewAchievement(name); return; }
      }
      if (deflections >= 10) {
        const name = await unlockAchievement('hat_trick');
        if (name) { setNewAchievement(name); return; }
      }
      if (profile.totalGames >= 99) {
        const name = await unlockAchievement('century');
        if (name) { setNewAchievement(name); return; }
      }
    }
    checkAchievements();
  }, []);

  const positionLabels = ['', '1ST', '2ND', '3RD', '4TH'];
  const positionColors = ['', '#FFD700', '#C0C0C0', '#CD7F32', '#8B8B8B'];
  const medalEmoji     = ['', '🥇', '🥈', '🥉', '💀'];

  return (
    <Reanimated.View entering={FadeIn.duration(350)} exiting={FadeOutDown.duration(220)} style={[styles.root, { backgroundColor: colors.background }]}>
      <FloatingOrbs opacity={0.85} />
      <LinearGradient
        colors={won ? ['#0A140A', '#0A1A0A', '#0A0A14'] : ['#140A0A', '#1A0A0A', '#0A0A14']}
        style={StyleSheet.absoluteFill}
      />
      <ConfettiRain active={won || promoted} />

      {/* Stars/particles background */}
      {won && Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={[styles.star, {
          top: `${10 + i * 11}%` as never, left: `${5 + i * 12}%` as never,
          backgroundColor: '#C8820A', opacity: 0.15 + i * 0.05,
        }]} />
      ))}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: topPad + 10, paddingBottom: insets.bottom + 24 }]}
        >
        {/* Result banner */}
        <Reanimated.View entering={SlideInUp.springify().damping(14).stiffness(100)}>
        <Animated.View style={[styles.resultBanner, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={
              won       ? ['#C8820A55', '#C8820A22', '#C8820A08']
              : position === 2 ? ['#C0C0C033', '#C0C0C011', '#00000000']
              : position === 3 ? ['#CD7F3233', '#CD7F3211', '#00000000']
              :                  ['#FF475744', '#FF475722', '#FF475708']
            }
            style={styles.bannerGrad}
          >
            {/* Large medal / outcome emoji */}
            {won ? (
              <PulseRing color="#FFD700" size={90} rings={3} duration={1800} opacity={0.28}>
                <Text style={[styles.medalEmoji, { textShadowColor: positionColors[position] ?? '#8B8B8B' }]}>
                  {medalEmoji[position] ?? '💀'}
                </Text>
              </PulseRing>
            ) : (
              <Text style={[styles.medalEmoji, { textShadowColor: positionColors[position] ?? '#8B8B8B' }]}>
                {medalEmoji[position] ?? '💀'}
              </Text>
            )}
            <Text style={[styles.positionText, { color: positionColors[position] ?? '#8B8B8B' }]}>
              {positionLabels[position] ?? '4TH'}  ·  PLACE
            </Text>
            <GlowText intensity="strong" color={won ? '#00FF88' : '#C03820'} style={[styles.resultText, { color: won ? '#FFD700' : position === 2 ? '#D8D8D8' : position === 3 ? '#CD7F32' : '#FF4757' }]}>
              {won ? 'VICTORY!' : position === 2 ? 'RUNNER-UP' : position === 3 ? 'THIRD PLACE' : 'ELIMINATED'}
            </GlowText>
          </LinearGradient>
        </Animated.View>
        </Reanimated.View>

        {/* Stats */}
        <Animated.View style={{ opacity: card1Anim, transform: [{ translateY: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ width: 3, height: 16, backgroundColor: rankData.color, borderRadius: 2 }} />
            <Text style={[styles.statsTitle, { color: colors.foreground }]}>MATCH STATS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: 'Deflections', value: String(deflections), color: '#00FF88' },
              { label: 'Goals Against', value: String(goalsAgainst), color: '#FF4757' },
              { label: 'XP Earned', value: `+${xpEarned}`, color: rankData.color },
              { label: 'Coins', value: `+${coinsEarned}`, color: '#C8820A' },
            ].map(stat => (
              <View key={stat.label} style={styles.statItem}>
                {stat.label === 'XP Earned' ? (
                  <GlowText intensity="medium" color='#C8820A' style={[styles.statValue, { color: stat.color }]}>{stat.value}</GlowText>
                ) : stat.label === 'Coins' ? (
                  <GlowText intensity="soft" color='#FFD700' style={[styles.statValue, { color: stat.color }]}>{stat.value}</GlowText>
                ) : (
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                )}
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
        </Animated.View>

        {/* Event bonus card */}
        {hasEvent && (
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: evColor + '44' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 16 }}>{evEmoji}</Text>
              <Text style={[styles.bonusTitle, { color: evColor }]}>EVENT BONUS</Text>
              <Text style={[styles.bonusTitle, { color: colors.mutedForeground, fontWeight: '400' }]}>· {evName}</Text>
            </View>
            <View style={styles.bonusRows}>
              {evXP > 0 && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>✨</Text>
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Bonus XP</Text>
                  <Text style={[styles.bonusMult, { color: evColor }]}>+{evXP}</Text>
                </View>
              )}
              {evCoins > 0 && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>🪙</Text>
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Bonus Coins</Text>
                  <Text style={[styles.bonusMult, { color: '#C8820A' }]}>+{evCoins}</Text>
                </View>
              )}
              {evCredits > 0 && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>⚡</Text>
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Credits</Text>
                  <Text style={[styles.bonusMult, { color: '#B9A0E0' }]}>+{evCredits}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Qualifier result card */}
        {isQualifier && qualResult && (
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: (qualResult.advanced ? '#FFD700' : '#00BFFF') + '44' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 16 }}>{qEventEmoji}</Text>
              <Text style={[styles.bonusTitle, { color: qualResult.advanced ? '#FFD700' : '#00BFFF' }]}>
                {qualResult.advanced ? '🎉 QUALIFIED!' : 'QUALIFIER POINTS'}
              </Text>
              <Text style={[styles.bonusTitle, { color: colors.mutedForeground, fontWeight: '400' }]}>
                · {qRoundName}
              </Text>
            </View>
            <View style={styles.bonusRows}>
              <View style={styles.bonusRow}>
                <Text style={styles.bonusIcon}>⚡</Text>
                <Text style={[styles.bonusLabel, { color: colors.foreground }]}>QP Earned</Text>
                <Text style={[styles.bonusMult, { color: '#00BFFF' }]}>+{qualResult.qpEarned} QP</Text>
              </View>
              <View style={styles.bonusRow}>
                <Text style={styles.bonusIcon}>📊</Text>
                <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Total QP</Text>
                <Text style={[styles.bonusMult, { color: '#00BFFF' }]}>
                  {qualResult.totalQP} / {qThreshold} QP
                </Text>
              </View>
              {qualResult.advanced && qualResult.nextRoundName.length > 0 && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>🏆</Text>
                  <Text style={[styles.bonusLabel, { color: '#FFD700', fontFamily: 'Inter_700Bold' }]}>
                    ADVANCED → {qualResult.nextRoundName.toUpperCase()}
                  </Text>
                </View>
              )}
              {!qualResult.advanced && qualResult.totalQP < qThreshold && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>🎯</Text>
                  <Text style={[styles.bonusLabel, { color: colors.mutedForeground }]}>
                    Need {qThreshold - qualResult.totalQP} more QP to advance
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reward multiplier breakdown */}
        {hasBonus && (
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.bonusTitle, { color: colors.mutedForeground }]}>REWARD MULTIPLIERS</Text>
            <View style={styles.bonusRows}>
              {/* Difficulty multiplier */}
              {(() => {
                const label = matchType === 'casual' ? 'Casual Mode'
                  : variant === 'six_player' ? '6-Player'
                  : variant === 'chaos'      ? 'Chaos Mode'
                  : variant === 'rumble'     ? 'Rumble Mode'
                  : 'Ranked Classic';
                const color = diffMult >= 1.5 ? '#FF4757' : diffMult >= 1.2 ? '#FF6B35' : diffMult >= 1.0 ? '#C8820A' : '#8B8B8B';
                const icon  = diffMult >= 1.5 ? '🔴' : diffMult >= 1.2 ? '🟠' : diffMult >= 1.0 ? '🟡' : '⚪';
                return (
                  <View style={styles.bonusRow}>
                    <Text style={styles.bonusIcon}>{icon}</Text>
                    <Text style={[styles.bonusLabel, { color: colors.foreground }]}>{label}</Text>
                    <Text style={[styles.bonusMult, { color }]}>{diffMult < 1 ? '−' : ''}{Math.round(Math.abs(diffMult - 1) * 100)}%</Text>
                  </View>
                );
              })()}
              {/* Streak multiplier */}
              {streakMult > 1.0 && (
                <View style={styles.bonusRow}>
                  <Text style={styles.bonusIcon}>🔥</Text>
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>
                    {winStreak + 1}-Win Streak
                  </Text>
                  <Text style={[styles.bonusMult, { color: '#FF6B35' }]}>
                    +{Math.round((streakMult - 1) * 100)}%
                  </Text>
                </View>
              )}
              {/* Total */}
              <View style={[styles.bonusTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.bonusTotalLabel, { color: colors.mutedForeground }]}>Total multiplier</Text>
                <Text style={[styles.bonusTotalMult, { color: '#C8820A' }]}>
                  {(streakMult * diffMult).toFixed(2)}×
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* XP Progress */}
        {showXP && (
          <Animated.View style={{ opacity: card2Anim, transform: [{ translateY: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <View style={[styles.xpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.xpHeader}>
              {promoted ? (
                <Reanimated.View entering={ZoomIn.springify().damping(10).stiffness(120).delay(800)}>
                  <RankBadge rank={newRank.name} size="sm" showLabel={false} />
                </Reanimated.View>
              ) : (
                <RankBadge rank={profile.rank} size="sm" showLabel={false} />
              )}
              <Text style={[styles.xpLabel, { color: colors.foreground }]}>
                {promoted ? `RANK UP! → ${newRank.name}` : `${profile.rank} Rank`}
              </Text>
              {promoted && (
                <Reanimated.View entering={SlideInRight.springify().damping(14).stiffness(120).delay(900)}>
                  <Text style={[styles.rankUpBadge, { color: '#00FF88', borderColor: '#00FF88' }]}>↑ PROMOTED</Text>
                </Reanimated.View>
              )}
            </View>
            <View style={[styles.xpTrack, { backgroundColor: '#FFFFFF12' }]}>
              <Animated.View style={[styles.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: rankData.color,
              }]}>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#FFFFFF28', borderRadius: 4 }} />
              </Animated.View>
            </View>
            <Text style={[styles.xpSub, { color: colors.mutedForeground }]}>
              Level {xpToLevel(profile.xp)} → {xpToLevel(newXP)} · Total: {newXP} XP
            </Text>
          </View>
          </Animated.View>
        )}

        {/* Competitive level change (ranked only) */}
        {matchType === 'ranked' && (
          <View style={[styles.lvlCard, {
            backgroundColor: levelDelta > 0 ? '#00FF8811' : levelDelta < 0 ? '#FF475711' : colors.card,
            borderColor: levelDelta > 0 ? '#00FF8855' : levelDelta < 0 ? '#FF475755' : colors.border,
          }]}>
            <View style={styles.lvlRow}>
              <Text style={[styles.lvlLabel, { color: colors.mutedForeground }]}>COMPETITIVE LEVEL</Text>
              {levelDelta !== 0 && (
                <View style={[styles.lvlDeltaBadge, {
                  backgroundColor: levelDelta > 0 ? '#00FF8822' : '#FF475722',
                  borderColor: levelDelta > 0 ? '#00FF8866' : '#FF475766',
                }]}>
                  <Text style={[styles.lvlDeltaText, { color: levelDelta > 0 ? '#00FF88' : '#FF4757' }]}>
                    {levelDelta > 0 ? `+${levelDelta}` : `${levelDelta}`}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.lvlBefore}>
              <Text style={[styles.lvlNum, { color: colors.mutedForeground }]}>{levelBefore}</Text>
              {levelDelta !== 0 && (
                <>
                  <Feather name="arrow-right" size={14} color={levelDelta > 0 ? '#00FF88' : '#FF4757'} />
                  <Text style={[styles.lvlNum, { color: levelDelta > 0 ? '#00FF88' : '#FF4757' }]}>{levelAfter}</Text>
                </>
              )}
              {levelDelta === 0 && <Text style={[styles.lvlStable, { color: colors.mutedForeground }]}>— No change</Text>}
              <Text style={[styles.lvlSuffix, { color: colors.mutedForeground }]}> / 50</Text>
            </View>
          </View>
        )}

        {/* Achievement unlock */}
        {newAchievement && (
          <View style={[styles.achieveCard, { borderColor: '#C8820A' }]}>
            <LinearGradient colors={['#C8820A22', '#C8820A08']} style={StyleSheet.absoluteFill} />
            <Feather name="award" size={20} color="#C8820A" />
            <View style={{ flex: 1 }}>
              <Text style={styles.achieveTitle}>Achievement Unlocked!</Text>
              <Text style={[styles.achieveName, { color: '#C8820A' }]}>{newAchievement}</Text>
            </View>
          </View>
        )}

        {/* Win streak Lucky Block reward */}
        {(() => {
          if (!won || winStreak <= 0 || winStreak % 5 !== 0) return null;
          const pendingId = profile.pendingStreakLuckyBlockId;
          const block = pendingId
            ? (profile.luckyBlocks ?? []).find(b => b.id === pendingId) ?? null
            : null;
          if (!block) return null;
          const meta = LUCKY_BLOCK_META[block.tier];
          return (
            <Pressable
              onPress={() => setActiveLuckyBlock(block)}
              style={[styles.achieveCard, { borderColor: meta.color + '88', backgroundColor: 'transparent' }]}
            >
              <LinearGradient
                colors={[meta.color + '30', meta.color + '10', '#00000000']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={{ fontSize: 32 }}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.achieveTitle, { color: meta.color }]}>
                  🎉 {winStreak}-WIN STREAK!
                </Text>
                <Text style={[styles.achieveName, { color: meta.color + 'CC' }]}>
                  {meta.name} awaits — tap to open!
                </Text>
              </View>
              <Text style={{ color: meta.color, fontSize: 20 }}>▶</Text>
            </Pressable>
          );
        })()}

        {/* Buttons */}
        <Animated.View style={{ opacity: card3Anim, transform: [{ translateY: card3Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => router.replace('/lobby')}
            style={({ pressed }) => [styles.playAgainBtn, pressed && { opacity: 0.85 }]}
          >
            <ShimmerCard active={true} borderRadius={10} style={{ flex: 1 }}>
              <LinearGradient colors={['#FFE020', '#FFB800']} style={styles.playAgainGrad}>
                <Feather name="refresh-cw" size={18} color="#080814" />
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </LinearGradient>
            </ShimmerCard>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.homeBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Feather name="share-2" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.homeBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Feather name="home" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        </Animated.View>

        {/* Win streak */}
        {profile.winStreak > 1 && !activeLuckyBlock && (
          <Text style={[styles.streakText, { color: '#FF6B35' }]}>
            🔥 {profile.winStreak} win streak
          </Text>
        )}
        </ScrollView>
      </Animated.View>
      {activeLuckyBlock && (
        <LuckyBlockOpener
          block={activeLuckyBlock}
          onClose={() => setActiveLuckyBlock(null)}
        />
      )}

      {/* Rank-up: full-screen glow flash overlay */}
      {promoted && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: promotedFlashAnim }]}
        >
          <LinearGradient
            colors={['#FFD70066', '#00FF8844', '#C8820055', '#FFD70066']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  content: { paddingHorizontal: 20, gap: 14, alignItems: 'stretch' },
  resultBanner: { alignItems: 'center', overflow: 'hidden', borderRadius: 22 },
  bannerGrad: { width: '100%', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, gap: 6, borderRadius: 22 },
  medalEmoji: { fontSize: 68, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 },
  positionText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 5 },
  resultText: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: 3 },
  victoryEmoji: { fontSize: 40, marginTop: 4 },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  statsTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },
  xpCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  xpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpLabel: { fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 },
  rankUpBadge: { fontFamily: 'Inter_700Bold', fontSize: 10, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  xpSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  achieveCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  achieveTitle: { color: '#FFFFFF88', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },
  achieveName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  lvlCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  lvlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lvlLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2 },
  lvlDeltaBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  lvlDeltaText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  lvlBefore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lvlNum: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  lvlStable: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  lvlSuffix: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  buttons: { flexDirection: 'row', gap: 10 },
  playAgainBtn: { flex: 1, borderRadius: 16, overflow: 'hidden', elevation: 6, shadowColor: '#C8820A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 14 },
  playAgainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  playAgainText: { color: '#080814', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1 },
  homeBtn: { width: 58, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bonusCard:      { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  bonusTitle:     { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  bonusRows:      { gap: 8 },
  bonusRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusIcon:      { fontSize: 16, width: 22, textAlign: 'center' },
  bonusLabel:     { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13 },
  bonusMult:      { fontFamily: 'Inter_700Bold', fontSize: 13 },
  bonusTotalRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  bonusTotalLabel:{ fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bonusTotalMult: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  streakText: { textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
