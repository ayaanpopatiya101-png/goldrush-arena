import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/Flat';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOutDown, SlideInRight, SlideInUp, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { ConfettiRain } from '@/components/ConfettiRain';
import { FloatingOrbs, GlowText, PulseRing, ShimmerCard } from '@/components/effects';
import { ACHIEVEMENTS, RANKS, LUCKY_BLOCK_META, getCurrentEvents, usePlayer, xpForNextRank, xpToLevel, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { RankCeremonyOverlay } from '@/components/RankCeremonyOverlay';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/hooks/useSettings';
import { useSoundFX } from '@/hooks/useSoundFX';
import { ShareCard } from '@/components/ShareCard';
import { getPendingClip, clearPendingClip } from '@/store/highlightClip';
import { submitChallengeScore } from '@/utils/dailyChallenge';
import { getDeviceId } from '@/utils/deviceId';
import { Glyph } from '@/components/ui/Glyph';

// ─── Emote strip ─────────────────────────────────────────────────────────────
const EMOTES = ['🔥', '👏', '😤', '💀', '🤝', '👑'] as const;

function EmoteButton({ emoji, selected, onPress }: { emoji: string; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(1.45, { damping: 5, stiffness: 320 }, () => {
      scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    });
    onPress();
  }

  return (
    <Pressable onPress={handlePress}>
      <Reanimated.View style={[animStyle, {
        width: 46, height: 46, borderRadius: 3,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: selected ? '#ECE7DC20' : '#ECE7DC0A',
        borderWidth: 1.5,
        borderColor: selected ? '#C99A2E' : '#ECE7DC14',
      }]}>
        <Glyph style={{ fontSize: 22 }} value={emoji} />
      </Reanimated.View>
    </Pressable>
  );
}

export default function PostGameScreen() {
  const rawParams = useLocalSearchParams();
  if (!rawParams.won && !rawParams.xpEarned) {
    return (
      <View style={{ flex: 1, backgroundColor: '#16171A', justifyContent: 'center', padding: 28, gap: 20 }}>
        <Text accessibilityRole="alert" style={{ color: '#ECE7DC', fontSize: 18 }}>No completed match is available on this page. Return Home to play a new match.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: '#C99A2E', fontSize: 18 }}>RETURN HOME</Text>
        </Pressable>
      </View>
    );
  }
  return <PostGameContent />;
}

function PostGameContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const sfx = useSoundFX(settings.soundEnabled);

  // ── Guard: if params are missing (e.g. hard-refresh on web), go home ──────

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
    // Daily challenge, empty string when this was not a challenge run
    challengeSeed: string; matchNonce: string;
    // Arcade params
    arcadeBest: string;
    // Match highlights, multi-clip auto-detected moments
    momentCount: string; matchHighlightsId: string;
  }>();
  const { profile, unlockAchievement, claimEventBonus, earnQualifierPoints } = usePlayer();

  const won = params.won === '1';
  const position = parseInt(params.position ?? '4', 10);
  const deflections = parseInt(params.deflections ?? '0', 10);
  const goalsAgainst = parseInt(params.goalsAgainst ?? '0', 10);
  const xpEarned = parseInt(params.xpEarned ?? '50', 10);
  const coinsEarned = parseInt(params.coinsEarned ?? '15', 10);
  const matchType   = params.matchType ?? 'casual';
  const isArcade    = matchType === 'arcade';
  const arcadeBest   = parseInt(params.arcadeBest ?? String(0), 10);
  const momentCount  = parseInt(params.momentCount ?? '0', 10);
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
  const evColor   = params.evColor ?? '#C99A2E';
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
  const qEventColor = params.qEventColor ?? '#C99A2E';
  const isQualifier  = qPeriodKey.length > 0 && qRoundIdx >= 0;
  const qpEarnedThisMatch = isQualifier ? (qpPerPlace[Math.min(Math.max(position - 1, 0), 3)] ?? 0) : 0;

  // Daily challenge, only truthy when the match was seeded by the challenge config
  const challengeSeed  = params.challengeSeed ?? '';
  const matchNonce     = params.matchNonce    ?? '';
  const isChallengeRun = challengeSeed.length > 0 && matchNonce.length > 0;

  const levelAfter  = profile.competitiveLevel ?? 1;
  const levelDelta  = levelAfter - levelBefore;

  const [selectedEmote, setSelectedEmote] = useState<string | null>(null);
  // Read the pending highlight clip once at mount; clear when screen unmounts
  const highlightClip = useRef(getPendingClip()).current;
  useEffect(() => () => clearPendingClip(), []);

  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const scaleAnim       = useRef(new Animated.Value(0.7)).current;
  const xpBarAnim       = useRef(new Animated.Value(0)).current;
  const card1Anim       = useRef(new Animated.Value(0)).current; // stats card
  const card2Anim       = useRef(new Animated.Value(0)).current; // xp / level card
  const card3Anim       = useRef(new Animated.Value(0)).current; // buttons row
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showXP, setShowXP] = useState(false);
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);
  const [qualResult, setQualResult] = useState<{ qpEarned: number; totalQP: number; advanced: boolean; nextRoundName: string } | null>(null);

  // ── Daily challenge state ─────────────────────────────────────────────────
  const [showShareCard,  setShowShareCard]  = useState(false);
  const [challengeRank,  setChallengeRank]  = useState<number | null>(null);
  const [challengePB,    setChallengePB]    = useState<number | null>(null);
  const [challengeTotal, setChallengeTotal] = useState(0);
  const [dailySeed,      setDailySeed]      = useState('');

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const newXP = profile.xp + xpEarned;
  const newRank = (() => {
    let r = RANKS[0];
    for (const rank of RANKS) { if (newXP >= rank.minXP) r = rank; }
    return r;
  })();
  const promoted = newRank.name !== profile.rank;

  // Ceremony overlay, initialized after `promoted` is computed
  const [showCeremony, setShowCeremony] = useState(promoted);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  async function handleShare() {
    const posLabel = positionLabels[position] ?? '4TH';
    const msg = won
      ? `VICTORY! I won a match in GoldRush Arena with ${deflections} deflections and earned +${xpEarned} XP. Think you can beat me?`
      : `I finished ${posLabel} in GoldRush Arena, ${deflections} deflections, +${xpEarned} XP. Download and challenge me!`;
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

    // Rank-up fanfare, fires at ~750 ms, same timing as the flash/ceremony
    if (promoted) {
      setTimeout(() => sfx.rankUp(), 750);
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

    // Only submit to leaderboard when this was an actual challenge run (has nonce + seed) and NOT arcade
    if (!isArcade && isChallengeRun && deflections > 0) {
      setDailySeed(challengeSeed);
      async function submitToChallenge() {
        const deviceId    = await getDeviceId();
        // Estimate match duration, 2.5 s/deflection average safely clears the
        // 300 ms/deflection anti-cheat floor; task #48 will pass the real timer.
        const estimatedMs = Math.max(deflections * 2500, 30_000);
        const result = await submitChallengeScore(
          deviceId, profile.name, deflections, estimatedMs, matchNonce, challengeSeed,
        );
        if (result.rank !== null)         setChallengeRank(result.rank);
        if (result.personalBest !== null) setChallengePB(result.personalBest);
        setChallengeTotal(result.totalPlayers);
      }
      submitToChallenge();
    }
  }, []);

  const positionLabels = ['', '1ST', '2ND', '3RD', '4TH'];
  const positionColors = ['', '#C99A2E', '#B7B2A6', '#C99A2E', '#8A867D'];
  const medalEmoji     = ['', '🥇', '🥈', '🥉', '💀'];

  return (
    <Reanimated.View entering={FadeIn.duration(350)} exiting={FadeOutDown.duration(220)} style={[styles.root, { backgroundColor: colors.background }]}>
      <FloatingOrbs opacity={0.85} />
      <LinearGradient
        colors={won ? ['#16171A', '#1F2125', '#16171A'] : ['#16171A', '#1F2125', '#16171A']}
        style={StyleSheet.absoluteFill}
      />
      <ConfettiRain active={won || promoted} />



      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: topPad + 10, paddingBottom: insets.bottom + 24 }]}
        >
        {/* Result banner */}
        <Reanimated.View entering={SlideInUp.springify().damping(14).stiffness(100)}>
        <Animated.View style={[styles.resultBanner, { transform: [{ scale: scaleAnim }] }]}>
          {isArcade ? (
            /* ── Arcade banner ── */
            <LinearGradient
              colors={deflections >= arcadeBest && arcadeBest > 0 ? ['#6F8A5B44', '#6F8A5B20', '#6F8A5B08'] : ['#8C8F7A44', '#8C8F7A20', '#8C8F7A08']}
              style={styles.bannerGrad}
            >
              <Glyph style={[styles.medalEmoji]} value="⚡" />
              <Text style={[styles.positionText, { color: '#6F8A5B88', letterSpacing: 3 }]}>SOLO ARCADE · GAME OVER</Text>
              <GlowText intensity="strong" color={deflections >= arcadeBest && arcadeBest > 0 ? '#6F8A5B' : '#C99A2E'} style={[styles.scoreDisplay]}>
                {deflections}
              </GlowText>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 11, color: '#ECE7DC66', letterSpacing: 3 }}>
                HITS
              </Text>
              {deflections >= arcadeBest && arcadeBest > 0 && (
                <View style={{ backgroundColor: '#6F8A5B22', borderRadius: 3, borderWidth: 1, borderColor: '#6F8A5B55', paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#6F8A5B', letterSpacing: 2 }}>NEW PERSONAL BEST!</Text>
                </View>
              )}
            </LinearGradient>
          ) : (
            /* ── Standard multi-player banner ── */
            <LinearGradient
              colors={
                won       ? ['#C99A2E55', '#C99A2E22', '#C99A2E08']
                : position === 2 ? ['#B7B2A633', '#B7B2A611', '#16171A00']
                : position === 3 ? ['#C99A2E33', '#C99A2E11', '#16171A00']
                :                  ['#B4533A44', '#B4533A22', '#B4533A08']
              }
              style={styles.bannerGrad}
            >
              {/* Large medal / outcome emoji */}
              {won ? (
                <PulseRing color="#C99A2E" size={90} rings={3} duration={1800} opacity={0.28}>
                  <Glyph style={[styles.medalEmoji, { textShadowColor: 'transparent'}]} value={medalEmoji[position] ?? '💀'} />
                </PulseRing>
              ) : (
                <Glyph style={[styles.medalEmoji, { textShadowColor: 'transparent'}]} value={medalEmoji[position] ?? '💀'} />
              )}
              <Text style={[styles.positionText, { color: positionColors[position] ?? '#8A867D' }]}>
                {positionLabels[position] ?? '4TH'}  ·  PLACE
              </Text>
              <GlowText intensity="strong" color={won ? '#6F8A5B' : '#B4533A'} style={[styles.resultText, { color: won ? '#C99A2E' : position === 2 ? '#ECE7DC' : position === 3 ? '#C99A2E' : '#B4533A' }]}>
                {won ? 'VICTORY!' : position === 2 ? 'RUNNER-UP' : position === 3 ? 'THIRD PLACE' : 'ELIMINATED'}
              </GlowText>
            </LinearGradient>
          )}
        </Animated.View>
        </Reanimated.View>

        {/* ── Emote strip (hidden in arcade) ── */}
        {!isArcade && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 4 }}>
              {EMOTES.map(emote => (
                <EmoteButton
                  key={emote}
                  emoji={emote}
                  selected={selectedEmote === emote}
                  onPress={() => setSelectedEmote(emote)}
                />
              ))}
            </View>
            {selectedEmote && (
              <Text style={{ textAlign: 'center', fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: '#C99A2E88', marginBottom: 2 }}>
                {selectedEmote} reacted
              </Text>
            )}
          </>
        )}

        {/* Stats */}
        <Animated.View style={{ opacity: card1Anim, transform: [{ translateY: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        {isArcade ? (
          /* ── Arcade stats card ── */
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: '#6F8A5B22' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[styles.statsTitle, { color: '#6F8A5B' }]}>ARCADE STATS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
            </View>
            <View style={styles.statsGrid}>
              {[
                { label: 'Score (Hits)',   value: String(deflections), color: '#C99A2E' },
                { label: 'Personal Best',  value: String(arcadeBest),  color: '#6F8A5B' },
              ].map(stat => (
                <View key={stat.label} style={[styles.statItem, { minWidth: '45%' }]}>
                  <GlowText intensity="medium" color={stat.color} style={[styles.statValue, { color: stat.color, fontSize: 28 }]}>{stat.value}</GlowText>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
            {deflections < arcadeBest && arcadeBest > 0 && (
              <View style={{ marginTop: 10, backgroundColor: '#C99A2E10', borderRadius: 3, padding: 10, borderWidth: 1, borderColor: '#C99A2E22' }}>
                <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#C99A2E99', textAlign: 'center' }}>
                   {arcadeBest - deflections} more hits to beat your best
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Standard match stats card ── */
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={[styles.statsTitle, { color: colors.foreground }]}>MATCH STATS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
            </View>
            <View style={styles.statsGrid}>
              {[
                { label: 'Deflections', value: String(deflections), color: '#6F8A5B' },
                { label: 'Goals Against', value: String(goalsAgainst), color: '#B4533A' },
                { label: 'XP Earned', value: `+${xpEarned}`, color: rankData.color },
                { label: 'Coins', value: `+${coinsEarned}`, color: '#C99A2E' },
              ].map(stat => (
                <View key={stat.label} style={styles.statItem}>
                  {stat.label === 'XP Earned' ? (
                    <GlowText intensity="medium" color='#C99A2E' style={[styles.statValue, { color: stat.color }]}>{stat.value}</GlowText>
                  ) : stat.label === 'Coins' ? (
                    <GlowText intensity="soft" color='#C99A2E' style={[styles.statValue, { color: stat.color }]}>{stat.value}</GlowText>
                  ) : (
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  )}
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        </Animated.View>

        {/* Event bonus card */}
        {hasEvent && (
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: evColor + '44' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Glyph style={{ fontSize: 16 }} value={evEmoji} />
              <Text style={[styles.bonusTitle, { color: evColor }]}>EVENT BONUS</Text>
              <Text style={[styles.bonusTitle, { color: colors.mutedForeground, fontWeight: '400' }]}>· {evName}</Text>
            </View>
            <View style={styles.bonusRows}>
              {evXP > 0 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="✨" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Bonus XP</Text>
                  <Text style={[styles.bonusMult, { color: evColor }]}>+{evXP}</Text>
                </View>
              )}
              {evCoins > 0 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🪙" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Bonus Coins</Text>
                  <Text style={[styles.bonusMult, { color: '#C99A2E' }]}>+{evCoins}</Text>
                </View>
              )}
              {evCredits > 0 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="⚡" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Credits</Text>
                  <Text style={[styles.bonusMult, { color: '#8C8F7A' }]}>+{evCredits}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Qualifier result card */}
        {isQualifier && qualResult && (
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: (qualResult.advanced ? '#C99A2E' : '#8C8F7A') + '44' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Glyph style={{ fontSize: 16 }} value={qEventEmoji} />
              <Text style={[styles.bonusTitle, { color: qualResult.advanced ? '#C99A2E' : '#8C8F7A' }]}>
                {qualResult.advanced ? 'QUALIFIED!' : 'QUALIFIER POINTS'}
              </Text>
              <Text style={[styles.bonusTitle, { color: colors.mutedForeground, fontWeight: '400' }]}>
                · {qRoundName}
              </Text>
            </View>
            <View style={styles.bonusRows}>
              <View style={styles.bonusRow}>
                <Glyph style={styles.bonusIcon} value="⚡" />
                <Text style={[styles.bonusLabel, { color: colors.foreground }]}>QP Earned</Text>
                <Text style={[styles.bonusMult, { color: '#8C8F7A' }]}>+{qualResult.qpEarned} QP</Text>
              </View>
              <View style={styles.bonusRow}>
                <Glyph style={styles.bonusIcon} value="📊" />
                <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Total QP</Text>
                <Text style={[styles.bonusMult, { color: '#8C8F7A' }]}>
                  {qualResult.totalQP} / {qThreshold} QP
                </Text>
              </View>
              {qualResult.advanced && qualResult.nextRoundName.length > 0 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🏆" />
                  <Text style={[styles.bonusLabel, { color: '#C99A2E', fontFamily: 'SourceSans3_700Bold' }]}>
                    ADVANCED → {qualResult.nextRoundName.toUpperCase()}
                  </Text>
                </View>
              )}
              {!qualResult.advanced && qualResult.totalQP < qThreshold && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🎯" />
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
                const color = diffMult >= 1.5 ? '#B4533A' : diffMult >= 1.2 ? '#B4533A' : diffMult >= 1.0 ? '#C99A2E' : '#8A867D';
                const icon  = diffMult >= 1.5 ? '🔴' : diffMult >= 1.2 ? '🟠' : diffMult >= 1.0 ? '🟡' : '⚪';
                return (
                  <View style={styles.bonusRow}>
                    <Glyph style={styles.bonusIcon} value={icon} />
                    <Text style={[styles.bonusLabel, { color: colors.foreground }]}>{label}</Text>
                    <Text style={[styles.bonusMult, { color }]}>{diffMult < 1 ? '−' : ''}{Math.round(Math.abs(diffMult - 1) * 100)}%</Text>
                  </View>
                );
              })()}
              {/* Streak multiplier */}
              {streakMult > 1.0 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🔥" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>
                    {winStreak + 1}-Win Streak
                  </Text>
                  <Text style={[styles.bonusMult, { color: '#B4533A' }]}>
                    +{Math.round((streakMult - 1) * 100)}%
                  </Text>
                </View>
              )}
              {/* Total */}
              <View style={[styles.bonusTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.bonusTotalLabel, { color: colors.mutedForeground }]}>Total multiplier</Text>
                <Text style={[styles.bonusTotalMult, { color: '#C99A2E' }]}>
                  {(streakMult * diffMult).toFixed(2)}×
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* XP Progress, hidden in arcade mode */}
        {showXP && !isArcade && (
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
                  <Text style={[styles.rankUpBadge, { color: '#6F8A5B', borderColor: '#6F8A5B' }]}>↑ PROMOTED</Text>
                </Reanimated.View>
              )}
            </View>
            <View style={[styles.xpTrack, { backgroundColor: '#ECE7DC12' }]}>
              <Animated.View style={[styles.xpFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: rankData.color,
              }]}>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#ECE7DC28', borderRadius: 4 }} />
              </Animated.View>
            </View>
            <Text style={[styles.xpSub, { color: colors.mutedForeground }]}>
              Level {xpToLevel(profile.xp)} → {xpToLevel(newXP)} · Total: {newXP} XP
            </Text>
          </View>
          </Animated.View>
        )}

        {/* Daily challenge rank, only shown for challenge runs (not arcade) */}
        {!isArcade && isChallengeRun && dailySeed.length > 0 && deflections > 0 && (
          <Reanimated.View entering={FadeIn.duration(600).delay(1400)}>
          <View style={[styles.bonusCard, { backgroundColor: colors.card, borderColor: '#C99A2E33' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Glyph style={{ fontSize: 16 }} value="⚡" />
              <Text style={[styles.bonusTitle, { color: '#C99A2E' }]}>DAILY CHALLENGE</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
              <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#ECE7DC33' }}>{dailySeed}</Text>
            </View>
            <View style={styles.bonusRows}>
              {/* Today's score */}
              <View style={styles.bonusRow}>
                <Glyph style={styles.bonusIcon} value="🎯" />
                <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Today's Score</Text>
                <Text style={[styles.bonusMult, { color: '#6F8A5B' }]}>{deflections} hits</Text>
              </View>
              {/* Personal best */}
              {challengePB !== null && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🏆" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>
                    Personal Best{deflections >= challengePB && deflections > 0 ? ' 🆕' : ''}
                  </Text>
                  <Text style={[styles.bonusMult, { color: '#C99A2E' }]}>{challengePB} hits</Text>
                </View>
              )}
              {/* Daily rank */}
              {challengeRank !== null && challengeTotal > 1 && (
                <View style={styles.bonusRow}>
                  <Glyph style={styles.bonusIcon} value="🌍" />
                  <Text style={[styles.bonusLabel, { color: colors.foreground }]}>Daily Rank</Text>
                  <Text style={[styles.bonusMult, { color: '#C99A2E' }]}>
                    #{challengeRank} of {challengeTotal}
                  </Text>
                </View>
              )}
            </View>
          </View>
          </Reanimated.View>
        )}

        {/* Competitive level change (ranked only) */}
        {matchType === 'ranked' && (
          <View style={[styles.lvlCard, {
            backgroundColor: levelDelta > 0 ? '#6F8A5B11' : levelDelta < 0 ? '#B4533A11' : colors.card,
            borderColor: levelDelta > 0 ? '#6F8A5B55' : levelDelta < 0 ? '#B4533A55' : colors.border,
          }]}>
            <View style={styles.lvlRow}>
              <Text style={[styles.lvlLabel, { color: colors.mutedForeground }]}>COMPETITIVE LEVEL</Text>
              {levelDelta !== 0 && (
                <View style={[styles.lvlDeltaBadge, {
                  backgroundColor: levelDelta > 0 ? '#6F8A5B22' : '#B4533A22',
                  borderColor: levelDelta > 0 ? '#6F8A5B66' : '#B4533A66',
                }]}>
                  <Text style={[styles.lvlDeltaText, { color: levelDelta > 0 ? '#6F8A5B' : '#B4533A' }]}>
                    {levelDelta > 0 ? `+${levelDelta}` : `${levelDelta}`}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.lvlBefore}>
              <Text style={[styles.lvlNum, { color: colors.mutedForeground }]}>{levelBefore}</Text>
              {levelDelta !== 0 && (
                <>
                  <Feather name="arrow-right" size={14} color={levelDelta > 0 ? '#6F8A5B' : '#B4533A'} />
                  <Text style={[styles.lvlNum, { color: levelDelta > 0 ? '#6F8A5B' : '#B4533A' }]}>{levelAfter}</Text>
                </>
              )}
              {levelDelta === 0 && <Text style={[styles.lvlStable, { color: colors.mutedForeground }]}>- No change</Text>}
              <Text style={[styles.lvlSuffix, { color: colors.mutedForeground }]}> / 50</Text>
            </View>
          </View>
        )}

        {/* Achievement unlock */}
        {newAchievement && (
          <View style={[styles.achieveCard, { borderColor: '#C99A2E' }]}>
            <LinearGradient colors={['#C99A2E22', '#C99A2E08']} style={StyleSheet.absoluteFill} />
            <Feather name="award" size={20} color="#C99A2E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.achieveTitle}>Achievement Unlocked!</Text>
              <Text style={[styles.achieveName, { color: '#C99A2E' }]}>{newAchievement}</Text>
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
                colors={[meta.color + '30', meta.color + '10', '#16171A00']}
                style={StyleSheet.absoluteFill}
              />
              <Glyph style={{ fontSize: 32 }} value={meta.emoji} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.achieveTitle, { color: meta.color }]}>
                   {winStreak}-WIN STREAK!
                </Text>
                <Text style={[styles.achieveName, { color: meta.color + 'CC' }]}>
                  {meta.name} awaits, tap to open!
                </Text>
              </View>
              <Text style={{ color: meta.color, fontSize: 20 }}>▶</Text>
            </Pressable>
          );
        })()}

        {/* Buttons */}
        <Animated.View style={{ opacity: card3Anim, transform: [{ translateY: card3Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], gap: 10 }}>
          {/* Primary: RETRY (arcade) or PLAY AGAIN (multiplayer) */}
          {isArcade ? (
            <Pressable
              onPress={() => router.replace('/arcade' as never)}
              style={({ pressed }) => [styles.playAgainBtn, { shadowColor: '#6F8A5B' }, pressed && { opacity: 0.85 }]}
            >
              <ShimmerCard active={true} borderRadius={3} style={{ flex: 1 }}>
                <LinearGradient colors={['#6F8A5B', '#6F8A5B']} style={styles.playAgainGrad}>
                  <Feather name="refresh-cw" size={18} color="#16171A" />
                  <Text style={styles.playAgainText}>RETRY</Text>
                </LinearGradient>
              </ShimmerCard>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.replace('/lobby')}
              style={({ pressed }) => [styles.playAgainBtn, pressed && { opacity: 0.85 }]}
            >
              <ShimmerCard active={true} borderRadius={3} style={{ flex: 1 }}>
                <LinearGradient colors={['#C99A2E', '#C99A2E']} style={styles.playAgainGrad}>
                  <Feather name="refresh-cw" size={18} color="#16171A" />
                  <Text style={styles.playAgainText}>PLAY AGAIN</Text>
                </LinearGradient>
              </ShimmerCard>
            </Pressable>
          )}
          {/* ── MATCH HIGHLIGHTS banner (multi-clip auto-detected moments) ── */}
          {momentCount > 0 && (
            <Pressable
              onPress={() => router.push('/match-highlights')}
              style={({ pressed }) => [styles.seeClipBtn, { opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />
              <View style={styles.seeClipBorder} />
              <View style={styles.seeClipInner}>
                <Glyph style={{ fontSize: 26 }} value="🎬" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.seeClipTitle}>MATCH HIGHLIGHTS</Text>
                  <Text style={styles.seeClipSub}>
                    {momentCount} moment{momentCount > 1 ? 's' : ''} detected · Edit · Share · Earn
                  </Text>
                </View>
                <View style={[styles.seeClipArrow, { backgroundColor: '#C99A2E20' }]}>
                  <Text style={{ fontSize: 18, color: '#C99A2E' }}>›</Text>
                </View>
              </View>
            </Pressable>
          )}
          {/* ── Fallback: SEE YOUR CLIP (single clip, no auto-detect) ── */}
          {momentCount === 0 && highlightClip && (
            <Pressable
              onPress={() => router.push('/clip-viewer')}
              style={({ pressed }) => [styles.seeClipBtn, { opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />
              <View style={styles.seeClipBorder} />
              <View style={styles.seeClipInner}>
                <Glyph style={{ fontSize: 28 }} value="🎬" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.seeClipTitle}>SEE YOUR CLIP</Text>
                  <Text style={styles.seeClipSub}>Watch · Edit · Share · Save</Text>
                </View>
                <View style={styles.seeClipArrow}>
                  <Text style={{ fontSize: 18, color: '#C99A2E' }}>›</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* Secondary row: Challenge (non-arcade only) + Share + Home */}
          <View style={styles.buttons}>
            {!isArcade && isChallengeRun && (
              <Pressable
                onPress={() => setShowShareCard(true)}
                style={({ pressed }) => [styles.challengeBtn, pressed && { opacity: 0.82 }]}
              >
                <LinearGradient colors={['#8C8F7A', '#2A2C31']} style={styles.challengeBtnGrad}>
                  <Text style={styles.challengeBtnText}>CHALLENGE</Text>
                </LinearGradient>
              </Pressable>
            )}
            {!isArcade && (
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.homeBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Feather name="share-2" size={18} color={colors.foreground} />
              </Pressable>
            )}
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
          <Text style={[styles.streakText, { color: '#B4533A' }]}>
             {profile.winStreak} win streak
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

      {/* Rank promotion ceremony overlay */}
      <RankCeremonyOverlay
        newRank={newRank.name}
        visible={showCeremony}
        onDismiss={() => setShowCeremony(false)}
      />


      {/* Viral share card, only rendered for non-arcade challenge runs */}
      {!isArcade && isChallengeRun && <ShareCard
        visible={showShareCard}
        score={deflections}
        personalBest={challengePB ?? deflections}
        playerName={profile.name}
        dailyRank={challengeRank}
        totalPlayers={challengeTotal}
        seed={dailySeed}
        onClose={() => setShowShareCard(false)}
      />}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  content: { paddingHorizontal: 20, gap: 14, alignItems: 'stretch' },
  resultBanner: { alignItems: 'center', overflow: 'hidden', borderRadius: 3 },
  bannerGrad: { width: '100%', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, gap: 6, borderRadius: 3 },
  medalEmoji: { fontSize: 68, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  positionText: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 5 },
  resultText:   { fontFamily: 'BarlowCondensed_700Bold', fontSize: 38, letterSpacing: 3 },
  scoreDisplay: { fontFamily: 'SourceSans3_700Bold', fontSize: 64, letterSpacing: -2, lineHeight: 68 },
  victoryEmoji: { fontSize: 40, marginTop: 4 },
  statsCard: { borderRadius: 3, borderWidth: 1, padding: 16, gap: 14 },
  statsTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'SourceSans3_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1.5 },
  xpCard: { borderRadius: 3, borderWidth: 1, padding: 16, gap: 10 },
  xpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, flex: 1 },
  rankUpBadge: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  xpSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 11 },
  achieveCard: { borderRadius: 3, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  achieveTitle: { color: '#ECE7DC88', fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1.5 },
  achieveName: { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  lvlCard: { borderRadius: 3, borderWidth: 1, padding: 16, gap: 10 },
  lvlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lvlLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 2 },
  lvlDeltaBadge: { borderRadius: 3, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  lvlDeltaText: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  lvlBefore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lvlNum: { fontFamily: 'SourceSans3_700Bold', fontSize: 20 },
  lvlStable: { fontFamily: 'SourceSans3_400Regular', fontSize: 13 },
  lvlSuffix: { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },
  seeClipBtn:    { borderRadius: 3, overflow: 'hidden', borderWidth: 1.5, borderColor: '#C99A2E44' },
  seeClipBorder: { position: 'absolute', inset: 0, borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E22' },
  seeClipInner:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  seeClipTitle:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, color: '#C99A2E', letterSpacing: 1.5 },
  seeClipSub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#C99A2E99', letterSpacing: 0.3, marginTop: 1 },
  seeClipArrow:  { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C99A2E15', borderRadius: 3 },
  buttons: { flexDirection: 'row', gap: 10 },
  playAgainBtn: { borderRadius: 3, overflow: 'hidden', elevation: 0, shadowColor: '#C99A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 0 },
  playAgainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  playAgainText: { color: '#16171A', fontFamily: 'SourceSans3_700Bold', fontSize: 15, letterSpacing: 1 },
  challengeBtn:    { flex: 1, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#8C8F7A44' },
  challengeBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  challengeBtnText:{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#8C8F7A', letterSpacing: 0.5 },
  homeBtn: { width: 54, borderRadius: 3, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bonusCard:      { borderRadius: 3, borderWidth: 1, padding: 14, gap: 10 },
  bonusTitle:     { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 1.2 },
  bonusRows:      { gap: 8 },
  bonusRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusIcon:      { fontSize: 16, width: 22, textAlign: 'center' },
  bonusLabel:     { flex: 1, fontFamily: 'SourceSans3_400Regular', fontSize: 13 },
  bonusMult:      { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  bonusTotalRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  bonusTotalLabel:{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12 },
  bonusTotalMult: { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  streakText: { textAlign: 'center', fontFamily: 'SourceSans3_600SemiBold', fontSize: 14 },
});
