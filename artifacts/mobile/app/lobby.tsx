import { idleAnimation } from "@/components/ui/idleAnimation";
import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { LinearGradient } from '@/components/ui/Flat';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { palette, tactile } from '@/constants/colors';
import { Button, ScreenTitle } from '@/components/ui/Primitives';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  FadeIn,
  SlideInRight,
  SlideOutRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerCard } from '@/components/PlayerCard';
import { FloatingOrbs, ORBS_GOLD, GlowText } from '@/components/effects';
import { RANKS, SKINS, MAPS, getRankIndex, usePlayer } from '@/context/PlayerContext';
import { getActiveFeaturedMode } from '@/utils/featuredModes';
import { useParty } from '@/context/PartyContext';
import { getGameConfig, hasGameConfig, updateGameConfig } from '@/store/gameSession';
import { getGauntletState } from '@/store/gauntletSession';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/hooks/useSettings';
import { useSoundFX } from '@/hooks/useSoundFX';
import { apiUrl } from '@/utils/api';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MatchPlayer {
  id:    string;
  name:  string;
  rank:  string;
  color: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genPlayerId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const VARIANT_META: Record<string, { emoji: string; name: string; color: string }> = {
  duos:         { emoji: '👥', name: 'DUOS',         color: '#575D5C' },
  blitz:        { emoji: '⚡', name: 'BLITZ',        color: '#EDBA3C' },
  chaos:        { emoji: '🌪️', name: 'CHAOS',        color: '#F36B3F' },
  survival:     { emoji: '🛡️', name: 'SURVIVAL',     color: '#EDBA3C' },
  sudden_death: { emoji: '💀', name: 'SUDDEN DEATH', color: '#F36B3F' },
  turbo:        { emoji: '🚀', name: 'TURBO',        color: '#575D5C' },
  pinball:      { emoji: '🎰', name: 'PINBALL',      color: '#EDBA3C' },
  six_player:   { emoji: '6️⃣', name: '6-PLAYER',     color: '#EDBA3C' },
};

const VARIANT_RULES: Record<string, string[]> = {
  classic: [
    'Drag to move your bottom paddle (desktop: click and drag)',
    'Deflect balls, let them through and lose a life',
    'Each player starts with 5 lives',
    'New balls spawn every 7 seconds',
    'Collect power-ups near your paddle zone',
    'Last player standing wins!',
  ],
  duos: [
    'Team Battle: Bottom+Right (Gold) vs Top+Left (Blue)',
    'Your teammate bot covers the opposite wall',
    'Both teammates must be eliminated to lose',
    'No phase transitions, 4-player arena throughout',
    'The last surviving team wins!',
  ],
  blitz: [
    'EXTREME: everyone has only 1 life',
    'One goal = instant elimination',
    '2 balls launch from the start',
    '1.5× speed, no time to breathe',
    'Matches last under 60 seconds',
  ],
  chaos: [
    '5 balls launch simultaneously at game start',
    'Every player starts with just 3 lives',
    'No power-ups, pure skill only',
    '1.2× starting speed, escalating fast',
    'More balls spawn every 5 seconds',
  ],
  survival: [
    'Each player has 12 lives, outlast the storm',
    'New balls spawn every 5 seconds',
    'Speed increases with every ball added',
    'Power-ups still appear, grab them fast',
    'Last player with lives remaining wins',
  ],
  sudden_death: [
    'MAXIMUM DANGER: 1 life each, 3 balls at launch',
    'Ball speed starts at 2×, no warmup',
    'No power-ups, nothing to save you',
    'Every single ball is a death threat',
    'Average match: under 20 seconds',
  ],
  turbo: [
    'Ball speed starts at 1.8× from the first second',
    'Balls spawn every 8 seconds',
    'Power-ups still appear for a chance to swing',
    '5 lives each, need them all',
    'Fast hands and sharp reflexes required',
  ],
  pinball: [
    'A new ball spawns every 3 seconds',
    'Up to 8 balls can be in play at once',
    'Slower starting speed, but volume is brutal',
    'Power-ups spawn normally',
    'Last player standing in the ball storm wins',
  ],
  six_player: [
    '6 fighters, each wall is split into two zones',
    'You guard the LEFT half of the bottom wall',
    'Top wall is split between two bots (left & right)',
    'Left and right walls each have their own bot',
    '4 lives each, no phase transitions, pure survival',
    'Last of 6 standing wins, largest bracket ever!',
  ],
};

// ── GO! Flash Overlay ─────────────────────────────────────────────────────────
function GoFlash() {
  const scale   = useSharedValue(0.3);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value   = withSpring(1, { damping: 7, stiffness: 220 });
    opacity.value = withDelay(150, withTiming(0, { duration: 250 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={goFlashStyles.overlay} pointerEvents="none">
      <Reanimated.Text style={[goFlashStyles.text, animStyle]}>GO!</Reanimated.Text>
    </View>
  );
}

const goFlashStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#213D3955',
  },
  text: {
    fontFamily: 'SourceSans3_700Bold', fontSize: 112, color: '#6F8A5B',
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0,
  },
});

// ── 3D Countdown Overlay ──────────────────────────────────────────────────────
function CountdownOverlay({ countdown }: { countdown: number }) {
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;

  // Reanimated shared values for the number
  const numScale   = useSharedValue(2.8);
  const numOpacity = useSharedValue(0);

  useEffect(() => {
    // Reanimated spring-in for the digit
    numScale.value   = 2.8;
    numOpacity.value = 0;
    numScale.value   = withSpring(1, { damping: 7, stiffness: 180 });
    numOpacity.value = withTiming(1, { duration: 160 });

    // RN Animated expanding rings
    ring1Anim.setValue(0);
    ring2Anim.setValue(0);
    Animated.timing(ring1Anim, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(ring2Anim, { toValue: 1, duration: 1100, delay: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [countdown]);

  const numStyle = useAnimatedStyle(() => ({
    opacity: numOpacity.value,
    transform: [{ scale: numScale.value }],
  }));

  const ring1Scale   = ring1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.8] });
  const ring1Opacity = ring1Anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.9, 0.5, 0] });
  const ring2Scale   = ring2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 4.0] });
  const ring2Opacity = ring2Anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.6, 0.25, 0] });

  return (
    <View style={styles.countdownOverlay} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', width: 100, height: 100, borderRadius: 3,
        borderWidth: 3, borderColor: '#C99A2E',
        opacity: ring1Opacity, transform: [{ scale: ring1Scale }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 100, height: 100, borderRadius: 3,
        borderWidth: 2, borderColor: '#C99A2E',
        opacity: ring2Opacity, transform: [{ scale: ring2Scale }],
      }} />
      <Reanimated.Text style={[styles.countdownText, numStyle]}>
        {countdown}
      </Reanimated.Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function LobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const { settings } = useSettings();
  const sfx = useSoundFX(settings.soundEnabled);
  // Stable ref so the matchmaking effect closure always reads the latest sfx/settings
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;
  const { partyCode, isInParty, members: partyMembers, myPlayerId } = useParty();
  const config = getGameConfig();

  const playerRankIdx = getRankIndex(profile.rank);
  const unlockedMaps  = MAPS.filter(m => playerRankIdx >= m.unlockRankIndex);
  const defaultMapId  = unlockedMaps.length ? unlockedMaps[unlockedMaps.length - 1].id : MAPS[0].id;
  const playerSkin    = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
  const topPad        = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  // Use the same stable ID that PartyContext registered with the party server,
  // so matchmaking and party membership identify the same player.
  const playerIdRef = useRef(myPlayerId);

  // Matchmaking state
  const [opponents, setOpponents]   = useState<MatchPlayer[]>([]);  // up to 3 others
  const [status, setStatus]         = useState<'searching' | 'found' | 'countdown'>('searching');
  const [rulesOpen, setRulesOpenState] = useState(settings.showLobbyRules ?? true);
  const rulesTouched = useRef(false);
  const setRulesOpen = (fn: (o: boolean) => boolean) => { rulesTouched.current = true; setRulesOpenState(fn); };
  // Settings load asynchronously; follow the saved preference until the player toggles.
  useEffect(() => {
    if (!rulesTouched.current) setRulesOpenState(settings.showLobbyRules ?? true);
  }, [settings.showLobbyRules]);
  const [countdown, setCountdown]   = useState<number | null>(null);
  const [showGoFlash, setShowGoFlash] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null); // null = unknown
  const [selectedMap, setSelectedMap]   = useState(defaultMapId);
  const selectedMapRef = useRef(selectedMap);
  selectedMapRef.current = selectedMap;
  const roomIdRef     = useRef<string | null>(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const dot1Anim      = useRef(new Animated.Value(0.8)).current;
  const dot2Anim      = useRef(new Animated.Value(0.8)).current;
  const dot3Anim      = useRef(new Animated.Value(0.8)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = staticLoop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    // Staggered 3-dot bounce loader
    const makeDot = (anim: Animated.Value, delay: number) => staticLoop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.delay(Math.max(0, 600 - delay)),
      ])
    );
    const d1 = makeDot(dot1Anim, 0);
    const d2 = makeDot(dot2Anim, 200);
    const d3 = makeDot(dot3Anim, 400);
    pulse.start(); d1.start(); d2.start(); d3.start();
    return () => { pulse.stop(); d1.stop(); d2.stop(); d3.stop(); };
  }, []);

  // Lives bank, player chooses how many bank lives to spend this match
  const bankLives       = profile.extraLivesInventory ?? 0;
  const isChampionPlus  = getRankIndex(profile.rank) >= 15; // Champion 1–5 = index 15–19
  const maxLivesPerGame = isChampionPlus ? 2 : 3;
  const livesCap        = Math.min(bankLives, maxLivesPerGame);
  const [livesUsed, setLivesUsed] = useState(0);

  // Keep game config in sync whenever the selection changes
  useEffect(() => { updateGameConfig({ bankLivesUsed: livesUsed }); }, [livesUsed]);

  // Matchmaking logic
  useFocusEffect(useCallback(() => {
    // Without a setup from Play/Events, never start a fabricated match.
    if (!hasGameConfig()) return;
    let cancelled = false;
    let readyScheduled = false;
    let navigated = false;
    let fallbackStarted = false;
    let polling = false;
    let pollFailures = 0;
    const requests = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;
    const delayed = new Set<ReturnType<typeof setTimeout>>();
    const later = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        delayed.delete(timer);
        if (!cancelled) callback();
      }, delay);
      delayed.add(timer);
      return timer;
    };
    updateGameConfig({ countdownComplete: false });

    function startCountdown(finalOpponents: MatchPlayer[]) {
      if (cancelled) return;
      // Store opponents in game config so GameArena uses their names/ranks
      const names = finalOpponents.map(p => p.name);
      const ranks = finalOpponents.map(p => p.rank);
      updateGameConfig({ opponentNames: names, opponentRanks: ranks, mapId: selectedMapRef.current });
      setStatus('countdown');
      let c = 3;
      setCountdown(c);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sfxRef.current.countdown();
      countdownTimer = setInterval(() => {
        if (cancelled) { if (countdownTimer) clearInterval(countdownTimer); return; }
        c -= 1;
        setCountdown(c);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (c > 0) sfxRef.current.countdown();
        if (c <= 0) {
          if (countdownTimer) clearInterval(countdownTimer);
          updateGameConfig({ mapId: selectedMapRef.current, countdownComplete: true });
          setShowGoFlash(true);
          later(() => {
            if (!cancelled && !navigated) {
              navigated = true;
              router.replace('/game');
            }
          }, 400);
        }
      }, 1000);
    }

    function handlePollResult(players: MatchPlayer[], isReady: boolean) {
      if (cancelled || fallbackStarted || readyScheduled) return;
      // Filter out the human player
      const others = players.filter(p => p.id !== playerIdRef.current);
      // Animate new arrivals one by one
      const prev = opponents.length;
      const curr = others.length;
      if (curr > prev) {
        for (let i = prev; i < curr; i++) {
          const idx = i;
          later(() => {
            if (cancelled) return;
            setOpponents(o => {
              if (o.length <= idx) {
                const updated = [...o];
                while (updated.length <= idx) updated.push(others[updated.length]!);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                sfxRef.current.playerJoin();
                return updated;
              }
              return o;
            });
          }, (i - prev) * 500);
        }
      }
      if (isReady && !readyScheduled) {
        readyScheduled = true;
        // Wait for animations to finish before counting down
        later(() => {
          if (cancelled) return;
          const allOthers = players.filter(p => p.id !== playerIdRef.current);
          setOpponents(allOthers);
          setStatus('found');
          later(() => startCountdown(allOthers), 600);
        }, (curr - prev) * 500 + 200);
        if (pollTimer) clearInterval(pollTimer);
      }
    }

    async function joinMatchmaking() {
      try {
        const res = await fetch(apiUrl('/matchmaking/join'), {
          method: 'POST',
          signal: requests.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId:    playerIdRef.current,
            playerName:  profile.name,
            playerRank:  profile.rank,
            rankIndex:   playerRankIdx,
            color:       playerSkin.color,
            ...(partyCode ? { partyCode, partySize: partyMembers.length } : {}),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { roomId: string; players: MatchPlayer[]; isReady: boolean };
        if (cancelled || fallbackStarted) {
          fetch(apiUrl(`/matchmaking/room/${data.roomId}/leave`), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: playerIdRef.current }),
          }).catch(() => {});
          return;
        }
        setApiAvailable(true);
        roomIdRef.current = data.roomId;
        handlePollResult(data.players, data.isReady);

        // Start polling every 2s
        if (!readyScheduled) pollTimer = setInterval(async () => {
          if (cancelled || fallbackStarted || polling || !roomIdRef.current) return;
          polling = true;
          try {
            const pollRes = await fetch(
              apiUrl(`/matchmaking/room/${roomIdRef.current}?playerId=${playerIdRef.current}&rankIndex=${playerRankIdx}${partyCode ? `&partyCode=${partyCode}&partySize=${partyMembers.length}` : ''}`),
              { signal: requests.signal },
            );
            if (pollRes.status === 404) { beginFallback(); return; }
            if (!pollRes.ok) throw new Error(`HTTP ${pollRes.status}`);
            const pollData = await pollRes.json() as { players: MatchPlayer[]; isReady: boolean };
            pollFailures = 0;
            handlePollResult(pollData.players, pollData.isReady);
          } catch {
            pollFailures += 1;
            if (pollFailures >= 3) beginFallback();
          } finally {
            polling = false;
          }
        }, 2000);
      } catch {
        beginFallback();
      }
    }

    function beginFallback() {
      if (cancelled || fallbackStarted || readyScheduled) return;
      fallbackStarted = true;
      readyScheduled = true;
      requests.abort();
      if (pollTimer) clearInterval(pollTimer);
      delayed.forEach(clearTimeout);
      delayed.clear();
      setOpponents([]);
      setApiAvailable(false);
      simulateFallback();
    }

    // Fallback: simulated matchmaking (when API is unreachable)
    const FALLBACK_POOL = [
      { id: 'f1', name: 'ArcReaper',   rank: 'Diamond',  color: '#8C8F7A' },
      { id: 'f2', name: 'VoidDash',    rank: 'Platinum', color: '#8C8F7A' },
      { id: 'f3', name: 'PhantomBolt', rank: 'Master 1', color: '#B4533A' },
      { id: 'f4', name: 'NightHawk',   rank: 'Gold III', color: '#B4533A' },
      { id: 'f5', name: 'ZeroShift',   rank: 'Diamond',  color: '#6F8A5B' },
      { id: 'f6', name: 'CyberAce',    rank: 'Master 2', color: '#8C8F7A' },
      { id: 'f7', name: 'SlipStream7', rank: 'Silver II', color: '#B7B2A6' },
      { id: 'f8', name: 'GhostPad',    rank: 'Gold I',   color: '#C99A2E' },
    ];
    function simulateFallback() {
      const shuffled = [...FALLBACK_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      shuffled.forEach((p, i) => {
        later(() => {
          if (cancelled) return;
          setOpponents(prev => [...prev, p]);
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          sfxRef.current.playerJoin();
        }, (i + 1) * 900);
      });
      later(() => {
        if (cancelled) return;
        setStatus('found');
        later(() => startCountdown(shuffled), 400);
      }, 3600);
    }

    // Bound the whole queue, including a fetch or response body that never resolves.
    later(beginFallback, 15000);
    joinMatchmaking();

    return () => {
      cancelled = true;
      requests.abort();
      delayed.forEach(clearTimeout);
      if (pollTimer) clearInterval(pollTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      // Leave the room gracefully
      if (roomIdRef.current) {
        fetch(apiUrl(`/matchmaking/room/${roomIdRef.current}/leave`), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: playerIdRef.current }),
        }).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const searchingLabel = status === 'countdown' && countdown !== null
    ? `Bots ready. Starting in ${countdown}`
    : status === 'found'
    ? 'Local bot seats ready'
    : opponents.length === 0
    ? 'Preparing local bot seats...'
    : `${opponents.length}/3 bot seats prepared...`;
  const statusColor = status === 'searching' ? '#252A2B' : '#575D5C';

  if (!hasGameConfig()) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.ink, alignItems: 'center', paddingTop: topPad + 24, paddingHorizontal: 18 }}>
        <View style={{ width: '100%', maxWidth: 520, gap: 16 }}>
          <Text accessibilityRole="header" style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, color: palette.paper }}>No match is set up</Text>
          <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 16, lineHeight: 24, color: palette.paperDim }}>
            The lobby opens from Play or Events with a chosen mode. Opening it directly or refreshing clears that choice, so no bots were prepared and nothing will start.
          </Text>
          <Button label="Go to Play" size="lg" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  return (
    <Reanimated.View entering={SlideInRight.duration(260)} exiting={SlideOutRight.duration(220)} style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#EEE9DE', '#E3DFD3', '#EEE9DE']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.5} />
      <LinearGradient
        colors={['#C99A2E1A', '#C99A2E08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave lobby" testID="leave-lobby" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 4, flex: 1, marginHorizontal: 8 }}>
          <ScreenTitle title="Match setup" style={{ width: '100%' }} />
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {(() => {
              const isGauntlet = config.matchType === 'gauntlet';
              const isRanked   = config.matchType === 'ranked';
              const c = isGauntlet || isRanked ? '#EDBA3C' : '#575D5C';
              const label = isGauntlet
                ? `GAUNTLET · Round ${getGauntletState().roundNumber}`
                : isRanked ? 'RANKED' : 'CASUAL';
              return (
                <View style={[styles.modeBadge, { backgroundColor: c === '#EDBA3C' ? c : 'transparent', borderColor: c }]}>
                  <Text style={[styles.modeBadgeText, { color: c === '#EDBA3C' ? '#252A2B' : c }]}>{label}</Text>
                </View>
              );
            })()}
            {config.variant !== 'classic' && (() => {
              const vm = VARIANT_META[config.variant];
              const c  = vm?.color ?? '#252A2B';
              return (
                <View style={[styles.modeBadge, { backgroundColor: c === '#EDBA3C' || c === '#F36B3F' ? c : 'transparent', borderColor: c }]}>
                  <Text style={[styles.modeBadgeText, { color: c === '#EDBA3C' || c === '#F36B3F' ? '#252A2B' : c }]}>
                    {vm?.name}
                  </Text>
                </View>
              );
            })()}
            {config.featuredModeId && (() => {
              const fm = getActiveFeaturedMode();
              if (!fm || fm.id !== config.featuredModeId) return null;
              return (
                <View style={[styles.modeBadge, { backgroundColor: fm.color + '22', borderColor: fm.color + '55' }]}>
                  <Text style={[styles.modeBadgeText, { color: fm.color }]}>{fm.name.toUpperCase()}</Text>
                </View>
              );
            })()}
            {profile.totalGames < 5 && (
              <View style={[styles.modeBadge, { backgroundColor: '#EDBA3C', borderColor: '#252A2B' }]}>
                <Text style={[styles.modeBadgeText, { color: '#252A2B' }]}>
                   TRAINING · {5 - profile.totalGames} left
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status row */}
        <View style={styles.statusRow}>
          {status === 'searching' ? (
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              {([dot1Anim, dot2Anim, dot3Anim] as Animated.Value[]).map((anim, i) => (
                <Animated.View key={i} style={{
                  width: 8, height: 8, borderRadius: 4, backgroundColor: '#C99A2E',
                  opacity: anim,
                  transform: [{ scale: anim.interpolate({ inputRange: [0.2, 1], outputRange: [0.7, 1] }) }],
                }} />
              ))}
            </View>
          ) : (
            <View style={[styles.dot, { backgroundColor: '#6F8A5B' }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{searchingLabel}</Text>
        </View>
        {apiAvailable === false && (
          <Text accessibilityRole="alert" style={{ color: colors.foreground, fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
            Matchmaking is unavailable. Preparing a local bot match instead. You can leave before the countdown finishes.
          </Text>
        )}

        {/* Lives bank: shown only when it can be used */}
        {bankLives > 0 ? <View style={{ marginBottom: 8, backgroundColor: '#B4533A10', borderRadius: 3, borderWidth: 1, borderColor: '#B4533A33', padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 2, color: '#B4533A' }}>LIVES BANK</Text>
            <View style={{ flex: 1 }} />
            {bankLives > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {Array.from({ length: Math.min(bankLives, 6) }).map((_, i) => (
                  <Glyph key={i} style={{ fontSize: 11 }} value="❤️" />
                ))}
                {bankLives > 6 && <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: '#B4533AAA' }}>+{bankLives - 6}</Text>}
              </View>
            ) : (
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: '#ECE7DC33' }}>Empty</Text>
            )}
          </View>

          {bankLives > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#ECE7DC99' }}>
                  Use {livesUsed} {livesUsed === 1 ? 'life' : 'lives'} this match
                </Text>
                {isChampionPlus && (
                  <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#B4533A66', marginTop: 2 }}>
                     Champion+ cap: 2 lives per match
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable
                  onPress={() => { setLivesUsed(v => Math.max(0, v - 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[{ width: 32, height: 32, borderRadius: 3, backgroundColor: '#B4533A20', borderWidth: 1, borderColor: '#B4533A44', alignItems: 'center', justifyContent: 'center' }, livesUsed === 0 && { opacity: 0.35 }]}
                  disabled={livesUsed === 0}
                >
                  <Text style={{ color: '#B4533A', fontFamily: 'SourceSans3_700Bold', fontSize: 20, lineHeight: 22 }}>−</Text>
                </Pressable>
                <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 24, color: '#B4533A', minWidth: 22, textAlign: 'center' }}>{livesUsed}</Text>
                <Pressable
                  onPress={() => { setLivesUsed(v => Math.min(livesCap, v + 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[{ width: 32, height: 32, borderRadius: 3, backgroundColor: '#B4533A20', borderWidth: 1, borderColor: '#B4533A44', alignItems: 'center', justifyContent: 'center' }, livesUsed >= livesCap && { opacity: 0.35 }]}
                  disabled={livesUsed >= livesCap}
                >
                  <Text style={{ color: '#B4533A', fontFamily: 'SourceSans3_700Bold', fontSize: 20, lineHeight: 22 }}>+</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: '#ECE7DC44', lineHeight: 18 }}>
              Earn lives from Gold Strikes (Dragon Cache &amp; Nexus Core), the Premium Pass, the Shop, or by referring friends.
            </Text>
          )}
        </View> : null}

        {/* Party panel, only visible when player is in a party */}
        {isInParty && (
          <View style={{ marginBottom: 8, backgroundColor: '#8C8F7A0F', borderRadius: 3, borderWidth: 1, borderColor: '#8C8F7A44', padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 2, color: '#8C8F7A' }}>YOUR PARTY</Text>
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: '#8C8F7A88', letterSpacing: 1.5 }}>· {partyCode}</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#C9D2C6' }}>Entered together; arena opponents are local bots</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {partyMembers.map(m => (
                <View key={m.playerId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECE7DC08', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Glyph style={{ fontSize: 14 }} value={m.avatarEmoji} />
                  <View>
                    <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, color: '#ECE7DC' }}>{m.name}</Text>
                    <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 9, color: '#ECE7DC55' }}>{m.rank}</Text>
                  </View>
                  {m.isLeader && <Glyph style={{ fontSize: 10 }} value="👑" />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Game rules */}
        <View style={[styles.rulesCard, {
          backgroundColor: tactile.paperPanel,
          borderColor: tactile.brassEdge,
        }]}>
          <Pressable
            onPress={() => setRulesOpen(o => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: rulesOpen }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <Text style={[styles.rulesTitle, { color: tactile.paperInk, marginBottom: 0 }]}>
              {config.variant !== 'classic'
                ? `${VARIANT_META[config.variant]?.name ?? ''} RULES`
                : 'HOW TO PLAY'}
            </Text>
            <View style={{ flex: 1 }} />
            <Feather name={rulesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={tactile.paperInk} />
          </Pressable>
          {rulesOpen ? <View style={styles.rulesList}>
            {(VARIANT_RULES[config.variant] ?? VARIANT_RULES['classic']!).map((rule, i) => (
              <View key={i} style={styles.ruleItem}>
                <View style={[styles.ruleDot, {
                  backgroundColor: config.variant !== 'classic'
                    ? (VARIANT_META[config.variant]?.color ?? colors.primary)
                    : colors.primary,
                }]} />
                 <Text style={[styles.ruleText, { color: tactile.paperMuted }]}>{rule}</Text>
              </View>
            ))}
          </View> : null}
        </View>
        {/* Players */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>MATCH SEATS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
          </View>
          <Text style={{ color: '#B8B5AA', fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20 }}>
            You control South. Opponent paddles are local bots, even when matchmaking supplies player names. Parties coordinate entry, not synchronized human gameplay.
          </Text>
          <View style={styles.playersList}>
            {/* Human player */}
            <PlayerCard
              name={profile.name}
              rank={profile.rank}
              color={playerSkin.color}
              wins={profile.wins}
              level={profile.level}
              isBot={false}
              isReady={true}
            />
            {/* All opponent paddles are locally controlled in this build. */}
            {opponents.map((opp) => (
              <Reanimated.View key={opp.id} entering={ZoomIn.springify().damping(13).stiffness(160)}>
                <PlayerCard
                  name={opp.name}
                  rank={opp.rank}
                  color={opp.color}
                  isBot={true}
                  isReady={status !== 'searching'}
                />
              </Reanimated.View>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - opponents.length) }).map((_, i) => (
              <View key={i} style={[styles.emptySlot, { borderColor: colors.border }]}>
                <Animated.View style={{ opacity: pulseAnim }}>
                  <Feather name="user" size={20} color={colors.mutedForeground} />
                </Animated.View>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Preparing bot seat</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Map select */}
        <View style={styles.section}>
          <View style={[styles.sectionHead, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ARENA</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ECE7DC0E' }} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingRight: 8 }}
          >
            {MAPS.map(map => {
              const unlocked = playerRankIdx >= map.unlockRankIndex;
              const selected = selectedMap === map.id;
              const reqRank  = RANKS[map.unlockRankIndex];
              return (
                <Pressable
                  key={map.id}
                  disabled={!unlocked}
                  onPress={() => {
                    setSelectedMap(map.id);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.mapCard, {
                    borderColor: selected ? map.accent : colors.border,
                    opacity: 1,
                    shadowColor: map.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0,
                    shadowRadius: 0,
                    elevation: 0,
                    borderWidth: selected ? 2 : 1,
                  }]}
                >
                  <LinearGradient colors={map.arenaBg} style={StyleSheet.absoluteFill} />
                  <Glyph style={styles.mapIcon} value={map.icon} />
                  <Text style={[styles.mapName, { color: selected ? map.accent : colors.foreground }]} numberOfLines={1}>{map.name}</Text>
                  <Text style={[styles.mapDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{map.desc}</Text>
                  {unlocked
                    ? (selected
                        ? <View style={[styles.mapBadge, { backgroundColor: map.accent }]}><Feather name="check" size={10} color="#252A2B" /><Text style={styles.mapBadgeText}>SELECTED</Text></View>
                        : <View style={[styles.mapBadge, { backgroundColor: '#ECE7DC14' }]}><Text style={[styles.mapBadgeText, { color: colors.mutedForeground }]}>SELECT</Text></View>)
                    : <View style={[styles.mapLockBadge, { borderColor: reqRank?.color + '66' }]}><Feather name="lock" size={9} color={reqRank?.color} /><Text style={[styles.mapLockText, { color: reqRank?.color }]}>{reqRank?.name}</Text></View>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Big countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <CountdownOverlay key={countdown} countdown={countdown} />
      )}

      {/* GO! flash, shown when countdown hits zero */}
      {showGoFlash && <GoFlash key="go-flash" />}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 2 },
  modeBadge:   { borderRadius: 3, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  modeBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 1.5 },
  content: { paddingHorizontal: 18, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 2, borderColor: tactile.brassEdge, backgroundColor: palette.graphite },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 2 },
  playersList: { gap: 8 },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13 },
  mapCard: { width: 144, padding: 12, borderRadius: 0, borderWidth: 2, gap: 5, overflow: 'hidden' },
  mapIcon: { fontSize: 24 },
  mapName: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  mapDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 10, lineHeight: 14, minHeight: 42 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: '#252A2B', letterSpacing: 0.5 },
  mapLockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 3, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapLockText: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 0.5 },
  rulesCard: { borderRadius: 0, borderWidth: 2, padding: 16, gap: 10 },
  rulesTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 23, letterSpacing: 1 },
  rulesList: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  ruleText: { fontFamily: 'SourceSans3_400Regular', fontSize: 13, flex: 1, lineHeight: 19 },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#23344BEE', alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#EDBA3C', fontSize: 96, fontFamily: 'SourceSans3_700Bold', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
});
