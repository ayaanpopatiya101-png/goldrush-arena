import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Image, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { RankBadge } from '@/components/RankBadge';
import { AmbientParticles } from '@/components/AmbientParticles';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import { FloatingOrbs, ORBS_GOLD, GlowText, ShimmerCard, PulseRing } from '@/components/effects';
import {
  RANKS, getRankIndex, SEASON_TIERS, SKINS, SUPERS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
type SuperType = 1 | 2 | 3;
import { setGameConfig } from '@/store/gameSession';
import type { MatchType, GameVariant } from '@/store/gameSession';
import { startGauntlet } from '@/store/gauntletSession';
import { useColors } from '@/hooks/useColors';

// ─── Mini arena preview ──────────────────────────────────────────────────────
function MiniArena() {
  const ballX = useRef(new Animated.Value(60)).current;
  const ballY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ballX, { toValue: 110, duration: 800, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 20,  duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 25, duration: 650, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 90, duration: 650, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 100, duration: 700, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 55,  duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ballX, { toValue: 60, duration: 550, useNativeDriver: true }),
          Animated.timing(ballY, { toValue: 100, duration: 550, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={mini.arena}>
      <LinearGradient colors={['#0C0804', '#1A1008', '#0C0804']} style={StyleSheet.absoluteFill} />
      <View style={[mini.wallH, { bottom: 0, backgroundColor: '#C8820A88' }]} />
      <View style={[mini.wallH, { top:    0, backgroundColor: '#C0382088' }]} />
      <View style={[mini.wallV, { left:   0, backgroundColor: '#1E8AAA88' }]} />
      <View style={[mini.wallV, { right:  0, backgroundColor: '#4A8A3888' }]} />
      <View style={[mini.paddleH, { bottom: 10, left: 30, backgroundColor: '#C8820A' }]} />
      <View style={[mini.paddleH, { top:    10, left: 50, backgroundColor: '#C03820' }]} />
      <View style={[mini.paddleV, { left:   10, top:  35, backgroundColor: '#1E8AAA' }]} />
      <View style={[mini.paddleV, { right:  10, top:  50, backgroundColor: '#4A8A38' }]} />
      <Animated.View style={[mini.ball, { transform: [{ translateX: ballX }, { translateY: ballY }] }]} />
      <View style={mini.border} />
    </View>
  );
}

// ─── Season pass tier card ───────────────────────────────────────────────────
function TierCard({ tier, index, totalGames, claimed, onClaim }: {
  tier: typeof SEASON_TIERS[0]; index: number; totalGames: number;
  claimed: boolean; onClaim: (i: number) => void;
}) {
  const isUnlocked = totalGames >= tier.games;
  const isCurrent  = isUnlocked && (index === SEASON_TIERS.length - 1 || totalGames < SEASON_TIERS[index + 1].games);

  return (
    <ShimmerCard borderRadius={12} active={isCurrent || isUnlocked} shimmerColor="rgba(200,130,10,0.14)" style={[
      st.tierCard,
      isCurrent && { borderColor: '#C8820A66', backgroundColor: '#C8820A11' },
      !isUnlocked && { opacity: 0.45 },
    ]}>
      {/* Tier icon */}
      <Text style={st.tierIcon}>{tier.icon}</Text>
      <Text style={[st.tierName, { color: isCurrent ? '#C8820A' : '#FFFFFF88' }]}>{tier.name}</Text>
      <Text style={st.tierGames}>{tier.games}+ games</Text>
      <Text style={st.tierReward}>{tier.reward}</Text>

      {/* Claim / status */}
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
        <View style={st.lockedBadge}>
          <Feather name="lock" size={10} color="#FFFFFF44" />
        </View>
      )}
    </ShimmerCard>
  );
}

// ─── Per-super accent colors ──────────────────────────────────────────────────
// ─── AI-generated premium icon images ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CROWN_IMG = require('../../assets/images/crown.png') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SUPER_IMAGES: Record<number, number> = {
  1: require('../../assets/images/super_rampart.png'),
  2: require('../../assets/images/super_deadzone.png'),
  3: require('../../assets/images/super_shatter.png'),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODE_IMAGES: Partial<Record<string, number>> = {
  chaos: require('../../assets/images/mode_chaos.png'),
  blitz: require('../../assets/images/mode_blitz.png'),
};

const SUPER_COLORS: Record<number, string> = {
  1: '#00BFFF', // RAMPART  — electric steel blue
  2: '#BF5FFF', // DEAD ZONE — void purple
  3: '#FF6B35', // SHATTER  — explosive orange
};

// ─── Home screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const {
    profile, isLoaded, showStreakModal, dismissStreakModal,
    claimDailyStreak, claimSeasonTier, setSelectedSuper,
  } = usePlayer();
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const glowAnim       = useRef(new Animated.Value(0)).current;
  const shimmerAnim    = useRef(new Animated.Value(-1)).current;
  const titleGlowAnim  = useRef(new Animated.Value(0)).current;
  const floatCrownAnim = useRef(new Animated.Value(0)).current;
  const rotateCrownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim,  { toValue: 1.05, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim,  { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 2, duration: 1800, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(shimmerAnim, { toValue: -1, duration: 0,   useNativeDriver: true }),
      ])
    );
    const titleGlow = Animated.loop(Animated.sequence([
      Animated.timing(titleGlowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(titleGlowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    const crownFloat = Animated.loop(Animated.sequence([
      Animated.timing(floatCrownAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(floatCrownAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const crownRotate = Animated.loop(Animated.sequence([
      Animated.timing(rotateCrownAnim, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(rotateCrownAnim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    pulse.start(); glow.start(); shimmer.start(); titleGlow.start();
    crownFloat.start(); crownRotate.start();
    return () => { pulse.stop(); glow.stop(); shimmer.stop(); titleGlow.stop(); crownFloat.stop(); crownRotate.stop(); };
  }, []);

  function handlePlay(matchType: MatchType) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: profile.currentRelic,
      matchType, variant: 'classic',
    });
    router.push('/lobby');
  }

  function handlePlayMode(variant: GameVariant) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: profile.currentRelic,
      matchType: 'casual', variant,
    });
    router.push('/lobby');
  }

  function handlePlayEliteMode(variant: GameVariant) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: profile.currentRelic,
      matchType: 'ranked', variant,
    });
    router.push('/lobby');
  }

  function handleStartGauntlet() {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    const firstVariant = startGauntlet();
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      playerRelicId: profile.currentRelic,
      matchType: 'gauntlet', variant: firstVariant,
    });
    router.push('/lobby');
  }

  async function handleClaimStreak() {
    await claimDailyStreak();
    dismissStreakModal();
  }

  const rankInfo     = xpForNextRank(profile.xp);
  const rankData     = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const playerRankIdx = getRankIndex(profile.rank);
  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate  = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#07090F' }} />;

  return (
    <View style={styles.root}>
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.8} />
      {/* ── Cinematic 5-layer background depth system ─────────────────────── */}
      {/* 1. Deep base — richer midnight blue-black, not flat CSS black */}
      <LinearGradient colors={['#070B1E', '#04060E', '#06091A']} style={StyleSheet.absoluteFill} />
      {/* 2. Top atmospheric warmth — gold veil; 2× stronger and 45% taller than before */}
      <LinearGradient
        colors={['#C8820A2E', '#C8820A14', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 580 }}
        pointerEvents="none"
      />
      {/* 3. Cinematic spotlight column — warm amber shaft behind the arena center */}
      <LinearGradient
        colors={['#C8820A1C', '#C8820A0C', 'transparent']}
        style={{ position: 'absolute', top: 0, left: '16%', right: '16%', height: 480 }}
        pointerEvents="none"
      />
      {/* 4. Edge vignette — dark edges pull the eye inward to the arena */}
      <LinearGradient
        colors={['#04060E70', 'transparent', 'transparent', '#04060E70']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      {/* 5. Ground atmosphere — cool blue depth at bottom creates a horizon sense */}
      <LinearGradient
        colors={['transparent', '#0508189A']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 360 }}
        pointerEvents="none"
      />
      <AmbientParticles />

      {/* Daily streak modal */}
      <DailyStreakModal
        visible={showStreakModal}
        streak={profile.loginStreak}
        onClaim={handleClaimStreak}
        onDismiss={dismissStreakModal}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.playerInfo}>
            {/* Avatar with animated glow ring */}
            <View style={{ position: 'relative' }}>
              <Animated.View style={{
                position: 'absolute', inset: -3,
                borderRadius: 30, borderWidth: 2,
                borderColor: profile.avatarFrameColor + '60',
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              }} />
              <View style={[styles.avatar, { borderColor: profile.avatarFrameColor, backgroundColor: profile.avatarFrameColor + '28' }]}>
                <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
              </View>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.playerName}>{profile.name}</Text>
              <View style={styles.streakRow}>
                <View style={{ backgroundColor: rankData.color + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: rankData.color, letterSpacing: 0.5 }}>
                    LV.{xpToLevel(profile.xp)}
                  </Text>
                </View>
                {profile.loginStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakIcon}>🔥</Text>
                    <Text style={styles.streakCount}>{profile.loginStreak}d</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinText}>{profile.coins.toLocaleString()}</Text>
            </View>
            <RankBadge rank={profile.rank} size="sm" showLabel={false} />
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Feather name="settings" size={18} color="#FFFFFF44" />
            </Pressable>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBar}>
          <View style={[styles.xpTrack, { backgroundColor: '#FFFFFF12' }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#FFFFFF28', borderRadius: 4 }} />
            </View>
          </View>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
            {rankInfo.next ? `${rankInfo.remaining} XP to ${rankInfo.next}` : 'MAX RANK'}
          </Text>
        </View>

        {/* Mini arena — 3D perspective table */}
        <View style={styles.arenaWrap}>
          {/* Arena stage glow — two concentric halos for depth */}
          {/* Outer diffuse aura */}
          <View pointerEvents="none" style={{
            position: 'absolute',
            top: -40, width: 340, height: 210, borderRadius: 170,
            backgroundColor: '#C8820A', opacity: 0.05,
            shadowColor: '#C8820A', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1, shadowRadius: 110,
          }} />
          {/* Inner focused halo — more saturated, brighter center */}
          <View pointerEvents="none" style={{
            position: 'absolute',
            top: 0, width: 210, height: 125, borderRadius: 105,
            backgroundColor: '#D49828', opacity: 0.10,
            shadowColor: '#D49828', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1, shadowRadius: 58,
          }} />
          <View style={{ transform: [{ perspective: 500 }, { rotateX: '18deg' }], shadowColor: '#C8820A', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 }}>
            <MiniArena />
          </View>
          {/* Floor glow */}
          <View style={{ width: 130, height: 10, borderRadius: 65, backgroundColor: '#C8820A', opacity: 0.18, marginTop: 6, alignSelf: 'center' }} />
        </View>

        {/* Floating 3D crown */}
        <Animated.View style={{ alignItems: 'center', marginBottom: 2, transform: [
          { translateY: floatCrownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
          { perspective: 800 },
          { rotateY: rotateCrownAnim.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) },
        ] }}>
          <Image source={CROWN_IMG} style={{ width: 74, height: 74 }} resizeMode="contain" />
        </Animated.View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Animated.View style={{
            opacity: titleGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
            transform: [{ scale: titleGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.015] }) }],
          }}>
            <GlowText intensity="medium" color="#C8820A" style={styles.gameTitle}>GOLDRUSH ARENA</GlowText>
          </Animated.View>
          <Text style={styles.gameSubtitle}>4-PLAYER AIR HOCKEY · LAST ONE STANDING WINS</Text>
        </View>

        {/* Play buttons — Hero RANKED + Secondary CASUAL */}
        <View style={styles.playWrap}>
          {/* RANKED — Hero CTA */}
          <Animated.View style={{
            marginBottom: 10,
            transform: [{ scale: pulseAnim }],
            shadowColor: '#C8820A', shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.9, shadowRadius: 32, elevation: 18,
          }}>
            <Pressable
              onPress={() => handlePlay('ranked')}
              style={({ pressed }) => [styles.rankedBtn, pressed && { transform: [{ scale: 0.97 }, { translateY: 2 }], opacity: 0.94 }]}
            >
              <LinearGradient colors={['#F0A428', '#D08A14', '#A86008', '#7A4800']} style={styles.rankedBtnGrad}>
                {/* Top highlight edge */}
                <View style={styles.rankedBtnHighlight} />
                {/* Bottom 3D edge — depth illusion */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: '#00000060', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }} />
                {/* Shimmer sweep */}
                <Animated.View pointerEvents="none" style={[styles.shimmerSweep, {
                  transform: [
                    { translateX: shimmerAnim.interpolate({ inputRange: [-1, 2], outputRange: [-140, 300] }) },
                    { skewX: '-18deg' },
                  ],
                }]} />
                <Text style={styles.rankedBtnIcon}>⚔️</Text>
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <GlowText intensity="medium" color="#FFD700" style={styles.rankedBtnText}>RANKED</GlowText>
                  <Text style={styles.rankedBtnSub}>WIN XP · CLIMB RANKS · EARN GLORY</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#07090F66" />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* CASUAL — Secondary CTA */}
          <Pressable
            onPress={() => handlePlay('casual')}
            style={({ pressed }) => [styles.casualBtn, pressed && { opacity: 0.86, transform: [{ scale: 0.97 }, { translateY: 1 }] }]}
          >
            <LinearGradient colors={['#0D2533', '#081828', '#0A1E2A']} style={styles.casualBtnGrad}>
              {/* Top highlight edge */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: '#1E8AAA28', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
              {/* Bottom depth edge */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#00000035', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />
              <Text style={{ fontSize: 16 }}>🎮</Text>
              <GlowText intensity="medium" color="#FFD700" style={styles.casualBtnText}>CASUAL</GlowText>
              <Text style={styles.casualBtnSub}>· No rank effect</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Super Ability Selector ── */}
        <View style={styles.superSection}>
          {(() => {
            const sc = SUPER_COLORS[profile.selectedSuper ?? 1] ?? '#FFD700';
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <View style={{ width: 3, height: 16, backgroundColor: sc, borderRadius: 2 }} />
                <Text style={[styles.superTitle, { color: sc }]}>SUPER ABILITIES</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 8, color: sc + '66', letterSpacing: 1 }}>CHARGE 10 BLOCKS</Text>
              </View>
            );
          })()}
          <Text style={styles.superSubtitle}>Tap to unleash when charged during a match</Text>
          <View style={styles.superRow}>
            {SUPERS.map(sup => {
              const active = (profile.selectedSuper ?? 1) === sup.id;
              const unlocked = profile.level >= sup.unlockLevel;
              const supColor = SUPER_COLORS[sup.id] ?? '#FFD700';
              return (
                <Pressable
                  key={sup.id}
                  onPress={() => unlocked && setSelectedSuper(sup.id)}
                  style={({ pressed }) => [styles.superCard, {
                    borderColor: !unlocked ? '#FFFFFF0D' : active ? supColor : '#FFFFFF18',
                    backgroundColor: !unlocked ? '#FFFFFF03' : active ? supColor + '1C' : supColor + '07',
                    opacity: !unlocked ? 0.45 : pressed ? 0.82 : 1,
                    transform: [{ scale: pressed && unlocked ? 0.97 : 1 }],
                  }]}
                >
                  {active && unlocked && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: supColor, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                  )}
                  {!unlocked && (
                    <View style={styles.superLockBadge}>
                      <Text style={styles.superLockTxt}>LV.{sup.unlockLevel}</Text>
                    </View>
                  )}
                  <Image
                    source={SUPER_IMAGES[sup.id]}
                    style={{ width: 46, height: 46, opacity: unlocked ? 1 : 0.35 }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.superName, { color: !unlocked ? '#FFFFFF33' : active ? supColor : '#FFFFFF88' }]}>{sup.name}</Text>
                  <Text style={[styles.superDesc, { color: !unlocked ? '#FFFFFF1A' : active ? supColor + 'AA' : '#FFFFFF44' }]}>{sup.desc}</Text>
                  {active && unlocked && (
                    <View style={[styles.superActiveBadge, { backgroundColor: supColor + '22', borderColor: supColor + 'BB' }]}>
                      <Text style={[styles.superActiveTxt, { color: supColor }]}>EQUIPPED</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>


        {/* ── Champion's Gauntlet ── */}
        {(() => {
          const locked = playerRankIdx < 9;
          return (
            <Pressable
              onPress={locked ? undefined : handleStartGauntlet}
              style={({ pressed }) => [
                {
                  marginHorizontal: 0, marginBottom: 16, borderRadius: 20,
                  borderWidth: 1.5, overflow: 'hidden',
                  borderColor: locked ? '#FFFFFF1A' : '#C8820A66',
                  opacity: locked ? 0.85 : (pressed ? 0.88 : 1),
                },
              ]}
            >
              <LinearGradient
                colors={locked ? ['#141008', '#0E0C06'] : ['#2A1800', '#1A1000', '#0E0A04']}
                style={{ padding: 20 }}
              >
                {/* Top row: title + diamond badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <View>
                    <Text style={{ fontSize: 10, letterSpacing: 3, color: '#C8820A', fontFamily: 'Inter_700Bold', marginBottom: 4 }}>
                      EXCLUSIVE MODE
                    </Text>
                    <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: locked ? '#FFFFFF55' : '#FFD700', letterSpacing: 0.5 }}>
                      ⚔️ CHAMPION'S{'\n'}GAUNTLET
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: locked ? '#FFFFFF10' : '#B9F2FF22',
                    borderColor: locked ? '#FFFFFF28' : '#B9F2FF66',
                    borderWidth: 1, borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 5,
                  }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: locked ? '#FFFFFF55' : '#B9F2FF' }}>
                      💎 DIAMOND+
                    </Text>
                  </View>
                </View>

                {/* Feature chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
                  {[
                    { label: '🏆 First to 5 wins', color: '#FFD700' },
                    { label: '🎲 Rotating variants', color: '#BF5FFF' },
                    { label: '4 Players', color: '#00E5FF' },
                    { label: '3× XP bonus', color: '#00FF88' },
                  ].map(f => (
                    <View key={f.label} style={{
                      backgroundColor: locked ? '#FFFFFF08' : f.color + '18',
                      borderColor: locked ? '#FFFFFF18' : f.color + '44',
                      borderWidth: 1, borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: locked ? '#FFFFFF44' : f.color }}>
                        {f.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action area */}
                {locked ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: '#FFFFFF0A', borderRadius: 10,
                    paddingVertical: 10, paddingHorizontal: 14,
                  }}>
                    <Text style={{ fontSize: 16 }}>🔒</Text>
                    <Text style={{ color: '#FFFFFF55', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                      Reach Diamond rank to unlock this mode
                    </Text>
                  </View>
                ) : (
                  <View style={{ borderRadius: 14, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={['#E8A030', '#C8820A', '#9A6208', '#7A4A06']}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 }}
                    >
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: '#FFFFFF45', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: '#00000055', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />
                      <Text style={{ color: '#07090F', fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 }}>ENTER THE GAUNTLET</Text>
                      <Text style={{ fontSize: 16 }}>⚔️</Text>
                    </LinearGradient>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })()}

        {/* ── Elite Modes ── */}
        {(() => {
          const eliteModes = [
            {
              id: 'storm_surge' as GameVariant,
              emoji: '⚡',
              name: 'STORM SURGE',
              rankLabel: '⚡ MASTER 1+',
              lockIdx: 12,
              accent: '#FF8C42',
              bg: ['#1A0A00', '#2A1200', '#1A0A00'] as [string,string,string],
              tagline: '3 balls. 1 life. Max-skill opponents.',
              chips: ['3 balls active','1 life only','Elite bots','2× XP + coins'],
              chipColors: ['#FF4757','#FF8C42','#FF6B35','#00FF88'],
            },
            {
              id: 'ghost_protocol' as GameVariant,
              emoji: '👻',
              name: 'GHOST PROTOCOL',
              rankLabel: '👑 CHAMPION 1+',
              lockIdx: 15,
              accent: '#BF5FFF',
              bg: ['#0E0018', '#1A0030', '#0E0018'] as [string,string,string],
              tagline: 'Balls vanish mid-flight. Navigate by instinct.',
              chips: ['Balls turn invisible','2 lives','2× balls','3× XP + coins'],
              chipColors: ['#BF5FFF','#B9F2FF','#00E5FF','#00FF88'],
            },
            {
              id: 'warlord' as GameVariant,
              emoji: '🔱',
              name: 'WARLORD',
              rankLabel: '💀 CHAMPION 3+',
              lockIdx: 17,
              accent: '#FF2244',
              bg: ['#180004', '#2A0008', '#180004'] as [string,string,string],
              tagline: '1 vs 5 max-rank Generals. Dominate or fall.',
              chips: ['6 players','8 lives (you)','Elite bots','5× XP + coins'],
              chipColors: ['#FF4757','#FFD700','#FF2244','#00FF88'],
            },
          ];
          return (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 11, letterSpacing: 3, color: '#FF8C42', fontFamily: 'Inter_700Bold' }}>⚡  ELITE MODES</Text>
                <Text style={{ fontSize: 11, color: '#FFFFFF55', fontFamily: 'Inter_600SemiBold' }}>Ranked · Higher rewards</Text>
              </View>
              {eliteModes.map(m => {
                const locked = playerRankIdx < m.lockIdx;
                return (
                  <Pressable
                    key={m.id}
                    onPress={locked ? undefined : () => handlePlayEliteMode(m.id)}
                    style={({ pressed }) => [{
                      marginHorizontal: 20, marginBottom: 10, borderRadius: 16,
                      borderWidth: 1.5, overflow: 'hidden' as const,
                      borderColor: locked ? '#FFFFFF1A' : m.accent + '55',
                      opacity: locked ? 0.82 : (pressed ? 0.88 : 1),
                    }]}
                  >
                    <LinearGradient colors={locked ? ['#0E0E10','#0A0A0C'] : m.bg} style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
                          <View>
                            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, color: locked ? '#FFFFFF44' : m.accent }}>
                              {m.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: locked ? '#FFFFFF33' : '#FFFFFF88', marginTop: 1 }}>
                              {m.tagline}
                            </Text>
                          </View>
                        </View>
                        <View style={{
                          backgroundColor: locked ? '#FFFFFF0A' : m.accent + '22',
                          borderColor: locked ? '#FFFFFF22' : m.accent + '66',
                          borderWidth: 1, borderRadius: 8,
                          paddingHorizontal: 8, paddingVertical: 4,
                        }}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: locked ? '#FFFFFF44' : m.accent }}>{m.rankLabel}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {m.chips.map((chip, ci) => (
                          <View key={chip} style={{
                            backgroundColor: locked ? '#FFFFFF08' : m.chipColors[ci]! + '18',
                            borderColor: locked ? '#FFFFFF18' : m.chipColors[ci]! + '44',
                            borderWidth: 1, borderRadius: 6,
                            paddingHorizontal: 8, paddingVertical: 3,
                          }}>
                            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: locked ? '#FFFFFF33' : m.chipColors[ci] }}>{chip}</Text>
                          </View>
                        ))}
                      </View>
                      {locked ? (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 7,
                          backgroundColor: '#FFFFFF08', borderRadius: 8,
                          paddingVertical: 8, paddingHorizontal: 12,
                        }}>
                          <Text style={{ fontSize: 14 }}>🔒</Text>
                          <Text style={{ color: '#FFFFFF44', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                            Reach {m.rankLabel.replace(/^[^ ]+ /, '')} to unlock
                          </Text>
                        </View>
                      ) : (
                        <View style={{ borderRadius: 10, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={[m.accent + '55', m.accent + '30', m.accent + '18']}
                            style={{
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              gap: 8, paddingVertical: 11, borderWidth: 1,
                              borderColor: m.accent + '77', borderRadius: 10,
                            }}
                          >
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: m.accent + '66', borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
                            <Text style={{ color: m.accent, fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 }}>PLAY NOW</Text>
                            <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                          </LinearGradient>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          );
        })()}

        {/* ── Extra Game Modes ── */}
        <View style={styles.modesSection}>
          <View style={[styles.modesSectionHeader, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <View style={{ width: 3, height: 16, backgroundColor: '#BF5FFF', borderRadius: 2 }} />
            <Text style={styles.modesSectionTitle}>EXTRA MODES</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
            <Text style={[styles.modesSectionSub, { color: colors.mutedForeground }]}>Tap to play</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 4 }}
          >
            {([
              { id: 'duos',         emoji: '👥', name: 'DUOS',         sub: '2v2 Teams',       color: '#00E5FF', desc: 'Bottom+Right vs\nTop+Left' },
              { id: 'blitz',        emoji: '⚡', name: 'BLITZ',        sub: '1 Life · Fast',   color: '#C8820A', desc: '1 hit = out.\nLightning fast' },
              { id: 'chaos',        emoji: '🌪️', name: 'CHAOS',        sub: '5 Balls · No PUs',color: '#FF6B35', desc: 'Pure mayhem,\nno mercy' },
              { id: 'survival',     emoji: '🛡️', name: 'SURVIVAL',     sub: '12 Lives',         color: '#00FF88', desc: 'Outlast the\nendless storm' },
              { id: 'sudden_death', emoji: '💀', name: 'SUDDEN DEATH', sub: '1 Life · 3 Balls', color: '#FF4757', desc: 'Zero margin.\nMax chaos' },
              { id: 'turbo',        emoji: '🚀', name: 'TURBO',        sub: '1.8× Speed',       color: '#BF5FFF', desc: 'Warp speed\nfrom second 1' },
              { id: 'pinball',      emoji: '🎰', name: 'PINBALL',      sub: 'Ball Every 3s',    color: '#FF69B4', desc: 'Up to 8 balls\nin play at once' },
              { id: 'six_player',   emoji: '6️⃣', name: '6-PLAYER',     sub: '6 Zones · Split',  color: '#FF9500', desc: 'Split walls,\n6 fighters' },
            ] as const).map(m => (
              <Pressable
                key={m.id}
                onPress={() => handlePlayMode(m.id)}
                style={({ pressed }) => [styles.modePickCard, {
                  borderColor: m.color + '55',
                  backgroundColor: m.color + '0E',
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }, { translateY: pressed ? 2 : 0 }],
                }]}
              >
                {/* Per-mode top color strip */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, backgroundColor: m.color, borderTopLeftRadius: 14, borderTopRightRadius: 14, opacity: 0.9 }} />
                <LinearGradient
                  colors={[m.color + '28', m.color + '08', '#00000000']}
                  style={StyleSheet.absoluteFill}
                />
                {MODE_IMAGES[m.id] != null
                  ? <Image source={MODE_IMAGES[m.id]!} style={{ width: 36, height: 36 }} resizeMode="contain" />
                  : <Text style={styles.modePickEmoji}>{m.emoji}</Text>}
                <Text style={[styles.modePickName, { color: m.color }]}>{m.name}</Text>
                <Text style={[styles.modePickSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
                <Text style={[styles.modePickDesc, { color: m.color + 'BB' }]}>{m.desc}</Text>
                <View style={[styles.modePlayChip, { backgroundColor: m.color + '28', borderColor: m.color + '66' }]}>
                  <Feather name="play" size={8} color={m.color} />
                  <Text style={[styles.modePlayChipText, { color: m.color }]}>PLAY</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#C8820A', borderRadius: 2 }} />
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#C8820A' }}>YOUR STATS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: 'WINS',     value: String(profile.wins),    icon: 'award',   color: '#C8820A' },
            { label: 'WIN RATE', value: profile.totalGames > 0 ? `${winRate}%` : '—', icon: 'percent', color: '#00FF88' },
            { label: 'STREAK',   value: String(profile.winStreak), icon: 'zap',   color: '#BF5FFF' },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.color + '0A', borderColor: stat.color + '28', overflow: 'hidden' }]}>
              {/* Top accent strip */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: stat.color, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
              <Text style={[styles.statValue, { color: '#F0F0FF' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: stat.color + 'AA' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Live Event Banner ── */}
        <LiveEventBanner />

        {/* ── Season Pass ── */}
        <View style={styles.passSection}>
          <View style={styles.passHeader}>
            <View style={{ width: 3, height: 16, backgroundColor: '#FF4757', borderRadius: 2 }} />
            <Text style={styles.passTitle}>SEASON PASS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
            <View style={[styles.activeBadge, { backgroundColor: '#FF475722', borderColor: '#FF475755' }]}>
              <Text style={[styles.activeBadgeText, { color: '#FF4757' }]}>SEASON 7</Text>
            </View>
          </View>
          <Text style={[styles.passSub, { color: colors.mutedForeground }]}>
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
        </View>

        {/* Daily challenge */}
        <View style={[styles.challengeCard, { borderColor: '#C8820A44', overflow: 'hidden' }]}>
          <LinearGradient colors={['#1E1000', '#130C00', '#0E0900']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['#C8820A20', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50 }} />
          <View style={styles.challengeHeader}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#C8820A22', borderWidth: 1, borderColor: '#C8820A44', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="sun" size={15} color="#C8820A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>DAILY CHALLENGE</Text>
              <Text style={styles.challengeDesc}>Win 3 matches today</Text>
            </View>
            <View style={{ backgroundColor: '#C8820A22', borderRadius: 8, borderWidth: 1, borderColor: '#C8820A44', paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#C8820A' }}>+100</Text>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#C8820A88' }}>COINS</Text>
            </View>
          </View>
          {/* Segmented progress bar */}
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
            {[0, 1, 2].map(i => {
              const filled = i < (profile.wins % 3);
              return (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: filled ? '#C8820A' : '#FFFFFF12', overflow: 'hidden' }}>
                  {filled && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: '#FFFFFF30', borderRadius: 4 }} />}
                </View>
              );
            })}
          </View>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF44', marginTop: 4 }}>
            {(profile.wins % 3)}/3 wins today
          </Text>
        </View>

        {/* Login streak card */}
        <Pressable onPress={() => dismissStreakModal()} style={styles.streakCard}>
          <LinearGradient colors={['#1A1008', '#251808']} style={StyleSheet.absoluteFill} />
          <View style={styles.streakCardLeft}>
            <Text style={styles.streakCardIcon}>{profile.loginStreak >= 7 ? '💎' : profile.loginStreak >= 5 ? '🔥' : '⚡'}</Text>
            <View>
              <Text style={styles.streakCardTitle}>LOGIN STREAK</Text>
              <Text style={styles.streakCardDay}>Day {profile.loginStreak || 1}</Text>
            </View>
          </View>
          <View style={styles.streakCalendar}>
            {[...Array(7)].map((_, i) => (
              <View key={i} style={[styles.streakDot, {
                backgroundColor: i < Math.min(profile.loginStreak, 7) ? '#C8820A' : '#FFFFFF22',
              }]} />
            ))}
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const mini = StyleSheet.create({
  arena:   { width: 150, height: 120, overflow: 'hidden', borderRadius: 10 },
  wallH:   { position: 'absolute', left: 0, right: 0, height: 4 },
  wallV:   { position: 'absolute', top: 0, bottom: 0, width: 4 },
  paddleH: { position: 'absolute', width: 44, height: 7, borderRadius: 3.5 },
  paddleV: { position: 'absolute', width: 7, height: 40, borderRadius: 3.5 },
  ball:    { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  border:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.5, borderColor: '#FFFFFF30', borderRadius: 10 },
});

const st = StyleSheet.create({
  tierCard:     { width: 100, backgroundColor: '#FFFFFF08', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF18', padding: 10, alignItems: 'center', gap: 5 },
  tierIcon:     { fontSize: 26 },
  tierName:     { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  tierGames:    { color: '#FFFFFF55', fontFamily: 'Inter_400Regular', fontSize: 8 },
  tierReward:   { color: '#C8820A', fontFamily: 'Inter_600SemiBold', fontSize: 9, textAlign: 'center' },
  claimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#4A8A3822', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  claimedText:  { color: '#4A8A38', fontFamily: 'Inter_700Bold', fontSize: 8 },
  claimTierBtn: { backgroundColor: '#C8820A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  claimTierText: { color: '#07090F', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  lockedBadge:  { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF08', alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 21 },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#F0F0FF', letterSpacing: 0.3 },
  streakRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText:  { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF66' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FF6B3522', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  streakIcon: { fontSize: 9 },
  streakCount: { color: '#FF6B35', fontFamily: 'Inter_700Bold', fontSize: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C8820A1A', borderRadius: 10, borderWidth: 1, borderColor: '#C8820A44', paddingHorizontal: 9, paddingVertical: 4 },
  coinEmoji:  { fontSize: 12 },
  coinText:   { color: '#FFB830', fontFamily: 'Inter_700Bold', fontSize: 13 },
  xpBar:      { paddingHorizontal: 20, marginBottom: 8, gap: 5 },
  xpTrack:    { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill:     { height: '100%', borderRadius: 4 },
  xpText:     { fontFamily: 'Inter_400Regular', fontSize: 10 },
  arenaWrap:  { alignItems: 'center', marginBottom: 6 },
  titleWrap:  { alignItems: 'center', gap: 3, marginBottom: 14, paddingHorizontal: 20 },
  gameTitle:  { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: 4, textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28, textAlign: 'center' },
  gameSubtitle: { color: '#FFFFFF7A', fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  playWrap:   { paddingHorizontal: 20, marginBottom: 20 },
  settingsBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  // Hero RANKED button
  rankedBtn:          { borderRadius: 18, overflow: 'hidden' },
  rankedBtnGrad:      { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  rankedBtnHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: '#FFFFFF50', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  rankedBtnIcon:      { fontSize: 24 },
  rankedBtnText:      { fontFamily: 'Inter_700Bold', fontSize: 21, color: '#07090F', letterSpacing: 2 },
  rankedBtnSub:       { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#07090F77', letterSpacing: 1 },
  // Secondary CASUAL button
  casualBtn:     { borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1E8AAA44' },
  casualBtnGrad: { paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  casualBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#5BB8D4', letterSpacing: 1.5 },
  casualBtnSub:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#1E8AAA66' },
  shimmerSweep:  { position: 'absolute', top: 0, bottom: 0, width: '45%', backgroundColor: '#FFFFFF', opacity: 0.15, borderRadius: 22 },
  modesSection: { gap: 8, marginBottom: 16 },
  modesSectionHeader: { paddingHorizontal: 20, gap: 2 },
  modesSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#F0F0FF', letterSpacing: 1.5 },
  modesSectionSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  modePickCard: { width: 118, borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 4, overflow: 'hidden' },
  modePickEmoji: { fontSize: 24 },
  modePickName: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  modePickSub: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 0.3 },
  modePickDesc: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13 },
  modePlayChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  modePlayChipText: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1 },
  modeRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  modeCard:   { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 5 },
  modeLabel:  { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  modeDesc:   { fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', lineHeight: 13 },
  // Super selector
  superSection:    { paddingHorizontal: 16, marginBottom: 16, gap: 6 },
  superTitle:      { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2 },
  superSubtitle:   { color: '#FFFFFF55', fontFamily: 'Inter_400Regular', fontSize: 10 },
  superRow:        { flexDirection: 'row', gap: 8 },
  superCard:       { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 3 },
  superIcon:       { fontSize: 24 },
  superName:       { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, textAlign: 'center' },
  superDesc:       { fontFamily: 'Inter_400Regular', fontSize: 8, textAlign: 'center', lineHeight: 12 },
  superActiveBadge:{ backgroundColor: '#FFD70033', borderRadius: 5, borderWidth: 1, borderColor: '#FFD700', paddingHorizontal: 5, paddingVertical: 1, marginTop: 2 },
  superActiveTxt:  { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1 },
  superLockBadge:  { position: 'absolute', top: 4, right: 4, backgroundColor: '#FFFFFF12', borderRadius: 5, borderWidth: 1, borderColor: '#FFFFFF1A', paddingHorizontal: 4, paddingVertical: 1 },
  superLockTxt:    { color: '#FFFFFF55', fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 0.5 },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statCard:   { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, gap: 3 },
  statValue:  { fontFamily: 'Inter_700Bold', fontSize: 19 },
  statLabel:  { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.5 },
  // Season pass
  passSection: { paddingHorizontal: 16, marginBottom: 14, gap: 6 },
  passHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passTitle:   { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5, flex: 1 },
  passSub:     { fontFamily: 'Inter_400Regular', fontSize: 11 },
  activeBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  tierScroll:  { paddingVertical: 8, paddingRight: 16, gap: 8 },
  // Daily challenge
  challengeCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeTitle: { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2 },
  challengeDesc:  { color: '#F0F0FF', fontFamily: 'Inter_700Bold', fontSize: 15 },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeDot:   { width: 10, height: 10, borderRadius: 5 },
  challengeReward: { fontFamily: 'Inter_500Medium', fontSize: 11, marginLeft: 4 },
  // Login streak card
  streakCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: '#C8820A44', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, overflow: 'hidden' },
  streakCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakCardIcon: { fontSize: 28 },
  streakCardTitle: { color: '#FFFFFF88', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.5 },
  streakCardDay:   { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 16 },
  streakCalendar:  { flexDirection: 'row', gap: 4 },
  streakDot:       { width: 8, height: 8, borderRadius: 4 },
});
