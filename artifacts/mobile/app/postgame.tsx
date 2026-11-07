import { Feather } from '@expo/vector-icons';
import { getCompletedMatch, updateCompletedMatch } from '@/store/completedMatch';
import { startRematch } from '@/store/gameSession';
import * as Haptics from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOutDown, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RankBadge } from '@/components/RankBadge';
import { RANKS, LUCKY_BLOCK_META, getCurrentEvents, usePlayer, xpForNextRank, xpToLevel, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { RankCeremonyOverlay } from '@/components/RankCeremonyOverlay';
import { useSettings } from '@/hooks/useSettings';
import { useSoundFX } from '@/hooks/useSoundFX';
import { ShareCard } from '@/components/ShareCard';
import { getPendingClip, clearPendingClip } from '@/store/highlightClip';
import { submitChallengeScore } from '@/utils/dailyChallenge';
import { getDeviceId } from '@/utils/deviceId';
import { palette, tactile } from '@/constants/colors';
import { ScreenTitle } from '@/components/ui/Primitives';
import { CURRENT_SEASON } from '@/constants/season';
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
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Reanimated.View style={[animStyle, {
        width: 46, height: 46, borderRadius: 3,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: selected ? palette.graphite2 : palette.ink,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? palette.ochre : palette.line,
      }]}>
        <Glyph style={{ fontSize: 22 }} value={emoji} />
      </Reanimated.View>
    </Pressable>
  );
}

export default function PostGameScreen() {
  const rawParams = useLocalSearchParams();
  const { currentUsername } = usePlayer();
  const receipt = getCompletedMatch();
  if ((!rawParams.won && !rawParams.xpEarned) || !receipt || receipt.username !== currentUsername) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 520, gap: 16 }}>
          <Text accessibilityRole="header" style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, color: palette.paper }}>No results to show</Text>
          <Text accessibilityRole="alert" style={{ fontFamily: 'SourceSans3_400Regular', color: palette.paperDim, fontSize: 16, lineHeight: 24 }}>Results only appear right after a saved match. Refreshing or opening this page directly clears them. Your saved progress is on Profile.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 3, backgroundColor: palette.ochre }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', color: palette.ochreInk, fontSize: 17 }}>Return to Play</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return <PostGameContent />;
}

function PostGameContent() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const sfx = useSoundFX(settings.soundEnabled);
  const startingRematchRef = useRef(false);

  function handlePlayAgain() {
    if (startingRematchRef.current) return;
    startingRematchRef.current = true;
    if (!isArcade) startRematch();
    router.replace((isArcade ? '/arcade' : '/lobby') as never);
  }

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
  const { profile, unlockAchievement, earnQualifierPoints } = usePlayer();

  const completed = useRef(getCompletedMatch()).current;
  const won = completed?.won ?? params.won === '1';
  const position = completed?.position ?? parseInt(params.position ?? '4', 10);
  const deflections = completed?.deflections ?? parseInt(params.deflections ?? '0', 10);
  const goalsAgainst = completed?.goalsAgainst ?? parseInt(params.goalsAgainst ?? '0', 10);
  const xpEarned = completed?.xpEarned ?? parseInt(params.xpEarned ?? '0', 10);
  const coinsEarned = completed?.coinsEarned ?? parseInt(params.coinsEarned ?? '0', 10);
  const matchType   = completed?.matchType ?? 'casual';
  const isArcade    = matchType === 'arcade';
  const arcadeBest   = parseInt(params.arcadeBest ?? String(0), 10);
  const momentCount  = parseInt(params.momentCount ?? '0', 10);
  const levelBefore = completed?.levelBefore ?? profile.competitiveLevel ?? 1;
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
  const evColor   = params.evColor ?? '#EFBD3C';
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
  const qEventColor = params.qEventColor ?? '#EFBD3C';
  const isQualifier  = qPeriodKey.length > 0 && qRoundIdx >= 0;
  const qpEarnedThisMatch = isQualifier ? (qpPerPlace[Math.min(Math.max(position - 1, 0), 3)] ?? 0) : 0;

  // Daily challenge, only truthy when the match was seeded by the challenge config
  const challengeSeed  = params.challengeSeed ?? '';
  const matchNonce     = params.matchNonce    ?? '';
  const isChallengeRun = challengeSeed.length > 0 && matchNonce.length > 0;

  const levelAfter  = completed?.levelAfter ?? profile.competitiveLevel ?? 1;
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

  const previousXP = completed?.xpBefore ?? profile.xp;
  const rankInfo = xpForNextRank(previousXP);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const newXP = completed?.xpAfter ?? profile.xp;
  const newRank = (() => {
    let r = RANKS[0];
    for (const rank of RANKS) { if (newXP >= rank.minXP) r = rank; }
    return r;
  })();
  const previousRank = RANKS.reduce((rank, candidate) => previousXP >= candidate.minXP ? candidate : rank, RANKS[0]);
  const promoted = newRank.minXP > previousRank.minXP;

  // Ceremony overlay, initialized after `promoted` is computed
  const [showCeremony, setShowCeremony] = useState(promoted && !completed?.ceremonySeen);

  const topPad = insets.top;

  async function handleShare() {
    const posLabel = (['', '1st', '2nd', '3rd', '4th'])[position] ?? '4th';
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

    // Event rewards are persisted with the match before navigation, never on viewing results.

    // Award qualifier points if this was a qualifier match
    if (isQualifier && !getCompletedMatch()?.qualifierApplied) {
      updateCompletedMatch({ qualifierApplied: true });
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

  const positionLabels = ['', '1st', '2nd', '3rd', '4th'];
  const outcome = isArcade ? 'Run over'
    : won ? 'Victory' : position === 2 ? 'Runner-up' : position === 3 ? 'Third place' : 'Fourth place';
  const modeLabel = isArcade ? 'Solo arcade' : isChallengeRun ? 'Daily challenge' : matchType === 'ranked' ? 'Ranked match' : 'Casual match';
  const newBest = isArcade && arcadeBest > 0 && deflections >= arcadeBest;
  const stats: { label: string; value: string }[] = isArcade
    ? [{ label: 'Hits', value: String(deflections) }, { label: 'Best', value: String(arcadeBest) }]
    : [
        { label: 'Place', value: positionLabels[position] ?? '4th' },
        { label: 'Hits', value: String(deflections) },
        { label: 'Goals against', value: String(goalsAgainst) },
        { label: 'Account XP', value: `+${xpEarned}` },
        { label: 'Coins', value: `+${coinsEarned}` },
      ];

  return (
    <Reanimated.View entering={FadeIn.duration(250)} exiting={FadeOutDown.duration(200)} style={[styles.root, { backgroundColor: palette.ink }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: insets.bottom + 32 }]}
        >
        <View style={styles.column}>
        <ScreenTitle title="Match receipt" kicker="GoldRush Arena" />
        {/* ── Result header: outcome, stats, next actions (above the fold) ── */}
        <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }, won && !isArcade && { borderColor: palette.ochre }]}>
          <Text style={[styles.kicker, { color: tactile.paperMuted }]}>{modeLabel}</Text>
          <Text accessibilityRole="header" style={[styles.resultText, { color: tactile.paperInk }]}>{outcome}</Text>
          {newBest && <Text style={styles.resultSub}>New personal best</Text>}
          {isArcade && !newBest && arcadeBest > 0 && <Text style={styles.resultSub}>{arcadeBest - deflections} more hits to beat your best</Text>}
          <View style={styles.statsGrid}>
            {stats.map(st => (
              <View key={st.label} style={styles.statItem}>
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: card3Anim, gap: 10 }}>
          <Pressable
            onPress={handlePlayAgain}
            accessibilityRole="button"
            style={({ pressed }) => [styles.playAgainBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="refresh-cw" size={18} color={palette.ochreInk} />
            <Text style={styles.playAgainText}>{isArcade ? 'Retry arcade' : 'Play again'}</Text>
          </Pressable>
          <View style={styles.buttons}>
            <Pressable onPress={() => router.replace('/')} accessibilityRole="button" style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
              <Feather name="home" size={16} color={palette.paper} />
              <Text style={styles.secondaryText}>Home</Text>
            </Pressable>
            {!isArcade && (
              <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share result text" style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
                <Feather name="share-2" size={16} color={palette.paper} />
                <Text style={styles.secondaryText}>Share text</Text>
              </Pressable>
            )}
            {!isArcade && isChallengeRun && (
              <Pressable onPress={() => setShowShareCard(true)} accessibilityRole="button" style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
                <Feather name="target" size={16} color={palette.paper} />
                <Text style={styles.secondaryText}>Challenge card</Text>
              </Pressable>
            )}
          </View>
          {momentCount > 0 ? (
            <Pressable onPress={() => router.push('/match-highlights')} accessibilityRole="button" style={({ pressed }) => [styles.clipRow, pressed && { opacity: 0.85 }]}>
              <Feather name="film" size={18} color={palette.ochre} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clipTitle}>Match highlights</Text>
                <Text style={styles.clipSub}>{momentCount} moment{momentCount > 1 ? 's' : ''} from this match · kept until you leave or play again</Text>
              </View>
              <Feather name="chevron-right" size={18} color={palette.paper} />
            </Pressable>
          ) : highlightClip ? (
            <Pressable onPress={() => router.push('/clip-viewer')} accessibilityRole="button" style={({ pressed }) => [styles.clipRow, pressed && { opacity: 0.85 }]}>
              <Feather name="film" size={18} color={palette.ochre} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clipTitle}>Your captured clip</Text>
                <Text style={styles.clipSub}>Trim, caption and save it to this device</Text>
              </View>
              <Feather name="chevron-right" size={18} color={palette.paper} />
            </Pressable>
          ) : null}
        </Animated.View>

        {/* ── Progress: three separate systems, labelled plainly ── */}
        {!isArcade && (
          <Animated.View style={[styles.card, { opacity: card2Anim }]}>
            <Text style={styles.cardTitle}>What this match changed</Text>

            <View style={styles.progRow}>
              <View style={styles.progHead}>
                <Text style={styles.progName}>Account XP and XP rank</Text>
                <Text style={styles.progVal}>+{xpEarned}</Text>
              </View>
              {showXP && (
                <View style={styles.xpTrack}>
                  <Animated.View style={[styles.xpFill, { width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                </View>
              )}
              <Text style={styles.progSub}>
                Account level {xpToLevel(previousXP)} to {xpToLevel(newXP)} · {newXP} XP total · XP rank {promoted ? `${previousRank.name} to ${newRank.name}` : newRank.name}. Casual and ranked matches both earn account XP, which also moves your XP rank.
              </Text>
              {promoted && (
                <Reanimated.View entering={ZoomIn.duration(300).delay(600)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <RankBadge rank={newRank.name} size="sm" showLabel={false} />
                  <Text style={[styles.progName, { color: palette.charcoal }]}>Promoted to {newRank.name}</Text>
                </Reanimated.View>
              )}
            </View>

            <View style={styles.progRow}>
              <View style={styles.progHead}>
                <Text style={styles.progName}>Competitive level</Text>
                <Text style={[styles.progVal, levelDelta > 0 && { color: palette.charcoal }, levelDelta < 0 && { color: palette.slate }]}>
                  {matchType === 'ranked' ? `${levelBefore} to ${levelAfter} / 50` : `${levelBefore} / 50`}
                </Text>
              </View>
              <Text style={styles.progSub}>
                {matchType === 'ranked'
                  ? (levelDelta === 0 ? 'No change this match. Only ranked placement against your lobby moves it.' : `${levelDelta > 0 ? '+' : ''}${levelDelta} from your ranked placement against this lobby.`)
                  : 'Unchanged. Only ranked matches move competitive level.'}
              </Text>
            </View>

            <View style={[styles.progRow, { borderBottomWidth: 0 }]}>
              <View style={styles.progHead}>
                <Text style={styles.progName}>{CURRENT_SEASON.label} pass points</Text>
                <Text style={styles.progVal}>{profile.battlePassPoints ?? 0}</Text>
              </View>
              <Text style={styles.progSub}>Matches do not add pass points directly. They count toward quests; claim finished quests on the Pass screen to earn points.</Text>
              <Pressable onPress={() => router.push('/trophyroad' as never)} accessibilityRole="button" style={styles.linkBtn}>
                <Text style={styles.linkText}>Open Pass and quests</Text>
                <Feather name="chevron-right" size={16} color={palette.ochre} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Event bonus card */}
        {hasEvent && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Included in totals · {evName}</Text>
            {evXP > 0 && <BonusLine icon="star" label="Bonus account XP" value={`+${evXP}`} />}
            {evCoins > 0 && <BonusLine icon="disc" label="Bonus coins" value={`+${evCoins}`} />}
            {evCredits > 0 && <BonusLine icon="zap" label="Credits" value={`+${evCredits}`} />}
          </View>
        )}

        {/* Qualifier result card */}
        {isQualifier && qualResult && (
          <View style={[styles.card, qualResult.advanced && { borderColor: palette.ochre }]}>
            <Text style={styles.cardTitle}>{qualResult.advanced ? 'Qualified' : 'Qualifier points'} · {qEventName || qRoundName}</Text>
            <BonusLine icon="plus" label="Earned this match" value={`+${qualResult.qpEarned} QP`} />
            <BonusLine icon="bar-chart-2" label={`Total in ${qRoundName}`} value={`${qualResult.totalQP} / ${qThreshold} QP`} />
            {qualResult.advanced && qualResult.nextRoundName.length > 0 && (
              <BonusLine icon="arrow-right" label={`Advanced to ${qualResult.nextRoundName}`} value="" />
            )}
            {!qualResult.advanced && qualResult.totalQP < qThreshold && (
              <BonusLine icon="target" label={`Need ${qThreshold - qualResult.totalQP} more QP to advance`} value="" />
            )}
          </View>
        )}

        {/* Reward multiplier breakdown */}
        {hasBonus && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reward multipliers</Text>
            <BonusLine icon="sliders"
              label={matchType === 'casual' ? 'Casual mode' : variant === 'six_player' ? '6-player' : variant === 'chaos' ? 'Chaos mode' : variant === 'rumble' ? 'Rumble mode' : 'Ranked classic'}
              value={`${diffMult < 1 ? '−' : '+'}${Math.round(Math.abs(diffMult - 1) * 100)}%`} />
            {streakMult > 1.0 && (
              <BonusLine icon="trending-up" label={`${winStreak + 1}-win streak`} value={`+${Math.round((streakMult - 1) * 100)}%`} />
            )}
            <BonusLine icon="x" label="Total multiplier" value={`${(streakMult * diffMult).toFixed(2)}×`} strong />
          </View>
        )}

        {/* Daily challenge result */}
        {!isArcade && isChallengeRun && dailySeed.length > 0 && deflections > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily challenge · seed {dailySeed}</Text>
            <BonusLine icon="target" label="Today's score" value={`${deflections} hits`} />
            {challengePB !== null && (
              <BonusLine icon="award" label={deflections >= challengePB ? 'Personal best (new)' : 'Personal best'} value={`${challengePB} hits`} />
            )}
            {challengeRank !== null && challengeTotal > 1 && (
              <BonusLine icon="list" label="Today's challenge position" value={`#${challengeRank} of ${challengeTotal}`} />
            )}
          </View>
        )}

        {/* Achievement unlock */}
        {newAchievement && (
          <View style={[styles.card, styles.rowCard, { borderColor: palette.ochre }]}>
            <Feather name="award" size={20} color={palette.ochre} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Achievement unlocked</Text>
              <Text style={styles.progName}>{newAchievement}</Text>
            </View>
          </View>
        )}

        {/* Win streak Gold Strike reward */}
        {(() => {
          if (!won || winStreak <= 0 || winStreak % 5 !== 0) return null;
          const pendingId = profile.pendingStreakLuckyBlockId;
          const block = pendingId ? (profile.luckyBlocks ?? []).find(b => b.id === pendingId) ?? null : null;
          if (!block) return null;
          const meta = LUCKY_BLOCK_META[block.tier];
          return (
            <Pressable onPress={() => setActiveLuckyBlock(block)} accessibilityRole="button"
              style={({ pressed }) => [styles.card, styles.rowCard, { borderColor: meta.color }, pressed && { opacity: 0.85 }]}>
              <Feather name="box" size={22} color={meta.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{winStreak}-win streak reward</Text>
                <Text style={styles.progName}>{meta.name} · tap to open</Text>
              </View>
              <Feather name="chevron-right" size={18} color={palette.paper} />
            </Pressable>
          );
        })()}

        {/* Reaction strip: local only, never sent to other players */}
        {!isArcade && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your reaction (shown only to you)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EMOTES.map(emote => (
                <EmoteButton key={emote} emoji={emote} selected={selectedEmote === emote} onPress={() => setSelectedEmote(emote)} />
              ))}
            </View>
          </View>
        )}

        {profile.winStreak > 1 && !activeLuckyBlock && (
          <Text style={styles.streakText}>{profile.winStreak} win streak</Text>
        )}
        </View>
        </ScrollView>
      </Animated.View>
      {activeLuckyBlock && (
        <LuckyBlockOpener block={activeLuckyBlock} onClose={() => setActiveLuckyBlock(null)} />
      )}

      {/* Rank promotion ceremony overlay */}
      <RankCeremonyOverlay
        newRank={newRank.name}
        visible={showCeremony}
        onDismiss={() => { updateCompletedMatch({ ceremonySeen: true }); setShowCeremony(false); }}
      />

      {/* Share card, only rendered for non-arcade challenge runs */}
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

function BonusLine({ icon, label, value, strong }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.bonusRow}>
      <Feather name={icon} size={15} color={palette.muted} />
      <Text style={[styles.bonusLabel, strong && { fontFamily: 'SourceSans3_700Bold' }]}>{label}</Text>
      {value ? <Text style={styles.bonusMult}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  resultCard: { borderWidth: 2, borderColor: tactile.brassEdge, backgroundColor: tactile.paperPanel, borderRadius: 0, padding: 16, gap: 4 },
  kicker: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: palette.muted, letterSpacing: 1 },
  resultText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 44, lineHeight: 48 },
  resultSub: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 15, color: tactile.paperMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, rowGap: 8 },
  statItem: { minWidth: 96, flexGrow: 1, flexBasis: '18%' },
  statValue: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, color: tactile.paperInk },
  statLabel: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: tactile.paperMuted },
  playAgainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: 3, backgroundColor: palette.ochre },
  playAgainText: { color: palette.ochreInk, fontFamily: 'SourceSans3_700Bold', fontSize: 17 },
  buttons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondaryBtn: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 3, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 12 },
  secondaryText: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },
  clipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 3, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite },
  clipTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },
  clipSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.paperDim },
  card: { borderRadius: 0, borderWidth: 2, borderColor: palette.lineStrong, backgroundColor: palette.graphite, padding: 14, gap: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.muted, letterSpacing: 0.5 },
  progRow: { gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.line },
  progHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  progName: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.paper },
  progVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, color: palette.charcoal },
  progSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, color: palette.paperDim },
  xpTrack: { height: 8, borderRadius: 2, overflow: 'hidden', backgroundColor: palette.ink },
  xpFill: { height: '100%', backgroundColor: palette.ochre },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  linkText: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.charcoal },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  bonusLabel: { flex: 1, fontFamily: 'SourceSans3_400Regular', fontSize: 15, color: palette.paper },
  bonusMult: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: palette.paper },
  streakText: { textAlign: 'center', fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: palette.paperDim },
});
