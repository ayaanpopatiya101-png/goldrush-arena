import React, { useCallback, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  TROPHY_ROAD, RELICS, SKINS, usePlayer,
  type TrophyMilestone,
} from '@/context/PlayerContext';

const { width: SW } = Dimensions.get('window');

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_SIZE   = 68;
const NODE_SPACE  = 120; // horizontal distance between node centres
const ROAD_H      = 320; // total height of the scroll area
const ROAD_Y      = ROAD_H / 2; // centre line
const AMP         = 88;  // vertical amplitude for zig-zag

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nodeY(idx: number): number {
  // Smooth sinusoidal wave so road curves naturally
  return ROAD_Y + Math.sin(idx * 0.85) * AMP;
}

function rewardIcon(m: TrophyMilestone): string {
  const r = m.reward;
  if (r.type === 'coins') return '🪙';
  if (r.type === 'skin') {
    const s = SKINS.find(sk => sk.id === r.id);
    return s ? '🎨' : '🎨';
  }
  const rel = RELICS.find(rl => rl.id === r.id);
  return rel?.icon ?? '⚡';
}

function rewardColor(m: TrophyMilestone): string {
  const r = m.reward;
  if (r.type === 'coins') return '#FFD700';
  if (r.type === 'skin') {
    const s = SKINS.find(sk => sk.id === r.id);
    return s?.color ?? '#FF4757';
  }
  const rel = RELICS.find(rl => rl.id === r.id);
  return rel?.color ?? '#C8820A';
}

function rewardLabel(m: TrophyMilestone): string {
  const r = m.reward;
  if (r.type === 'coins') return `${r.amount} Coins`;
  if (r.type === 'skin') {
    const s = SKINS.find(sk => sk.id === r.id);
    return s?.name ?? r.id;
  }
  const rel = RELICS.find(rl => rl.id === r.id);
  return rel?.name ?? r.id;
}

function fmtXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(xp >= 10000 ? 0 : 1)}k`;
  return String(xp);
}

// ─── Claim toast ──────────────────────────────────────────────────────────────
function ClaimToast({ label, onDone }: { label: string; onDone: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  React.useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0,  duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(1400),
      Animated.timing(op, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity: op, transform: [{ translateY: ty }] }]}>
      <Text style={styles.toastTxt}>✅ {label} collected!</Text>
    </Animated.View>
  );
}

// ─── Single road node ─────────────────────────────────────────────────────────
type NodeState = 'locked' | 'available' | 'claimed';

function RoadNode({
  milestone, idx, state, onClaim,
}: {
  milestone: TrophyMilestone;
  idx: number;
  state: NodeState;
  onClaim: (m: TrophyMilestone) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (state === 'available') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [state]);

  function press() {
    if (state !== 'available') return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: true }),
    ]).start();
    onClaim(milestone);
  }

  const col   = rewardColor(milestone);
  const icon  = rewardIcon(milestone);
  const label = rewardLabel(milestone);
  const xAbove = idx % 2 === 0;

  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  return (
    <View style={{
      position: 'absolute',
      left: (idx + 0.5) * NODE_SPACE - NODE_SIZE / 2,
      top:  nodeY(idx) - NODE_SIZE / 2,
      width: NODE_SIZE,
      alignItems: 'center',
    }}>
      {/* XP label — alternates above/below node */}
      <View style={{ position: 'absolute', top: xAbove ? -26 : NODE_SIZE + 6, alignItems: 'center' }}>
        <Text style={[styles.xpLabel, state === 'locked' && { color: '#FFFFFF33' }]}>
          {fmtXP(milestone.xp)} XP
        </Text>
      </View>

      {/* Glow ring for available */}
      {state === 'available' && (
        <Animated.View style={[styles.glowRing, {
          borderColor: col,
          opacity: glowOp,
          shadowColor: col,
        }]} />
      )}

      <Pressable onPress={press}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={
              state === 'claimed'   ? ['#1A3A1A', '#0D1E0D'] :
              state === 'available' ? [col + '44', col + '22'] :
                                      ['#1A1A2E', '#0F0F1E']
            }
            style={[
              styles.nodeCircle,
              {
                borderColor: state === 'claimed'   ? '#00C853' :
                             state === 'available' ? col :
                                                     '#FFFFFF22',
                shadowColor: state === 'available' ? col : 'transparent',
                shadowOpacity: state === 'available' ? 0.9 : 0,
              },
            ]}
          >
            {state === 'claimed' ? (
              <Text style={{ fontSize: 22 }}>✅</Text>
            ) : state === 'locked' ? (
              <Text style={{ fontSize: 22, opacity: 0.35 }}>{icon}</Text>
            ) : (
              <Text style={{ fontSize: 26 }}>{icon}</Text>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Reward name */}
      <Text
        style={[
          styles.rewardName,
          { color: state === 'claimed' ? '#00C85388' : state === 'available' ? col : '#FFFFFF22' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* COLLECT chip */}
      {state === 'available' && (
        <Pressable onPress={press} style={styles.collectChip}>
          <Text style={styles.collectTxt}>COLLECT</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TrophyRoadScreen() {
  const insets  = useSafeAreaInsets();
  const { profile, claimTrophyRoad } = usePlayer();

  const [toasts, setToasts] = useState<{ id: string; label: string }[]>([]);

  const claimed   = profile.trophyRoadClaimed ?? [];
  const userXP    = profile.xp;

  // Progress: how many milestones completed
  const doneCount = TROPHY_ROAD.filter(m => userXP >= m.xp).length;
  const totalW    = TROPHY_ROAD.length * NODE_SPACE + 60;

  // Find the current/next milestone for the progress bar
  const nextIdx   = TROPHY_ROAD.findIndex(m => userXP < m.xp);
  const prevMilestone = nextIdx > 0 ? TROPHY_ROAD[nextIdx - 1] : null;
  const nextMilestone = nextIdx >= 0 ? TROPHY_ROAD[nextIdx] : null;
  const segProgress   = nextMilestone
    ? (userXP - (prevMilestone?.xp ?? 0)) / (nextMilestone.xp - (prevMilestone?.xp ?? 0))
    : 1;

  const handleClaim = useCallback(async (m: TrophyMilestone) => {
    await claimTrophyRoad(m.id);
    setToasts(prev => [...prev, { id: m.id + Date.now(), label: rewardLabel(m) }]);
  }, [claimTrophyRoad]);

  function nodeState(m: TrophyMilestone): NodeState {
    if (claimed.includes(m.id))    return 'claimed';
    if (userXP >= m.xp)            return 'available';
    return 'locked';
  }

  return (
    <LinearGradient colors={['#0A0A14', '#070710', '#0A0A14']} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 12, flex: 1 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🏆 TROPHY ROAD</Text>
            <Text style={styles.headerSub}>Earn XP to unlock rewards along the road</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeVal}>{userXP.toLocaleString()}</Text>
            <Text style={styles.xpBadgeLabel}>XP</Text>
          </View>
        </View>

        {/* ── Progress summary ── */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {doneCount}/{TROPHY_ROAD.length} unlocked
            </Text>
            {nextMilestone && (
              <Text style={styles.progressLabel}>
                {fmtXP(nextMilestone.xp - userXP)} XP to next
              </Text>
            )}
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(segProgress * 100)}%` as never }]} />
          </View>
        </View>

        {/* ── Road ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalW, height: ROAD_H + 20 }}
          style={{ flex: 1 }}
        >
          {/* Road path: connect nodes with a curved strip using segments */}
          {TROPHY_ROAD.map((m, idx) => {
            if (idx === TROPHY_ROAD.length - 1) return null;
            const x1 = (idx + 0.5) * NODE_SPACE;
            const y1 = nodeY(idx);
            const x2 = (idx + 1.5) * NODE_SPACE;
            const y2 = nodeY(idx + 1);
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const isFilled = userXP >= m.xp;
            return (
              <View
                key={`seg-${idx}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: x1, top: y1 - 5,
                  width: len, height: 10,
                  borderRadius: 5,
                  backgroundColor: isFilled ? '#C8820A' : '#FFFFFF11',
                  transformOrigin: '0 50%',
                  transform: [{ rotate: `${angle}deg` }],
                } as never}
              />
            );
          })}

          {/* Nodes */}
          {TROPHY_ROAD.map((m, idx) => (
            <RoadNode
              key={m.id}
              milestone={m}
              idx={idx}
              state={nodeState(m)}
              onClaim={handleClaim}
            />
          ))}
        </ScrollView>

        {/* ── Legend ── */}
        <View style={[styles.legend, { paddingBottom: insets.bottom + 80 }]}>
          {[
            { dot: '#FFD700', label: 'Coins' },
            { dot: '#FF4757', label: 'Skin' },
            { dot: '#C8820A', label: 'Relic' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.dot }]} />
              <Text style={styles.legendLabel}>{l.label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <Text style={{ fontSize: 12 }}>✅</Text>
            <Text style={styles.legendLabel}>Collected</Text>
          </View>
        </View>
      </View>

      {/* ── Toast overlays ── */}
      {toasts.map(t => (
        <ClaimToast key={t.id} label={t.label} onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
      ))}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 14,
  },
  headerTitle: {
    color: '#FFD700', fontFamily: 'Exo2_700Bold', fontSize: 20, letterSpacing: 1,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  headerSub: { color: '#FFFFFF55', fontFamily: 'Exo2_400Regular', fontSize: 11, marginTop: 2 },
  xpBadge: {
    backgroundColor: '#FFD70022', borderWidth: 1, borderColor: '#FFD70066',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
  },
  xpBadgeVal: { color: '#FFD700', fontFamily: 'Exo2_700Bold', fontSize: 18 },
  xpBadgeLabel: { color: '#FFD70099', fontFamily: 'Exo2_500Medium', fontSize: 9, letterSpacing: 1.5 },

  progressCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#FFFFFF08', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#FFFFFF11',
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#FFFFFF66', fontFamily: 'Exo2_500Medium', fontSize: 11 },
  progressBarBg: {
    height: 6, borderRadius: 3, backgroundColor: '#FFFFFF11', overflow: 'hidden',
  },
  progressBarFill: {
    height: 6, borderRadius: 3, backgroundColor: '#FFD700',
  },

  nodeCircle: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  glowRing: {
    position: 'absolute',
    width: NODE_SIZE + 18, height: NODE_SIZE + 18,
    borderRadius: (NODE_SIZE + 18) / 2,
    borderWidth: 2,
    shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  rewardName: {
    fontFamily: 'Exo2_600SemiBold', fontSize: 8, letterSpacing: 0.5,
    marginTop: 3, textAlign: 'center', width: NODE_SIZE + 16,
  },
  xpLabel: {
    color: '#FFD70099', fontFamily: 'Exo2_700Bold', fontSize: 9, letterSpacing: 0.5,
  },
  collectChip: {
    marginTop: 4, backgroundColor: '#FFD70033', borderWidth: 1, borderColor: '#FFD700',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  collectTxt: {
    color: '#FFD700', fontFamily: 'Exo2_700Bold', fontSize: 7, letterSpacing: 1.5,
  },

  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 18,
    paddingHorizontal: 20, paddingTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: '#FFFFFF55', fontFamily: 'Exo2_400Regular', fontSize: 10 },

  toast: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    backgroundColor: '#0F1E0F', borderWidth: 1, borderColor: '#00C853',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
    shadowColor: '#00C853', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  toastTxt: { color: '#00C853', fontFamily: 'Exo2_700Bold', fontSize: 13 },
});
