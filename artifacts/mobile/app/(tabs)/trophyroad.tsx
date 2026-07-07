import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TROPHY_ROAD, RELICS, SKINS, usePlayer,
  type TrophyMilestone,
} from '@/context/PlayerContext';

const { width: SW } = Dimensions.get('window');

// ─── Layout ───────────────────────────────────────────────────────────────────
const NODE_SIZE  = 72;
const NODE_SPACE = 130;
const ROAD_H     = 360;
const ROAD_MID   = ROAD_H / 2;
const AMP        = 96;

function nodeY(idx: number) { return ROAD_MID + Math.sin(idx * 0.82) * AMP; }

// ─── Data helpers ─────────────────────────────────────────────────────────────
function rewardIcon(m: TrophyMilestone) {
  const r = m.reward;
  if (r.type === 'coins') return '🪙';
  if (r.type === 'skin') return '🎨';
  const rel = RELICS.find(rl => rl.id === r.id);
  return rel?.icon ?? '⚡';
}
function rewardColor(m: TrophyMilestone) {
  const r = m.reward;
  if (r.type === 'coins') return '#FFD700';
  if (r.type === 'skin') { const s = SKINS.find(sk => sk.id === r.id); return s?.color ?? '#FF4757'; }
  const rel = RELICS.find(rl => rl.id === r.id); return rel?.color ?? '#C8820A';
}
function rewardLabel(m: TrophyMilestone) {
  const r = m.reward;
  if (r.type === 'coins') return `${r.amount} Coins`;
  if (r.type === 'skin') { const s = SKINS.find(sk => sk.id === r.id); return s?.name ?? r.id; }
  const rel = RELICS.find(rl => rl.id === r.id); return rel?.name ?? r.id;
}
function fmtXP(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n); }

// ─── 3D layered title text ────────────────────────────────────────────────────
function Title3D({ text, size = 22, color = '#FFD700', shadow = '#7A4C00' }: {
  text: string; size?: number; color?: string; shadow?: string;
}) {
  return (
    <View style={{ position: 'relative' }}>
      {/* Bottom shadow layer */}
      <Text style={[styles.titleLayer, { fontSize: size, color: shadow, top: 3, left: 3, position: 'absolute' }]}>
        {text}
      </Text>
      {/* Mid layer */}
      <Text style={[styles.titleLayer, { fontSize: size, color: '#B87800', top: 1.5, left: 1.5, position: 'absolute' }]}>
        {text}
      </Text>
      {/* Top shiny layer */}
      <Text style={[styles.titleLayer, { fontSize: size, color }]}>{text}</Text>
    </View>
  );
}

// ─── Floating sparkle particle ────────────────────────────────────────────────
function Sparkle({ x, delay, color }: { x: number; delay: number; color: string }) {
  const ty   = useRef(new Animated.Value(0)).current;
  const op   = useRef(new Animated.Value(0)).current;
  const sc   = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = () => {
      ty.setValue(ROAD_H);
      op.setValue(0);
      sc.setValue(0.4);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(ty, { toValue: -20, duration: 4000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0,   duration: 1200, useNativeDriver: true, delay: 2000 }),
          ]),
          Animated.sequence([
            Animated.timing(sc, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
            Animated.timing(sc, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
          ]),
        ]),
      ]).start(loop);
    };
    loop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: x, top: 0,
      opacity: op, transform: [{ translateY: ty }, { scale: sc }],
    }}>
      <Text style={{ fontSize: 10, color }}>{color === '#FFD700' ? '✦' : '✧'}</Text>
    </Animated.View>
  );
}

// ─── Animated road segment ────────────────────────────────────────────────────
function RoadSegment({ idx, isFilled, mountAnim }: { idx: number; isFilled: boolean; mountAnim: Animated.Value }) {
  const x1 = (idx + 0.5) * NODE_SPACE;
  const y1 = nodeY(idx);
  const x2 = (idx + 1.5) * NODE_SPACE;
  const y2 = nodeY(idx + 1);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const op = mountAnim.interpolate({
    inputRange: [0, Math.max(0.01, idx / TROPHY_ROAD.length), Math.min(1, (idx + 1) / TROPHY_ROAD.length)],
    outputRange: [0, 0, 1], extrapolate: 'clamp',
  });

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: x1, top: y1 - 6,
      width: len, height: 12, borderRadius: 6, opacity: op,
      overflow: 'hidden',
      transformOrigin: '0 50%',
      transform: [{ rotate: `${angle}deg` }],
    } as never}>
      {/* Road shadow */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#000000AA', top: 4, borderRadius: 6 }} />
      {/* Road surface */}
      <LinearGradient
        colors={isFilled ? ['#FFE066', '#C8820A', '#7A4C00'] : ['#2A2A4A', '#1A1A2E', '#111128']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ flex: 1, borderRadius: 6 }}
      />
      {/* Shine stripe */}
      {isFilled && (
        <View style={{
          position: 'absolute', top: 1, left: '10%',
          width: '80%', height: 3, borderRadius: 2,
          backgroundColor: '#FFFFFF44',
        }} />
      )}
    </Animated.View>
  );
}

// ─── 3D road node ─────────────────────────────────────────────────────────────
type NodeState = 'locked' | 'available' | 'claimed';

function RoadNode({ milestone, idx, state, onClaim, mountAnim }: {
  milestone: TrophyMilestone; idx: number; state: NodeState;
  onClaim: (m: TrophyMilestone) => void; mountAnim: Animated.Value;
}) {
  const scale    = useRef(new Animated.Value(1)).current;
  const glow     = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(50)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const tiltX    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = idx * 55;
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (state !== 'available') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 950, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, [state]);

  function press() {
    if (state !== 'available') return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.82, duration: 90, useNativeDriver: true }),
        Animated.timing(tiltX, { toValue: 8,    duration: 90, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scale,  { toValue: 1, useNativeDriver: true, bounciness: 14 }),
        Animated.timing(tiltX,  { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
    onClaim(milestone);
  }

  const col     = rewardColor(milestone);
  const icon    = rewardIcon(milestone);
  const label   = rewardLabel(milestone);
  const above   = idx % 2 === 0;
  const glowOp  = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  const glowSc  = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View style={{
      position: 'absolute',
      left: (idx + 0.5) * NODE_SPACE - NODE_SIZE / 2,
      top: nodeY(idx) - NODE_SIZE / 2,
      width: NODE_SIZE,
      alignItems: 'center',
      opacity, transform: [{ translateY: slideY }],
    }}>
      {/* XP label — alternates above/below */}
      <View style={{ position: 'absolute', top: above ? -28 : NODE_SIZE + 8, alignItems: 'center' }}>
        <Text style={[styles.xpLabel, state === 'locked' && { color: '#FFFFFF22' }]}>
          {fmtXP(milestone.xp)} XP
        </Text>
      </View>

      {/* Outer glow ring for available nodes */}
      {state === 'available' && (
        <Animated.View style={[styles.glowRing, {
          borderColor: col, shadowColor: col,
          opacity: glowOp, transform: [{ scale: glowSc }],
        }]} />
      )}

      <Pressable onPress={press} style={{ alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale }, { perspective: 300 }, { rotateX: tiltX.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) }] }}>
          {/* 3D node: outer shell */}
          <View style={[styles.nodeShell, {
            shadowColor: state === 'available' ? col : '#000',
            shadowOpacity: state === 'available' ? 0.9 : 0.4,
          }]}>
            {/* Outer bevel — bottom-right dark edge */}
            <View style={[StyleSheet.absoluteFill, styles.nodeBevelBot,
              { backgroundColor: state === 'claimed' ? '#003314' : state === 'available' ? col + '44' : '#050510' }
            ]} />
            {/* Main face gradient */}
            <LinearGradient
              colors={
                state === 'claimed'   ? ['#00E676', '#00C853', '#007A33'] :
                state === 'available' ? [col + 'FF', col + 'BB', col + '55'] :
                                        ['#2A2A4A', '#1A1A2E', '#0D0D1A']
              }
              start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
              style={styles.nodeFace}
            >
              {/* Top-left highlight spot for 3D roundness */}
              <View style={styles.nodeHighlight} />

              {/* Icon */}
              <Text style={{
                fontSize: state === 'locked' ? 22 : 26,
                opacity: state === 'locked' ? 0.28 : 1,
              }}>
                {state === 'claimed' ? '✓' : icon}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Reward label */}
        <Text style={[styles.rewardName, {
          color: state === 'claimed'   ? '#00C85388' :
                 state === 'available' ? col :
                                         '#FFFFFF1A',
        }]} numberOfLines={1}>{label}</Text>

        {/* COLLECT chip */}
        {state === 'available' && (
          <Animated.View style={[styles.collectChip, {
            borderColor: col, backgroundColor: col + '22',
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
          }]}>
            <Text style={[styles.collectTxt, { color: col }]}>COLLECT</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Claim toast ──────────────────────────────────────────────────────────────
function ClaimToast({ label, color, onDone }: { label: string; color: string; onDone: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(30)).current;
  const sc = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(sc, { toValue: 1, useNativeDriver: true, bounciness: 16 }),
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.timing(op, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, {
      borderColor: color, shadowColor: color,
      opacity: op, transform: [{ translateY: ty }, { scale: sc }],
    }]}>
      <Text style={{ fontSize: 18 }}>🏆</Text>
      <Text style={[styles.toastTxt, { color }]}>{label} collected!</Text>
    </Animated.View>
  );
}

// ─── XP badge with subtle pulse ───────────────────────────────────────────────
function XPBadge({ xp }: { xp: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[styles.xpBadge, { transform: [{ scale: pulse }] }]}>
      <LinearGradient colors={['#FFE566', '#C8820A']} style={styles.xpBadgeGrad}>
        <Text style={styles.xpBadgeVal}>{xp.toLocaleString()}</Text>
        <Text style={styles.xpBadgeLabel}>XP</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ progress, doneCount }: { progress: number; doneCount: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: progress, duration: 1200, delay: 400, useNativeDriver: false,
    }).start();
  }, [progress]);
  const widthPct = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{doneCount} / {TROPHY_ROAD.length} milestones</Text>
        <Text style={[styles.progressLabel, { color: '#FFD700AA' }]}>
          {Math.round(progress * 100)}% to next
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width: widthPct as never }]}>
          {/* Shine stripe on bar */}
          <View style={styles.barShine} />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const SPARKLES = [
  { x: SW * 0.08, delay: 0,    color: '#FFD700' },
  { x: SW * 0.25, delay: 1200, color: '#FFFFFF' },
  { x: SW * 0.55, delay: 600,  color: '#FFD700' },
  { x: SW * 0.75, delay: 2000, color: '#FFFFFF' },
  { x: SW * 0.92, delay: 800,  color: '#FFD700' },
];

export default function TrophyRoadScreen() {
  const insets = useSafeAreaInsets();
  const { profile, claimTrophyRoad } = usePlayer();
  const scrollRef = useRef<ScrollView>(null);
  const mountAnim = useRef(new Animated.Value(0)).current;
  const [toasts, setToasts] = useState<{ id: string; label: string; color: string }[]>([]);

  const claimed  = profile.trophyRoadClaimed ?? [];
  const userXP   = profile.xp;
  const totalW   = TROPHY_ROAD.length * NODE_SPACE + 80;
  const doneCount = TROPHY_ROAD.filter(m => userXP >= m.xp).length;

  const nextIdx = TROPHY_ROAD.findIndex(m => userXP < m.xp);
  const prevMilestone = nextIdx > 0 ? TROPHY_ROAD[nextIdx - 1] : null;
  const nextMilestone = nextIdx >= 0 ? TROPHY_ROAD[nextIdx] : null;
  const segProgress   = nextMilestone
    ? (userXP - (prevMilestone?.xp ?? 0)) / (nextMilestone.xp - (prevMilestone?.xp ?? 0))
    : 1;

  // Animate the road draw on mount
  useEffect(() => {
    Animated.timing(mountAnim, { toValue: 1, duration: 1800, delay: 300, useNativeDriver: false }).start();
  }, []);

  // Auto-scroll to first available/unclaimed node
  useEffect(() => {
    const firstAvailIdx = TROPHY_ROAD.findIndex(m => !claimed.includes(m.id) && userXP >= m.xp);
    const targetIdx = firstAvailIdx >= 0 ? firstAvailIdx : doneCount;
    const scrollX = Math.max(0, (targetIdx + 0.5) * NODE_SPACE - SW / 2);
    setTimeout(() => scrollRef.current?.scrollTo({ x: scrollX, animated: true }), 800);
  }, []);

  const handleClaim = useCallback(async (m: TrophyMilestone) => {
    await claimTrophyRoad(m.id);
    setToasts(prev => [...prev, { id: m.id + Date.now(), label: rewardLabel(m), color: rewardColor(m) }]);
  }, [claimTrophyRoad]);

  function nodeState(m: TrophyMilestone): NodeState {
    if (claimed.includes(m.id)) return 'claimed';
    if (userXP >= m.xp) return 'available';
    return 'locked';
  }

  return (
    <LinearGradient colors={['#090912', '#0C0C1A', '#07070F']} style={{ flex: 1 }}>
      {/* Background sparkles */}
      {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}

      <View style={{ paddingTop: insets.top + 14, flex: 1 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ gap: 2 }}>
            <Title3D text="TROPHY ROAD" size={21} />
            <Text style={styles.headerSub}>Earn XP · Unlock Rewards · Rule the Arena</Text>
          </View>
          <XPBadge xp={userXP} />
        </View>

        {/* ── Progress bar ── */}
        <ProgressBar progress={segProgress} doneCount={doneCount} />

        {/* ── Road ── */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalW, height: ROAD_H + 24 }}
          style={{ flex: 1 }}
        >
          {/* Road path segments */}
          {TROPHY_ROAD.map((m, idx) => idx < TROPHY_ROAD.length - 1 && (
            <RoadSegment key={`seg-${idx}`} idx={idx} isFilled={userXP >= m.xp} mountAnim={mountAnim} />
          ))}

          {/* Milestone nodes */}
          {TROPHY_ROAD.map((m, idx) => (
            <RoadNode key={m.id} milestone={m} idx={idx} state={nodeState(m)} onClaim={handleClaim} mountAnim={mountAnim} />
          ))}
        </ScrollView>

        {/* ── Legend ── */}
        <View style={[styles.legend, { paddingBottom: insets.bottom + 78 }]}>
          {[
            { emoji: '🪙', label: 'Coins' },
            { emoji: '🎨', label: 'Skin'  },
            { emoji: '⚡', label: 'Relic' },
            { emoji: '✓',  label: 'Done'  },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <Text style={{ fontSize: l.emoji === '✓' ? 12 : 13 }}>{l.emoji}</Text>
              <Text style={styles.legendLabel}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Toasts ── */}
      {toasts.map(t => (
        <ClaimToast key={t.id} label={t.label} color={t.color}
          onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
      ))}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // 3D title
  titleLayer: {
    fontFamily: 'Inter_700Bold', letterSpacing: 2.5, textTransform: 'uppercase',
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 14,
  },
  headerSub: {
    color: '#FFFFFF44', fontFamily: 'Inter_400Regular', fontSize: 10,
    letterSpacing: 0.4, marginTop: 4,
  },

  // XP badge
  xpBadge: { borderRadius: 14, overflow: 'hidden', shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  xpBadgeGrad: { paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center', borderRadius: 14 },
  xpBadgeVal: { color: '#1A0900', fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 22 },
  xpBadgeLabel: { color: '#1A090088', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 2 },

  // Progress
  progressCard: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: '#FFFFFF08', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#FFFFFF0D',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#FFFFFF55', fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.3 },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF0D', overflow: 'hidden' },
  progressBarFill: {
    height: 8, borderRadius: 4, overflow: 'hidden',
    backgroundColor: '#FFD700',
  },
  barShine: {
    position: 'absolute', top: 1, left: '5%', width: '60%', height: 3,
    borderRadius: 2, backgroundColor: '#FFFFFF55',
  },

  // XP label above/below node
  xpLabel: { color: '#FFD70099', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },

  // Node 3D construction
  nodeShell: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    overflow: 'visible',
  },
  nodeBevelBot: {
    borderRadius: NODE_SIZE / 2,
    transform: [{ translateY: 4 }, { scaleX: 0.97 }],
  },
  nodeFace: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF22',
    overflow: 'hidden',
  },
  nodeHighlight: {
    position: 'absolute', top: 6, left: 9,
    width: NODE_SIZE * 0.38, height: NODE_SIZE * 0.22,
    borderRadius: 10, backgroundColor: '#FFFFFF40',
    transform: [{ rotate: '-25deg' }],
  },

  // Glow ring
  glowRing: {
    position: 'absolute',
    width: NODE_SIZE + 20, height: NODE_SIZE + 20,
    borderRadius: (NODE_SIZE + 20) / 2,
    borderWidth: 2,
    shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
  },

  // Reward name under node
  rewardName: {
    fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 0.6,
    marginTop: 4, textAlign: 'center', width: NODE_SIZE + 20,
  },

  // COLLECT chip
  collectChip: {
    marginTop: 4, borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  collectTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1.8 },

  // Legend
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    paddingHorizontal: 20, paddingTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLabel: { color: '#FFFFFF44', fontFamily: 'Inter_400Regular', fontSize: 10 },

  // Toast
  toast: {
    position: 'absolute', bottom: 118, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0D0D1E', borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 11,
    shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  toastTxt: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});
