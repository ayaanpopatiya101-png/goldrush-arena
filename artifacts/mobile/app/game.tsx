import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Animated, View, useWindowDimensions } from 'react-native';
import Reanimated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameArena, type GameMode, type GameResult } from '@/components/GameArena';
import { BackgroundMusicButton, useBackgroundMusic } from '@/components/BackgroundMusic';
import { usePlayer, getMap, getRankIndex, MAX_RANK_INDEX, RANKS, MAPS, getStreakMultiplier, getDifficultyMultiplier, levelFromRank } from '@/context/PlayerContext';
import { getGameConfig, hasGameConfig, updateGameConfig, getActiveEvent, clearActiveEvent, getQualifierContext, clearQualifierContext } from '@/store/gameSession';
import { recordRoundResult, getGauntletState } from '@/store/gauntletSession';
import { useSettings } from '@/hooks/useSettings';
import { useHighlightCapture } from '@/hooks/useHighlightCapture';
import { setPendingClip, getPendingClip } from '@/store/highlightClip';
import { computeClipScore, getClipTier } from '@/utils/clipRewards';
import { startMatchTracking, getCurrentMatchId, recordMatchEvent, getBestMatchEvents } from '@/store/matchEvents';
import { saveClipToLibrary } from '@/store/clipLibrary';
import { trackEvent } from '@/utils/analytics';
import { clearCompletedMatch } from '@/store/completedMatch';
import { Button } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import OnlineMatch from '@/components/multiplayer/OnlineMatch';

const BOT_NAMES  = ['Blaze_99', 'IceQueen', 'Venom_X', 'ShadowFox', 'CyberWolf'];
const BOT_RANKS  = ['Gold', 'Platinum', 'Diamond', 'Master 1', 'Master 2'];
const BOT_COLORS = ['#B4533A',  '#8C8F7A',  '#6F8A5B', '#C99A2E',   '#8C8F7A'];

const VARIANT_PROPS: Record<string, {
  initialLives?: number;
  startingBallCount?: number;
  ballSpawnFrames?: number;
  noPowerups?: boolean;
  startSpeedMult?: number;
  duoMode?: boolean;
  sixPlayer?: boolean;
  phantomBalls?: boolean;
  playerBonusLives?: number;
  maxSkillBots?: boolean; // game.tsx only, forces botSkill to 1.0
}> = {
  classic:       {},
  duos:          { duoMode: true },
  blitz:         { initialLives: 1, startingBallCount: 2, ballSpawnFrames: 600, startSpeedMult: 1.5 },
  chaos:         { initialLives: 3, startingBallCount: 5, ballSpawnFrames: 300, noPowerups: true, startSpeedMult: 1.2 },
  survival:      { initialLives: 12, ballSpawnFrames: 300 },
  sudden_death:  { initialLives: 1, startingBallCount: 3, ballSpawnFrames: 240, noPowerups: true, startSpeedMult: 2.0 },
  turbo:         { ballSpawnFrames: 480, startSpeedMult: 1.8 },
  pinball:       { ballSpawnFrames: 180 },
  six_player:    { sixPlayer: true, initialLives: 4, ballSpawnFrames: 600 },
  // ── Elite rank-gated modes ────────────────────────────────────────────────
  storm_surge:    { initialLives: 1, startingBallCount: 3, startSpeedMult: 1.6, ballSpawnFrames: 420, maxSkillBots: true },
  ghost_protocol: { initialLives: 2, startingBallCount: 2, startSpeedMult: 1.1, phantomBalls: true },
  warlord:        { sixPlayer: true, initialLives: 3, playerBonusLives: 5, startSpeedMult: 1.3, maxSkillBots: true },
};

const MODE_LABELS: Record<GameMode, string> = { square:'4-PLAYER', triangle:'3-PLAYER', duel:'1v1' };
const MODE_COLORS: Record<GameMode, string> = { square:'#C99A2E', triangle:'#6F8A5B', duel:'#B4533A' };

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function GameScreen() {
  if (getGameConfig().onlineMatchId) return <OnlineMatch />;
  return <OfflineGameScreen />;
}
function OfflineGameScreen() {
  const { width, height } = useWindowDimensions();
  const insets   = useSafeAreaInsets();
  const { addMatchResult, profile, consumeExtraLives } = usePlayer();
  const config   = getGameConfig();
  const countdownComplete = useRef(Boolean(config.countdownComplete)).current;
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  useEffect(() => { updateGameConfig({ countdownComplete: false }); }, []);
  const music    = useBackgroundMusic();
  const { settings } = useSettings();

  const topPad    = insets.top + 4;
  const bottomPad = insets.bottom;
  // Court is square: fit it to both width and the height left after the grouped HUD
  // (top bar 48, scoreboard 50, you-row 36, legend 28, web hint 20, margins 16).
  const chromeH   = 48 + 50 + 36 + 28 + (Platform.OS === 'web' ? 20 : 0) + 16;
  const arenaSize = Math.floor(Math.max(240, Math.min(width - 16, height - topPad - bottomPad - chromeH, 560)));

  const variantCfg = VARIANT_PROPS[config.variant ?? 'classic'] ?? {};

  // Resolve the equipped relic, selected map, and rank-based bot skill.
  // Final rank-gate (defense-in-depth): never honor a relic/map the player's rank
  // hasn't unlocked, even if a stale/corrupt session id slips through the UI gates.
  const playerRankIdx = getRankIndex(profile.rank);

  // Generate ±1 rank slots for each bot, computed once on mount so the
  // opponents don't shuffle on every re-render.  Lobby path overrides these
  // with matchmaker-assigned ranks via config.opponentRanks.
  const generatedBotRanks = useMemo(() =>
    Array.from({ length: 5 }, () => {
      const offset = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
      const idx    = Math.max(0, Math.min(MAX_RANK_INDEX, playerRankIdx + offset));
      return RANKS[idx]?.name ?? profile.rank;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [], // compute once per game mount
  );

  const rawMap   = getMap(config.mapId);
  const map      = rawMap.unlockRankIndex <= playerRankIdx ? rawMap : MAPS[0];

  // ── Bot difficulty curve ──────────────────────────────────────────────────
  // Training window (first 5 games): always easy, skill locked at 0.
  // Ramp window (games 5–14): skill climbs smoothly from 0 → full rank value.
  // After 15 games: full rank-based skill, matchType determines easy/normal.
  const NEW_PLAYER_GAMES = 5;
  const RAMP_GAMES       = 10;
  const isTraining  = profile.totalGames < NEW_PLAYER_GAMES;
  const rankSkill   = playerRankIdx / MAX_RANK_INDEX;
  const botSkill    = (() => {
    if (isTraining) return 0;
    const ramp = Math.min(1, (profile.totalGames - NEW_PLAYER_GAMES) / RAMP_GAMES);
    return rankSkill * ramp;
  })();

  // ── Challenge mode: all player-progression variables are locked out so every
  // player faces identical conditions regardless of rank, relic, or inventory.
  const isChallenge = Boolean(config.challengeSeed);

  // For challenge, ignore the equipped map and always use the default arena
  // (no terrain modifiers that could affect ball physics).
  const effectiveMap = isChallenge ? MAPS[0] : map;
  const mapMods      = effectiveMap.mods ?? {};

  const { maxSkillBots, ...variantCfgRest } = variantCfg;
  const effectiveBotSkill = maxSkillBots ? 1.0 : botSkill;
  const bankLivesUsed = Math.max(0, config.bankLivesUsed ?? 0);

  const mergedCfg = {
    ...variantCfgRest,
    startSpeedMult:   isChallenge
                        ? (config.challengeStartSpeedMult ?? variantCfgRest.startSpeedMult ?? mapMods.startSpeedMult)
                        : (variantCfgRest.startSpeedMult  ?? mapMods.startSpeedMult),
    rampRate:         isChallenge ? config.challengeRampRate : undefined,
    rngSeed:          isChallenge ? config.challengeSeedHash : undefined,
    ballSpawnFrames:  variantCfgRest.ballSpawnFrames ?? mapMods.ballSpawnFrames,
    // Challenge: disable power-ups entirely so extra-life pickups can't break
    // the 1-life rule and so scores aren't affected by different power-up luck.
    noPowerups:       isChallenge ? true : (variantCfgRest.noPowerups ?? mapMods.noPowerups),
    // Challenge: locked config, 1 life (one miss ends the run), no bank lives.
    // This overrides the survival variant's default 12 lives so every challenger
    // faces identical starting conditions regardless of inventory.
    initialLives:     isChallenge ? 1 : variantCfgRest.initialLives,
    playerBonusLives: isChallenge ? 0 : ((variantCfgRest.playerBonusLives ?? 0) + bankLivesUsed),
  };

  const [gameOver,     setGameOver]     = useState(false);
  const [gameMode,     setGameMode]     = useState<GameMode>('square');
  const [playerLives,  setPlayerLives]  = useState(variantCfg.initialLives ?? 5);
  const [seatLives, setSeatLives] = useState<number[]>([]);
  const [activeBalls,  setActiveBalls]  = useState(1);
  const [paused,       setPaused]       = useState(false);
  const [timerSecs,    setTimerSecs]    = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const modePulse         = useRef(new Animated.Value(1)).current;
  const musicStarted      = useRef(false);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const arenaWrapRef      = useRef<View>(null);
  const clipScoreRef      = useRef(0);
  const [captureStarted, setCaptureStarted] = useState(false);
  const [clipSaved,      setClipSaved]      = useState(false);

  // Highlight clip capture (no-op on web via platform file split)
  const { startCapture, triggerHighlight, snapshotClip, stopAndGetClip } = useHighlightCapture();

  // Training period always forces easy bots; after that matchType decides.
  const botDifficulty: 'easy' | 'normal' = isTraining || config.matchType === 'casual' ? 'easy' : 'normal';

  useEffect(() => {
    music.setMuted(!settings.musicEnabled);
  }, [settings.musicEnabled]);

  // Pause automatically when the player switches away from the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' && !gameOver) setPaused(true);
    });
    return () => sub.remove();
  }, [gameOver]);

  useEffect(() => {
    if (timerRunning && !paused && !gameOver) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, paused, gameOver]);

  const prevModeRef = useRef<GameMode>('square');
  function handleGameModeChange(mode: GameMode) {
    if (mode !== prevModeRef.current) {
      prevModeRef.current = mode;
      setGameMode(mode);
    }
  }

  function handleLivesChange(lives: number) {
    setPlayerLives(lives);
  }

  function handleGameStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    setTimerRunning(true);
    startCapture(arenaWrapRef as any);
    setCaptureStarted(true);
    startMatchTracking(); // begin the per-match event log
    trackEvent('match_started', {
      match_type: config.matchType ?? 'casual',
      variant: config.variant ?? 'classic',
      challenge: isChallenge,
      bank_lives: bankLivesUsed,
    });
    // Deduct the chosen bank lives, consumed once at match start, non-refundable
    if (!config.practice && bankLivesUsed > 0) consumeExtraLives(bankLivesUsed);
  }

  function handleHighlight(type: 'multi_block' | 'near_death' | 'hot_streak') {
    // Snapshot clip score at the moment the highlight fires
    const cs = computeClipScore(activeBalls, playerLives);
    clipScoreRef.current = cs;
    triggerHighlight(type);
    // Also log it in the multi-clip event store
    const frames = snapshotClip();
    if (frames) recordMatchEvent(type, frames, cs);
  }

  function handleManualRecord() {
    const frames = snapshotClip();
    if (!frames || frames.length < 4) return;
    const cs = computeClipScore(activeBalls, playerLives);
    clipScoreRef.current = cs;
    recordMatchEvent('manual', frames, cs); // log to event store
    setPendingClip(frames, 'manual', 0, cs); // keep single-clip fallback
    setClipSaved(true);
    setTimeout(() => setClipSaved(false), 2000);
  }

  function ensureMusic() {
    if (!musicStarted.current && settings.musicEnabled) {
      musicStarted.current = true;
      music.start();
    }
  }

  useEffect(() => {
    return () => {
      music.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(modePulse, { toValue: 1.18, duration: 180, useNativeDriver: true }),
      Animated.timing(modePulse, { toValue: 1,    duration: 280, useNativeDriver: true }),
    ]).start();
  }, [gameMode]);

  async function handleGameOver(result: GameResult) {
    if (completedRef.current) return;
    completedRef.current = true;
    if (config.practice) { router.replace('/practice'); return; }
    clearCompletedMatch();
    // Store the best clip for the post-game share button (no-op on web)
    const hlClip = stopAndGetClip();
    const existing = getPendingClip();
    if (existing?.type === 'manual') {
      // Player manually triggered, preserve their clip, just attach the final score
      setPendingClip(existing.frames, 'manual', result.deflections, existing.clipScore);
    } else if (hlClip) {
      // Auto-highlight, use the clip-score captured at trigger time
      setPendingClip(hlClip.frames, hlClip.type, result.deflections, clipScoreRef.current);
    }

    // ── Auto-save top match moments to the clip library ───────────────────────
    const bestEvents   = getBestMatchEvents(5);
    const matchId      = getCurrentMatchId();
    const momentCount  = bestEvents.length;
    // Save the top 3 worth-saving clips in the background (no GIF yet, encoded lazily in viewer)
    bestEvents.slice(0, 3).forEach(ev => {
      if (ev.clipScore < 25) return; // skip very low-quality moments
      const { label: tierLabel, color: tierColor } = getClipTier(ev.clipScore);
      saveClipToLibrary({
        frames:    ev.frames,
        gifBase64: '',            // encoded lazily when the user opens the clip
        type:      ev.type,
        score:     result.deflections,
        clipScore: ev.clipScore,
        tier:      tierLabel,
        tierColor,
        matchId,
        autoSaved: true,
      }).catch(() => {});
    });

    setGameOver(true);
    setTimerRunning(false);
    music.stop();
    const matchType   = config.matchType ?? 'casual';
    const variant     = config.variant ?? 'classic';
    trackEvent('match_completed', {
      won: result.won,
      position: result.position,
      deflections: result.deflections,
      goals_against: result.goalsAgainst,
      match_type: matchType,
      variant,
      challenge: isChallenge,
    });
    const streakMult  = getStreakMultiplier(profile.winStreak, result.won);
    const diffMult    = getDifficultyMultiplier(variant, matchType);
    const totalMult   = streakMult * diffMult;
    let finalXP       = Math.round(result.xpEarned * totalMult);
    let finalCoins    = Math.round(result.coinsEarned * totalMult);

    // Resolve the 3 opponent ranks (matchmaker or generated), convert to 1–50 skill levels
    // so calcTrueSkillDelta can weight the outcome by lobby strength.
    const resolvedBotRanks = (config.opponentRanks?.length ? config.opponentRanks : generatedBotRanks).slice(0, 3);
    const opponentLevels   = resolvedBotRanks.map(r => levelFromRank(r));

    // ── Gauntlet round completion ─────────────────────────────────────────────
    if (matchType === 'gauntlet') {
      const { gauntletWon, gauntletOver } = recordRoundResult(result.won, finalXP, finalCoins);
      // One-time champion bonus on the winning round
      if (gauntletWon) { finalXP += 1500; finalCoins += 300; }
      try {
        await addMatchResult({
          won: result.won, xpEarned: finalXP, coinsEarned: finalCoins,
          deflections: result.deflections, goalsAgainst: result.goalsAgainst,
          position: result.position, matchType: 'casual', opponentLevels,
        });
      } catch {
        setCompletionError('Saving this round could not be confirmed. Check device storage and your Profile before playing again. Results are unavailable to avoid showing unconfirmed rewards.');
        return;
      }
      const gs = getGauntletState();
      router.replace({
        pathname: '/gauntlet',
        params: {
          roundWon:     result.won ? '1' : '0',
          gauntletWon:  gauntletWon  ? '1' : '0',
          gauntletOver: gauntletOver ? '1' : '0',
          xpEarned:     String(finalXP),
          coinsEarned:  String(finalCoins),
          completedRound: String(gs.roundNumber - 1),
        },
      });
      return;
    }

    // ── Normal match completion ───────────────────────────────────────────────
    // Local bots and offline variants never change competitive human-match rating.
    const mt = 'casual' as const;
    const ev   = getActiveEvent();
    clearActiveEvent();
    const qCtx = getQualifierContext();
    clearQualifierContext();
    const evXP      = ev ? (result.won ? ev.winXP      : ev.loseXP)      : 0;
    const evCoins   = ev ? (result.won ? ev.winCoins   : ev.loseCoins)   : 0;
    const evCredits = ev ? (result.won ? ev.winCredits : ev.loseCredits) : 0;
    try {
      await addMatchResult({
        won: result.won, xpEarned: finalXP, coinsEarned: finalCoins,
        deflections: result.deflections, goalsAgainst: result.goalsAgainst,
        position: result.position, matchType: mt, opponentLevels,
        eventBonus: { xp: evXP, coins: evCoins, credits: evCredits },
      });
    } catch {
      setCompletionError('Saving this match could not be confirmed. Check device storage and your Profile before playing again. Results are unavailable to avoid showing unconfirmed rewards.');
      return;
    }
    router.replace({
      pathname: '/postgame',
      params: {
        won: result.won ? '1' : '0',
        position: String(result.position),
        deflections: String(result.deflections),
        // Challenge context, only non-empty when the match was seeded by the daily challenge
        challengeSeed: config.challengeSeed ?? '',
        matchNonce:    config.matchNonce    ?? '',
        goalsAgainst: String(result.goalsAgainst),
        xpEarned: String(finalXP),
        coinsEarned: String(finalCoins),
        matchType: mt,
        levelBefore: String(profile.competitiveLevel),
        streakMult: String(streakMult),
        diffMult: String(diffMult),
        winStreak: String(profile.winStreak),
        variant,
        evXP: String(evXP),
        evCoins: String(evCoins),
        evCredits: String(evCredits),
        evName:  ev?.eventName  ?? '',
        evEmoji: ev?.eventEmoji ?? '',
        evColor: ev?.eventColor ?? '',
        // Qualifier context, non-empty when this was a qualifier match
        qPeriodKey:   qCtx?.periodKey    ?? '',
        qRoundIdx:    String(qCtx?.roundIdx    ?? -1),
        qRoundName:   qCtx?.roundName    ?? '',
        qTotalRounds: String(qCtx?.totalRounds ?? 0),
        qThreshold:   String(qCtx?.threshold   ?? 0),
        qpFor1:       String(qCtx?.qpPerPlace[0] ?? 0),
        qpFor2:       String(qCtx?.qpPerPlace[1] ?? 0),
        qpFor3:       String(qCtx?.qpPerPlace[2] ?? 0),
        qpFor4:       String(qCtx?.qpPerPlace[3] ?? 0),
        qEventName:   qCtx?.eventName   ?? '',
        qEventEmoji:  qCtx?.eventEmoji  ?? '',
        qEventColor:  qCtx?.eventColor  ?? '',
        // Match highlights, multi-clip auto-detected moments
        momentCount:       String(momentCount),
        matchHighlightsId: matchId,
      },
    });
  }

  const modeColor = MODE_COLORS[gameMode];
  const isWeb = Platform.OS === 'web';
  const configured = hasGameConfig();

  // Web keyboard: Escape or P toggles pause. Paddle movement stays pointer-driven.
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPaused(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWeb, gameOver]);

  // Move keyboard focus to Resume when the pause dialog opens (web).
  const resumeRef = useRef<View>(null);
  useEffect(() => {
    if (!paused || !isWeb) return;
    const t = setTimeout(() => { (resumeRef.current as unknown as { focus?: () => void } | null)?.focus?.(); }, 50);
    return () => clearTimeout(t);
  }, [paused, isWeb]);

  if (!configured) {
    return (
      <View style={[styles.stateRoot, { paddingTop: insets.top + 24 }]}>
        <View style={styles.stateCard}>
          <Text accessibilityRole="header" style={styles.stateTitle}>No match is set up</Text>
          <Text style={styles.stateBody}>
            This screen only runs a match started from Play, a lobby, an event or a challenge. Opening it directly, or refreshing the page, clears that setup, so nothing was started and nothing was recorded.
          </Text>
          <Button label="Go to Play" size="lg" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  if (completionError) {
    return (
      <View style={[styles.stateRoot, { paddingTop: topPad + 24 }]}>
        <View style={styles.stateCard}>
          <Text accessibilityRole="header" style={styles.stateTitle}>Match save unavailable</Text>
          <Text accessibilityRole="alert" style={styles.stateBody}>{completionError}</Text>
          <Button label="Return to Play" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  const seats = isChallenge ? ['SOUTH'] : mergedCfg.sixPlayer ? ['SOUTH L', 'NORTH L', 'WEST', 'EAST', 'SOUTH R', 'NORTH R'] : ['SOUTH', 'NORTH', 'WEST', 'EAST'];
  const isGauntletRun = config.matchType === 'gauntlet';

  return (
    <Reanimated.View entering={SlideInRight.duration(260)} exiting={SlideOutRight.duration(220)} style={[styles.root, { paddingTop: topPad }]} onTouchStart={ensureMusic}>
      <View style={[styles.column, { width: arenaSize }]}>
        {/* Top bar: controls and match clock, grouped to the court width */}
        <View style={styles.hud}>
          <Pressable accessibilityRole="button" accessibilityLabel="Pause match" testID="pause-match" onPress={() => setPaused(true)} style={styles.iconBtn}>
            <Feather name="pause" size={20} color={palette.paper} />
          </Pressable>
          <Animated.View style={[styles.modeChip, { borderColor: modeColor, transform: [{ scale: modePulse }] }]}>
            <Text style={[styles.modeText, { color: palette.paper }]}>{MODE_LABELS[gameMode]}</Text>
          </Animated.View>
          <View style={styles.stat} accessibilityLabel={`Time ${fmtTime(timerSecs)}`}>
            <Feather name="clock" size={12} color={palette.muted} />
            <Text style={styles.statText}>{fmtTime(timerSecs)}</Text>
          </View>
          <View style={styles.stat} accessibilityLabel={`${activeBalls} pucks in play`}>
            <View style={[styles.ballDot, { backgroundColor: activeBalls > 1 ? palette.ochre : palette.muted }]} />
            <Text style={styles.statText}>{activeBalls}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {captureStarted && !gameOver && (
            <Pressable onPress={handleManualRecord} style={styles.iconBtn} hitSlop={8}
              accessibilityRole="button" accessibilityLabel={clipSaved ? 'Moment captured' : 'Capture this moment'}>
              <Feather name={clipSaved ? 'check' : 'video'} size={18} color={clipSaved ? palette.moss : palette.paper} />
            </Pressable>
          )}
          <BackgroundMusicButton muted={music.muted} onToggle={music.setMuted} />
        </View>

        {/* Scoreboard: lives per seat */}
        <View style={styles.board} accessibilityLabel="Lives per seat. You control South; every other seat is a local bot.">
          {seats.map((seat, i) => (
            <View key={seat} style={[styles.boardCell, i === seats.length - 1 && { borderRightWidth: 0 }, i === 0 && styles.boardYou]}>
              <Text style={[styles.boardSeat, i === 0 && { color: palette.ochreInk }]}>{i === 0 ? 'YOU' : 'BOT'} · {seat}</Text>
              <Text style={[styles.boardLives, i === 0 && { color: palette.ochreInk }]}>{seatLives[i] ?? (variantCfg.initialLives ?? 5)}</Text>
            </View>
          ))}
        </View>

        {/* Court */}
        <View style={{ width: arenaSize, height: arenaSize }}>
          {!gameOver && (
            /* arenaWrapRef, used by useHighlightCapture to screen-capture frames */
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <View ref={arenaWrapRef as any} style={{ alignSelf: 'stretch' }}>
            <GameArena
              arenaSize={arenaSize}
              courtStyle={map?.id === MAPS[0]?.id ? 'tactile' : 'classic'}
              playerName={config.playerName}
              playerColor={config.playerColor}
              playerGlowColor={config.playerGlowColor}
              botNames={config.opponentNames ?? BOT_NAMES}
              // Challenge: soloMode pre-eliminates bots in GameArena's state init;
              // passing [] for botRanks is belt-and-suspenders (provides empty fallbacks).
              soloMode={isChallenge}
              botRanks={isChallenge ? [] : (config.opponentRanks ?? generatedBotRanks)}
              onGameOver={handleGameOver}
              onGameModeChange={handleGameModeChange}
              onPlayerLivesChange={handleLivesChange}
              onSeatLivesChange={setSeatLives}
              onEliminatedSpectating={() => {}}
              colorBoard={false}
              soundEnabled={settings.soundEnabled}
              sensitivity={settings.sensitivity}
              onActiveBallsChange={setActiveBalls}
              botDifficulty={botDifficulty}
              onGameStart={handleGameStart}
              skipCountdown={countdownComplete}
              paused={paused}
              playerRelic={undefined}
              botSkill={isChallenge ? 0 : effectiveBotSkill}
              arenaBg={map?.arenaBg}
              playerSuperType={profile.selectedSuper ?? 1}
              practice={config.practice}
              onHighlight={handleHighlight}
              {...mergedCfg}
            />
            </View>
          )}
          <View pointerEvents="none" style={styles.courtFrame} />
        </View>

        {/* Persistent "you" marker directly under the South goal */}
        <View style={styles.youRow}>
          <Feather name="chevron-up" size={16} color={palette.ochre} />
          <View style={[styles.labelDot, { backgroundColor: config.playerColor }]} />
          <Text style={styles.youText} numberOfLines={1}>YOU · {config.playerName} · South paddle</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.livesLabel}>LIVES</Text>
          <Text style={[styles.livesVal, playerLives <= 0 && { color: palette.clay }]}>{playerLives > 0 ? playerLives : 'OUT'}</Text>
        </View>
        {playerLives <= 0 && !gameOver && (
          <Text style={styles.outNote}>{isGauntletRun ? 'You are out of this round. The bots finish it, then your Gauntlet run continues.' : 'You are out. The bots finish the match, then results open.'}</Text>
        )}

        {/* Power-up legend: matches the letters on court pickups */}
        <View style={styles.legend} accessibilityLabel="Pickup legend: SHD shield, SPD speed, SHK shrink rivals, plus 1 extra life, MLB multiball">
          {[
            { c: '#EFBD3C', l: 'SHD', d: 'Shield' }, { c: '#9BB77A', l: 'SPD', d: 'Speed' },
            { c: '#CE7863', l: 'SHK', d: 'Shrink rivals' }, { c: '#EFBD3C', l: '+1', d: 'Life' },
            { c: '#EDE3CC', l: 'MLB', d: 'Multiball' },
          ].map(pu => (
            <View key={pu.l} style={styles.puLegend}>
              <Text style={[styles.puKey, { borderColor: pu.c, color: pu.c }]}>{pu.l}</Text>
              <Text style={styles.puLabel}>{pu.d}</Text>
            </View>
          ))}
        </View>
        {isWeb && (
          <Text style={styles.hint}>Drag with the mouse or a finger inside the court to move your paddle. Esc or P pauses.</Text>
        )}
      </View>

      {/* Pause dialog: opaque, explicit consequences */}
      <Modal visible={paused} transparent animationType="none" onRequestClose={() => setPaused(false)}>
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard} accessibilityViewIsModal accessibilityRole="alert">
            <Text style={styles.pauseTitle} accessibilityRole="header">Paused</Text>
            <View style={styles.pauseStats}>
              {[
                { v: fmtTime(timerSecs), l: 'TIME' },
                { v: String(Math.max(0, playerLives)), l: 'LIVES' },
                { v: String(activeBalls), l: 'PUCKS' },
              ].map(st => (
                <View key={st.l} style={styles.pauseStat}>
                  <Text style={styles.pauseStatVal}>{st.v}</Text>
                  <Text style={styles.pauseStatLbl}>{st.l}</Text>
                </View>
              ))}
            </View>
            <Pressable ref={resumeRef} onPress={() => setPaused(false)} style={styles.resumeBtn}
              accessibilityRole="button" accessibilityLabel="Resume match">
              <Feather name="play" size={18} color={palette.ochreInk} />
              <Text style={styles.resumeText}>Resume</Text>
            </Pressable>
            <Text style={styles.pauseBody}>
              {isGauntletRun
                ? 'Exit ends this round without recording it. Your Gauntlet run stays where it was before this round.'
                : 'Exit ends this match now. It is not recorded and earns no XP or coins.'}
              {bankLivesUsed > 0 ? ' Bank lives used at the start are not refunded.' : ''}
            </Text>
            <Pressable onPress={() => { setPaused(false); music.stop(); router.replace('/'); }} style={styles.quitBtn}
              accessibilityRole="button" accessibilityLabel="Exit match to Play">
              <Feather name="log-out" size={16} color={tactile.paperInk} />
              <Text style={styles.quitText}>Exit to Play</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: palette.ink },
  column: { alignItems: 'stretch' },
  stateRoot: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', paddingHorizontal: 18 },
  stateCard: { width: '100%', maxWidth: 520, gap: 16 },
  stateTitle: { color: palette.paper, fontSize: 30, fontFamily: 'BarlowCondensed_700Bold' },
  stateBody: { color: palette.paperDim, fontSize: 16, lineHeight: 24, fontFamily: 'SourceSans3_400Regular' },
  hud: { flexDirection: 'row', alignItems: 'center', height: 48, gap: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modeChip: { borderRadius: 2, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  modeText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, letterSpacing: 1 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 17, color: palette.paper },
  ballDot: { width: 8, height: 8, borderRadius: 4 },
  board: { flexDirection: 'row', borderWidth: 2, borderColor: tactile.brassEdge, backgroundColor: tactile.brass, marginBottom: 6, height: 44 },
  boardCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: tactile.courtLine },
  boardYou: { backgroundColor: palette.ochre },
  boardSeat: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: tactile.paperInk },
  boardLives: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, color: tactile.paperInk, lineHeight: 20 },
  courtFrame: { ...StyleSheet.absoluteFillObject, borderWidth: 3, borderColor: tactile.brass, borderRadius: 0 },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, marginTop: 4 },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  youText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.paper, flexShrink: 1 },
  livesLabel: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: palette.muted, letterSpacing: 1 },
  livesVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, color: palette.paper },
  outNote: { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.paperDim },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 4, minHeight: 24, alignItems: 'center' },
  puLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  puKey: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 12, borderWidth: 1, borderRadius: 2, paddingHorizontal: 3 },
  puLabel: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.paperDim },
  hint: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.muted, marginTop: 4 },
  pauseOverlay: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center', padding: 18 },
  pauseCard: { width: '100%', maxWidth: 360, borderRadius: 0, padding: 24, gap: 16, borderWidth: 2, borderColor: tactile.brassEdge, backgroundColor: tactile.paperPanel },
  pauseTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 34, color: tactile.paperInk },
  pauseStats: { flexDirection: 'row', borderWidth: 1, borderColor: tactile.courtLine, backgroundColor: tactile.brass, paddingVertical: 10 },
  pauseStat: { alignItems: 'center', flex: 1 },
  pauseStatVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, color: tactile.paperInk },
  pauseStatLbl: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: tactile.paperMuted, letterSpacing: 1 },
  pauseBody: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, color: tactile.paperMuted },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 0, borderWidth: 2, borderColor: tactile.courtLine, backgroundColor: palette.ochre },
  resumeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 17, color: palette.ochreInk },
  quitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 0, borderWidth: 1, borderColor: tactile.paperMuted },
  quitText: { fontFamily: 'SourceSans3_700Bold', fontSize: 15, color: tactile.paperInk },
});
