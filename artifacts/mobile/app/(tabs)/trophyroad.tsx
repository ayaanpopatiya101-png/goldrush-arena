import { Text } from '@/components/ui/Text';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '@/constants/colors';
import { ScreenTitle } from '@/components/ui/Primitives';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import {
  BATTLE_PASS_TIERS, BATTLE_PASS_POINTS_PER_TIER, BATTLE_PASS_SEASON, QUESTS, LUCKY_BLOCK_META,
  type BattlePassTier, type LuckyBlock, usePlayer,
} from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { BattlePassTrack, bpCellState, isOwnedCosmetic } from '@/components/progression/BattlePassTrack';
import { QuestSection } from '@/components/progression/QuestList';
import { RewardInspector, type InspectTarget } from '@/components/progression/RewardInspector';
import { RewardArt, StateChip, bpRewardView } from '@/components/progression/rewards';
import { usePlusOffer } from '@/hooks/usePlusOffer';

import { fonts } from '@/constants/typography';
const DAILY = QUESTS.filter(q => q.period === 'daily');
const WEEKLY = QUESTS.filter(q => q.period === 'weekly');
const SEASONAL = QUESTS.filter(q => q.period === 'seasonal');
const PLUS_QUESTS = QUESTS.filter(q => q.premiumOnly).length;
const SEASON_SKIN_TIERS = BATTLE_PASS_TIERS.filter(t => t.premium.type === 'skin' || t.free.type === 'skin');
const TOTAL = BATTLE_PASS_TIERS.length;

export default function BattlePassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const offer = usePlusOffer();
  const { profile, claimBattlePassTier, claimQuestReward } = usePlayer();
  const [tab, setTab] = useState<'pass' | 'quests'>('pass');
  const [inspect, setInspect] = useState<{ tier: BattlePassTier; isPlus: boolean } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [block, setBlock] = useState<LuckyBlock | null>(null);
  const busyRef = useRef(false);
  const focusStyle = useFocusAnimation();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const bpp = profile.battlePassPoints ?? 0;
  const hasPlus = profile.battlePassPremiumOwned ?? false;
  const freeClaimed = profile.battlePassClaimed ?? [];
  const plusClaimed = profile.battlePassPremiumClaimed ?? [];
  const ownedSkins = profile.ownedSkins ?? [];

  const tiersReached = Math.min(TOTAL, Math.floor(bpp / BATTLE_PASS_POINTS_PER_TIER));
  const nextTier = BATTLE_PASS_TIERS[tiersReached];
  const intoTier = bpp % BATTLE_PASS_POINTS_PER_TIER;
  const ready = BATTLE_PASS_TIERS.reduce((n, t) =>
    n + (bpCellState(t, false, bpp, hasPlus, freeClaimed, plusClaimed) === 'claimable' ? 1 : 0)
      + (bpCellState(t, true, bpp, hasPlus, freeClaimed, plusClaimed) === 'claimable' ? 1 : 0), 0);

  const openInspect = useCallback((tier: BattlePassTier, isPlus: boolean) => { setError(''); setInspect({ tier, isPlus }); }, []);

  const claimTier = useCallback(async (tier: BattlePassTier, isPlus: boolean) => {
    if (busyRef.current) return;
    if (bpCellState(tier, isPlus, bpp, hasPlus, freeClaimed, plusClaimed) !== 'claimable') return;
    busyRef.current = true; setBusyKey(`${tier.slot}_${isPlus}`); setError('');
    try {
      const b = await claimBattlePassTier(tier.slot, isPlus);
      setInspect(null);
      if (b) setBlock(b);
      else setNotice(`${bpRewardView(isPlus ? tier.premium : tier.free).title} claimed.`);
    } catch {
      setError('This claim could not be saved. Nothing was granted; try again.');
    } finally { busyRef.current = false; setBusyKey(null); }
  }, [bpp, hasPlus, freeClaimed, plusClaimed, claimBattlePassTier]);

  const claimQuest = useCallback(async (id: string) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusyKey(id); setNotice('');
    try {
      const res = await claimQuestReward(id);
      setNotice(res.success ? `+${res.bppEarned} Battle Pass points added.` : 'That quest could not be claimed. Check its progress and try again.');
    } catch {
      setNotice('This claim could not be saved. Nothing was granted; try again.');
    } finally { busyRef.current = false; setBusyKey(null); }
  }, [claimQuestReward]);

  let target: InspectTarget | null = null;
  if (inspect) {
    const { tier, isPlus } = inspect;
    const r = isPlus ? tier.premium : tier.free;
    const state = bpCellState(tier, isPlus, bpp, hasPlus, freeClaimed, plusClaimed);
    target = {
      key: `${tier.slot}_${isPlus}`,
      view: bpRewardView(r),
      state,
      owned: isOwnedCosmetic(r, ownedSkins),
      context: `Tier ${tier.slot}, ${isPlus ? 'Plus' : 'Free'} track`,
      requirement: state === 'claimed' ? 'Already claimed on this account.'
        : state === 'needsPlus' ? `Plus track reward. Requires Plus${bpp >= tier.bpp ? '; you have already reached this tier.' : ` and ${tier.bpp} points.`}`
        : state === 'claimable' ? `Tier reached with ${bpp} points. Ready to claim.`
        : `Unlocks at ${tier.bpp} Battle Pass points. You have ${bpp}, ${tier.bpp - bpp} to go.`,
    };
  }

  return (
    <Reanimated.View style={[{ flex: 1, backgroundColor: palette.background }, focusStyle]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <ScreenTitle kicker={`Season ${BATTLE_PASS_SEASON}`} title="Battle Pass" />
        <Text style={s.lede}>Finish quests for Battle Pass points. Every {BATTLE_PASS_POINTS_PER_TIER} points reaches a tier with a Free reward, plus a Plus reward if you own Plus.</Text>

        {/* Points */}
        <View style={s.card}>
          <View style={s.statRow}>
            <View style={s.stat}><Text style={s.statVal}>{bpp.toLocaleString()}</Text><Text style={s.statLbl}>POINTS</Text></View>
            <View style={s.stat}><Text style={s.statVal}>{tiersReached} / {TOTAL}</Text><Text style={s.statLbl}>TIERS REACHED</Text></View>
            <View style={s.stat}><Text style={s.statVal}>{ready}</Text><Text style={s.statLbl}>READY TO CLAIM</Text></View>
          </View>
          {nextTier ? (
            <>
              <Text style={s.small}>{intoTier} / {BATTLE_PASS_POINTS_PER_TIER} points toward tier {nextTier.slot}</Text>
              <View style={s.bar} accessible accessibilityRole="progressbar" aria-valuenow={intoTier} aria-valuemin={0} aria-valuemax={BATTLE_PASS_POINTS_PER_TIER} accessibilityLabel={`${intoTier} of ${BATTLE_PASS_POINTS_PER_TIER} points toward tier ${nextTier.slot}`}>
                <View style={[s.fill, { width: `${(intoTier / BATTLE_PASS_POINTS_PER_TIER) * 100}%` }]} />
              </View>
            </>
          ) : <Text style={s.small}>All {TOTAL} tiers reached this season.</Text>}
        </View>

        {/* Plus */}
        <View style={[s.card, { borderColor: hasPlus ? palette.edge : palette.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="crown-outline" size={22} color={palette.gold} />
            <Text style={s.h2}>{hasPlus ? 'PLUS ACTIVE' : 'PLUS TRACK'}</Text>
            <Text style={[s.badge, hasPlus ? { backgroundColor: palette.gold, color: palette.onAccent } : null]}>{hasPlus ? 'OWNED' : 'NOT OWNED'}</Text>
          </View>
          <Text style={s.small}>
            {hasPlus
              ? `Season ${BATTLE_PASS_SEASON}. Plus rewards claim on the same track as Free rewards once each tier is reached.`
              : `Plus unlocks the second reward on all ${TOTAL} tiers, including the ${SEASON_SKIN_TIERS.length} season skins below, and ${PLUS_QUESTS} Plus-only quests. Rewards are still earned by reaching each tier.`}
          </Text>
          {!hasPlus && (
            <>
              <Text style={s.small} accessibilityLiveRegion="polite">{offer.message}</Text>
              <Pressable onPress={() => router.push({ pathname: '/(tabs)/shop', params: { section: 'store' } })} accessibilityRole="link" aria-label="View store availability and prices in the Shop" style={s.btn}>
                <Text style={s.btnTxt}>VIEW STORE AVAILABILITY AND PRICES</Text>
              </Pressable>
              <Text style={s.small}>Opens the Shop. Nothing is charged on this screen; the Shop shows whether purchasing is available on this device.</Text>
            </>
          )}
        </View>

        {/* Season cosmetics */}
        <Text style={s.h2} accessibilityRole="header">SEASON {BATTLE_PASS_SEASON} SKINS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SEASON_SKIN_TIERS.map(tier => {
            const isPlus = tier.premium.type === 'skin';
            const r = isPlus ? tier.premium : tier.free;
            const view = bpRewardView(r);
            const state = bpCellState(tier, isPlus, bpp, hasPlus, freeClaimed, plusClaimed);
            const owned = isOwnedCosmetic(r, ownedSkins);
            return (
              <Pressable key={tier.slot} onPress={() => openInspect(tier, isPlus)} accessibilityRole="button"
                aria-label={`${view.title}, tier ${tier.slot} ${isPlus ? 'Plus' : 'Free'}. Opens details.`}
                style={s.showcase}>
                <RewardArt view={view} size={132} dim={state === 'locked' || state === 'needsPlus'} />
                <Text style={s.showTitle}>{view.title}</Text>
                <Text style={s.small}>Tier {tier.slot}, {isPlus ? 'Plus' : 'Free'} track</Text>
                <StateChip state={state} owned={owned} />
              </Pressable>
            );
          })}
        </View>

        {/* Tabs */}
        <View style={s.tabs} accessibilityRole="tablist">
          {([['pass', 'REWARDS', 'ticket-outline'], ['quests', 'QUESTS', 'clipboard-list-outline']] as const).map(([id, label, icon]) => {
            const on = tab === id;
            return (
              <Pressable key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} style={[s.tab, on && s.tabOn]}>
                <MaterialCommunityIcons name={icon} size={18} color={on ? palette.onAccent : palette.foreground} />
                <Text style={[s.tabTxt, on && { color: palette.onAccent }]}>{label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/trophyroad-map')} accessibilityRole="link" aria-label="Open Trophy Road" style={s.tab}>
            <MaterialCommunityIcons name="map-outline" size={18} color={palette.foreground} />
            <Text style={s.tabTxt}>ROAD</Text>
          </Pressable>
        </View>

        {notice ? (
          <Pressable onPress={() => setNotice('')} accessibilityRole="button" aria-label={`${notice} Dismiss`} style={s.notice}>
            <Text style={s.noticeTxt} accessibilityLiveRegion="polite">{notice}</Text>
            <MaterialCommunityIcons name="close" size={18} color={palette.foreground} />
          </Pressable>
        ) : null}

        {tab === 'pass' ? (
          <BattlePassTrack tiers={BATTLE_PASS_TIERS} bpp={bpp} hasPlus={hasPlus} freeClaimed={freeClaimed} plusClaimed={plusClaimed} ownedSkins={ownedSkins} onInspect={openInspect} />
        ) : (
          <View>
            <QuestSection title="Daily" period="daily" quests={DAILY} profile={profile} hasPlus={hasPlus} busyId={busyKey} onClaim={claimQuest} />
            <QuestSection title="Weekly" period="weekly" quests={WEEKLY} profile={profile} hasPlus={hasPlus} busyId={busyKey} onClaim={claimQuest} defaultOpen={false} />
            <QuestSection title="Seasonal" period="seasonal" quests={SEASONAL} profile={profile} hasPlus={hasPlus} busyId={busyKey} onClaim={claimQuest} defaultOpen={false} />
          </View>
        )}
      </ScrollView>

      <RewardInspector
        target={target}
        busy={!!busyKey}
        error={error}
        onClaim={inspect ? () => claimTier(inspect.tier, inspect.isPlus) : undefined}
        onClose={() => { setInspect(null); setError(''); }}
        secondary={target?.state === 'needsPlus' ? { label: 'VIEW STORE AVAILABILITY AND PRICES', onPress: () => { setInspect(null); router.push({ pathname: '/(tabs)/shop', params: { section: 'store' } }); } } : undefined}
      />
      {block && (
        <LuckyBlockOpener block={block} onClose={() => { const b = block; setBlock(null); setNotice(`${LUCKY_BLOCK_META[b.tier].name} opened.`); }} />
      )}
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  lede: { fontFamily: 'SourceSans3_400Regular', fontSize: 15, lineHeight: 21, color: palette.supporting },
  card: { padding: 14, gap: 10, backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderBottomWidth: 6, borderColor: palette.edge },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { flexGrow: 1, flexBasis: 84, padding: 8, backgroundColor: palette.inset, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  statVal: { fontFamily: fonts.display, fontSize: 26, color: palette.foreground, fontVariant: ['tabular-nums'] },
  statLbl: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.supporting },
  small: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 19, color: palette.supporting },
  bar: { height: 18, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.inset, padding: 2 },
  fill: { height: '100%', backgroundColor: palette.primary },
  h2: { flex: 1, fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: palette.foreground },
  badge: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.supporting, backgroundColor: palette.inset, paddingHorizontal: 6, paddingVertical: 2 },
  btn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: palette.raised, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge },
  btnTxt: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.8, color: palette.foreground, textAlign: 'center' },
  showcase: { flexGrow: 1, flexBasis: 140, padding: 10, gap: 6, alignItems: 'center', backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.border },
  showTitle: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, textTransform: 'uppercase' },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.surface, paddingHorizontal: 4 },
  tabOn: { backgroundColor: palette.primary, borderColor: palette.edge },
  tabTxt: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 1, color: palette.foreground },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, padding: 10, backgroundColor: palette.raised, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  noticeTxt: { flex: 1, fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.foreground },
});
