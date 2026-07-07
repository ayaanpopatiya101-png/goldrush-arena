import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient as SvgRG, Stop } from 'react-native-svg';

import { DailyStreakModal } from '@/components/DailyStreakModal';
import { AmbientParticles } from '@/components/AmbientParticles';
import {
  RANKS, getRankIndex, SEASON_TIERS, SKINS, usePlayer, xpForNextRank, xpToLevel,
} from '@/context/PlayerContext';
type SuperType = 1 | 2 | 3;
import { setGameConfig } from '@/store/gameSession';
import type { MatchType, GameVariant } from '@/store/gameSession';
import { startGauntlet } from '@/store/gauntletSession';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Arena Showcase ───────────────────────────────────────────────────────────
function ArenaShowcase() {
  const ballX = useRef(new Animated.Value(0)).current;
  const ballY = useRef(new Animated.Value(0)).current;
  const pulse  = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0)).current;
  const SIZE   = Math.min(SW * 0.62, 230);
  const R      = SIZE / 2;
  const moves  = [
    [R * 0.3, -R * 0.3], [-R * 0.4, R * 0.1], [R * 0.2, R * 0.35],
    [-R * 0.3, -R * 0.2], [R * 0.1, -R * 0.4], [-R * 0.15, R * 0.3],
  ];

  useEffect(() => {
    const seq = moves.map(([tx, ty]) => Animated.parallel([
      Animated.timing(ballX, { toValue: tx, duration: 500 + Math.random() * 300, useNativeDriver: true }),
      Animated.timing(ballY, { toValue: ty, duration: 500 + Math.random() * 300, useNativeDriver: true }),
    ]));
    Animated.loop(Animated.sequence(seq)).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: 'center' }}>
      {/* Outer glow ring */}
      <Animated.View style={{
        position: 'absolute', inset: -12, borderRadius: SIZE / 2 + 12,
        borderWidth: 1.5, borderColor: '#C8820A',
        opacity: glowOp,
        shadowColor: '#C8820A', shadowRadius: 20, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
      }} />

      {/* Arena circle */}
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <SvgRG id="floor" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#2A1A00" stopOpacity="1" />
            <Stop offset="70%"  stopColor="#0E0908" stopOpacity="1" />
            <Stop offset="100%" stopColor="#050404" stopOpacity="1" />
          </SvgRG>
        </Defs>
        {/* Floor */}
        <Circle cx={R} cy={R} r={R - 2} fill="url(#floor)" />
        {/* Border */}
        <Circle cx={R} cy={R} r={R - 2} stroke="#C8820A55" strokeWidth="2" fill="none" />
        {/* Inner rings */}
        <Circle cx={R} cy={R} r={R * 0.65} stroke="#FFFFFF08" strokeWidth="1" fill="none" />
        <Circle cx={R} cy={R} r={R * 0.35} stroke="#FFFFFF08" strokeWidth="1" fill="none" />
        {/* Center cross */}
        <Path d={`M${R - R*0.15},${R} L${R + R*0.15},${R}`} stroke="#FFFFFF08" strokeWidth="1" />
        <Path d={`M${R},${R - R*0.15} L${R},${R + R*0.15}`} stroke="#FFFFFF08" strokeWidth="1" />
        {/* Player wall arcs */}
        <Path d={`M${R * 0.35},8 L${R * 1.65},8`} stroke="#C03820" strokeWidth="8" strokeLinecap="round" />
        <Path d={`M${R * 0.35},${SIZE - 8} L${R * 1.65},${SIZE - 8}`} stroke="#C8820A" strokeWidth="8" strokeLinecap="round" />
        <Path d={`M8,${R * 0.35} L8,${R * 1.65}`} stroke="#1E8AAA" strokeWidth="8" strokeLinecap="round" />
        <Path d={`M${SIZE - 8},${R * 0.35} L${SIZE - 8},${R * 1.65}`} stroke="#4A8A38" strokeWidth="8" strokeLinecap="round" />
        {/* Center circle (scoring zone) */}
        <Circle cx={R} cy={R} r={R * 0.12} fill="#FFFFFF15" />
      </Svg>

      {/* Animated puck */}
      <Animated.View style={{
        position: 'absolute',
        left: R - 9, top: R - 9,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF', shadowRadius: 8, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
        transform: [{ translateX: ballX }, { translateY: ballY }],
      }} />

      {/* Crown overlay */}
      <Animated.Text style={{
        position: 'absolute', top: R * 0.18, alignSelf: 'center',
        fontSize: 28, transform: [{ scale: pulse }],
        textShadowColor: '#FFD700', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 },
      }}>
        👑
      </Animated.Text>

      {/* Player corner badges */}
      {[
        { label: 'YOU',   color: '#C8820A', pos: { bottom: 6, left:  '35%' } },
        { label: 'TOP',   color: '#C03820', pos: { top:    6, left:  '35%' } },
        { label: 'LEFT',  color: '#1E8AAA', pos: { top: '42%', left: 4 } },
        { label: 'RIGHT', color: '#4A8A38', pos: { top: '42%', right: 4 } },
      ].map(p => (
        <View key={p.label} style={[arena.badge, { backgroundColor: p.color + '33', borderColor: p.color + '88' }, p.pos as never]}>
          <Text style={[arena.badgeTxt, { color: p.color }]}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

const arena = StyleSheet.create({
  badge: {
    position: 'absolute', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1,
  },
  badgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 0.5 },
});

// ─── Quick nav button ──────────────────────────────────────────────────────────
function QuickBtn({ emoji, label, color, badge, onPress }: {
  emoji: string; label: string; color: string; badge?: number; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  }
  return (
    <Pressable onPress={press} style={{ alignItems: 'center', flex: 1 }}>
      <Animated.View style={[qb.box, { borderColor: color + '66', transform: [{ scale }] }]}>
        <LinearGradient colors={[color + '33', color + '11']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
        {badge !== undefined && badge > 0 && (
          <View style={qb.badge}>
            <Text style={qb.badgeTxt}>{badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[qb.label, { color: color }]}>{label}</Text>
    </Pressable>
  );
}

const qb = StyleSheet.create({
  box: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  badge: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF4757', alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 8 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8, marginTop: 4 },
});

// ─── Season tier card ─────────────────────────────────────────────────────────
function TierCard({ tier, index, totalGames, claimed, onClaim }: {
  tier: typeof SEASON_TIERS[0]; index: number; totalGames: number;
  claimed: boolean; onClaim: (i: number) => void;
}) {
  const isUnlocked = totalGames >= tier.games;
  const isCurrent  = isUnlocked && (index === SEASON_TIERS.length - 1 || totalGames < SEASON_TIERS[index + 1].games);
  return (
    <View style={[tc.card, isCurrent && tc.cardCurrent, !isUnlocked && { opacity: 0.4 }]}>
      <Text style={tc.icon}>{tier.icon}</Text>
      <Text style={[tc.name, isCurrent && { color: '#E5A020' }]}>{tier.name}</Text>
      <Text style={tc.reward}>{tier.reward}</Text>
      {claimed ? (
        <View style={tc.claimedBadge}><Text style={tc.claimedTxt}>✅</Text></View>
      ) : isUnlocked ? (
        <Pressable onPress={() => onClaim(index)} style={tc.claimBtn}>
          <Text style={tc.claimTxt}>CLAIM</Text>
        </Pressable>
      ) : (
        <View style={tc.lockBadge}><Feather name="lock" size={10} color="#FFFFFF44" /></View>
      )}
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    width: 84, borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF15',
    backgroundColor: '#FFFFFF08', padding: 10, alignItems: 'center', gap: 3,
  },
  cardCurrent: { borderColor: '#E5A02066', backgroundColor: '#E5A02011' },
  icon:   { fontSize: 20 },
  name:   { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF66', textAlign: 'center' },
  reward: { fontFamily: 'Inter_500Medium', fontSize: 7, color: '#FFFFFF44', textAlign: 'center' },
  claimedBadge: { marginTop: 2 },
  claimedTxt: { fontSize: 14 },
  claimBtn: {
    marginTop: 2, backgroundColor: '#E5A02033', borderWidth: 1, borderColor: '#E5A02088',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  claimTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 7 },
  lockBadge: { marginTop: 2 },
});

// ─── Home screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const {
    profile, isLoaded, showStreakModal, dismissStreakModal,
    claimDailyStreak, claimSeasonTier, setSelectedSuper,
  } = usePlayer();

  const rankInfo  = xpForNextRank(profile.xp);
  const rankData  = RANKS.find(r => r.name === profile.rank) ?? RANKS[0];
  const playerRankIdx = getRankIndex(profile.rank);

  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const playRing1 = useRef(new Animated.Value(0)).current;
  const playRing2 = useRef(new Animated.Value(0)).current;
  const shimmer   = useRef(new Animated.Value(-1)).current;
  const superGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoaded) return;
    Animated.timing(xpBarAnim, { toValue: rankInfo.progress, duration: 1200, useNativeDriver: false }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(playRing1, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(playRing1, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(600),
      Animated.timing(playRing2, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(playRing2, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 2, duration: 1800, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(superGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(superGlow, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, [isLoaded]);

  function getSkin() { return SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]; }

  function handlePlay(matchType: MatchType) {
    const skin = getSkin();
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType, variant: 'classic' });
    router.push('/lobby');
  }

  function handlePlayMode(variant: GameVariant) {
    const skin = getSkin();
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType: 'casual', variant });
    router.push('/lobby');
  }

  function handleStartGauntlet() {
    const skin = getSkin();
    const firstVariant = startGauntlet();
    setGameConfig({ playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: profile.currentRelic, matchType: 'gauntlet', variant: firstVariant });
    router.push('/lobby');
  }

  async function handleClaimStreak() { await claimDailyStreak(); dismissStreakModal(); }

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 56) : insets.top;
  const r1Scale = playRing1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const r1Op    = playRing1.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 0.4, 0] });
  const r2Scale = playRing2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const r2Op    = playRing2.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 0.2, 0] });
  const xpBarW  = xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const shimX   = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-40, 280] });

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#07051A' }} />;

  return (
    <View style={S.root}>
      {/* ── Layered background ── */}
      <LinearGradient
        colors={['#0B0918', '#0E0B20', '#090716', '#07051A']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill as never} pointerEvents="none">
        <Defs>
          <SvgRG id="cg" cx="50%" cy="30%" r="55%">
            <Stop offset="0%"   stopColor="#C8820A" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRG>
          <SvgRG id="cg2" cx="80%" cy="80%" r="40%">
            <Stop offset="0%"   stopColor="#7B2FBE" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </SvgRG>
        </Defs>
        <Circle cx="50%" cy="30%" r="70%" fill="url(#cg)" />
        <Circle cx="80%" cy="80%" r="50%" fill="url(#cg2)" />
        {/* Grid */}
        {[...Array(9)].map((_, i) => <Path key={`h${i}`} d={`M0,${SH * i / 8} L${SW},${SH * i / 8}`} stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.025" />)}
        {[...Array(7)].map((_, i) => <Path key={`v${i}`} d={`M${SW * i / 6},0 L${SW * i / 6},${SH}`} stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.025" />)}
      </Svg>
      <AmbientParticles />

      <DailyStreakModal visible={showStreakModal} streak={profile.loginStreak} onClaim={handleClaimStreak} onDismiss={dismissStreakModal} />

      {/* ── TOP HUD ── */}
      <View style={[S.hud, { paddingTop: topPad + 2 }]}>
        {/* Level badge */}
        <View style={[S.levelBadge, { backgroundColor: rankData.color + '33', borderColor: rankData.color + '88' }]}>
          <Text style={[S.levelNum, { color: rankData.color }]}>{xpToLevel(profile.xp)}</Text>
          <Text style={S.levelLbl}>LV</Text>
        </View>

        {/* XP bar */}
        <View style={S.xpSection}>
          <View style={S.xpBarBg}>
            <Animated.View style={[S.xpBarFill, { width: xpBarW as never, backgroundColor: rankData.color }]}>
              <Animated.View style={[S.xpShimmer, { transform: [{ translateX: shimX }, { skewX: '-20deg' }] }]} />
            </Animated.View>
          </View>
          <Text style={S.xpLabel} numberOfLines={1}>
            {rankInfo.next ? `→ ${rankInfo.next}` : '⭐ MAX'}
          </Text>
        </View>

        {/* Trophies */}
        <View style={S.resourceChip}>
          <Text style={{ fontSize: 12 }}>🏆</Text>
          <Text style={S.resourceTxt}>{profile.xp.toLocaleString()}</Text>
        </View>

        {/* Coins */}
        <View style={[S.resourceChip, { borderColor: '#FFD70044' }]}>
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text style={[S.resourceTxt, { color: '#FFD700' }]}>{profile.coins.toLocaleString()}</Text>
        </View>

        <Pressable onPress={() => router.push('/settings')} style={S.settingsBtn}>
          <Feather name="settings" size={15} color="#FFFFFF55" />
        </Pressable>
      </View>

      {/* ── CENTER STAGE ── */}
      <View style={S.stage}>
        {/* Title above arena */}
        <View style={S.titleRow}>
          <Text style={S.titleMain}>GOLDRUSH</Text>
          <Text style={S.titleArena}>ARENA</Text>
          {profile.loginStreak > 0 && (
            <View style={S.streakChip}>
              <Text style={{ fontSize: 10 }}>🔥</Text>
              <Text style={S.streakTxt}>{profile.loginStreak}</Text>
            </View>
          )}
        </View>
        <Text style={S.playerNameTag}>{profile.name} · {profile.rank}</Text>

        {/* Arena */}
        <ArenaShowcase />

        {/* Quick nav */}
        <View style={S.quickNav}>
          <QuickBtn emoji="🛒" label="SHOP"    color="#E5A020" onPress={() => router.push('/shop' as never)} />
          <QuickBtn emoji="📦" label="GEAR"    color="#00E5FF" onPress={() => router.push('/inventory' as never)} />
          <QuickBtn emoji="🗺️" label="TROPHY"  color="#BF5FFF" badge={(profile.xp >= 100 && !(profile.trophyRoadClaimed ?? []).includes('tr_01')) ? 1 : 0} onPress={() => router.push('/trophyroad' as never)} />
          <QuickBtn emoji="🏆" label="RANKS"   color="#FF4757" onPress={() => router.push('/leaderboard' as never)} />
          <QuickBtn emoji="👤" label="PROFILE" color="#00FF88" onPress={() => router.push('/profile' as never)} />
        </View>
      </View>

      {/* ── SCROLLABLE LOWER SECTION ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Super selector */}
        <View style={S.superSection}>
          <Text style={S.sectionTitle}>⚡ YOUR SUPER</Text>
          <View style={S.superRow}>
            {([
              { id: 1 as SuperType, icon: '⚔️', name: 'IRON WALL',  color: '#E5A020' },
              { id: 2 as SuperType, icon: '🌀', name: 'SLOW FIELD', color: '#00E5FF' },
              { id: 3 as SuperType, icon: '💥', name: 'BANISH',     color: '#BF5FFF' },
            ] as { id: SuperType; icon: string; name: string; color: string }[]).map(sup => {
              const active = (profile.selectedSuper ?? 1) === sup.id;
              return (
                <Pressable key={sup.id} onPress={() => setSelectedSuper(sup.id)}
                  style={[S.superCard, {
                    borderColor: active ? sup.color : '#FFFFFF15',
                    transform: [{ scale: active ? 1.04 : 1 }],
                    shadowColor: active ? sup.color : 'transparent', shadowOpacity: active ? 0.7 : 0,
                  }]}>
                  {active && <LinearGradient colors={[sup.color + '44', sup.color + '11']} style={StyleSheet.absoluteFill} />}
                  <Text style={{ fontSize: 22 }}>{sup.icon}</Text>
                  <Text style={[S.superName, { color: active ? sup.color : '#FFFFFF55' }]}>{sup.name}</Text>
                  {active && (
                    <Animated.View style={[S.superEquipped, { borderColor: sup.color + '88', backgroundColor: sup.color + '22',
                      shadowColor: sup.color, shadowOpacity: superGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }) as never,
                    }]}>
                      <Text style={[S.superEquippedTxt, { color: sup.color }]}>EQUIPPED</Text>
                    </Animated.View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Mode cards */}
        <Text style={[S.sectionTitle, { marginBottom: 8 }]}>🎮 GAME MODES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          style={{ marginLeft: -16, paddingLeft: 16, marginBottom: 16 }}
        >
          {([
            { id: 'duos',         emoji: '👥', name: 'DUOS',   sub: '2v2',         color: '#00E5FF' },
            { id: 'blitz',        emoji: '⚡', name: 'BLITZ',  sub: '1 LIFE',      color: '#FFD700' },
            { id: 'chaos',        emoji: '🌪️', name: 'CHAOS',  sub: '5 BALLS',     color: '#FF6B35' },
            { id: 'survival',     emoji: '🛡️', name: 'SURVIVE',sub: '12 LIVES',    color: '#00FF88' },
            { id: 'sudden_death', emoji: '💀', name: 'SUDDEN', sub: 'ONE LIFE',    color: '#FF4757' },
            { id: 'turbo',        emoji: '🚀', name: 'TURBO',  sub: '1.8× SPEED',  color: '#BF5FFF' },
            { id: 'pinball',      emoji: '🎰', name: 'PINBALL',sub: '8 BALLS',     color: '#FF69B4' },
            { id: 'six_player',   emoji: '6️⃣', name: '6 PLR', sub: '6 ZONES',     color: '#FF9500' },
          ] as const).map(m => (
            <Pressable key={m.id} onPress={() => handlePlayMode(m.id)}
              style={({ pressed }) => [S.modeCard, { borderColor: m.color + '55', opacity: pressed ? 0.8 : 1 }]}>
              <LinearGradient colors={[m.color + '30', m.color + '10', '#00000000']} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 28, marginBottom: 4 }}>{m.emoji}</Text>
              <Text style={[S.modeName, { color: m.color }]}>{m.name}</Text>
              <Text style={[S.modeSub, { color: m.color + 'AA' }]}>{m.sub}</Text>
              <View style={[S.modePlayChip, { backgroundColor: m.color + '22', borderColor: m.color + '66' }]}>
                <Text style={[S.modePlayTxt, { color: m.color }]}>▶ PLAY</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Season pass compact */}
        <View style={S.passRow}>
          <Text style={S.sectionTitle}>🏆 SEASON PASS</Text>
          <View style={S.s7badge}><Text style={S.s7txt}>S7</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 8 }}>
          {SEASON_TIERS.map((tier, i) => (
            <TierCard key={i} tier={tier} index={i} totalGames={profile.totalGames}
              claimed={profile.seasonPassClaimed.includes(i)} onClaim={claimSeasonTier} />
          ))}
        </ScrollView>
      </ScrollView>

      {/* ── FIXED BOTTOM ACTION BAR ── */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + 6 }]}>
        <LinearGradient colors={['#120F22', '#0C0A18']} style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: '#FFFFFF0E' }]} />

        {/* Mode selector */}
        <Pressable
          onPress={playerRankIdx >= 5 ? handleStartGauntlet : () => handlePlay('ranked')}
          style={S.modeSelector}
        >
          <LinearGradient
            colors={playerRankIdx >= 5 ? ['#2A1800', '#1A1000'] : ['#1A1630', '#120F25']}
            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
          />
          <Text style={{ fontSize: 22 }}>{playerRankIdx >= 5 ? '⚔️' : '🎯'}</Text>
          <View>
            <Text style={S.modeSelectorName}>
              {playerRankIdx >= 5 ? 'GAUNTLET' : 'RANKED MATCH'}
            </Text>
            <Text style={S.modeSelectorSub}>
              {playerRankIdx >= 5 ? '5-WIN SERIES · 3× XP' : 'Affects your rank'}
            </Text>
          </View>
          <View style={S.newBadge}><Text style={S.newBadgeTxt}>HOT</Text></View>
        </Pressable>

        {/* PLAY button */}
        <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={[S.playRing, { transform: [{ scale: r1Scale }], opacity: r1Op }]} />
          <Animated.View style={[S.playRing, { transform: [{ scale: r2Scale }], opacity: r2Op, borderColor: '#E5A020' }]} />
          <Pressable onPress={() => handlePlay('ranked')} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.93 : 1 }] })}>
            <Animated.View style={[S.playBtn, { transform: [{ scale: bounceAnim }] }]}>
              <LinearGradient colors={['#FFD700', '#E5A020', '#C8820A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.playBtnGrad}>
                <View style={S.playBtnShine} />
                <Text style={S.playBtnTxt}>PLAY</Text>
                <Text style={S.playBtnSub}>⚔️</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07051A' },

  // HUD
  hud: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingBottom: 6,
  },
  levelBadge: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  levelNum: { fontFamily: 'Inter_900Black', fontSize: 14, lineHeight: 16 },
  levelLbl: { fontFamily: 'Inter_700Bold', fontSize: 7, color: '#FFFFFF55', lineHeight: 8 },
  xpSection: { flex: 1, gap: 3 },
  xpBarBg: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF12', overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpShimmer: { position: 'absolute', top: 0, bottom: 0, width: 24, backgroundColor: '#FFFFFF', opacity: 0.3 },
  xpLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF44' },
  resourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFFFF0A', borderWidth: 1, borderColor: '#C8820A33',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
  },
  resourceTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF' },
  settingsBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF0A',
    borderWidth: 1, borderColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center',
  },

  // Stage
  stage: { paddingHorizontal: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 2 },
  titleMain: {
    fontFamily: 'Inter_900Black', fontSize: 26, color: '#FFD700',
    letterSpacing: 2,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  titleArena: {
    fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFFFFF66', letterSpacing: 6,
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FF450022', borderWidth: 1, borderColor: '#FF450055',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  streakTxt: { color: '#FF4500', fontFamily: 'Inter_700Bold', fontSize: 10 },
  playerNameTag: {
    textAlign: 'center', color: '#FFFFFF44', fontFamily: 'Inter_600SemiBold',
    fontSize: 10, letterSpacing: 1, marginBottom: 10,
  },
  quickNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 4, marginTop: 14,
  },

  // Sections
  sectionTitle: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF55',
    letterSpacing: 1.5, marginBottom: 8,
  },

  // Super
  superSection: { marginBottom: 14 },
  superRow: { flexDirection: 'row', gap: 8 },
  superCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 10,
    alignItems: 'center', gap: 4, overflow: 'hidden',
    backgroundColor: '#FFFFFF05',
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  superName: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5, textAlign: 'center' },
  superEquipped: {
    borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  superEquippedTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1 },

  // Mode cards
  modeCard: {
    width: 110, borderRadius: 18, borderWidth: 1.5, padding: 14,
    alignItems: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF06',
  },
  modeName: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  modeSub:  { fontFamily: 'Inter_400Regular', fontSize: 8, marginTop: 1 },
  modePlayChip: {
    marginTop: 8, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  modePlayTxt: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },

  // Season pass
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  s7badge: {
    backgroundColor: '#FF475722', borderWidth: 1, borderColor: '#FF475555',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  s7txt: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 10, overflow: 'hidden',
  },
  modeSelector: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#FFFFFF15',
    overflow: 'hidden', position: 'relative',
  },
  modeSelectorName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF', letterSpacing: 0.5 },
  modeSelectorSub:  { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF55' },
  newBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: '#FF4757', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeTxt: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5 },
  playRing: {
    position: 'absolute', width: 80, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: '#FFD700',
  },
  playBtn: {
    width: 80, height: 56, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FFD700', shadowRadius: 16, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
  },
  playBtnGrad: {
    flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFD70088',
  },
  playBtnShine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: '#FFFFFF', opacity: 0.2, borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  playBtnTxt: { fontFamily: 'Inter_900Black', fontSize: 16, color: '#0A0500', letterSpacing: 1 },
  playBtnSub: { fontSize: 10, position: 'absolute', bottom: 4, right: 10 },
});
