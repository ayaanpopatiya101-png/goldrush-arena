import { Text } from '@/components/ui/Text';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { palette } from '@/constants/colors';
import { ScreenTitle } from '@/components/ui/Primitives';
import { TROPHY_ROAD, RELICS, getRankIndex, type LuckyBlock, type TrophyMilestone, usePlayer } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { RoadSummary, RoadZones, milestoneState } from '@/components/progression/TrophyRoadPath';
import { RewardInspector, type InspectTarget } from '@/components/progression/RewardInspector';
import { trophyRewardView } from '@/components/progression/rewards';

export default function TrophyRoadMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, claimTrophyRoad } = usePlayer();
  const claimed = profile.trophyRoadClaimed ?? [];
  const xp = profile.xp ?? 0;
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const [inspect, setInspect] = useState<{ ms: TrophyMilestone; idx: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [block, setBlock] = useState<LuckyBlock | null>(null);
  const busyRef = useRef(false);

  const openInspect = useCallback((ms: TrophyMilestone) => {
    setError('');
    setInspect({ ms, idx: TROPHY_ROAD.findIndex(m => m.id === ms.id) });
  }, []);

  const claim = useCallback(async (ms: TrophyMilestone) => {
    if (busyRef.current) return;
    if (milestoneState(ms, xp, claimed) !== 'claimable') return;
    busyRef.current = true; setBusyId(ms.id); setError('');
    try {
      const b = await claimTrophyRoad(ms.id);
      setInspect(null);
      if (b) setBlock(b);
      else setNotice(`${trophyRewardView(ms.reward).title} claimed.`);
    } catch {
      setError('This claim could not be saved. Nothing was granted; try again.');
      if (!inspect) setNotice('This claim could not be saved. Nothing was granted; try again.');
    } finally {
      busyRef.current = false; setBusyId(null);
    }
  }, [xp, claimed, claimTrophyRoad, inspect]);

  let target: InspectTarget | null = null;
  if (inspect) {
    const state = milestoneState(inspect.ms, xp, claimed);
    const r = inspect.ms.reward;
    const owned = r.type === 'skin' ? profile.ownedSkins.includes(r.id) : r.type === 'relic'
      ? (profile.trophyUnlockedRelics ?? []).includes(r.id)
        || getRankIndex(profile.rank) >= (RELICS.find(relic => relic.id === r.id)?.unlockRankIndex ?? Infinity)
      : false;
    const view = trophyRewardView(r);
    if (r.type === 'relic' && owned) {
      view.detail = 'You already have access to this relic. This milestone grants 15 Credits instead, following the existing duplicate-relic reward rule.';
    }
    target = {
      key: inspect.ms.id,
      view,
      state,
      owned: r.type === 'skin' ? owned : undefined,
      context: `Trophy Road milestone ${inspect.idx + 1}`,
      requirement: state === 'claimed' ? 'Already claimed on this account.'
        : state === 'claimable' ? `Reached at ${inspect.ms.xp.toLocaleString()} XP. Ready to claim.`
        : `Unlocks at ${inspect.ms.xp.toLocaleString()} XP. You have ${xp.toLocaleString()} XP, ${(inspect.ms.xp - xp).toLocaleString()} to go.`,
    };
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.replace('/(tabs)/trophyroad')} accessibilityRole="button" aria-label="Back to Battle Pass" accessibilityLabel="Back to Battle Pass" style={s.back}>
          <Feather name="chevron-left" size={24} color={palette.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>TROPHY ROAD</Text>
        <View style={s.back} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <ScreenTitle kicker="25 XP milestones . 5 zones" title="Trophy Road" />
        <Text style={s.lede}>Every match earns XP. Each milestone unlocks once your total XP reaches it, then you claim it here.</Text>
        <RoadSummary xp={xp} claimed={claimed} onInspect={openInspect} />
        {notice ? (
          <Pressable onPress={() => setNotice('')} accessibilityRole="button" aria-label={`${notice} Dismiss`} style={s.notice}>
            <Text style={s.noticeTxt} accessibilityLiveRegion="polite">{notice}</Text>
            <Feather name="x" size={18} color={palette.foreground} />
          </Pressable>
        ) : null}
        <RoadZones xp={xp} claimed={claimed} busyId={busyId} onInspect={openInspect} onClaim={claim} />
        {claimed.length === TROPHY_ROAD.length && (
          <View style={s.done}>
            <Text style={s.headerTitle}>ROAD COMPLETE</Text>
            <Text style={s.lede}>All 25 milestones claimed.</Text>
          </View>
        )}
      </ScrollView>
      <RewardInspector
        target={target}
        busy={!!busyId}
        error={error}
        onClaim={inspect ? () => claim(inspect.ms) : undefined}
        onClose={() => { setInspect(null); setError(''); }}
      />
      {block && <LuckyBlockOpener block={block} onClose={() => setBlock(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8, backgroundColor: palette.surface, borderBottomWidth: 2, borderBottomColor: palette.gold },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, letterSpacing: 1.5, color: palette.foreground },
  lede: { fontFamily: 'SourceSans3_400Regular', fontSize: 15, lineHeight: 21, color: palette.supporting },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, padding: 10, backgroundColor: palette.raised, borderWidth: 2, borderColor: palette.border },
  noticeTxt: { flex: 1, fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.foreground },
  done: { padding: 18, alignItems: 'center', gap: 4, backgroundColor: palette.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge },
});
