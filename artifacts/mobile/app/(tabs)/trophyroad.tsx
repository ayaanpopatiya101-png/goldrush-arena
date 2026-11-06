import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import Reanimated, { FadeInRight } from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { LinearGradient } from '@/components/ui/Flat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BATTLE_PASS_TIERS, BATTLE_PASS_POINTS_PER_TIER, BATTLE_PASS_SEASON,
  TROPHY_ROAD, QUESTS, LUCKY_BLOCK_META,
  type BattlePassTier, type BPReward, type QuestDefinition, type LuckyBlock,
  type TrophyReward, type TrophyMilestone,
  usePlayer,
} from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { FloatingOrbs, ORBS_ARCANE, GlowText, ParticleField, ShimmerCard, PulseRing, HolographicShimmer, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

const { width: SW } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bpRewardEmoji(r: BPReward): string {
  if (r.type === 'coins')     return '🪙';
  if (r.type === 'credits')   return '⚡';
  if (r.type === 'skin')      return '🎨';
  if (r.type === 'ultradrop') return '💎';
  if (r.type === 'luckyblock' && r.tier) return LUCKY_BLOCK_META[r.tier].emoji;
  return '🎁';
}
function bpRewardLabel(r: BPReward): string {
  if (r.label) return r.label;
  if (r.type === 'coins')     return `${(r.amount ?? 0).toLocaleString()} Coins`;
  if (r.type === 'credits')   return `${r.amount ?? 0} Credits`;
  if (r.type === 'skin')      return 'Excl. Skin';
  if (r.type === 'ultradrop') return r.amount === 1 ? 'Ultra Drop' : `${r.amount}× Ultra Drop`;
  if (r.type === 'luckyblock' && r.tier) {
    const m = LUCKY_BLOCK_META[r.tier];
    const cnt = r.amount && r.amount > 1 ? `${r.amount}× ` : '';
    return `${cnt}${m.name}`;
  }
  return 'Reward';
}
function bpRewardColor(r: BPReward): string {
  if (r.type === 'coins')     return '#C99A2E';
  if (r.type === 'credits')   return '#8C8F7A';
  if (r.type === 'skin')      return '#8C8F7A';
  if (r.type === 'ultradrop') return '#C99A2E';
  if (r.type === 'luckyblock' && r.tier) return LUCKY_BLOCK_META[r.tier].color;
  return '#ECE7DC';
}
function questEmoji(q: QuestDefinition) {
  if (q.period === 'daily')    return '☀️';
  if (q.period === 'weekly')   return '📅';
  return '🏆';
}
function getQuestProgress(q: QuestDefinition, profile: ReturnType<typeof usePlayer>['profile']): number {
  const map = q.period === 'daily'   ? profile.dailyQuestProgress
            : q.period === 'weekly'  ? profile.weeklyQuestProgress
            :                          profile.seasonalQuestProgress;
  return (map ?? {})[q.trackKey] ?? 0;
}
function isQuestClaimed(q: QuestDefinition, profile: ReturnType<typeof usePlayer>['profile']): boolean {
  const arr = q.period === 'daily'   ? profile.dailyQuestClaimed
            : q.period === 'weekly'  ? profile.weeklyQuestClaimed
            :                          profile.seasonalQuestClaimed;
  return (arr ?? []).includes(q.id);
}

// ─── 3D Title ─────────────────────────────────────────────────────────────────
function Title3D({ text, size = 22, color = '#C99A2E', shadow = '#9E7620' }: {
  text: string; size?: number; color?: string; shadow?: string;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <Text style={[s.titleLayer, { fontSize: size, color: shadow, top: 3, left: 3, position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color: '#C99A2E', top: 1.5, left: 1.5, position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color }]}>{text}</Text>
    </View>
  );
}

// ─── BPP Badge ────────────────────────────────────────────────────────────────
function BPPBadge({ bpp }: { bpp: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    staticLoop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <GlowBorder color='#8C8F7A' borderRadius={3} spread={12} pulse>
      <Animated.View style={[s.bppBadge, { transform: [{ scale: pulse }] }]}>
        <LinearGradient colors={['#8C8F7A', '#8C8F7A']} style={s.bppGrad}>
          <Text style={s.bppVal}>{bpp.toLocaleString()}</Text>
          <Text style={s.bppLabel}>BP PTS</Text>
        </LinearGradient>
      </Animated.View>
    </GlowBorder>
  );
}

// ─── Pass Slot Card ───────────────────────────────────────────────────────────
type SlotState = 'locked' | 'free_claimable' | 'premium_claimable' | 'both_claimable' | 'free_claimed' | 'premium_claimed' | 'both_claimed';

function SlotCard({ tier, bpp, hasPremium, onClaim }: {
  tier: BattlePassTier;
  bpp: number;
  hasPremium: boolean;
  onClaim: (slot: number, isPremium: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  const isUnlocked   = bpp >= tier.bpp;
  const isMilestone  = !!tier.isMilestone;

  useEffect(() => {
    if (!isUnlocked) return;
    staticLoop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, [isUnlocked]);

  const freeColor    = bpRewardColor(tier.free);
  const premColor    = bpRewardColor(tier.premium);

  function pressHandler(isPremium: boolean) {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();
    onClaim(tier.slot, isPremium);
  }

  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  return (
    <ShimmerCard active={isUnlocked} borderRadius={3} shimmerColor="rgba(255,215,10,0.12)">
      <Animated.View style={[s.slotWrap, isMilestone && s.slotMilestone, { transform: [{ scale }] }]}>


        {/* Slot number */}
        <View style={[s.slotNum, isUnlocked && s.slotNumUnlocked, isMilestone && s.slotNumMilestone]}>
          {isMilestone ? (
            <Text style={s.slotNumTxt}>{tier.slot}</Text>
          ) : (
            <Text style={s.slotNumTxt}>{tier.slot}</Text>
          )}
        </View>

        {/* Free reward (top) */}
        <Pressable
          onPress={() => pressHandler(false)}
          disabled={!isUnlocked}
          style={[s.rewardBlock, s.freeBlock, isUnlocked && { borderColor: freeColor + '44' }]}
        >
          <LinearGradient
            colors={isUnlocked ? [freeColor + '22', freeColor + '08'] : ['#ECE7DC05', '#0005']}
            style={StyleSheet.absoluteFill}
          />
          <Glyph style={[s.rewardEmoji, !isUnlocked && { opacity: 0.2 }]} value={bpRewardEmoji(tier.free)} />
          <Text style={[s.rewardLbl, { color: isUnlocked ? freeColor : '#ECE7DC22' }]} numberOfLines={2}>
            {bpRewardLabel(tier.free)}
          </Text>
          {isUnlocked && <Text style={[s.trackLabel, { color: freeColor + 'BB' }]}>FREE</Text>}
        </Pressable>

        {/* Premium reward (bottom) */}
        <Pressable
          onPress={() => pressHandler(true)}
          disabled={!isUnlocked || !hasPremium}
          style={[s.rewardBlock, s.premBlock, isUnlocked && hasPremium && { borderColor: premColor + '55' }]}
        >
          <LinearGradient
            colors={isUnlocked && hasPremium ? [premColor + '22', premColor + '08'] : ['#ECE7DC03', '#0003']}
            style={StyleSheet.absoluteFill}
          />
          <Glyph style={[s.rewardEmoji, !(isUnlocked && hasPremium) && { opacity: 0.2 }]} value={bpRewardEmoji(tier.premium)} />
          <Text style={[s.rewardLbl, { color: isUnlocked && hasPremium ? premColor : '#ECE7DC22' }]} numberOfLines={2}>
            {bpRewardLabel(tier.premium)}
          </Text>
          {!hasPremium && <Text style={s.lockLabel}>PREMIUM</Text>}
          {isUnlocked && hasPremium && <Text style={[s.trackLabel, { color: premColor + 'BB' }]}>PREMIUM</Text>}
        </Pressable>
      </Animated.View>
    </ShimmerCard>
  );
}

// ─── Quest Row ────────────────────────────────────────────────────────────────
function QuestRow({ quest, progress, claimed, premiumOwned, onClaim }: {
  quest: QuestDefinition;
  progress: number;
  claimed: boolean;
  premiumOwned: boolean;
  onClaim: (id: string) => void;
}) {
  const pct = Math.min(1, progress / quest.target);
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: pct, duration: 700, delay: 200, useNativeDriver: false }).start();
  }, [pct]);
  const barPct = barW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const isReady = pct >= 1 && !claimed;
  const isLocked = quest.premiumOnly && !premiumOwned;
  const periodColor = quest.period === 'daily' ? '#C99A2E' : quest.period === 'weekly' ? '#8C8F7A' : '#B4533A';

  return (
    <ShimmerCard active={claimed} borderRadius={3} shimmerColor="rgba(100,255,100,0.1)">
      <View style={[s.questRow, { borderColor: claimed ? '#6F8A5B22' : isReady ? periodColor + '44' : '#ECE7DC0D' }]}>
        <LinearGradient
          colors={claimed ? ['#6F8A5B08', '#0005'] : isReady ? [periodColor + '18', '#0005'] : ['#ECE7DC04', '#0003']}
          style={StyleSheet.absoluteFill}
        />
        <Glyph style={s.questEmoji} value={questEmoji(quest)} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.questTitle, { color: isLocked ? '#ECE7DC33' : claimed ? '#6F8A5B' : '#ECE7DCCC' }]}>
              {quest.title}
            </Text>
            {quest.premiumOnly && (
              <View style={s.premBadge}>
                <Text style={s.premBadgeTxt}>PREMIUM</Text>
              </View>
            )}
          </View>
          <Text style={[s.questDesc, { color: isLocked ? '#ECE7DC22' : '#ECE7DC55' }]}>{quest.description}</Text>
          {/* Progress bar */}
          <View style={{ gap: 3 }}>
            <View style={s.questBarBg}>
              <Animated.View style={[s.questBarFill, { width: barPct as never, backgroundColor: claimed ? '#6F8A5B' : periodColor }]}>
                <View style={s.questBarShine} />
              </Animated.View>
            </View>
            <Text style={s.questProg}>
              {claimed ? 'Complete!' : isLocked ? 'Requires Premium Pass' : `${Math.min(progress, quest.target)} / ${quest.target}`}
            </Text>
          </View>
        </View>
        {/* BPP badge */}
        <View style={{ alignItems: 'flex-end', gap: 5, minWidth: 54 }}>
          <View style={[s.bppChip, { borderColor: periodColor + '55', backgroundColor: periodColor + '18' }]}>
            <Text style={[s.bppChipTxt, { color: periodColor }]}>+{quest.reward}</Text>
            <Text style={[s.bppChipLabel, { color: periodColor + 'AA' }]}>BP</Text>
          </View>
          {isReady && !isLocked && (
            <Pressable onPress={() => onClaim(quest.id)} style={[s.claimBtn, { borderColor: periodColor, backgroundColor: periodColor + '22' }]}>
              <Text style={[s.claimBtnTxt, { color: periodColor }]}>CLAIM</Text>
            </Pressable>
          )}
          {claimed && <Glyph style={{ fontSize: 16 }} value="✅" />}
          {isLocked && <Glyph style={{ fontSize: 14, opacity: 0.4 }} value="🔒" />}
        </View>
      </View>
    </ShimmerCard>
  );
}

// ─── Quest Section ────────────────────────────────────────────────────────────
function QuestSection({ title, quests, profile, premiumOwned, onClaim, periodColor, defaultOpen }: {
  title: string;
  quests: QuestDefinition[];
  profile: ReturnType<typeof usePlayer>['profile'];
  premiumOwned: boolean;
  onClaim: (id: string) => void;
  periodColor: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const claimedCount = quests.filter(q => isQuestClaimed(q, profile)).length;
  const totalEligible = quests.filter(q => !q.premiumOnly || premiumOwned).length;
  return (
    <View style={{ marginBottom: 10 }}>
      <Pressable onPress={() => setOpen(o => !o)} style={[s.sectionHeader, { borderColor: periodColor + '44' }]}>
        <LinearGradient colors={[periodColor + '18', periodColor + '06']} style={StyleSheet.absoluteFill} />
        <Glyph style={{ fontSize: 14 }} value={title === 'Daily' ? '☀️' : title === 'Weekly' ? '📅' : '🏆'} />
        <GlowText intensity="soft" color='#C99A2E' style={[s.sectionTitle, { color: periodColor }]}>
          {title.toUpperCase()} QUESTS
        </GlowText>
        <View style={s.sectionCount}>
          <Text style={[s.sectionCountTxt, { color: periodColor }]}>{claimedCount}/{totalEligible}</Text>
        </View>
        <Text style={{ color: '#ECE7DC44', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && quests.map(q => (
        <QuestRow
          key={q.id}
          quest={q}
          progress={getQuestProgress(q, profile)}
          claimed={isQuestClaimed(q, profile)}
          premiumOwned={premiumOwned}
          onClaim={onClaim}
        />
      ))}
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ label, color, onDone }: { label: string; color: string; onDone: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
      Animated.delay(1800),
      Animated.timing(op, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View pointerEvents="none" style={[tr.toast, { borderColor: color, opacity: op, transform: [{ translateY: ty }] }]}>
      <Text style={[tr.toastTxt, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Trophy Road ──────────────────────────────────────────────────────────────

interface RoadZone {
  name: string;
  subtitle: string;
  gradColors: [string, string];
  accent: string;
  decor: string[];
  milestones: TrophyMilestone[];
}

const ROAD_ZONES: RoadZone[] = [
  {
    name: 'Dusty Trail',
    subtitle: 'Where legends begin…',
    gradColors: ['#16171A', '#16171A'],
    accent: '#C99A2E',
    decor: ['🌵', '⛺', '🏜️', '🌅', '🌵'],
    milestones: TROPHY_ROAD.slice(0, 5),
  },
  {
    name: 'Gold Rush Gulch',
    subtitle: 'Strike it rich',
    gradColors: ['#16171A', '#16171A'],
    accent: '#C99A2E',
    decor: ['⛏️', '🪨', '💰', '🔦', '💎'],
    milestones: TROPHY_ROAD.slice(5, 10),
  },
  {
    name: 'Crimson Canyon',
    subtitle: 'Heat rises, do you?',
    gradColors: ['#16171A', '#16171A'],
    accent: '#B4533A',
    decor: ['🌋', '🔥', '💥', '🏔️', '🌋'],
    milestones: TROPHY_ROAD.slice(10, 15),
  },
  {
    name: 'Crystal Caverns',
    subtitle: 'Beneath the surface',
    gradColors: ['#16171A', '#16171A'],
    accent: '#8C8F7A',
    decor: ['💎', '🔮', '✨', '🫧', '💎'],
    milestones: TROPHY_ROAD.slice(15, 20),
  },
  {
    name: 'Summit of Champions',
    subtitle: 'Only the elite reach here',
    gradColors: ['#16171A', '#16171A'],
    accent: '#8C8F7A',
    decor: ['👑', '⚡', '🏆', '🌟', '⚡'],
    milestones: TROPHY_ROAD.slice(20, 25),
  },
];

function trEmoji(r: TrophyReward): string {
  if (r.type === 'coins')     return '🪙';
  if (r.type === 'skin')      return '🎨';
  if (r.type === 'relic')     return '⚔️';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].emoji;
  return '🎁';
}
function trLabel(r: TrophyReward): string {
  if (r.type === 'coins')     return `${r.amount.toLocaleString()} Coins`;
  if (r.type === 'skin')      return r.id[0].toUpperCase() + r.id.slice(1) + ' Skin';
  if (r.type === 'relic')     return r.id[0].toUpperCase() + r.id.slice(1) + ' Relic';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].name;
  return 'Reward';
}
function trColor(r: TrophyReward): string {
  if (r.type === 'coins')     return '#C99A2E';
  if (r.type === 'skin')      return '#8C8F7A';
  if (r.type === 'relic')     return '#B4533A';
  if (r.type === 'luckyblock') return LUCKY_BLOCK_META[r.tier].color;
  return '#ECE7DC';
}
function fmtXP(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return String(n);
}

// Z-shaped connector between zigzag nodes
function PathConnector({ fromRight, color }: { fromRight: boolean; color: string }) {
  const c = color + '70';
  const v: any = { backgroundColor: c, position: 'absolute' };
  return (
    <View style={{ height: 52, marginHorizontal: 40, marginTop: -2, marginBottom: -2 }}>
      {fromRight ? (
        <>
          <View style={[v, { right: 2, top: 0, height: 24, width: 2 }]} />
          <View style={[v, { right: 2, left: 2, top: 24, height: 2 }]} />
          <View style={[v, { left: 2, top: 24, bottom: 0, width: 2 }]} />
        </>
      ) : (
        <>
          <View style={[v, { left: 2, top: 0, height: 24, width: 2 }]} />
          <View style={[v, { left: 2, right: 2, top: 24, height: 2 }]} />
          <View style={[v, { right: 2, top: 24, bottom: 0, width: 2 }]} />
        </>
      )}
    </View>
  );
}

// Decorative floating emojis inside a zone banner
function ZoneDecor({ emojis, color }: { emojis: string[]; color: string }) {
  const floats = emojis.slice(0, 4).map((e, i) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      staticLoop(Animated.sequence([
        Animated.timing(anim, { toValue: -5, duration: 1600 + i * 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0,  duration: 1600 + i * 400, useNativeDriver: true }),
      ])).start();
    }, []);
    return { e, anim, x: 12 + i * 26 };
  });
  return (
    <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, width: 120, overflow: 'hidden' }}>
      {floats.map(({ e, anim, x }, i) => (
        <Animated.Text key={i}
          style={{
            position: 'absolute',
            fontSize: i === 0 ? 28 : i === 1 ? 20 : 14,
            right: x,
            top: i % 2 === 0 ? 6 : 16,
            transform: [{ translateY: anim }],
            opacity: 1 - i * 0.15,
          }}
        >{e}</Animated.Text>
      ))}
    </View>
  );
}

function ZoneBanner({ zone, zoneIdx }: { zone: RoadZone; zoneIdx: number }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: zoneIdx === 0 ? 8 : 20, marginBottom: 16 }}>
      <LinearGradient
        colors={[zone.accent + '35', zone.accent + '0A']}
        style={{
          borderRadius: 3, padding: 16, borderWidth: 1.5,
          borderColor: zone.accent + '55', overflow: 'hidden',
        }}
      >

        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 8, color: zone.accent, letterSpacing: 3, marginBottom: 3 }}>
          ZONE {zoneIdx + 1} · 5 MILESTONES
        </Text>
        <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: '#ECE7DC', letterSpacing: 1.5, lineHeight: 28 }}>
          {zone.name.toUpperCase()}
        </Text>
        <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: zone.accent + 'CC', marginTop: 2 }}>
          {zone.subtitle}
        </Text>
        {/* XP range pill */}
        <View style={{
          alignSelf: 'flex-start', marginTop: 8,
          backgroundColor: zone.accent + '22', borderRadius: 3,
          paddingHorizontal: 8, paddingVertical: 3,
          borderWidth: 1, borderColor: zone.accent + '44',
        }}>
          <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: zone.accent, letterSpacing: 0.5 }}>
            {fmtXP(zone.milestones[0].xp)} – {fmtXP(zone.milestones[4].xp)} XP
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function MilestoneNode({ ms, globalIdx, zone, claimed, canClaim, isLeft, onClaim }: {
  ms: TrophyMilestone; globalIdx: number; zone: RoadZone;
  claimed: boolean; canClaim: boolean; isLeft: boolean;
  onClaim: (id: string) => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!canClaim) return;
    const a = staticLoop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [canClaim]);

  const borderColor = claimed ? zone.accent + '60' : canClaim ? zone.accent : '#ECE7DC1A';
  const bg1 = claimed ? zone.accent + '20' : canClaim ? zone.accent + '38' : zone.accent + '08';
  const opacity = claimed ? 0.65 : canClaim ? 1 : 0.32;
  const rc = trColor(ms.reward);

  return (
    <View style={[tr.nodeRow, { justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}>
      <Animated.View style={{ transform: [{ scale: canClaim ? pulse : 1 }] }}>
        <Pressable
          onPress={() => canClaim && onClaim(ms.id)}
          style={({ pressed }) => [
            tr.nodeCard,
            { borderColor, opacity: pressed ? 0.75 : opacity },
            canClaim && { shadowColor: zone.accent, shadowRadius: 0, shadowOpacity: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
          ]}
        >
          <LinearGradient colors={[bg1, 'transparent']} style={StyleSheet.absoluteFill} />

          {/* Milestone number badge */}
          <View style={[tr.numBadge, { backgroundColor: zone.accent + '25', borderColor: zone.accent + '40' }]}>
            <Text style={[tr.numTxt, { color: zone.accent }]}>#{globalIdx + 1}</Text>
          </View>

          {/* Reward icon */}
          <Glyph style={{ fontSize: 32, marginVertical: 6 }} value={trEmoji(ms.reward)} />

          {/* Reward name */}
          <Text style={[tr.rewardTxt, { color: rc }]} numberOfLines={2}>{trLabel(ms.reward)}</Text>

          {/* XP threshold */}
          <Text style={tr.xpTxt}>{fmtXP(ms.xp)} XP</Text>

          {/* State chip */}
          {claimed ? (
            <View style={[tr.chip, { backgroundColor: '#6F8A5B20', borderColor: '#6F8A5B40' }]}>
              <Text style={[tr.chipTxt, { color: '#6F8A5B' }]}>CLAIMED</Text>
            </View>
          ) : canClaim ? (
            <View style={[tr.chip, { backgroundColor: zone.accent + '28', borderColor: zone.accent + '88' }]}>
              <Text style={[tr.chipTxt, { color: zone.accent }]}>TAP TO CLAIM</Text>
            </View>
          ) : (
            <View style={[tr.chip, { backgroundColor: '#ECE7DC08', borderColor: '#ECE7DC18' }]}>
              <Text style={[tr.chipTxt, { color: '#ECE7DC33' }]}> {fmtXP(ms.xp)} XP</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ZoneEndArrow({ accentA, accentB }: { accentA: string; accentB: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <LinearGradient
        colors={[accentA + '00', accentA + '44', accentB + '44', accentB + '00']}
        style={{ height: 2, width: 80, marginBottom: 6 }}
      />
      <Glyph style={{ fontSize: 14, opacity: 0.45 }} value="⬇" />
      <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 7, color: '#ECE7DC25', letterSpacing: 2.5, marginTop: 3 }}>
        NEXT ZONE
      </Text>
    </View>
  );
}

function TrophyRoadTab({
  profile,
  onClaim,
  insets,
}: {
  profile: ReturnType<typeof usePlayer>['profile'];
  onClaim: (id: string) => void;
  insets: { bottom: number };
}) {
  const claimed = profile.trophyRoadClaimed ?? [];
  const playerXP = profile.xp ?? 0;
  const total    = TROPHY_ROAD.length;
  const done     = claimed.length;

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

      {/* Overall progress bar */}
      <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 10, color: '#C99A2E', letterSpacing: 1 }}>
            TROPHY ROAD
          </Text>
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, color: '#ECE7DC55' }}>
            {done} / {total} claimed
          </Text>
        </View>
        <View style={{ height: 5, backgroundColor: '#ECE7DC0D', borderRadius: 3, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#C99A2E', '#C99A2E']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 5, width: `${(done / total) * 100}%` as any, borderRadius: 3 }}
          />
        </View>
      </View>

      {/* Zones */}
      {ROAD_ZONES.map((zone, zi) => (
        <View key={zone.name}>
          <ZoneBanner zone={zone} zoneIdx={zi} />
          {zone.milestones.map((ms, mi) => {
            const globalIdx = zi * 5 + mi;
            const isLeft    = globalIdx % 2 === 0;
            const isClaimed = claimed.includes(ms.id);
            const isUnlocked = playerXP >= ms.xp;
            return (
              <React.Fragment key={ms.id}>
                <MilestoneNode
                  ms={ms} globalIdx={globalIdx} zone={zone}
                  claimed={isClaimed} canClaim={isUnlocked && !isClaimed}
                  isLeft={isLeft} onClaim={onClaim}
                />
                {mi < zone.milestones.length - 1 && (
                  <PathConnector fromRight={!isLeft} color={zone.accent} />
                )}
              </React.Fragment>
            );
          })}
          {zi < ROAD_ZONES.length - 1 && (
            <ZoneEndArrow accentA={zone.accent} accentB={ROAD_ZONES[zi + 1].accent} />
          )}
        </View>
      ))}

      {/* Completion banner */}
      {done === total && (
        <View style={{ margin: 20, borderRadius: 3, overflow: 'hidden', borderWidth: 1.5, borderColor: '#C99A2E66' }}>
          <LinearGradient colors={['#16171A60', '#16171A']} style={{ padding: 20, alignItems: 'center', gap: 4 }}>
            <Glyph style={{ fontSize: 40 }} value="🏆" />
            <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, color: '#C99A2E', letterSpacing: 2 }}>
              ROAD COMPLETE!
            </Text>
            <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: '#ECE7DC66', textAlign: 'center' }}>
              You've conquered every zone. True GoldRush Champion.
            </Text>
          </LinearGradient>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DAILY_QUESTS   = QUESTS.filter(q => q.period === 'daily');
const WEEKLY_QUESTS  = QUESTS.filter(q => q.period === 'weekly');
const SEASONAL_QUESTS = QUESTS.filter(q => q.period === 'seasonal');

export default function BattlePassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, claimBattlePassTier, claimQuestReward, claimTrophyRoad } = usePlayer();
  const [innerTab, setInnerTab] = useState<'quests' | 'pass'>('pass');
  const [toasts, setToasts] = useState<{ id: string; label: string; color: string }[]>([]);
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);
  const passScrollRef = useRef<ScrollView>(null);

  const bpp         = profile.battlePassPoints ?? 0;
  const hasPremium  = profile.battlePassPremiumOwned ?? false;
  const freeClaimed = profile.battlePassClaimed ?? [];
  const premClaimed = profile.battlePassPremiumClaimed ?? [];

  // Auto-scroll pass to first claimable slot on mount
  useEffect(() => {
    if (innerTab !== 'pass') return;
    const currentTier = Math.floor(bpp / BATTLE_PASS_POINTS_PER_TIER);
    const targetSlot  = Math.max(0, Math.min(currentTier, BATTLE_PASS_TIERS.length - 1));
    const SLOT_W = 120;
    setTimeout(() => passScrollRef.current?.scrollTo({ x: targetSlot * SLOT_W - SW / 2 + SLOT_W / 2, animated: true }), 600);
  }, [innerTab]);

  const handleClaimTier = useCallback(async (slot: number, isPremium: boolean) => {
    const tierId = `bp_${slot}`;
    if (!isPremium && freeClaimed.includes(tierId)) return;
    if (isPremium && premClaimed.includes(tierId)) return;
    const block = await claimBattlePassTier(slot, isPremium);
    const tier = BATTLE_PASS_TIERS.find(t => t.slot === slot);
    if (!tier) return;
    const reward = isPremium ? tier.premium : tier.free;
    if (block) {
      setActiveLuckyBlock(block);
    } else {
      setToasts(prev => [...prev, {
        id: `${slot}_${isPremium}_${Date.now()}`,
        label: `${bpRewardLabel(reward)} collected!`,
        color: bpRewardColor(reward),
      }]);
    }
  }, [claimBattlePassTier, freeClaimed, premClaimed]);

  const handleClaimTrophyMilestone = useCallback(async (id: string) => {
    const block = await claimTrophyRoad(id);
    if (block) {
      setActiveLuckyBlock(block);
    } else {
      const ms = TROPHY_ROAD.find(m => m.id === id);
      if (ms) {
        const label = trLabel(ms.reward);
        setToasts(prev => [...prev, { id: id + Date.now(), label: `${label} collected!`, color: trColor(ms.reward) }]);
      }
    }
  }, [claimTrophyRoad]);

  const handleClaimQuest = useCallback(async (questId: string) => {
    const result = await claimQuestReward(questId);
    if (result.success) {
      const q = QUESTS.find(q => q.id === questId);
      setToasts(prev => [...prev, {
        id: questId + Date.now(),
        label: `+${result.bppEarned} Battle Pass Points!`,
        color: '#8C8F7A',
      }]);
    }
  }, [claimQuestReward]);

  // Progress bar for current tier
  const currentTierIdx = Math.floor(bpp / BATTLE_PASS_POINTS_PER_TIER);
  const tierProgress = (bpp % BATTLE_PASS_POINTS_PER_TIER) / BATTLE_PASS_POINTS_PER_TIER;
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: tierProgress, duration: 1000, delay: 400, useNativeDriver: false }).start();
  }, [tierProgress]);
  const progressPct = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const focusStyle = useFocusAnimation();

  return (
    <Reanimated.View style={[{ flex: 1, backgroundColor: '#16171A' }, focusStyle]}>
      <FloatingOrbs orbs={ORBS_ARCANE} opacity={0.8} />
      <ParticleField count={35} mode="stars" />
      <LinearGradient colors={['#16171A', '#16171A', '#16171A']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#8C8F7A26', '#8C8F7A10', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.seasonLabel}>SEASON {BATTLE_PASS_SEASON}</Text>
            <View style={{ shadowColor: '#C99A2E', shadowRadius: 0, shadowOpacity: 0, shadowOffset: { width: 0, height: 0 } }}>
              <Title3D text="BATTLE PASS" size={20} color="#8C8F7A" shadow="#8C8F7A" />
            </View>
            <Text style={s.headerSub}>Complete Quests → Earn Points → Unlock Rewards</Text>
          </View>
          <BPPBadge bpp={bpp} />
        </View>

        {/* ── Points progress bar ── */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLbl}>Tier {Math.min(currentTierIdx + 1, 50)} / 50</Text>
            <Text style={[s.progressLbl, { color: '#8C8F7A99' }]}>
              {bpp % BATTLE_PASS_POINTS_PER_TIER} / {BATTLE_PASS_POINTS_PER_TIER} pts to next
            </Text>
          </View>
          <View style={s.barBg}>
            <ShimmerCard active={true} borderRadius={4} duration={2200} shimmerColor="rgba(255,255,255,0.25)">
              <Animated.View style={[s.barFill, { width: progressPct as never }]}>
                <View style={s.barShine} />
              </Animated.View>
            </ShimmerCard>
          </View>
        </View>

        {/* ── Buy Premium / Premium badge ── */}
        {!hasPremium ? (
          <Pressable
            onPress={() => router.push('/(tabs)/shop')}
            style={({ pressed }) => [s.buyPremBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient colors={['#8C8F7A', '#8C8F7A']} style={StyleSheet.absoluteFill} />
            <Glyph style={{ fontSize: 18 }} value="👑" />
            <View style={{ flex: 1 }}>
              <Text style={s.buyPremTitle}>Upgrade to Premium Pass</Text>
              <Text style={s.buyPremSub}>2× rewards · 2 exclusive skins · 5× Ultra Drop</Text>
            </View>
            <Text style={s.buyPremPrice}>$4.99</Text>
          </Pressable>
        ) : (
          <View style={s.premOwnedBadge}>
            <LinearGradient colors={['#8C8F7A22', '#8C8F7A10']} style={StyleSheet.absoluteFill} />
            <Glyph style={{ fontSize: 14 }} value="👑" />
            <Text style={s.premOwnedTxt}>PREMIUM PASS ACTIVE, Season {BATTLE_PASS_SEASON}</Text>
          </View>
        )}

        {/* ── Inner Tabs ── */}
        <View style={s.tabBar}>
          {([
            { id: 'pass',   emoji: '🎫', label: 'PASS'   },
            { id: 'quests', emoji: '📋', label: 'QUESTS' },
          ] as const).map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setInnerTab(tab.id)}
              style={[s.tabBtn, innerTab === tab.id && s.tabBtnActive]}
            >
              <Glyph style={{ fontSize: 13 }} value={tab.emoji} />
              <Text style={[s.tabBtnTxt, innerTab === tab.id && { color: '#8C8F7A' }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => router.push('/trophyroad-map')}
            style={s.tabBtn}
          >
            <Glyph style={{ fontSize: 13 }} value="🗺️" />
            <Text style={s.tabBtnTxt}>ROAD</Text>
          </Pressable>
        </View>

        {/* ── QUESTS Tab ── */}
        {innerTab === 'quests' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 8 }}
          >
            <QuestSection title="Daily"    quests={DAILY_QUESTS}   profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#C99A2E" defaultOpen />
            <QuestSection title="Weekly"   quests={WEEKLY_QUESTS}  profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#8C8F7A" />
            <QuestSection title="Seasonal" quests={SEASONAL_QUESTS} profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#B4533A" />
          </ScrollView>
        )}

        {/* ── PASS Tab ── */}
        {innerTab === 'pass' && (
          <View style={{ flex: 1 }}>
            {/* Track labels */}
            <View style={s.trackLabelRow}>
              <View style={[s.trackTag, { borderColor: '#ECE7DC22' }]}>
                <Text style={[s.trackTagTxt, { color: '#ECE7DC66' }]}>FREE</Text>
              </View>
              <View style={[s.trackTag, { borderColor: '#8C8F7A66', backgroundColor: '#8C8F7A22' }]}>
                <Text style={[s.trackTagTxt, { color: '#8C8F7A' }]}>PREMIUM</Text>
              </View>
            </View>

            <ScrollView
              ref={passScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
            >
              {BATTLE_PASS_TIERS.map((tier, idx) => (
                <Reanimated.View key={tier.slot} entering={FadeInRight.delay(idx * 25).duration(280)}>
                  <SlotCard
                    tier={tier}
                    bpp={bpp}
                    hasPremium={hasPremium}
                    onClaim={handleClaimTier}
                  />
                </Reanimated.View>
              ))}
            </ScrollView>

            {/* Legend */}
            <View style={[s.legend, { paddingBottom: insets.bottom + 78 }]}>
              {[
                { emoji: '🪙', label: 'Coins' },
                { emoji: '⚡', label: 'Credits' },
                { emoji: '🎁', label: 'Block' },
                { emoji: '💎', label: 'Ultra' },
                { emoji: '🎨', label: 'Skin' },
              ].map(l => (
                <View key={l.label} style={s.legendItem}>
                  <Glyph style={{ fontSize: 11 }} value={l.emoji} />
                  <Text style={s.legendTxt}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ── Toasts ── */}
      {toasts.map(t => (
        <Toast key={t.id} label={t.label} color={t.color}
          onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
      ))}

      {/* ── Lucky Block Opener ── */}
      {activeLuckyBlock && (
        <LuckyBlockOpener
          block={activeLuckyBlock}
          onClose={() => {
            const b = activeLuckyBlock;
            setActiveLuckyBlock(null);
            setToasts(prev => [...prev, {
              id: b.id + '_opened',
              label: `${LUCKY_BLOCK_META[b.tier].name} opened!`,
              color: LUCKY_BLOCK_META[b.tier].color,
            }]);
          }}
        />
      )}
    </Reanimated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  titleLayer: { fontFamily: 'SourceSans3_700Bold', letterSpacing: 2.5, textTransform: 'uppercase' },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, marginBottom: 10, gap: 12 },
  seasonLabel: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, letterSpacing: 2.5, color: '#8C8F7A99', marginBottom: 2 },
  headerSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 9, color: '#ECE7DC44', letterSpacing: 0.3, marginTop: 4 },

  // BPP badge
  bppBadge: { borderRadius: 3, overflow: 'hidden', shadowColor: '#8C8F7A', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
  bppGrad:  { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', borderRadius: 3 },
  bppVal:   { color: '#ECE7DC', fontFamily: 'SourceSans3_700Bold', fontSize: 18, lineHeight: 22 },
  bppLabel: { color: '#8C8F7A', fontFamily: 'SourceSans3_700Bold', fontSize: 7, letterSpacing: 2 },

  // Progress
  progressCard: { marginHorizontal: 18, marginBottom: 10, backgroundColor: '#ECE7DC06', borderRadius: 3, padding: 10, borderWidth: 1, borderColor: '#8C8F7A22' },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLbl:  { color: '#ECE7DC55', fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 0.3 },
  barBg:   { height: 8, borderRadius: 4, backgroundColor: '#ECE7DC0D', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#8C8F7A' },
  barShine:{ position: 'absolute', top: 1, left: '5%', width: '60%', height: 3, borderRadius: 2, backgroundColor: '#ECE7DC55' },

  // Buy Premium button
  buyPremBtn: { marginHorizontal: 18, marginBottom: 10, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  buyPremTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: '#ECE7DC', letterSpacing: 0.3 },
  buyPremSub:   { fontFamily: 'SourceSans3_400Regular', fontSize: 10, color: '#8C8F7Abb', marginTop: 2 },
  buyPremPrice: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: '#ECE7DC', backgroundColor: '#ECE7DC22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3 },
  premOwnedBadge: { marginHorizontal: 18, marginBottom: 10, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: '#8C8F7A44' },
  premOwnedTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, color: '#8C8F7A', letterSpacing: 1 },

  // Inner tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 10, backgroundColor: '#ECE7DC08', borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#ECE7DC0D' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  tabBtnActive: { backgroundColor: '#8C8F7A22', borderBottomWidth: 2, borderBottomColor: '#8C8F7A' },
  tabBtnTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#ECE7DC55' },

  // Track labels above the pass
  trackLabelRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingHorizontal: 18, marginBottom: 6 },
  trackTag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  trackTagTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // Slot card
  slotWrap: {
    width: 112, borderRadius: 3, overflow: 'hidden',
    backgroundColor: '#1F2125', borderWidth: 1, borderColor: '#ECE7DC0D',
  },
  slotMilestone: { borderColor: '#C99A2E44' },
  milestoneGlow: { borderWidth: 1.5, borderRadius: 3 },
  slotNum: { alignItems: 'center', paddingVertical: 6, backgroundColor: '#ECE7DC08', borderBottomWidth: 1, borderColor: '#ECE7DC0A' },
  slotNumUnlocked: { backgroundColor: '#8C8F7A22' },
  slotNumMilestone: { backgroundColor: '#C99A2E22' },
  slotNumTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, color: '#ECE7DC66', letterSpacing: 0.5 },
  rewardBlock: { padding: 8, alignItems: 'center', borderWidth: 0, minHeight: 82, justifyContent: 'center' },
  freeBlock: { borderBottomWidth: 1, borderBottomColor: '#ECE7DC0A' },
  premBlock: {},
  rewardEmoji: { fontSize: 20, marginBottom: 3 },
  rewardLbl: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 8, letterSpacing: 0.3, textAlign: 'center', lineHeight: 11 },
  trackLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 3 },
  lockLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 7, color: '#ECE7DC33', letterSpacing: 1, marginTop: 3 },

  // Quest section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', borderRadius: 3, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6 },
  sectionTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 2, flex: 1 },
  sectionCount: { borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#ECE7DC10' },
  sectionCountTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 0.5 },

  // Quest row
  questRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, overflow: 'hidden', borderRadius: 3, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  questEmoji: { fontSize: 18, marginTop: 2 },
  questTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.3 },
  questDesc:  { fontFamily: 'SourceSans3_400Regular', fontSize: 10, lineHeight: 14 },
  questBarBg:   { height: 5, borderRadius: 3, backgroundColor: '#ECE7DC0D', overflow: 'hidden' },
  questBarFill: { height: 5, borderRadius: 3, overflow: 'hidden' },
  questBarShine:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#ECE7DC33', borderRadius: 2 },
  questProg: { fontFamily: 'SourceSans3_400Regular', fontSize: 9, color: '#ECE7DC44', letterSpacing: 0.3 },
  premBadge:    { borderRadius: 4, borderWidth: 1, borderColor: '#8C8F7A55', backgroundColor: '#8C8F7A22', paddingHorizontal: 5, paddingVertical: 1 },
  premBadgeTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 7, color: '#8C8F7A', letterSpacing: 1 },
  bppChip:    { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 3, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  bppChipTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 11 },
  bppChipLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 8, letterSpacing: 1 },
  claimBtn:    { borderRadius: 3, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  claimBtnTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // Legend
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendTxt:  { color: '#ECE7DC44', fontFamily: 'SourceSans3_400Regular', fontSize: 9 },
});

// ─── Trophy Road Styles ───────────────────────────────────────────────────────
const tr = StyleSheet.create({
  nodeRow:    { paddingHorizontal: 28, marginVertical: 0 },
  nodeCard:   {
    width: 128, borderRadius: 3, borderWidth: 2,
    overflow: 'hidden', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  numBadge:   {
    borderRadius: 3, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2,
  },
  numTxt:     { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 0.5 },
  rewardTxt:  {
    fontFamily: 'SourceSans3_700Bold', fontSize: 11,
    textAlign: 'center', letterSpacing: 0.3, lineHeight: 14,
  },
  xpTxt:      { fontFamily: 'SourceSans3_600SemiBold', fontSize: 8, color: '#ECE7DC44', letterSpacing: 0.3, marginTop: 3 },
  chip:       {
    borderRadius: 3, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3, marginTop: 7,
  },
  chipTxt:    { fontFamily: 'SourceSans3_700Bold', fontSize: 7, letterSpacing: 1 },

  // Toast
  toast: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2125', borderWidth: 1.5, borderRadius: 3,
    paddingHorizontal: 18, paddingVertical: 10,
    shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 },
  },
  toastTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#ECE7DC' },
});
