import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient as SvgRG, Stop, Path } from 'react-native-svg';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { RankBadge } from '@/components/RankBadge';
import { AmbientParticles } from '@/components/AmbientParticles';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import {
  RANKS, getRankIndex, SEASON_TIERS, SKINS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
type SuperType = 1 | 2 | 3;
import { setGameConfig } from '@/store/gameSession';
import type { MatchType, GameVariant } from '@/store/gameSession';
import { startGauntlet } from '@/store/gauntletSession';
import { useColors } from '@/hooks/useColors';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Animated crown logo ──────────────────────────────────────────────────────
function CrownLogo() {
  const float  = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(float,  { toValue: -10, duration: 1800, useNativeDriver: true }),
      Animated.timing(float,  { toValue: 0,   duration: 1800, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(rotate, { toValue: 1,   duration: 3600, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1,  duration: 3600, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0,   duration: 1800, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const rot = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });
  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: float }, { rotate: rot }] }}>
      {/* Glow ring behind crown */}
      <Animated.View style={{
        position: 'absolute', width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#FFD700', opacity: glowOp,
        top: -10,
        shadowColor: '#FFD700', shadowRadius: 40, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
      }} />
      <Text style={{ fontSize: 72, zIndex: 1 }}>👑</Text>
    </Animated.View>
  );
}

// ─── Epic title with 3D depth layers ─────────────────────────────────────────
function EpicTitle() {
  const pulse  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse,  { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulse,  { toValue: 0, duration: 1400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(scaleA, { toValue: 1.02, duration: 2200, useNativeDriver: true }),
      Animated.timing(scaleA, { toValue: 1,    duration: 2200, useNativeDriver: true }),
    ])).start();
  }, []);

  const glowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [8, 28] });

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleA }] }}>
      {/* Shadow layer 1 (deep) */}
      <Text style={[styles.titleShadow3, { top: 7, left: 5 }]} aria-hidden>GOLDRUSH</Text>
      {/* Shadow layer 2 */}
      <Text style={[styles.titleShadow2, { top: 4, left: 3 }]} aria-hidden>GOLDRUSH</Text>
      {/* Main text */}
      <Animated.Text style={[styles.titleMain, { textShadowRadius: glowRadius }]}>
        GOLDRUSH
      </Animated.Text>
      {/* ARENA line */}
      <Text style={styles.titleArena}>A R E N A</Text>
      <Text style={styles.titleTagline}>4-PLAYER · AIR HOCKEY · LAST ONE STANDING</Text>
    </Animated.View>
  );
}

// ─── Clash Royale-style BATTLE button ────────────────────────────────────────
function BattleButton({ onPress }: { onPress: () => void }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered pulsing rings
    const r1 = Animated.loop(Animated.sequence([
      Animated.timing(ring1, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(ring1, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ]));
    const r2 = Animated.loop(Animated.sequence([
      Animated.delay(600),
      Animated.timing(ring2, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(ring2, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]));
    r1.start(); r2.start(); glowLoop.start();
  }, []);

  function handlePress() {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  const r1Scale   = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const r1Opacity = ring1.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.8, 0.5, 0] });
  const r2Scale   = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const r2Opacity = ring2.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 0.3, 0] });
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
      {/* Pulse rings */}
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: r1Scale }], opacity: r1Opacity, borderColor: '#E8920A' }]} />
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: r2Scale }], opacity: r2Opacity, borderColor: '#FFD700' }]} />

      <Pressable onPress={handlePress} style={{ zIndex: 2 }}>
        {({ pressed }) => (
          <Animated.View style={{ transform: [{ translateX: shake }, { scale: pressed ? 0.94 : 1 }] }}>
            <LinearGradient
              colors={pressed ? ['#A86008', '#C8820A', '#E09620'] : ['#FFD700', '#E09620', '#C8820A', '#A86008']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.battleBtn}
            >
              {/* Inner shine */}
              <View style={styles.battleBtnShine} />
              <Text style={styles.battleBtnIcon}>⚔️</Text>
              <Text style={styles.battleBtnText}>BATTLE!</Text>
              <Text style={styles.battleBtnSub}>RANKED MATCH</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

// ─── 3D mode card ─────────────────────────────────────────────────────────────
function ModeCard3D({
  emoji, name, sub, color, onPress,
}: { emoji: string; name: string; sub: string; color: string; onPress: () => void }) {
  const tiltX  = useRef(new Animated.Value(0)).current;
  const tiltY  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 2, duration: 2200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  function onIn() {
    Animated.parallel([
      Animated.spring(tiltY, { toValue: 8, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1.06, useNativeDriver: true }),
    ]).start();
  }
  function onOut() {
    Animated.parallel([
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }

  const rot = tiltY.interpolate({ inputRange: [-12, 12], outputRange: ['-6deg', '6deg'] });
  const shimX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-60, 180] });

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={[
        styles.modeCard3D,
        {
          borderColor: color + '66',
          transform: [{ perspective: 600 }, { rotateY: rot }, { scale: scaleA }],
          shadowColor: color,
        },
      ]}>
        <LinearGradient
          colors={[color + '33', color + '14', '#00000000']}
          style={StyleSheet.absoluteFill}
        />
        {/* Shimmer */}
        <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimX }, { skewX: '-18deg' }] }]} />

        <Text style={styles.mode3DEmoji}>{emoji}</Text>
        <Text style={[styles.mode3DName, { color }]}>{name}</Text>
        <Text style={[styles.mode3DSub, { color: color + 'AA' }]}>{sub}</Text>
        <View style={[styles.mode3DChip, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Feather name="play" size={8} color={color} />
          <Text style={[styles.mode3DChipTxt, { color }]}>PLAY</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Animated stat counter ────────────────────────────────────────────────────
function StatCounter({ value, label, icon, color }: {
  value: number; label: string; icon: string; color: string;
}) {
  const anim   = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value]);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 1600, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 1600, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={[styles.statCard3D, { borderColor: color + '44', shadowColor: color }]}>
      <LinearGradient colors={[color + '22', color + '08']} style={StyleSheet.absoluteFill} />
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Animated.Text style={[styles.statVal, { color, transform: [{ scale }] }]}>
        {label === 'WIN RATE' ? `${shown}%` : String(shown)}
      </Animated.Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

// ─── Season tier card ─────────────────────────────────────────────────────────
function TierCard({ tier, index, totalGames, claimed, onClaim }: {
  tier: typeof SEASON_TIERS[0]; index: number; totalGames: number;
  claimed: boolean; onClaim: (i: number) => void;
}) {
  const isUnlocked = totalGames >= tier.games;
  const isCurrent  = isUnlocked && (index === SEASON_TIERS.length - 1 || totalGames < SEASON_TIERS[index + 1].games);
  return (
    <View style={[
      st.tierCard,
      isCurrent && { borderColor: '#C8820A66', backgroundColor: '#C8820A11' },
      !isUnlocked && { opacity: 0.45 },
    ]}>
      <Text style={st.tierIcon}>{tier.icon}</Text>
      <Text style={[st.tierName, { color: isCurrent ? '#C8820A' : '#FFFFFF88' }]}>{tier.name}</Text>
      <Text style={st.tierGames}>{tier.games}+ games</Text>
      <Text style={st.tierReward}>{tier.reward}</Text>
      {claimed ? (
        <View style={st.claimedBadge}>
          <Feather name="check" size={10} color="#00FF88" />
          <Text style={st.claimedText}>CLAIMED</Text>
        </View>
      ) : isUnlocked ? (
        <Pressable onPress={() => onClaim(index)} style={st.claimTierBtn}>
          <Text style={st.claimTierText}>CLAIM</Text>
        </Pressable>
      ) : (
        <View style={st.lockedBadge}><Feather name="lock" size={10} color="#FFFFFF44" /></View>
      )}
    </View>
  );
}

// ─── Home screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const {
    profile, isLoaded, showStreakModal, dismissStreakModal,
    claimDailyStreak, claimSeasonTier, setSelectedSuper,
  } = usePlayer();

  const xpBarAnim  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerOp   = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const titleOp    = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  const rankInfo     = xpForNextRank(profile.xp);
  const rankData     = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const playerRankIdx = getRankIndex(profile.rank);
  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate  = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;

  useEffect(() => {
    if (!isLoaded) return;
    // Entry animations
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(headerOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
    Animated.timing(xpBarAnim, { toValue: rankInfo.progress, duration: 1400, useNativeDriver: false }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(shimmerAnim, { toValue: 2, duration: 1900, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(shimmerAnim, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, [isLoaded]);

  function handlePlay(matchType: MatchType) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType, variant: 'classic' });
    router.push('/lobby');
  }
  function handlePlayMode(variant: GameVariant) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType: 'casual', variant });
    router.push('/lobby');
  }
  function handleStartGauntlet() {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    const firstVariant = startGauntlet();
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType: 'gauntlet', variant: firstVariant });
    router.push('/lobby');
  }
  async function handleClaimStreak() {
    await claimDailyStreak();
    dismissStreakModal();
  }

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#060410' }} />;

  const xpBarW = xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
      {/* ── Layered background ── */}
      <LinearGradient
        colors={['#060410', '#0A070F', '#080512', '#060410']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Deep radial glow from centre */}
      <Svg style={StyleSheet.absoluteFill as never} pointerEvents="none">
        <Defs>
          <SvgRG id="centre" cx="50%" cy="35%" r="50%">
            <Stop offset="0%"   stopColor="#C8820A" stopOpacity="0.18" />
            <Stop offset="60%"  stopColor="#7B2FBE" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRG>
        </Defs>
        <Circle cx="50%" cy="35%" r="70%" fill="url(#centre)" />
      </Svg>

      {/* Grid lines for depth */}
      <Svg style={[StyleSheet.absoluteFill as never, { opacity: 0.04 }]} pointerEvents="none">
        {[...Array(10)].map((_, i) => (
          <Path key={`h${i}`} d={`M0,${SH * i / 9} L${SW},${SH * i / 9}`} stroke="#C8820A" strokeWidth="1" />
        ))}
        {[...Array(8)].map((_, i) => (
          <Path key={`v${i}`} d={`M${SW * i / 7},0 L${SW * i / 7},${SH}`} stroke="#C8820A" strokeWidth="1" />
        ))}
      </Svg>

      <AmbientParticles />

      <DailyStreakModal
        visible={showStreakModal} streak={profile.loginStreak}
        onClaim={handleClaimStreak} onDismiss={dismissStreakModal}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 90, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Player header bar ── */}
        <Animated.View style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerSlide }] }]}>
          {/* Avatar with animated ring */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: profile.avatarFrameColor, shadowColor: profile.avatarFrameColor }]}>
              <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
            </View>
            <View style={[styles.levelBubble, { backgroundColor: rankData.color }]}>
              <Text style={styles.levelBubbleTxt}>{xpToLevel(profile.xp)}</Text>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{profile.name}</Text>
            <View style={styles.rankRow}>
              <RankBadge rank={profile.rank} size="sm" showLabel />
              {profile.loginStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={{ fontSize: 10 }}>🔥</Text>
                  <Text style={styles.streakTxt}>{profile.loginStreak}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={styles.coinBadge}>
              <Text style={{ fontSize: 13 }}>🪙</Text>
              <Text style={styles.coinTxt}>{profile.coins.toLocaleString()}</Text>
            </View>
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Feather name="settings" size={16} color="#FFFFFF55" />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── XP progress bar ── */}
        <View style={styles.xpBarWrap}>
          <View style={styles.xpBarBg}>
            <Animated.View style={[styles.xpBarFill, { width: xpBarW as never, backgroundColor: rankData.color }]} />
            {/* Shimmer on bar */}
            <Animated.View pointerEvents="none" style={[
              styles.xpBarShimmer,
              { transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [-1, 2], outputRange: [-40, 300] }) }, { skewX: '-20deg' }] },
            ]} />
          </View>
          <Text style={styles.xpBarLabel}>
            {rankInfo.next ? `${rankInfo.remaining.toLocaleString()} XP → ${rankInfo.next}` : '✨ MAX RANK'}
          </Text>
        </View>

        {/* ── Crown + Title ── */}
        <Animated.View style={[styles.titleBlock, { opacity: titleOp, transform: [{ translateY: titleSlide }] }]}>
          <CrownLogo />
          <EpicTitle />
        </Animated.View>

        {/* ── BATTLE button (Clash Royale style) ── */}
        <BattleButton onPress={() => handlePlay('ranked')} />

        {/* ── Quick mode buttons ── */}
        <View style={styles.quickRow}>
          <Pressable onPress={() => handlePlay('casual')} style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.8 }]}>
            <LinearGradient colors={['#1A3A5C', '#1E8AAA', '#147898']} style={StyleSheet.absoluteFill as never} />
            <Animated.View pointerEvents="none" style={[styles.shimmer, {
              transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [-1, 2], outputRange: [-40, 220] }) }, { skewX: '-20deg' }],
            }]} />
            <Text style={{ fontSize: 20 }}>🎮</Text>
            <Text style={styles.quickBtnText}>CASUAL</Text>
          </Pressable>
          <Pressable
            onPress={playerRankIdx >= 5 ? handleStartGauntlet : undefined}
            style={({ pressed }) => [
              styles.quickBtn,
              { opacity: playerRankIdx >= 5 ? (pressed ? 0.8 : 1) : 0.45 },
            ]}
          >
            <LinearGradient
              colors={playerRankIdx >= 5 ? ['#2A1800', '#C8820A44', '#2A1800'] : ['#1A1A2E', '#252535']}
              style={StyleSheet.absoluteFill as never}
            />
            <Text style={{ fontSize: 20 }}>⚔️</Text>
            <Text style={[styles.quickBtnText, { color: playerRankIdx >= 5 ? '#FFD700' : '#FFFFFF44' }]}>GAUNTLET</Text>
            {playerRankIdx < 5 && <Text style={styles.quickBtnLock}>💎 DIAMOND+</Text>}
          </Pressable>
        </View>

        {/* ── Super ability selector ── */}
        <View style={styles.superSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ YOUR SUPER</Text>
            <Text style={styles.sectionSub}>Charge 10 blocks → unleash</Text>
          </View>
          <View style={styles.superRow}>
            {([
              { id: 1 as SuperType, icon: '⚔️', name: 'IRON WALL',  desc: 'Goal blocked\n3 seconds',          color: '#C8820A' },
              { id: 2 as SuperType, icon: '🌀', name: 'SLOW FIELD', desc: 'Incoming balls\ncrawl to a stop',   color: '#00E5FF' },
              { id: 3 as SuperType, icon: '💥', name: 'BANISH',     desc: 'Scoring ball\nvanishes from play',  color: '#BF5FFF' },
            ] as { id: SuperType; icon: string; name: string; desc: string; color: string }[]).map(sup => {
              const active = (profile.selectedSuper ?? 1) === sup.id;
              return (
                <Pressable
                  key={sup.id}
                  onPress={() => setSelectedSuper(sup.id)}
                  style={({ pressed }) => [
                    styles.superCard,
                    {
                      borderColor: active ? sup.color : '#FFFFFF1A',
                      shadowColor: active ? sup.color : 'transparent',
                      shadowOpacity: active ? 0.7 : 0,
                      transform: [{ scale: pressed ? 0.95 : active ? 1.03 : 1 }],
                    },
                  ]}
                >
                  {active && (
                    <LinearGradient colors={[sup.color + '33', sup.color + '11']} style={StyleSheet.absoluteFill} />
                  )}
                  <Text style={styles.superIcon}>{sup.icon}</Text>
                  <Text style={[styles.superName, { color: active ? sup.color : '#FFFFFF77' }]}>{sup.name}</Text>
                  <Text style={[styles.superDesc, { color: active ? sup.color + 'AA' : '#FFFFFF33' }]}>{sup.desc}</Text>
                  {active && (
                    <View style={[styles.superBadge, { backgroundColor: sup.color + '33', borderColor: sup.color + '88' }]}>
                      <Text style={[styles.superBadgeTxt, { color: sup.color }]}>EQUIPPED</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Extra Game Modes — 3D cards ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎮 GAME MODES</Text>
          <Text style={styles.sectionSub}>Tap to jump in</Text>
        </View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
          style={{ marginLeft: -18, paddingLeft: 18, marginBottom: 20 }}
        >
          {([
            { id: 'duos',         emoji: '👥', name: 'DUOS',         sub: '2v2 Teams',        color: '#00E5FF' },
            { id: 'blitz',        emoji: '⚡', name: 'BLITZ',        sub: '1 Life · Fast',    color: '#FFD700' },
            { id: 'chaos',        emoji: '🌪️', name: 'CHAOS',        sub: '5 Balls',           color: '#FF6B35' },
            { id: 'survival',     emoji: '🛡️', name: 'SURVIVAL',     sub: '12 Lives',          color: '#00FF88' },
            { id: 'sudden_death', emoji: '💀', name: 'SUDDEN DEATH', sub: '1 Life · 3 Balls', color: '#FF4757' },
            { id: 'turbo',        emoji: '🚀', name: 'TURBO',        sub: '1.8× Speed',        color: '#BF5FFF' },
            { id: 'pinball',      emoji: '🎰', name: 'PINBALL',      sub: 'Ball Every 3s',     color: '#FF69B4' },
            { id: 'six_player',   emoji: '6️⃣', name: '6-PLAYER',     sub: '6 Zones',           color: '#FF9500' },
          ] as const).map(m => (
            <ModeCard3D
              key={m.id} emoji={m.emoji} name={m.name} sub={m.sub} color={m.color}
              onPress={() => handlePlayMode(m.id)}
            />
          ))}
        </ScrollView>

        {/* ── Stats ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 YOUR STATS</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCounter value={profile.wins}    label="WINS"     icon="🏆" color="#FFD700" />
          <StatCounter value={winRate}         label="WIN RATE" icon="📈" color="#00FF88" />
          <StatCounter value={profile.winStreak} label="STREAK" icon="🔥" color="#FF4757" />
        </View>

        {/* ── Live Event Banner ── */}
        <LiveEventBanner />

        {/* ── Season Pass ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 SEASON PASS</Text>
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonBadgeTxt}>SEASON 7</Text>
          </View>
        </View>
        <Text style={[styles.sectionSub, { marginBottom: 10 }]}>
          {profile.totalGames} games played this season
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierScroll}>
          {SEASON_TIERS.map((tier, i) => (
            <TierCard
              key={i} tier={tier} index={i}
              totalGames={profile.totalGames}
              claimed={profile.seasonPassClaimed.includes(i)}
              onClaim={claimSeasonTier}
            />
          ))}
        </ScrollView>

        {/* ── Daily Challenge ── */}
        <View style={styles.challengeCard}>
          <LinearGradient colors={['#1A1000', '#100A00']} style={StyleSheet.absoluteFill as never} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>☀️</Text>
              <Text style={styles.challengeTitle}>DAILY CHALLENGE</Text>
            </View>
            <View style={styles.challengeRewardBadge}>
              <Text style={styles.challengeRewardTxt}>+100 🪙</Text>
            </View>
          </View>
          <Text style={styles.challengeDesc}>Win 3 matches today</Text>
          <View style={styles.challengeDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.challengeDot, {
                backgroundColor: i < (profile.wins % 3) ? '#C8820A' : '#FFFFFF15',
                shadowColor: i < (profile.wins % 3) ? '#C8820A' : 'transparent',
                shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
              }]} />
            ))}
            <Text style={styles.challengeProgress}>{profile.wins % 3}/3 wins</Text>
          </View>
        </View>

        {/* ── Login streak ── */}
        <View style={styles.streakCard}>
          <LinearGradient colors={['#1A1208', '#0E0A04']} style={StyleSheet.absoluteFill as never} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 28 }}>
              {profile.loginStreak >= 7 ? '💎' : profile.loginStreak >= 5 ? '🔥' : '⚡'}
            </Text>
            <View>
              <Text style={styles.streakCardTitle}>LOGIN STREAK</Text>
              <Text style={styles.streakCardDay}>Day {profile.loginStreak || 1} 🔥</Text>
            </View>
          </View>
          <View style={styles.streakDots}>
            {[...Array(7)].map((_, i) => (
              <View key={i} style={[styles.streakDot, {
                backgroundColor: i < Math.min(profile.loginStreak, 7) ? '#C8820A' : '#FFFFFF15',
                shadowColor: '#C8820A',
                shadowOpacity: i < Math.min(profile.loginStreak, 7) ? 0.8 : 0,
                shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
              }]} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060410' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarWrap: { position: 'relative', width: 52, height: 52 },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    backgroundColor: '#FFFFFF0A',
  },
  avatarEmoji: { fontSize: 28 },
  levelBubble: {
    position: 'absolute', bottom: -2, right: -4,
    borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1,
    minWidth: 20, alignItems: 'center',
  },
  levelBubbleTxt: { color: '#000', fontSize: 9, fontFamily: 'Inter_700Bold' },
  playerName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 0.3 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FF450022', borderWidth: 1, borderColor: '#FF450055',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  streakTxt: { color: '#FF4500', fontFamily: 'Inter_700Bold', fontSize: 10 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFD70018', borderWidth: 1, borderColor: '#FFD70044',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  coinTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 13 },
  settingsBtn: {
    backgroundColor: '#FFFFFF0A', borderWidth: 1, borderColor: '#FFFFFF15',
    borderRadius: 8, padding: 6, alignItems: 'center', justifyContent: 'center',
  },

  // XP bar
  xpBarWrap: { marginBottom: 2 },
  xpBarBg: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF12', overflow: 'hidden' },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpBarShimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 30,
    backgroundColor: '#FFFFFF', opacity: 0.25, borderRadius: 4,
  },
  xpBarLabel: { color: '#FFFFFF44', fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 4, textAlign: 'right' },

  // Crown + title block
  titleBlock: { alignItems: 'center', paddingVertical: 12 },

  // Title layers
  titleShadow3: {
    position: 'absolute', fontFamily: 'Inter_900Black', fontSize: 38, letterSpacing: 3,
    color: '#3A1500',
  },
  titleShadow2: {
    position: 'absolute', fontFamily: 'Inter_900Black', fontSize: 38, letterSpacing: 3,
    color: '#7A3A00',
  },
  titleMain: {
    fontFamily: 'Inter_900Black', fontSize: 38, letterSpacing: 3,
    color: '#FFD700',
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  titleArena: {
    fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 12,
    color: '#FFFFFF99',
    textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
    marginTop: 2,
  },
  titleTagline: {
    fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.5,
    color: '#FFFFFF44', marginTop: 6,
  },

  // Battle button
  pulseRing: {
    position: 'absolute', width: 200, height: 76, borderRadius: 38, borderWidth: 2,
  },
  battleBtn: {
    width: 200, height: 76, borderRadius: 38,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    overflow: 'hidden',
    shadowColor: '#FFD700', shadowRadius: 20, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
    borderWidth: 1.5, borderColor: '#FFD70088',
  },
  battleBtnShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
    backgroundColor: '#FFFFFF', opacity: 0.15, borderTopLeftRadius: 38, borderTopRightRadius: 38,
  },
  battleBtnIcon: { fontSize: 26 },
  battleBtnText: {
    fontFamily: 'Inter_900Black', fontSize: 24, color: '#0A0500',
    letterSpacing: 1, textShadowColor: '#FFFFFF44', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0,
  },
  battleBtnSub: {
    position: 'absolute', bottom: 8, right: 20,
    fontFamily: 'Inter_600SemiBold', fontSize: 7, color: '#00000066', letterSpacing: 1.5,
  },

  // Quick row
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickBtn: {
    flex: 1, height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF18',
  },
  quickBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' },
  quickBtnLock: { position: 'absolute', bottom: 5, fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF44' },

  // Shimmer
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 40,
    backgroundColor: '#FFFFFF', opacity: 0.12, borderRadius: 4,
  },

  // Super selector
  superSection: { marginBottom: 24 },
  superRow: { flexDirection: 'row', gap: 8 },
  superCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5,
    padding: 12, alignItems: 'center', gap: 4, overflow: 'hidden',
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    backgroundColor: '#FFFFFF06',
  },
  superIcon: { fontSize: 24, marginBottom: 2 },
  superName: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  superDesc: { fontFamily: 'Inter_400Regular', fontSize: 8, textAlign: 'center', lineHeight: 12 },
  superBadge: {
    marginTop: 4, borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  superBadgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FFFFFF99',
  },
  sectionSub: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF44' },

  // 3D mode cards
  modeCard3D: {
    width: 130, height: 150, borderRadius: 20, borderWidth: 1.5,
    padding: 14, alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden',
    backgroundColor: '#FFFFFF05',
    shadowRadius: 12, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 },
  },
  mode3DEmoji: { fontSize: 32, marginBottom: 2 },
  mode3DName:  { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  mode3DSub:   { fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center' },
  mode3DChip: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  mode3DChipTxt: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard3D: {
    flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 14,
    alignItems: 'center', gap: 4, overflow: 'hidden',
    shadowRadius: 10, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 },
  },
  statVal:  { fontFamily: 'Inter_900Black', fontSize: 22, letterSpacing: -0.5 },
  statLbl:  { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF55' },

  // Challenge card
  challengeCard: {
    borderRadius: 20, borderWidth: 1.5, borderColor: '#C8820A44',
    padding: 16, marginBottom: 14, overflow: 'hidden',
  },
  challengeTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, color: '#C8820A' },
  challengeDesc:  { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF88', marginBottom: 12 },
  challengeRewardBadge: {
    backgroundColor: '#FFD70022', borderWidth: 1, borderColor: '#FFD70044',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  challengeRewardTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 12 },
  challengeDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeDot: { width: 16, height: 16, borderRadius: 8 },
  challengeProgress: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#FFFFFF44', marginLeft: 4 },

  // Streak card
  streakCard: {
    borderRadius: 20, borderWidth: 1.5, borderColor: '#C8820A33',
    padding: 16, marginBottom: 14, overflow: 'hidden',
  },
  streakCardTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, color: '#C8820A' },
  streakCardDay:   { fontFamily: 'Inter_900Black', fontSize: 18, color: '#FFD700' },
  streakDots: { flexDirection: 'row', gap: 8 },
  streakDot: { width: 28, height: 28, borderRadius: 8 },

  // Season
  seasonBadge: {
    backgroundColor: '#FF475722', borderWidth: 1, borderColor: '#FF475555',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  seasonBadgeTxt: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  tierScroll: { gap: 8, paddingBottom: 4, marginBottom: 16 },
});

// ─── Tier card sub-styles ─────────────────────────────────────────────────────
const st = StyleSheet.create({
  tierCard: {
    width: 90, borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF1A',
    backgroundColor: '#FFFFFF08', padding: 10, alignItems: 'center', gap: 3,
  },
  tierIcon:    { fontSize: 22 },
  tierName:    { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  tierGames:   { fontFamily: 'Inter_400Regular', fontSize: 8, color: '#FFFFFF44' },
  tierReward:  { fontFamily: 'Inter_500Medium',  fontSize: 8, color: '#FFFFFF66', textAlign: 'center' },
  claimedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  claimedText: { color: '#00FF88', fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 0.5 },
  claimTierBtn:{
    marginTop: 4, backgroundColor: '#C8820A33', borderWidth: 1, borderColor: '#C8820A88',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  claimTierText: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 8 },
  lockedBadge: { marginTop: 4 },
});
