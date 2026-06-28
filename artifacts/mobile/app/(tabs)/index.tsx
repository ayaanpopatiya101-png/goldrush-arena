import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { RankBadge } from '@/components/RankBadge';
import { AmbientParticles } from '@/components/AmbientParticles';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import {
  RANKS, SEASON_TIERS, SKINS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';
import type { MatchType, GameVariant } from '@/store/gameSession';
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
    <View style={[
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
    </View>
  );
}

// ─── Home screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const {
    profile, isLoaded, showStreakModal, dismissStreakModal,
    claimDailyStreak, claimSeasonTier,
  } = usePlayer();
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const titleGlowAnim = useRef(new Animated.Value(0)).current;

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
    pulse.start(); glow.start(); shimmer.start(); titleGlow.start();
    return () => { pulse.stop(); glow.stop(); shimmer.stop(); titleGlow.stop(); };
  }, []);

  function handlePlay(matchType: MatchType) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      matchType, variant: 'classic',
    });
    router.push('/lobby');
  }

  function handlePlayMode(variant: GameVariant) {
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      matchType: 'casual', variant,
    });
    router.push('/lobby');
  }

  async function handleClaimStreak() {
    await claimDailyStreak();
    dismissStreakModal();
  }

  const rankInfo = xpForNextRank(profile.xp);
  const rankData = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const winRate  = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#0D0A06' }} />;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0D0A06', '#181208', '#0D0A06']} style={StyleSheet.absoluteFill} />
      <AmbientParticles />
      <Svg style={StyleSheet.absoluteFill as never} pointerEvents="none">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="40%" r="55%">
            <Stop offset="0%"   stopColor="#C8820A" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#C8820A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="40%" r="100%" fill="url(#bg)" />
      </Svg>

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
            {/* Avatar — uses emoji + frame color */}
            <View style={[styles.avatar, { borderColor: profile.avatarFrameColor, backgroundColor: profile.avatarFrameColor + '33' }]}>
              <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
            </View>
            <View>
              <Text style={styles.playerName}>{profile.name}</Text>
              <View style={styles.streakRow}>
                <Text style={styles.levelText}>Level {xpToLevel(profile.xp)}</Text>
                {profile.loginStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakIcon}>🔥</Text>
                    <Text style={styles.streakCount}>{profile.loginStreak}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Feather name="settings" size={18} color="#FFFFFF66" />
            </Pressable>
            <RankBadge rank={profile.rank} size="sm" showLabel={false} />
            <View style={styles.coinBadge}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinText}>{profile.coins}</Text>
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBar}>
          <View style={[styles.xpTrack, { backgroundColor: '#FFFFFF15' }]}>
            <View style={[styles.xpFill, { width: `${rankInfo.progress * 100}%` as never, backgroundColor: rankData.color }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
            {rankInfo.next ? `${rankInfo.remaining} XP to ${rankInfo.next}` : 'MAX RANK'}
          </Text>
        </View>

        {/* Mini arena */}
        <View style={styles.arenaWrap}>
          <MiniArena />
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Animated.Text style={[styles.gameTitle, {
            opacity: titleGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
            textShadowRadius: titleGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 36] }),
            transform: [{ scale: titleGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.015] }) }],
          }]}>
            GOLDRUSH ARENA
          </Animated.Text>
          <Text style={styles.gameSubtitle}>4-PLAYER AIR HOCKEY · LAST ONE STANDING WINS</Text>
        </View>

        {/* Play buttons — Ranked + Casual */}
        <View style={styles.playWrap}>
          <Animated.View style={[styles.playBtnRow, { transform: [{ scale: pulseAnim }] }]}>
            {/* Ranked */}
            <Pressable onPress={() => handlePlay('ranked')} style={({ pressed }) => [styles.playBtn, styles.playBtnRanked, pressed && { opacity: 0.85, transform:[{scale:0.97}] }]}>
              <LinearGradient colors={['#E09620', '#C8820A', '#A86008']} style={styles.playBtnGrad}>
                <Text style={styles.playBtnIcon}>⚔️</Text>
                <View>
                  <Text style={styles.playBtnText}>RANKED</Text>
                  <Text style={styles.playBtnSub}>Affects your rank</Text>
                </View>
              </LinearGradient>
              {/* Shimmer sweep */}
              <Animated.View pointerEvents="none" style={{
                position:'absolute', top:0, bottom:0, width:'40%',
                backgroundColor:'#FFFFFF', opacity:0.12, borderRadius:14,
                transform:[{ translateX: shimmerAnim.interpolate({inputRange:[-1,2], outputRange:[-80, 220]}) }, {skewX:'-20deg'}],
              }} />
            </Pressable>
            {/* Casual */}
            <Pressable onPress={() => handlePlay('casual')} style={({ pressed }) => [styles.playBtn, styles.playBtnCasual, pressed && { opacity: 0.85, transform:[{scale:0.97}] }]}>
              <LinearGradient colors={['#1A6888', '#1E8AAA', '#147898']} style={styles.playBtnGrad}>
                <Text style={styles.playBtnIcon}>🎮</Text>
                <View>
                  <Text style={[styles.playBtnText, { color: '#FFFFFF' }]}>CASUAL</Text>
                  <Text style={[styles.playBtnSub, { color: '#FFFFFF88' }]}>Just for fun</Text>
                </View>
              </LinearGradient>
              {/* Shimmer sweep */}
              <Animated.View pointerEvents="none" style={{
                position:'absolute', top:0, bottom:0, width:'40%',
                backgroundColor:'#FFFFFF', opacity:0.10, borderRadius:14,
                transform:[{ translateX: shimmerAnim.interpolate({inputRange:[-1,2], outputRange:[-80, 220]}) }, {skewX:'-20deg'}],
              }} />
            </Pressable>
          </Animated.View>
        </View>

        {/* Mode info cards */}
        <View style={styles.modeRow}>
          {[
            { icon: 'grid',     label: '4-PLAYER', desc: 'All 4 sides active',          color: '#C8820A' },
            { icon: 'triangle', label: 'TRIANGLE',  desc: '3 survive → new shape',       color: '#00FF88' },
            { icon: 'zap',      label: '1v1 DUEL',  desc: 'Final 2 go head-to-head',    color: '#FF4757' },
          ].map(m => (
            <View key={m.label} style={[styles.modeCard, { borderColor: m.color + '44', backgroundColor: m.color + '0F' }]}>
              <Feather name={m.icon as never} size={18} color={m.color} />
              <Text style={[styles.modeLabel, { color: m.color }]}>{m.label}</Text>
              <Text style={[styles.modeDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Extra Game Modes ── */}
        <View style={styles.modesSection}>
          <View style={styles.modesSectionHeader}>
            <Text style={styles.modesSectionTitle}>🎮  EXTRA GAME MODES</Text>
            <Text style={[styles.modesSectionSub, { color: colors.mutedForeground }]}>Tap a mode to jump in</Text>
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
                  backgroundColor: m.color + '10',
                  opacity: pressed ? 0.75 : 1,
                }]}
              >
                <LinearGradient
                  colors={[m.color + '22', m.color + '08', '#00000000']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.modePickEmoji}>{m.emoji}</Text>
                <Text style={[styles.modePickName, { color: m.color }]}>{m.name}</Text>
                <Text style={[styles.modePickSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
                <Text style={[styles.modePickDesc, { color: m.color + 'BB' }]}>{m.desc}</Text>
                <View style={[styles.modePlayChip, { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}>
                  <Feather name="play" size={8} color={m.color} />
                  <Text style={[styles.modePlayChipText, { color: m.color }]}>PLAY</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'WINS',     value: String(profile.wins),    icon: 'award'   },
            { label: 'WIN RATE', value: profile.totalGames > 0 ? `${winRate}%` : '—', icon: 'percent' },
            { label: 'STREAK',   value: String(profile.winStreak), icon: 'zap'   },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: '#FFFFFF0A', borderColor: '#FFFFFF18' }]}>
              <Feather name={stat.icon as never} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: '#F0F0FF' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Live Event Banner ── */}
        <LiveEventBanner />

        {/* ── Season Pass ── */}
        <View style={styles.passSection}>
          <View style={styles.passHeader}>
            <Text style={styles.passTitle}>🏆 SEASON PASS</Text>
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
        <View style={[styles.challengeCard, { backgroundColor: '#C8820A15', borderColor: '#C8820A44' }]}>
          <View style={styles.challengeHeader}>
            <Feather name="sun" size={15} color="#C8820A" />
            <Text style={styles.challengeTitle}>DAILY CHALLENGE</Text>
          </View>
          <Text style={styles.challengeDesc}>Win 3 matches today</Text>
          <View style={styles.challengeProgress}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.challengeDot, {
                backgroundColor: i < (profile.wins % 3) ? '#C8820A' : '#FFFFFF22',
              }]} />
            ))}
            <Text style={[styles.challengeReward, { color: colors.mutedForeground }]}>+100 coins reward</Text>
          </View>
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
  claimTierText: { color: '#0D0A06', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  lockedBadge:  { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF08', alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 22 },
  playerName: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#F0F0FF' },
  streakRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelText:  { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF66' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FF6B3522', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  streakIcon: { fontSize: 9 },
  streakCount: { color: '#FF6B35', fontFamily: 'Inter_700Bold', fontSize: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#C8820A22', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  coinEmoji:  { fontSize: 11 },
  coinText:   { color: '#C8820A', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  xpBar:      { paddingHorizontal: 20, marginBottom: 16, gap: 4 },
  xpTrack:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  xpFill:     { height: '100%', borderRadius: 3 },
  xpText:     { fontFamily: 'Inter_400Regular', fontSize: 10 },
  arenaWrap:  { alignItems: 'center', marginBottom: 12 },
  titleWrap:  { alignItems: 'center', gap: 4, marginBottom: 20, paddingHorizontal: 20 },
  gameTitle:  { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: 3.5, textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18, textAlign: 'center' },
  gameSubtitle: { color: '#FFFFFF66', fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1.5, textAlign: 'center' },
  playWrap:   { paddingHorizontal: 24, marginBottom: 20 },
  settingsBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  playBtnRow:  { flexDirection: 'row', gap: 10 },
  playBtn:     { flex: 1, borderRadius: 18, overflow: 'hidden', elevation: 8 },
  playBtnRanked: { shadowColor: '#C8820A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 20 },
  playBtnCasual: { shadowColor: '#1E8AAA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 20 },
  playBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 10, gap: 8 },
  playBtnIcon: { fontSize: 20 },
  playBtnText: { color: '#0D0A06', fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 1.5 },
  playBtnSub:  { color: '#0D0A0688', fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.5 },
  modesSection: { gap: 8, marginBottom: 16 },
  modesSectionHeader: { paddingHorizontal: 20, gap: 2 },
  modesSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#F0F0FF', letterSpacing: 1.5 },
  modesSectionSub: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  modePickCard: { width: 132, borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 5, overflow: 'hidden' },
  modePickEmoji: { fontSize: 28 },
  modePickName: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2 },
  modePickSub: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.3 },
  modePickDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  modePlayChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  modePlayChipText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  modeRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  modeCard:   { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  modeLabel:  { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  modeDesc:   { fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', lineHeight: 13 },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  statCard:   { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  statValue:  { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statLabel:  { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1 },
  // Season pass
  passSection: { paddingHorizontal: 16, marginBottom: 14, gap: 6 },
  passHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passTitle:   { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5, flex: 1 },
  passSub:     { fontFamily: 'Inter_400Regular', fontSize: 11 },
  activeBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  tierScroll:  { paddingVertical: 8, paddingRight: 16, gap: 8 },
  // Daily challenge
  challengeCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 7 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeTitle: { color: '#C8820A', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  challengeDesc:  { color: '#F0F0FF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
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
