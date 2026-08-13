/**
 * RankCeremonyOverlay — full-screen cinematic rank promotion sequence.
 *
 * Phase 1 (0–0.6 s):   screen fades in black + pulsing radial glow
 * Phase 2 (0.6–1.4 s): medal badge zooms in (0 → 1.2 → 1.0), particles burst
 * Phase 3 (1.4–2.2 s): rank name + flavor text slide up; shimmer sweeps badge
 * After 2.2 s:         "CLAIM" button fades in; tap anywhere skips
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RankBadge } from '@/components/RankBadge';
import { RANKS } from '@/context/PlayerContext';
import * as Haptics from 'expo-haptics';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Flavor text keyed by rank tier prefix ─────────────────────────────────────
const FLAVOR: Record<string, string> = {
  'Bronze':    'The climb begins.',
  'Silver':    'Rising through the ranks.',
  'Gold':      "You've entered the big leagues.",
  'Diamond':   'The elite few stand here.',
  'Master':    'Mastery is your calling.',
  'Champion':  'You are the arena.',
};

function getTierFlavor(rankName: string): string {
  for (const tier of Object.keys(FLAVOR)) {
    if (rankName.startsWith(tier)) return FLAVOR[tier];
  }
  return 'Keep climbing.';
}

// ── Particle types keyed by tier ───────────────────────────────────────────────
const TIER_SHAPES: Record<string, string> = {
  Bronze:   '✦',
  Silver:   '✦',
  Gold:     '★',
  Diamond:  '◆',
  Master:   '⚡',
  Champion: '👑',
};

function getTierShape(rankName: string): string {
  for (const tier of Object.keys(TIER_SHAPES)) {
    if (rankName.startsWith(tier)) return TIER_SHAPES[tier];
  }
  return '✦';
}

// ── Single particle ────────────────────────────────────────────────────────────
interface ParticleData {
  id: number;
  angle: number;
  dist: number;
  size: number;
  color: string;
  delay: number;
}

function CeremonyParticle({ p, triggered, rankColor }: { p: ParticleData; triggered: boolean; rankColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!triggered) return;
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: 700 + p.delay * 300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, p.delay * 80);
    return () => clearTimeout(t);
  }, [triggered]);

  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.dist] });
  const op = anim.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [0, 1, 0.7, 0] });
  const sc = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1.3, 0.4] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -p.size / 2,
        top: -p.size / 2,
        width: p.size,
        height: p.size,
        borderRadius: p.size / 2,
        backgroundColor: p.id % 4 === 0 ? '#FFFFFF' : rankColor,
        shadowColor: rankColor,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        opacity: op,
        transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface RankCeremonyOverlayProps {
  newRank: string;
  visible: boolean;
  onDismiss: () => void;
}

let _pid = 0;

export function RankCeremonyOverlay({ newRank, visible, onDismiss }: RankCeremonyOverlayProps) {
  const rankData = RANKS.find(r => r.name === newRank) ?? RANKS[0];
  const rankColor = rankData.color;
  const flavor = getTierFlavor(newRank);

  // ── Animation values ────────────────────────────────────────────────────────
  const overlayOp   = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.6)).current;
  const glowOp      = useRef(new Animated.Value(0)).current;
  const badgeOp     = useRef(new Animated.Value(0)).current;
  const textOp      = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(30)).current;
  const claimOp     = useRef(new Animated.Value(0)).current;
  const shimmerX    = useRef(new Animated.Value(-120)).current;
  const exitScale   = useRef(new Animated.Value(1)).current;

  // Badge scale via Reanimated for spring
  const badgeScale  = useSharedValue(0);
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  const [particlesTriggered, setParticlesTriggered] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Build particles once
  const particles = useRef<ParticleData[]>(
    Array.from({ length: 14 }, (_, i) => ({
      id: ++_pid,
      angle: (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      dist: 80 + Math.random() * 90,
      size: 4 + Math.random() * 6,
      color: rankColor,
      delay: i * 0.5 + Math.random() * 2,
    }))
  ).current;

  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  function runSequence() {
    setDismissed(false);
    setShowClaim(false);
    setParticlesTriggered(false);
    badgeScale.value = 0;
    overlayOp.setValue(0);
    glowScale.setValue(0.5);
    glowOp.setValue(0);
    badgeOp.setValue(0);
    textOp.setValue(0);
    textY.setValue(30);
    claimOp.setValue(0);
    shimmerX.setValue(-120);
    exitScale.setValue(1);

    // Phase 1: fade in overlay + glow pulse (0–600 ms)
    Animated.parallel([
      Animated.timing(overlayOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(glowOp,    { toValue: 0.8, duration: 500, useNativeDriver: true }),
      Animated.timing(glowScale, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Start glow pulse loop
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 0.95, duration: 900, useNativeDriver: true }),
      ])
    );
    setTimeout(() => glowLoop.current?.start(), 600);

    if (Platform.OS !== 'web') {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    }

    // Phase 2: badge zoom + particles (600–1400 ms)
    setTimeout(() => {
      badgeOp.setValue(1);
      badgeScale.value = withSequence(
        withSpring(1.22, { damping: 5, stiffness: 200 }),
        withSpring(1.0,  { damping: 8, stiffness: 180 }),
      );
      setParticlesTriggered(true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 600);

    // Phase 3: rank name / text + shimmer (1400–2200 ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(textY,  { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();
      // Shimmer sweep
      Animated.timing(shimmerX, { toValue: 120, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    }, 1400);

    // Show claim button (2200 ms)
    setTimeout(() => {
      Animated.timing(claimOp, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      setShowClaim(true);
    }, 2200);
  }

  useEffect(() => {
    if (visible) {
      // Slight delay so the post-game screen renders first
      const t = setTimeout(runSequence, 120);
      return () => clearTimeout(t);
    }
  }, [visible]);

  function handleDismiss() {
    if (dismissed) return;
    setDismissed(true);
    glowLoop.current?.stop();
    Animated.parallel([
      Animated.timing(exitScale, { toValue: 0.88, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOp, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(onDismiss);
  }

  function handleSkip() {
    if (showClaim) return; // Already done — let the claim button handle it
    // Jump to end of sequence immediately
    glowLoop.current?.stop();
    badgeOp.setValue(1);
    badgeScale.value = withTiming(1.0, { duration: 100 });
    setParticlesTriggered(true);
    Animated.parallel([
      Animated.timing(textOp,  { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(textY,   { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(claimOp, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setShowClaim(true);
  }

  if (!visible) return null;

  return (
    <Modal animationType="none" transparent presentationStyle="overFullScreen">
      <Pressable style={{ flex: 1 }} onPress={handleSkip}>
        <Animated.View style={[s.overlay, { opacity: overlayOp }]}>
          {/* Dark bg */}
          <LinearGradient colors={['#050508', '#0A0A12', '#050508']} style={StyleSheet.absoluteFill} />

          {/* Radial glow in rank color */}
          <Animated.View
            pointerEvents="none"
            style={[s.radialGlow, {
              backgroundColor: rankColor + '28',
              shadowColor: rankColor,
              transform: [{ scale: glowScale }],
              opacity: glowOp,
            }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[s.radialGlowInner, {
              backgroundColor: rankColor + '18',
              shadowColor: rankColor,
              transform: [{ scale: glowScale }],
              opacity: glowOp,
            }]}
          />

          {/* Ambient star dots */}
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} pointerEvents="none" style={[s.star, {
              top:  `${(i * 5.9 + 4) % 100}%` as never,
              left: `${(i * 7.3 + 8) % 100}%` as never,
              opacity: 0.06 + (i % 5) * 0.05,
              width: 1 + (i % 3), height: 1 + (i % 3),
            }]} />
          ))}

          {/* Center stage */}
          <Animated.View style={[s.stage, { transform: [{ scale: exitScale }] }]}>
            {/* RANK LABEL at top */}
            <Animated.View style={{ opacity: textOp, transform: [{ translateY: Animated.multiply(textY, new Animated.Value(-0.5)) }] }}>
              <Text style={s.rankUpLabel}>RANK UP!</Text>
            </Animated.View>

            {/* Badge + particle burst container */}
            <View style={s.badgeWrap}>
              {/* Particles — rendered relative to badge center */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={s.particleOrigin}>
                  {particles.map(p => (
                    <CeremonyParticle key={p.id} p={p} triggered={particlesTriggered} rankColor={rankColor} />
                  ))}
                </View>
              </View>

              {/* Badge with shimmer — use Animated.View for opacity, Reanimated for scale */}
              <Animated.View style={{ opacity: badgeOp }}>
                <Reanimated.View style={badgeAnimStyle}>
                  <View style={s.badgeInner}>
                    <RankBadge rank={newRank} size="lg" showLabel={false} />
                    {/* Shimmer sweep */}
                    <Animated.View
                      pointerEvents="none"
                      style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]}
                    />
                  </View>
                </Reanimated.View>
              </Animated.View>
            </View>

            {/* Rank name + flavor */}
            <Animated.View style={[s.textBlock, { opacity: textOp, transform: [{ translateY: textY }] }]}>
              <Text style={[s.rankName, { color: rankColor }]}>{newRank.toUpperCase()}</Text>
              <Text style={s.flavorText}>{flavor}</Text>
            </Animated.View>

            {/* Claim button */}
            <Animated.View style={{ opacity: claimOp, marginTop: 36 }}>
              <Pressable
                onPress={handleDismiss}
                style={({ pressed }) => [s.claimBtn, { backgroundColor: rankColor, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={s.claimBtnText}>CLAIM</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialGlow: {
    position: 'absolute',
    width: SW * 1.4,
    height: SW * 1.4,
    borderRadius: SW * 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 120,
    shadowOpacity: 1,
  },
  radialGlowInner: {
    position: 'absolute',
    width: SW * 0.7,
    height: SW * 0.7,
    borderRadius: SW * 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 60,
    shadowOpacity: 1,
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  stage: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  rankUpLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 5,
    color: '#FFFFFF55',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  badgeWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOrigin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
  },
  badgeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 40,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: '#FFFFFF',
    opacity: 0.22,
    transform: [{ skewX: '-15deg' }],
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  rankName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 42,
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
  },
  flavorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF88',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  claimBtn: {
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderRadius: 14,
  },
  claimBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 3,
    color: '#050508',
  },
});
