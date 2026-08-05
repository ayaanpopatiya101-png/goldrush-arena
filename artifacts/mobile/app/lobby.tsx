import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  FadeIn,
  SlideInRight,
  SlideOutRight,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerCard } from '@/components/PlayerCard';
import { FloatingOrbs, ORBS_GOLD, GlowText } from '@/components/effects';
import { RANKS, SKINS, MAPS, getRankIndex, getRelic, usePlayer } from '@/context/PlayerContext';
import { getActiveFeaturedMode } from '@/utils/featuredModes';
import { useParty } from '@/context/PartyContext';
import { getGameConfig, updateGameConfig } from '@/store/gameSession';
import { getGauntletState } from '@/store/gauntletSession';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/hooks/useSettings';
import { apiUrl } from '@/utils/api';

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
  duos:         { emoji: '👥', name: 'DUOS',         color: '#1E8AAA' },
  blitz:        { emoji: '⚡', name: 'BLITZ',        color: '#C8820A' },
  chaos:        { emoji: '🌪️', name: 'CHAOS',        color: '#D04818' },
  survival:     { emoji: '🛡️', name: 'SURVIVAL',     color: '#4A8A38' },
  sudden_death: { emoji: '💀', name: 'SUDDEN DEATH', color: '#C03820' },
  turbo:        { emoji: '🚀', name: 'TURBO',        color: '#7A50A0' },
  pinball:      { emoji: '🎰', name: 'PINBALL',      color: '#D07018' },
  six_player:   { emoji: '6️⃣', name: '6-PLAYER',     color: '#D07018' },
};

const VARIANT_RULES: Record<string, string[]> = {
  classic: [
    'Swipe anywhere to move YOUR GOLD paddle',
    'Deflect balls — let them through and lose a life',
    'Each player starts with 5 lives',
    'New balls spawn every 15 seconds',
    'Collect power-ups near your paddle zone',
    'Last player standing wins!',
  ],
  duos: [
    'Team Battle: Bottom+Right (Gold) vs Top+Left (Blue)',
    'Your teammate bot covers the opposite wall',
    'Both teammates must be eliminated to lose',
    'No phase transitions — 4-player arena throughout',
    'The last surviving team wins!',
  ],
  blitz: [
    'EXTREME: everyone has only 1 life',
    'One goal = instant elimination',
    '2 balls launch from the start',
    '1.5× speed — no time to breathe',
    'Matches last under 60 seconds',
  ],
  chaos: [
    '5 balls launch simultaneously at game start',
    'Every player starts with just 3 lives',
    'No power-ups — pure skill only',
    '1.2× starting speed, escalating fast',
    'More balls spawn every 5 seconds',
  ],
  survival: [
    'Each player has 12 lives — outlast the storm',
    'New balls spawn every 5 seconds',
    'Speed increases with every ball added',
    'Power-ups still appear — grab them fast',
    'Last player with lives remaining wins',
  ],
  sudden_death: [
    'MAXIMUM DANGER: 1 life each, 3 balls at launch',
    'Ball speed starts at 2× — no warmup',
    'No power-ups — nothing to save you',
    'Every single ball is a death threat',
    'Average match: under 20 seconds',
  ],
  turbo: [
    'Ball speed starts at 1.8× from the first second',
    'Balls spawn every 8 seconds',
    'Power-ups still appear for a chance to swing',
    '5 lives each — need them all',
    'Fast hands and sharp reflexes required',
  ],
  pinball: [
    'A new ball spawns every 3 seconds',
    'Up to 8 balls can be in play at once',
    'Slower starting speed — but volume is brutal',
    'Power-ups spawn normally',
    'Last player standing in the ball storm wins',
  ],
  six_player: [
    '6 fighters — each wall is split into two zones',
    'You guard the LEFT half of the bottom wall',
    'Top wall is split between two bots (left & right)',
    'Left and right walls each have their own bot',
    '4 lives each — no phase transitions, pure survival',
    'Last of 6 standing wins — largest bracket ever!',
  ],
};

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
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        borderWidth: 3, borderColor: '#C8820A',
        opacity: ring1Opacity, transform: [{ scale: ring1Scale }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        borderWidth: 2, borderColor: '#FFD700',
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
  const { partyCode, isInParty, members: partyMembers, myPlayerId } = useParty();
  const config = getGameConfig();

  const playerRankIdx = getRankIndex(profile.rank);
  const unlockedMaps  = MAPS.filter(m => playerRankIdx >= m.unlockRankIndex);
  const defaultMapId  = unlockedMaps.length ? unlockedMaps[unlockedMaps.length - 1].id : MAPS[0].id;
  const equippedRelic = getRelic(config.playerRelicId);
  const playerSkin    = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
  const topPad        = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  // Use the same stable ID that PartyContext registered with the party server,
  // so matchmaking and party membership identify the same player.
  const playerIdRef = useRef(myPlayerId);

  // Matchmaking state
  const [opponents, setOpponents]   = useState<MatchPlayer[]>([]);  // up to 3 others
  const [status, setStatus]         = useState<'searching' | 'found' | 'countdown'>('searching');
  const [countdown, setCountdown]   = useState<number | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null); // null = unknown
  const [selectedMap, setSelectedMap]   = useState(defaultMapId);
  const selectedMapRef = useRef(selectedMap);
  selectedMapRef.current = selectedMap;
  const roomIdRef     = useRef<string | null>(null);
  const pulseAnim     = useRef(new Animated.Value(0.5)).current;
  const dot1Anim      = useRef(new Animated.Value(0.2)).current;
  const dot2Anim      = useRef(new Animated.Value(0.2)).current;
  const dot3Anim      = useRef(new Animated.Value(0.2)).current;

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    // Staggered 3-dot bounce loader
    const makeDot = (anim: Animated.Value, delay: number) => Animated.loop(
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

  // Matchmaking logic
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

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
      countdownTimer = setInterval(() => {
        if (cancelled) { if (countdownTimer) clearInterval(countdownTimer); return; }
        c -= 1;
        setCountdown(c);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (c <= 0) {
          if (countdownTimer) clearInterval(countdownTimer);
          updateGameConfig({ mapId: selectedMapRef.current });
          router.replace('/game');
        }
      }, 1000);
    }

    function handlePollResult(players: MatchPlayer[], isReady: boolean) {
      if (cancelled) return;
      // Filter out the human player
      const others = players.filter(p => p.id !== playerIdRef.current);
      // Animate new arrivals one by one
      const prev = opponents.length;
      const curr = others.length;
      if (curr > prev) {
        for (let i = prev; i < curr; i++) {
          const idx = i;
          setTimeout(() => {
            if (cancelled) return;
            setOpponents(o => {
              if (o.length <= idx) {
                const updated = [...o];
                while (updated.length <= idx) updated.push(others[updated.length]!);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return updated;
              }
              return o;
            });
          }, (i - prev) * 500);
        }
      }
      if (isReady && status !== 'countdown') {
        // Wait for animations to finish before counting down
        setTimeout(() => {
          if (cancelled) return;
          const allOthers = players.filter(p => p.id !== playerIdRef.current);
          setOpponents(allOthers);
          setStatus('found');
          setTimeout(() => startCountdown(allOthers), 600);
        }, (curr - prev) * 500 + 200);
        if (pollTimer) clearInterval(pollTimer);
      }
    }

    async function joinMatchmaking() {
      try {
        const res = await fetch(apiUrl('/matchmaking/join'), {
          method: 'POST',
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
        if (cancelled) return;
        setApiAvailable(true);
        roomIdRef.current = data.roomId;
        handlePollResult(data.players, data.isReady);

        // Start polling every 2s
        pollTimer = setInterval(async () => {
          if (cancelled || !roomIdRef.current) return;
          try {
            const pollRes = await fetch(
              apiUrl(`/matchmaking/room/${roomIdRef.current}?playerId=${playerIdRef.current}&rankIndex=${playerRankIdx}${partyCode ? `&partyCode=${partyCode}&partySize=${partyMembers.length}` : ''}`)
            );
            if (!pollRes.ok) return;
            const pollData = await pollRes.json() as { players: MatchPlayer[]; isReady: boolean };
            handlePollResult(pollData.players, pollData.isReady);
          } catch { /* network hiccup — keep polling */ }
        }, 2000);
      } catch {
        // API unavailable — fall back to simulated matchmaking
        if (cancelled) return;
        setApiAvailable(false);
        simulateFallback();
      }
    }

    // Fallback: simulated matchmaking (when API is unreachable)
    const FALLBACK_POOL = [
      { id: 'f1', name: 'ArcReaper',   rank: 'Diamond',  color: '#00BFFF' },
      { id: 'f2', name: 'VoidDash',    rank: 'Platinum', color: '#9B59B6' },
      { id: 'f3', name: 'PhantomBolt', rank: 'Master 1', color: '#FF4757' },
      { id: 'f4', name: 'NightHawk',   rank: 'Gold III', color: '#FF6B35' },
      { id: 'f5', name: 'ZeroShift',   rank: 'Diamond',  color: '#00FF88' },
      { id: 'f6', name: 'CyberAce',    rank: 'Master 2', color: '#FF00FF' },
      { id: 'f7', name: 'SlipStream7', rank: 'Silver II', color: '#C0C0C0' },
      { id: 'f8', name: 'GhostPad',    rank: 'Gold I',   color: '#FFD700' },
    ];
    function simulateFallback() {
      const shuffled = [...FALLBACK_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      const timers: ReturnType<typeof setTimeout>[] = [];
      shuffled.forEach((p, i) => {
        timers.push(setTimeout(() => {
          if (cancelled) return;
          setOpponents(prev => [...prev, p]);
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, (i + 1) * 900));
      });
      timers.push(setTimeout(() => {
        if (cancelled) return;
        setStatus('found');
        setTimeout(() => startCountdown(shuffled), 400);
      }, 3600));
    }

    joinMatchmaking();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      // Leave the room gracefully
      if (roomIdRef.current && apiAvailable) {
        fetch(apiUrl(`/matchmaking/room/${roomIdRef.current}/leave`), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: playerIdRef.current }),
        }).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchingLabel = status === 'countdown' && countdown !== null
    ? `Match found! Starting in ${countdown}...`
    : status === 'found'
    ? 'All players ready!'
    : opponents.length === 0
    ? 'Scanning for players...'
    : `${opponents.length}/3 players found — waiting...`;
  const statusColor = status === 'searching' ? '#C8820A' : '#00FF88';

  return (
    <Reanimated.View entering={SlideInRight.duration(260)} exiting={SlideOutRight.duration(220)} style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#07090F', '#0D1428', '#07090F']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.5} />
      <LinearGradient
        colors={['#C8820A1A', '#C8820A08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <GlowText intensity="soft" color="#C8820A" style={[styles.headerTitle, { color: colors.foreground }]}>MATCHMAKING</GlowText>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {(() => {
              const isGauntlet = config.matchType === 'gauntlet';
              const isRanked   = config.matchType === 'ranked';
              const c = isGauntlet ? '#FFD700' : isRanked ? '#C8820A' : '#1E8AAA';
              const label = isGauntlet
                ? `⚔️ GAUNTLET · Round ${getGauntletState().roundNumber}`
                : isRanked ? '⚔️ RANKED' : '🎮 CASUAL';
              return (
                <View style={[styles.modeBadge, { backgroundColor: c + '22', borderColor: c + '66' }]}>
                  <Text style={[styles.modeBadgeText, { color: c }]}>{label}</Text>
                </View>
              );
            })()}
            {config.variant !== 'classic' && (() => {
              const vm = VARIANT_META[config.variant];
              const c  = vm?.color ?? '#FFFFFF';
              return (
                <View style={[styles.modeBadge, { backgroundColor: c + '22', borderColor: c + '55' }]}>
                  <Text style={[styles.modeBadgeText, { color: c }]}>
                    {vm?.emoji} {vm?.name}
                  </Text>
                </View>
              );
            })()}
            {config.featuredModeId && (() => {
              const fm = getActiveFeaturedMode();
              if (!fm || fm.id !== config.featuredModeId) return null;
              return (
                <View style={[styles.modeBadge, { backgroundColor: fm.color + '22', borderColor: fm.color + '55' }]}>
                  <Text style={[styles.modeBadgeText, { color: fm.color }]}>{fm.emoji} {fm.name.toUpperCase()}</Text>
                </View>
              );
            })()}
            {profile.totalGames < 5 && (
              <View style={[styles.modeBadge, { backgroundColor: '#00FF8820', borderColor: '#00FF8855' }]}>
                <Text style={[styles.modeBadgeText, { color: '#00FF88' }]}>
                  🎓 TRAINING · {5 - profile.totalGames} left
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
                  width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8820A',
                  opacity: anim,
                  transform: [{ scale: anim.interpolate({ inputRange: [0.2, 1], outputRange: [0.7, 1] }) }],
                }} />
              ))}
            </View>
          ) : (
            <View style={[styles.dot, { backgroundColor: '#00FF88' }]} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{searchingLabel}</Text>
        </View>

        {/* Party panel — only visible when player is in a party */}
        {isInParty && (
          <View style={{ marginBottom: 8, backgroundColor: '#BF5FFF0F', borderRadius: 14, borderWidth: 1, borderColor: '#BF5FFF44', padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: '#BF5FFF', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, color: '#BF5FFF' }}>YOUR PARTY</Text>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#BF5FFF88', letterSpacing: 1.5 }}>· {partyCode}</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF55' }}>Queueing together</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {partyMembers.map(m => (
                <View key={m.playerId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF08', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 14 }}>{m.avatarEmoji}</Text>
                  <View>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF' }}>{m.name}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF55' }}>{m.rank}</Text>
                  </View>
                  {m.isLeader && <Text style={{ fontSize: 10 }}>👑</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Players */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#C8820A', borderRadius: 2 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>PLAYERS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
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
            {/* Opponents (real or bot — no distinction shown) */}
            {opponents.map((opp) => (
              <Reanimated.View key={opp.id} entering={ZoomIn.springify().damping(13).stiffness(160)}>
                <PlayerCard
                  name={opp.name}
                  rank={opp.rank}
                  color={opp.color}
                  isBot={false}
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
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Searching...</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Map select */}
        <View style={styles.section}>
          <View style={[styles.sectionHead, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <View style={{ width: 3, height: 16, backgroundColor: '#BF5FFF', borderRadius: 2 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ARENA</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
            {equippedRelic && (
              <View style={[styles.relicChip, { borderColor: equippedRelic.color + '66', backgroundColor: equippedRelic.color + '1A' }]}>
                <Text style={{ fontSize: 11 }}>{equippedRelic.icon}</Text>
                <Text style={[styles.relicChipText, { color: equippedRelic.color }]}>{equippedRelic.name}</Text>
              </View>
            )}
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
                    opacity: unlocked ? 1 : 0.55,
                    shadowColor: map.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: selected ? 0.55 : 0,
                    shadowRadius: selected ? 10 : 0,
                    elevation: selected ? 6 : 0,
                  }]}
                >
                  <LinearGradient colors={map.arenaBg} style={StyleSheet.absoluteFill} />
                  <Text style={styles.mapIcon}>{map.icon}</Text>
                  <Text style={[styles.mapName, { color: selected ? map.accent : colors.foreground }]} numberOfLines={1}>{map.name}</Text>
                  <Text style={[styles.mapDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{map.desc}</Text>
                  {unlocked
                    ? (selected
                        ? <View style={[styles.mapBadge, { backgroundColor: map.accent }]}><Feather name="check" size={10} color="#0D0A06" /><Text style={styles.mapBadgeText}>SELECTED</Text></View>
                        : <View style={[styles.mapBadge, { backgroundColor: '#FFFFFF14' }]}><Text style={[styles.mapBadgeText, { color: colors.mutedForeground }]}>SELECT</Text></View>)
                    : <View style={[styles.mapLockBadge, { borderColor: reqRank?.color + '66' }]}><Feather name="lock" size={9} color={reqRank?.color} /><Text style={[styles.mapLockText, { color: reqRank?.color }]}>{reqRank?.name}</Text></View>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Game rules */}
        <View style={[styles.rulesCard, {
          backgroundColor: colors.card,
          borderColor: config.variant !== 'classic'
            ? (VARIANT_META[config.variant]?.color ?? colors.border) + '44'
            : colors.border,
        }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ width: 3, height: 16, backgroundColor: config.variant !== 'classic' ? (VARIANT_META[config.variant]?.color ?? '#C8820A') : '#C8820A', borderRadius: 2 }} />
            <Text style={[styles.rulesTitle, { color: config.variant !== 'classic' ? (VARIANT_META[config.variant]?.color ?? colors.foreground) : colors.foreground, marginBottom: 0 }]}>
              {config.variant !== 'classic'
                ? `${VARIANT_META[config.variant]?.name ?? ''} RULES`
                : 'HOW TO PLAY'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={styles.rulesList}>
            {(VARIANT_RULES[config.variant] ?? VARIANT_RULES['classic']!).map((rule, i) => (
              <View key={i} style={styles.ruleItem}>
                <View style={[styles.ruleDot, {
                  backgroundColor: config.variant !== 'classic'
                    ? (VARIANT_META[config.variant]?.color ?? colors.primary)
                    : colors.primary,
                }]} />
                <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Big countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <CountdownOverlay key={countdown} countdown={countdown} />
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2 },
  modeBadge:   { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  modeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2 },
  playersList: { gap: 8 },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  mapCard: { width: 128, padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 5, overflow: 'hidden' },
  mapIcon: { fontSize: 24 },
  mapName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  mapDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, minHeight: 42 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#07090F', letterSpacing: 0.5 },
  mapLockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  mapLockText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  relicChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  relicChipText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.3 },
  rulesCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  rulesTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5 },
  rulesList: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  ruleText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1, lineHeight: 19 },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  countdownText: { color: '#C8820A', fontSize: 96, fontFamily: 'Inter_700Bold', textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30 },
});
