import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Reanimated, {
  FadeInDown, FadeInUp, ZoomIn,
  interpolate, useAnimatedScrollHandler, useAnimatedStyle,
  useSharedValue, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  TROPHY_ROAD, LUCKY_BLOCK_META,
  type TrophyReward, type TrophyMilestone, type LuckyBlock,
  usePlayer,
} from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { ParticleField, GlowBorder, ShimmerCard } from '@/components/effects';

const { width: SW } = Dimensions.get('window');
const RVIEW = Reanimated.createAnimatedComponent(View);

// ─── Zone config ──────────────────────────────────────────────────────────────
interface RoadZone {
  name: string; subtitle: string; accent: string; dim: string;
  bg: [string, string, string]; decor: string[]; milestones: TrophyMilestone[];
}
const ZONES: RoadZone[] = [
  { name: 'Dusty Trail',         subtitle: 'Where legends begin…',        accent: '#C87820', dim: '#7A4A0E',
    bg: ['#2A1200', '#160900', '#08040088'], decor: ['🌵','⛺','🏜️','🌅','🌵','🐪'],   milestones: TROPHY_ROAD.slice(0, 5)  },
  { name: 'Gold Rush Gulch',     subtitle: 'Strike it rich',               accent: '#FFD700', dim: '#9A8000',
    bg: ['#251A00', '#120D00', '#08060088'], decor: ['⛏️','🪨','💰','🔦','⚙️','🏅'],   milestones: TROPHY_ROAD.slice(5, 10) },
  { name: 'Crimson Canyon',      subtitle: 'Heat rises — do you?',         accent: '#FF5520', dim: '#8A2A00',
    bg: ['#220600', '#120200', '#08010088'], decor: ['🌋','🔥','💥','🏔️','🌋','🌪️'],   milestones: TROPHY_ROAD.slice(10, 15)},
  { name: 'Crystal Caverns',     subtitle: 'Beneath the surface',          accent: '#00E5FF', dim: '#007A8A',
    bg: ['#001A1A', '#000D0D', '#00080888'], decor: ['💎','🔮','✨','🫧','💎','🌊'],   milestones: TROPHY_ROAD.slice(15, 20)},
  { name: 'Summit of Champions', subtitle: 'Only the elite reach here',    accent: '#C084FC', dim: '#6B30C8',
    bg: ['#0E0022', '#070010', '#02000888'], decor: ['👑','⚡','🏆','🌟','⚡','🌠'],   milestones: TROPHY_ROAD.slice(20, 25)},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function trEmoji(r: TrophyReward): string {
  if (r.type === 'coins')      return '🪙';
  if (r.type === 'skin')       return '🎨';
  if (r.type === 'relic')      return '⚔️';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].emoji;
  return '🎁';
}
function trLabel(r: TrophyReward): string {
  if (r.type === 'coins')      return `${r.amount.toLocaleString()} Coins`;
  if (r.type === 'skin')       return r.id[0].toUpperCase() + r.id.slice(1) + ' Skin';
  if (r.type === 'relic')      return r.id[0].toUpperCase() + r.id.slice(1) + ' Relic';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].name;
  return 'Reward';
}
function trColor(r: TrophyReward): string {
  if (r.type === 'coins')      return '#FFD700';
  if (r.type === 'skin')       return '#00E5FF';
  if (r.type === 'relic')      return '#FF6B35';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].color;
  return '#FFFFFF';
}
function fmtXP(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K' : String(n);
}

// ─── Floating depth layer ─────────────────────────────────────────────────────
// Three layers (far/mid/near) each drifting at different rates
function FloatLayer({ emoji, size, x, yBase, speed, scrollY, zoneY }:
  { emoji: string; size: number; x: number; yBase: number; speed: number; scrollY: Reanimated.SharedValue<number>; zoneY: number }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800 + speed * 600 }),
        withTiming(8,  { duration: 1800 + speed * 600 }),
      ), -1, true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value + interpolate(scrollY.value, [zoneY - 300, zoneY + 300], [-speed * 30, speed * 30], 'clamp') },
      { scale: 0.5 + speed * 0.5 },
    ],
    opacity: 0.15 + speed * 0.2,
  }));
  return (
    <RVIEW style={[{ position: 'absolute', left: x, top: yBase }, style]}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </RVIEW>
  );
}

// ─── Animated glowing path connector ─────────────────────────────────────────
function GlowPath({ fromRight, accent }: { fromRight: boolean; accent: string }) {
  const dot = useSharedValue(0);
  useEffect(() => {
    dot.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dot.value, [0, 0.5, 1], [1, 0.3, 1]),
    transform: [{ scale: interpolate(dot.value, [0, 0.5, 1], [1.2, 0.7, 1.2]) }],
  }));

  const c = accent + '80';
  const line: any = { backgroundColor: c, position: 'absolute' };

  return (
    <View style={{ height: 56, marginHorizontal: 40, marginTop: -2, marginBottom: -2 }}>
      {fromRight ? (
        <>
          <View style={[line, { right: 2, top: 0,  height: 26, width: 2 }]} />
          <View style={[line, { left: 2, right: 2,  top: 26, height: 2  }]} />
          <View style={[line, { left: 2, top: 26, bottom: 0, width: 2 }]} />
        </>
      ) : (
        <>
          <View style={[line, { left: 2,  top: 0,  height: 26, width: 2 }]} />
          <View style={[line, { left: 2, right: 2,  top: 26, height: 2  }]} />
          <View style={[line, { right: 2, top: 26, bottom: 0, width: 2 }]} />
        </>
      )}
      {/* Travelling glow dot */}
      <RVIEW style={[{ position: 'absolute', right: fromRight ? 0 : undefined, left: fromRight ? undefined : 0, top: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: accent, shadowColor: accent, shadowRadius: 6, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 } }, dotStyle]} />
    </View>
  );
}

// ─── 3D Zone Banner ───────────────────────────────────────────────────────────
function ZoneBanner({ zone, zoneIdx, scrollY }: { zone: RoadZone; zoneIdx: number; scrollY: Reanimated.SharedValue<number> }) {
  // Approximate Y position of this zone's banner
  const ZONE_H = 1040;
  const MY_Y   = 220 + zoneIdx * ZONE_H;

  const style3D = useAnimatedStyle(() => {
    const dist = scrollY.value - MY_Y;
    // Tilt toward viewer as it enters, straighten as it centers, tilt away as it exits
    const tilt = interpolate(dist, [-400, -80, 0, 80, 400], [12, 3, 0, -3, -12], 'clamp');
    const sc   = interpolate(Math.abs(dist), [0, 400], [1, 0.94], 'clamp');
    return {
      transform: [
        { perspective: 700 },
        { rotateX: `${tilt}deg` },
        { scale: sc },
      ],
    };
  });

  return (
    <RVIEW entering={FadeInDown.delay(zoneIdx * 60).duration(500).springify()} style={[{ marginHorizontal: 14, marginBottom: 14 }, style3D]}>
      <LinearGradient
        colors={[zone.accent + '40', zone.accent + '10', 'transparent']}
        style={s.zoneBannerGrad}
      >
        <LinearGradient colors={[zone.bg[0], zone.bg[1]]} style={StyleSheet.absoluteFill} />
        {/* Shimmer strip at top */}
        <View style={[s.zoneBannerShimmer, { backgroundColor: zone.accent + '30' }]} />

        {/* Floating decor — right side */}
        <View style={s.zoneBannerDecorRow} pointerEvents="none">
          {zone.decor.slice(0, 4).map((e, i) => {
            const fl = useRef(new Animated.Value(0)).current;
            useEffect(() => {
              Animated.loop(Animated.sequence([
                Animated.timing(fl, { toValue: -5 - i * 2, duration: 1400 + i * 300, useNativeDriver: true }),
                Animated.timing(fl, { toValue: 0,          duration: 1400 + i * 300, useNativeDriver: true }),
              ])).start();
            }, []);
            return (
              <Animated.Text key={i} style={{ fontSize: 20 - i * 2, opacity: 0.85 - i * 0.15, transform: [{ translateY: fl }] }}>
                {e}
              </Animated.Text>
            );
          })}
        </View>

        {/* Zone meta */}
        <Text style={[s.zonePill, { color: zone.accent }]}>ZONE {zoneIdx + 1} OF 5</Text>
        <Text style={[s.zoneName, { color: '#FFFFFF', textShadowColor: zone.accent, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }]}>
          {zone.name.toUpperCase()}
        </Text>
        <Text style={[s.zoneSub, { color: zone.accent + 'CC' }]}>{zone.subtitle}</Text>
        <View style={[s.zoneXPPill, { backgroundColor: zone.accent + '25', borderColor: zone.accent + '55' }]}>
          <Text style={[s.zoneXPTxt, { color: zone.accent }]}>
            {fmtXP(zone.milestones[0].xp)} – {fmtXP(zone.milestones[4].xp)} XP
          </Text>
        </View>
      </LinearGradient>
    </RVIEW>
  );
}

// ─── 3D Milestone Node ────────────────────────────────────────────────────────
function MilestoneNode({ ms, globalIdx, zone, claimed, canClaim, isLeft, onClaim }: {
  ms: TrophyMilestone; globalIdx: number; zone: RoadZone;
  claimed: boolean; canClaim: boolean; isLeft: boolean;
  onClaim: (id: string) => void;
}) {
  const pulse   = useSharedValue(1);
  const claimPop = useSharedValue(1);
  const glow    = useSharedValue(0);

  useEffect(() => {
    if (canClaim) {
      pulse.value = withRepeat(withSequence(
        withTiming(1.07, { duration: 750 }),
        withTiming(1.00, { duration: 750 }),
      ), -1, true);
      glow.value = withRepeat(withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ), -1, true);
    } else {
      pulse.value = 1;
      glow.value  = 0;
    }
  }, [canClaim]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * claimPop.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.7,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));

  const borderColor = claimed ? zone.accent + '55' : canClaim ? zone.accent : '#FFFFFF1A';
  const cardBg1     = claimed ? zone.accent + '22' : canClaim ? zone.accent + '3A' : zone.accent + '0A';
  const opacity     = claimed ? 0.65 : canClaim ? 1 : 0.30;
  const rc          = trColor(ms.reward);

  const handlePress = useCallback(() => {
    if (!canClaim) return;
    claimPop.value = withSequence(
      withSpring(1.25, { damping: 4, stiffness: 300 }),
      withSpring(1.00, { damping: 8, stiffness: 200 }),
    );
    onClaim(ms.id);
  }, [canClaim, ms.id]);

  return (
    <Reanimated.View
      entering={FadeInDown.delay(globalIdx * 55 + 100).duration(420).springify()}
      style={[s.nodeRow, { justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}
    >
      {/* Outer glow ring (visible when claimable) */}
      <RVIEW style={[s.nodeGlowRing, { borderColor: zone.accent + '60', shadowColor: zone.accent }, glowStyle]} />

      <RVIEW style={nodeStyle}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            s.nodeCard,
            { borderColor, opacity: pressed ? 0.75 : opacity },
            canClaim && { shadowColor: zone.accent, shadowRadius: 20, shadowOpacity: 0.8, elevation: 14 },
          ]}
        >
          <LinearGradient colors={[cardBg1, 'transparent']} style={StyleSheet.absoluteFill} />

          {/* 3D depth stripe at top */}
          <View style={[s.nodeTopStripe, { backgroundColor: zone.accent + (canClaim ? '55' : '20') }]} />

          {/* Milestone badge */}
          <View style={[s.numBadge, { backgroundColor: zone.accent + '22', borderColor: zone.accent + '44' }]}>
            <Text style={[s.numTxt, { color: zone.accent }]}>#{globalIdx + 1}</Text>
          </View>

          {/* Reward icon — larger when claimable */}
          <Text style={{ fontSize: canClaim ? 36 : 30, marginVertical: 5 }}>{trEmoji(ms.reward)}</Text>

          {/* Reward name */}
          <Text style={[s.rewardTxt, { color: rc }]} numberOfLines={2}>{trLabel(ms.reward)}</Text>

          {/* XP label */}
          <Text style={s.xpTxt}>{fmtXP(ms.xp)} XP</Text>

          {/* State chip */}
          {claimed ? (
            <View style={[s.chip, { backgroundColor: '#00CC5518', borderColor: '#00CC5545' }]}>
              <Text style={[s.chipTxt, { color: '#00CC55' }]}>✓  CLAIMED</Text>
            </View>
          ) : canClaim ? (
            <View style={[s.chip, { backgroundColor: zone.accent + '28', borderColor: zone.accent + '88' }]}>
              <Text style={[s.chipTxt, { color: zone.accent }]}>TAP TO CLAIM</Text>
            </View>
          ) : (
            <View style={[s.chip, { backgroundColor: '#FFFFFF07', borderColor: '#FFFFFF14' }]}>
              <Text style={[s.chipTxt, { color: '#FFFFFF30' }]}>🔒  {fmtXP(ms.xp)} XP</Text>
            </View>
          )}
        </Pressable>
      </RVIEW>
    </Reanimated.View>
  );
}

// ─── Zone-end transition ──────────────────────────────────────────────────────
function ZoneTransition({ fromAccent, toAccent }: { fromAccent: string; toAccent: string }) {
  return (
    <Reanimated.View entering={FadeInUp.duration(400)} style={s.zoneTransition}>
      <LinearGradient
        colors={[fromAccent + '00', fromAccent + '55', toAccent + '55', toAccent + '00']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: 2, width: '60%' }}
      />
      <Text style={{ fontSize: 11, color: '#FFFFFF22', marginVertical: 4 }}>⬇</Text>
      <Text style={s.zoneTransitionTxt}>NEXT ZONE</Text>
    </Reanimated.View>
  );
}

// ─── 3D Title ─────────────────────────────────────────────────────────────────
function Title3D({ text, size = 32, color = '#FFD700', shadow = '#7A4C00' }: {
  text: string; size?: number; color?: string; shadow?: string;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <Text style={[s.titleLayer, { fontSize: size, color: shadow,   top: 4,   left: 4,   position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color: '#C07800', top: 2,   left: 2,   position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color }]}>{text}</Text>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ label, color, onDone }: { label: string; color: string; onDone: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(op, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View style={[s.toast, { borderColor: color + '88', shadowColor: color, opacity: op }]}>
      <Text style={{ fontSize: 16 }}>✨</Text>
      <Text style={[s.toastTxt, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TrophyRoadMap() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, claimTrophyRoad } = usePlayer();

  const claimed   = profile.trophyRoadClaimed ?? [];
  const playerXP  = profile.xp ?? 0;
  const total     = TROPHY_ROAD.length;
  const done      = claimed.length;
  const pct       = done / total;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const [toasts,          setToasts]          = useState<{ id: string; label: string; color: string }[]>([]);
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);

  const headerStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(scrollY.value, [0, 80], [1, 0.92], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -8], 'clamp') }],
  }));

  // Progress bar animated fill
  const barW = useSharedValue(0);
  useEffect(() => {
    barW.value = withTiming(pct, { duration: 1200 });
  }, [pct]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${barW.value * 100}%` as any,
  }));

  const handleClaim = useCallback(async (id: string) => {
    const block = await claimTrophyRoad(id);
    if (block) {
      setActiveLuckyBlock(block);
    } else {
      const ms = TROPHY_ROAD.find(m => m.id === id);
      if (ms) setToasts(p => [...p, { id: id + Date.now(), label: `${trLabel(ms.reward)} collected!`, color: trColor(ms.reward) }]);
    }
  }, [claimTrophyRoad]);

  return (
    <View style={s.root}>
      {/* Deep space background */}
      <LinearGradient colors={['#03010A', '#060310', '#03010A']} style={StyleSheet.absoluteFill} />
      <ParticleField count={50} mode="stars" />

      {/* Per-zone parallax depth emojis — rendered behind everything */}
      {ZONES.map((zone, zi) => {
        const ZONE_H = 1040;
        const zoneY  = 220 + zi * ZONE_H;
        return zone.decor.slice(0, 6).map((emoji, ei) => (
          <FloatLayer
            key={`${zi}-${ei}`}
            emoji={emoji}
            size={ei === 0 ? 36 : ei < 3 ? 22 : 14}
            x={ei % 2 === 0 ? 10 + ei * 28 : SW - 50 - ei * 20}
            yBase={zoneY + ei * 140}
            speed={[0.4, 0.7, 1.0, 0.5, 0.8, 0.6][ei]}
            scrollY={scrollY}
            zoneY={zoneY}
          />
        ));
      })}

      {/* ── Sticky header ── */}
      <RVIEW style={[s.header, { paddingTop: insets.top + 4 }, headerStyle]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['#0A0520CC', '#06030EAA']} style={StyleSheet.absoluteFill} />

        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Feather name="chevron-left" size={22} color="#FFFFFF99" />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Title3D text="TROPHY ROAD" size={18} color="#FFD700" shadow="#5A3800" />
          <View style={s.headerProgress}>
            <View style={s.headerBarBg}>
              <RVIEW style={[s.headerBarFill, barStyle]}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </RVIEW>
            </View>
            <Text style={s.headerProgressTxt}>{done}/{total}</Text>
          </View>
        </View>

        <View style={s.xpBadge}>
          <Text style={s.xpBadgeVal}>{fmtXP(playerXP)}</Text>
          <Text style={s.xpBadgeLbl}>XP</Text>
        </View>
      </RVIEW>

      {/* ── Scrollable map ── */}
      <Reanimated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: (insets.top + 70) }}
      >
        {/* Hero title block */}
        <Reanimated.View entering={FadeInDown.duration(600).springify()} style={s.hero}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 52 }}>🏆</Text>
            <Title3D text="TROPHY ROAD" size={28} color="#FFD700" shadow="#5A3800" />
            <Text style={s.heroSub}>25 milestones · 5 legendary zones</Text>
          </View>
          <View style={[s.heroProgressCard, { borderColor: '#FFD70033' }]}>
            <LinearGradient colors={['#FFD70012', '#FF8C0008']} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={s.heroProgressLbl}>PROGRESS</Text>
              <Text style={[s.heroProgressLbl, { color: '#FFD700' }]}>{done} / {total} claimed</Text>
            </View>
            <View style={s.heroBarBg}>
              <RVIEW style={[s.heroBarFill, barStyle]}>
                <LinearGradient colors={['#FFD700', '#FF8C00', '#FF5500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <View style={s.heroBarShine} />
              </RVIEW>
            </View>
            {/* Zone milestone dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              {ZONES.map((z, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 3 }}>
                  <View style={[s.zoneDot, { backgroundColor: z.accent + (done >= (i + 1) * 5 ? 'FF' : '33') }]} />
                  <Text style={{ fontSize: 8, color: z.accent + '99' }}>{z.name.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </View>
        </Reanimated.View>

        {/* ── Zones ── */}
        {ZONES.map((zone, zi) => {
          const milestones = zone.milestones;
          return (
            <View key={zone.name}>
              <ZoneBanner zone={zone} zoneIdx={zi} scrollY={scrollY} />

              {milestones.map((ms, mi) => {
                const globalIdx  = zi * 5 + mi;
                const isLeft     = globalIdx % 2 === 0;
                const isClaimed  = claimed.includes(ms.id);
                const isUnlocked = playerXP >= ms.xp;
                return (
                  <React.Fragment key={ms.id}>
                    <MilestoneNode
                      ms={ms} globalIdx={globalIdx} zone={zone}
                      claimed={isClaimed} canClaim={isUnlocked && !isClaimed}
                      isLeft={isLeft} onClaim={handleClaim}
                    />
                    {mi < milestones.length - 1 && (
                      <GlowPath fromRight={!isLeft} accent={zone.accent} />
                    )}
                  </React.Fragment>
                );
              })}

              {zi < ZONES.length - 1 && (
                <ZoneTransition fromAccent={zone.accent} toAccent={ZONES[zi + 1].accent} />
              )}
            </View>
          );
        })}

        {/* Completion banner */}
        {done === total && (
          <Reanimated.View entering={ZoomIn.duration(600).springify()} style={s.completeBanner}>
            <LinearGradient colors={['#FFD70030', '#C0840015', '#00000000']} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 52 }}>🏆</Text>
            <Text style={[s.titleLayer, { fontSize: 22, color: '#FFD700', letterSpacing: 3 }]}>ROAD COMPLETE!</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#FFFFFF66', textAlign: 'center', marginTop: 4 }}>
              You've conquered every zone.{'\n'}True GoldRush Champion.
            </Text>
          </Reanimated.View>
        )}
      </Reanimated.ScrollView>

      {/* Toasts */}
      {toasts.map(t => (
        <Toast key={t.id} label={t.label} color={t.color}
          onDone={() => setToasts(p => p.filter(x => x.id !== t.id))} />
      ))}

      {/* Lucky block opener */}
      {activeLuckyBlock && (
        <LuckyBlockOpener
          block={activeLuckyBlock}
          onClose={() => setActiveLuckyBlock(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03010A' },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF0D',
    overflow: 'hidden',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  headerBarBg:   { flex: 1, height: 5, backgroundColor: '#FFFFFF0D', borderRadius: 3, overflow: 'hidden' },
  headerBarFill: { height: 5, borderRadius: 3, overflow: 'hidden' },
  headerProgressTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFD700', letterSpacing: 0.5 },
  xpBadge: { alignItems: 'center', backgroundColor: '#FFD70020', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FFD70040' },
  xpBadgeVal: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFD700', lineHeight: 18 },
  xpBadgeLbl: { fontFamily: 'Inter_700Bold', fontSize: 7, color: '#FFD70099', letterSpacing: 2 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, gap: 18 },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF44', letterSpacing: 0.5, textAlign: 'center' },
  heroProgressCard: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 14 },
  heroProgressLbl:  { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF44', letterSpacing: 2 },
  heroBarBg:   { height: 10, backgroundColor: '#FFFFFF0D', borderRadius: 5, overflow: 'hidden' },
  heroBarFill: { height: 10, borderRadius: 5, overflow: 'hidden' },
  heroBarShine:{ position: 'absolute', top: 1.5, left: '5%', width: '55%', height: 4, borderRadius: 2, backgroundColor: '#FFFFFF44' },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },

  // Zone banner
  zoneBannerGrad: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', padding: 18, borderColor: '#FFFFFF10' },
  zoneBannerShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  zoneBannerDecorRow: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  zonePill: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 3.5, marginBottom: 4 },
  zoneName: { fontFamily: 'Rajdhani_700Bold', fontSize: 26, letterSpacing: 2, lineHeight: 30 },
  zoneSub:  { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  zoneXPPill: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  zoneXPTxt:  { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },

  // Milestone nodes
  nodeRow:     { paddingHorizontal: 26, marginVertical: 0 },
  nodeGlowRing:{
    position: 'absolute', width: 148, height: 240,
    borderRadius: 22, borderWidth: 2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9,
  },
  nodeCard: {
    width: 136, borderRadius: 20, borderWidth: 2,
    overflow: 'hidden', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#08060F',
  },
  nodeTopStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  numBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2 },
  numTxt:   { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  rewardTxt:{ fontFamily: 'Inter_700Bold', fontSize: 11, textAlign: 'center', letterSpacing: 0.3, lineHeight: 14 },
  xpTxt:    { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF44', letterSpacing: 0.3, marginTop: 3 },
  chip:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, marginTop: 7 },
  chipTxt:  { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1 },

  // Zone transition
  zoneTransition:    { alignItems: 'center', paddingVertical: 14 },
  zoneTransitionTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, color: '#FFFFFF20', letterSpacing: 3, marginTop: 2 },

  // Completion banner
  completeBanner: {
    margin: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFD70055',
    overflow: 'hidden', alignItems: 'center', padding: 28, gap: 6,
  },

  // Toast
  toast: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0C0A18', borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 12,
    shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  toastTxt: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' },

  // 3D title layers
  titleLayer: { fontFamily: 'Rajdhani_700Bold', letterSpacing: 2.5, textTransform: 'uppercase' },
});
