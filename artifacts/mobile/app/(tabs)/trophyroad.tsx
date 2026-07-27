import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BATTLE_PASS_TIERS, BATTLE_PASS_POINTS_PER_TIER, BATTLE_PASS_SEASON,
  QUESTS, LUCKY_BLOCK_META,
  type BattlePassTier, type BPReward, type QuestDefinition, type LuckyBlock,
  usePlayer,
} from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';

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
  if (r.type === 'coins')     return '#FFD700';
  if (r.type === 'credits')   return '#BF5FFF';
  if (r.type === 'skin')      return '#00E5FF';
  if (r.type === 'ultradrop') return '#FFD700';
  if (r.type === 'luckyblock' && r.tier) return LUCKY_BLOCK_META[r.tier].color;
  return '#FFFFFF';
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
function Title3D({ text, size = 22, color = '#FFD700', shadow = '#7A4C00' }: {
  text: string; size?: number; color?: string; shadow?: string;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <Text style={[s.titleLayer, { fontSize: size, color: shadow, top: 3, left: 3, position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color: '#B87800', top: 1.5, left: 1.5, position: 'absolute' }]}>{text}</Text>
      <Text style={[s.titleLayer, { fontSize: size, color }]}>{text}</Text>
    </View>
  );
}

// ─── BPP Badge ────────────────────────────────────────────────────────────────
function BPPBadge({ bpp }: { bpp: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[s.bppBadge, { transform: [{ scale: pulse }] }]}>
      <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={s.bppGrad}>
        <Text style={s.bppVal}>{bpp.toLocaleString()}</Text>
        <Text style={s.bppLabel}>BP PTS</Text>
      </LinearGradient>
    </Animated.View>
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
    Animated.loop(Animated.sequence([
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
    <Animated.View style={[s.slotWrap, isMilestone && s.slotMilestone, { transform: [{ scale }] }]}>
      {/* Milestone glow border */}
      {isMilestone && isUnlocked && (
        <Animated.View style={[StyleSheet.absoluteFill, s.milestoneGlow, { borderColor: '#FFD700', opacity: glowOp }]} />
      )}

      {/* Slot number */}
      <View style={[s.slotNum, isUnlocked && s.slotNumUnlocked, isMilestone && s.slotNumMilestone]}>
        {isMilestone ? (
          <Text style={s.slotNumTxt}>★{tier.slot}</Text>
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
          colors={isUnlocked ? [freeColor + '22', freeColor + '08'] : ['#FFFFFF05', '#0005']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[s.rewardEmoji, !isUnlocked && { opacity: 0.2 }]}>{bpRewardEmoji(tier.free)}</Text>
        <Text style={[s.rewardLbl, { color: isUnlocked ? freeColor : '#FFFFFF22' }]} numberOfLines={2}>
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
          colors={isUnlocked && hasPremium ? [premColor + '22', premColor + '08'] : ['#FFFFFF03', '#0003']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[s.rewardEmoji, !(isUnlocked && hasPremium) && { opacity: 0.2 }]}>{bpRewardEmoji(tier.premium)}</Text>
        <Text style={[s.rewardLbl, { color: isUnlocked && hasPremium ? premColor : '#FFFFFF22' }]} numberOfLines={2}>
          {bpRewardLabel(tier.premium)}
        </Text>
        {!hasPremium && <Text style={s.lockLabel}>🔒 PREMIUM</Text>}
        {isUnlocked && hasPremium && <Text style={[s.trackLabel, { color: premColor + 'BB' }]}>PREMIUM</Text>}
      </Pressable>
    </Animated.View>
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
  const periodColor = quest.period === 'daily' ? '#FFD700' : quest.period === 'weekly' ? '#00E5FF' : '#FF6B35';

  return (
    <View style={[s.questRow, { borderColor: claimed ? '#00C85322' : isReady ? periodColor + '44' : '#FFFFFF0D' }]}>
      <LinearGradient
        colors={claimed ? ['#00C85308', '#0005'] : isReady ? [periodColor + '18', '#0005'] : ['#FFFFFF04', '#0003']}
        style={StyleSheet.absoluteFill}
      />
      <Text style={s.questEmoji}>{questEmoji(quest)}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[s.questTitle, { color: isLocked ? '#FFFFFF33' : claimed ? '#00C853' : '#FFFFFFCC' }]}>
            {quest.title}
          </Text>
          {quest.premiumOnly && (
            <View style={s.premBadge}>
              <Text style={s.premBadgeTxt}>PREMIUM</Text>
            </View>
          )}
        </View>
        <Text style={[s.questDesc, { color: isLocked ? '#FFFFFF22' : '#FFFFFF55' }]}>{quest.description}</Text>
        {/* Progress bar */}
        <View style={{ gap: 3 }}>
          <View style={s.questBarBg}>
            <Animated.View style={[s.questBarFill, { width: barPct as never, backgroundColor: claimed ? '#00C853' : periodColor }]}>
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
        {claimed && <Text style={{ fontSize: 16 }}>✅</Text>}
        {isLocked && <Text style={{ fontSize: 14, opacity: 0.4 }}>🔒</Text>}
      </View>
    </View>
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
        <Text style={{ fontSize: 14 }}>{title === 'Daily' ? '☀️' : title === 'Weekly' ? '📅' : '🏆'}</Text>
        <Text style={[s.sectionTitle, { color: periodColor }]}>{title.toUpperCase()} QUESTS</Text>
        <View style={s.sectionCount}>
          <Text style={[s.sectionCountTxt, { color: periodColor }]}>{claimedCount}/{totalEligible}</Text>
        </View>
        <Text style={{ color: '#FFFFFF44', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
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
    <Animated.View pointerEvents="none" style={[s.toast, { borderColor: color, shadowColor: color, opacity: op, transform: [{ translateY: ty }] }]}>
      <Text style={{ fontSize: 16 }}>✦</Text>
      <Text style={[s.toastTxt, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DAILY_QUESTS   = QUESTS.filter(q => q.period === 'daily');
const WEEKLY_QUESTS  = QUESTS.filter(q => q.period === 'weekly');
const SEASONAL_QUESTS = QUESTS.filter(q => q.period === 'seasonal');

export default function BattlePassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, claimBattlePassTier, claimQuestReward } = usePlayer();
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

  const handleClaimQuest = useCallback(async (questId: string) => {
    const result = await claimQuestReward(questId);
    if (result.success) {
      const q = QUESTS.find(q => q.id === questId);
      setToasts(prev => [...prev, {
        id: questId + Date.now(),
        label: `+${result.bppEarned} Battle Pass Points!`,
        color: '#8B5CF6',
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

  return (
    <View style={{ flex: 1, backgroundColor: '#04060E' }}>
      <LinearGradient colors={['#0A0520', '#04060E', '#06091A']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#8B5CF626', '#6D28D910', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.seasonLabel}>SEASON {BATTLE_PASS_SEASON}</Text>
            <Title3D text="BATTLE PASS" size={20} color="#C084FC" shadow="#4C1D95" />
            <Text style={s.headerSub}>Complete Quests → Earn Points → Unlock Rewards</Text>
          </View>
          <BPPBadge bpp={bpp} />
        </View>

        {/* ── Points progress bar ── */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLbl}>Tier {Math.min(currentTierIdx + 1, 50)} / 50</Text>
            <Text style={[s.progressLbl, { color: '#C084FC99' }]}>
              {bpp % BATTLE_PASS_POINTS_PER_TIER} / {BATTLE_PASS_POINTS_PER_TIER} pts to next
            </Text>
          </View>
          <View style={s.barBg}>
            <Animated.View style={[s.barFill, { width: progressPct as never }]}>
              <View style={s.barShine} />
            </Animated.View>
          </View>
        </View>

        {/* ── Buy Premium / Premium badge ── */}
        {!hasPremium ? (
          <Pressable
            onPress={() => router.push('/(tabs)/shop')}
            style={({ pressed }) => [s.buyPremBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 18 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.buyPremTitle}>Upgrade to Premium Pass</Text>
              <Text style={s.buyPremSub}>2× rewards · 2 exclusive skins · 5× Ultra Drop</Text>
            </View>
            <Text style={s.buyPremPrice}>$4.99</Text>
          </Pressable>
        ) : (
          <View style={s.premOwnedBadge}>
            <LinearGradient colors={['#8B5CF622', '#6D28D910']} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 14 }}>👑</Text>
            <Text style={s.premOwnedTxt}>PREMIUM PASS ACTIVE — Season {BATTLE_PASS_SEASON}</Text>
          </View>
        )}

        {/* ── Inner Tabs ── */}
        <View style={s.tabBar}>
          {(['pass', 'quests'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setInnerTab(tab)}
              style={[s.tabBtn, innerTab === tab && s.tabBtnActive]}
            >
              <Text style={{ fontSize: 13 }}>{tab === 'pass' ? '🎫' : '📋'}</Text>
              <Text style={[s.tabBtnTxt, innerTab === tab && { color: '#C084FC' }]}>
                {tab === 'pass' ? 'PASS' : 'QUESTS'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── QUESTS Tab ── */}
        {innerTab === 'quests' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 8 }}
          >
            <QuestSection title="Daily"    quests={DAILY_QUESTS}   profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#FFD700" defaultOpen />
            <QuestSection title="Weekly"   quests={WEEKLY_QUESTS}  profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#00E5FF" />
            <QuestSection title="Seasonal" quests={SEASONAL_QUESTS} profile={profile} premiumOwned={hasPremium} onClaim={handleClaimQuest} periodColor="#FF6B35" />
          </ScrollView>
        )}

        {/* ── PASS Tab ── */}
        {innerTab === 'pass' && (
          <View style={{ flex: 1 }}>
            {/* Track labels */}
            <View style={s.trackLabelRow}>
              <View style={[s.trackTag, { borderColor: '#FFFFFF22' }]}>
                <Text style={[s.trackTagTxt, { color: '#FFFFFF66' }]}>FREE</Text>
              </View>
              <View style={[s.trackTag, { borderColor: '#8B5CF666', backgroundColor: '#8B5CF622' }]}>
                <Text style={[s.trackTagTxt, { color: '#C084FC' }]}>👑 PREMIUM</Text>
              </View>
            </View>

            <ScrollView
              ref={passScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
            >
              {BATTLE_PASS_TIERS.map(tier => (
                <SlotCard
                  key={tier.slot}
                  tier={tier}
                  bpp={bpp}
                  hasPremium={hasPremium}
                  onClaim={handleClaimTier}
                />
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
                  <Text style={{ fontSize: 11 }}>{l.emoji}</Text>
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  titleLayer: { fontFamily: 'Inter_700Bold', letterSpacing: 2.5, textTransform: 'uppercase' },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, marginBottom: 10, gap: 12 },
  seasonLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 2.5, color: '#C084FC99', marginBottom: 2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF44', letterSpacing: 0.3, marginTop: 4 },

  // BPP badge
  bppBadge: { borderRadius: 12, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  bppGrad:  { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', borderRadius: 12 },
  bppVal:   { color: '#F5F3FF', fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 22 },
  bppLabel: { color: '#C4B5FD', fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 2 },

  // Progress
  progressCard: { marginHorizontal: 18, marginBottom: 10, backgroundColor: '#FFFFFF06', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#8B5CF622' },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLbl:  { color: '#FFFFFF55', fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.3 },
  barBg:   { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF0D', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#8B5CF6' },
  barShine:{ position: 'absolute', top: 1, left: '5%', width: '60%', height: 3, borderRadius: 2, backgroundColor: '#FFFFFF55' },

  // Buy Premium button
  buyPremBtn: { marginHorizontal: 18, marginBottom: 10, borderRadius: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  buyPremTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#F5F3FF', letterSpacing: 0.3 },
  buyPremSub:   { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#C4B5FDbb', marginTop: 2 },
  buyPremPrice: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#F5F3FF', backgroundColor: '#FFFFFF22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  premOwnedBadge: { marginHorizontal: 18, marginBottom: 10, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: '#8B5CF644' },
  premOwnedTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#C084FC', letterSpacing: 1 },

  // Inner tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 10, backgroundColor: '#FFFFFF08', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF0D' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  tabBtnActive: { backgroundColor: '#8B5CF622', borderBottomWidth: 2, borderBottomColor: '#C084FC' },
  tabBtnTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#FFFFFF55' },

  // Track labels above the pass
  trackLabelRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingHorizontal: 18, marginBottom: 6 },
  trackTag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  trackTagTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // Slot card
  slotWrap: {
    width: 112, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#0D0D20', borderWidth: 1, borderColor: '#FFFFFF0D',
  },
  slotMilestone: { borderColor: '#FFD70044' },
  milestoneGlow: { borderWidth: 1.5, borderRadius: 14 },
  slotNum: { alignItems: 'center', paddingVertical: 6, backgroundColor: '#FFFFFF08', borderBottomWidth: 1, borderColor: '#FFFFFF0A' },
  slotNumUnlocked: { backgroundColor: '#8B5CF622' },
  slotNumMilestone: { backgroundColor: '#FFD70022' },
  slotNumTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF66', letterSpacing: 0.5 },
  rewardBlock: { padding: 8, alignItems: 'center', borderWidth: 0, minHeight: 82, justifyContent: 'center' },
  freeBlock: { borderBottomWidth: 1, borderBottomColor: '#FFFFFF0A' },
  premBlock: {},
  rewardEmoji: { fontSize: 20, marginBottom: 3 },
  rewardLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 0.3, textAlign: 'center', lineHeight: 11 },
  trackLabel: { fontFamily: 'Inter_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 3 },
  lockLabel: { fontFamily: 'Inter_700Bold', fontSize: 7, color: '#FFFFFF33', letterSpacing: 1, marginTop: 3 },

  // Quest section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, flex: 1 },
  sectionCount: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#FFFFFF10' },
  sectionCountTxt: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },

  // Quest row
  questRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, overflow: 'hidden', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  questEmoji: { fontSize: 18, marginTop: 2 },
  questTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.3 },
  questDesc:  { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  questBarBg:   { height: 5, borderRadius: 3, backgroundColor: '#FFFFFF0D', overflow: 'hidden' },
  questBarFill: { height: 5, borderRadius: 3, overflow: 'hidden' },
  questBarShine:{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF33', borderRadius: 2 },
  questProg: { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF44', letterSpacing: 0.3 },
  premBadge:    { borderRadius: 4, borderWidth: 1, borderColor: '#8B5CF655', backgroundColor: '#8B5CF622', paddingHorizontal: 5, paddingVertical: 1 },
  premBadgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 7, color: '#C084FC', letterSpacing: 1 },
  bppChip:    { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  bppChipTxt: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  bppChipLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  claimBtn:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  claimBtnTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // Legend
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendTxt:  { color: '#FFFFFF44', fontFamily: 'Inter_400Regular', fontSize: 9 },

  // Toast
  toast: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0D0D1E', borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 10,
    shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  toastTxt: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' },
});
