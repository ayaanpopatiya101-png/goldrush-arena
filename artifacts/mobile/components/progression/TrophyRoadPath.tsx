// Trophy Road: XP earned (progress) is shown separately from rewards claimed.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';
import { TROPHY_ROAD, type TrophyMilestone } from '@/context/PlayerContext';
import { RewardArt, StateChip, trophyRewardView, type RewardState } from './rewards';

import { fonts } from '@/constants/typography';
export const ROAD_ZONES = [
  { name: 'Dusty Trail', subtitle: 'Where legends begin', milestones: TROPHY_ROAD.slice(0, 5) },
  { name: 'Gold Rush Gulch', subtitle: 'Strike it rich', milestones: TROPHY_ROAD.slice(5, 10) },
  { name: 'Crimson Canyon', subtitle: 'Heat rises. Do you?', milestones: TROPHY_ROAD.slice(10, 15) },
  { name: 'Crystal Caverns', subtitle: 'Beneath the surface', milestones: TROPHY_ROAD.slice(15, 20) },
  { name: 'Summit of Champions', subtitle: 'Only the elite reach here', milestones: TROPHY_ROAD.slice(20, 25) },
];

export function fmtXP(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K' : String(n);
}

export function milestoneState(ms: TrophyMilestone, xp: number, claimed: string[]): RewardState {
  if (claimed.includes(ms.id)) return 'claimed';
  return xp >= ms.xp ? 'claimable' : 'locked';
}

export function RoadSummary({ xp, claimed, onInspect }: { xp: number; claimed: string[]; onInspect: (ms: TrophyMilestone) => void }) {
  const reachedIdx = TROPHY_ROAD.reduce((acc, m, i) => (xp >= m.xp ? i : acc), -1);
  const next = TROPHY_ROAD[reachedIdx + 1];
  const prevXP = reachedIdx >= 0 ? TROPHY_ROAD[reachedIdx].xp : 0;
  const pct = next ? Math.min(1, (xp - prevXP) / Math.max(1, next.xp - prevXP)) : 1;
  const ready = TROPHY_ROAD.filter(m => xp >= m.xp && !claimed.includes(m.id)).length;
  const nextView = next ? trophyRewardView(next.reward) : null;
  return (
    <View style={r.card}>
      <View style={r.stats}>
        <Stat label="XP EARNED" value={xp.toLocaleString()} />
        <Stat label="REACHED" value={`${reachedIdx + 1} / ${TROPHY_ROAD.length}`} />
        <Stat label="CLAIMED" value={`${claimed.length} / ${TROPHY_ROAD.length}`} />
      </View>
      {ready > 0 && (
        <Text style={r.ready} accessibilityLiveRegion="polite">{ready} reward{ready > 1 ? 's' : ''} ready to claim below</Text>
      )}
      {next && nextView ? (
        <Pressable onPress={() => onInspect(next)} accessibilityRole="button"
          aria-label={`Next milestone ${reachedIdx + 2}: ${nextView.title} at ${next.xp} XP, ${next.xp - xp} XP to go. Opens details.`}
          style={r.next}>
          <RewardArt view={nextView} size={nextView.skinId ? 96 : 64} />
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
            <Text style={r.kicker}>NEXT: MILESTONE {reachedIdx + 2}</Text>
            <Text style={r.nextTitle}>{nextView.title}</Text>
            <Text style={r.sub}>{(next.xp - xp).toLocaleString()} XP to go, at {next.xp.toLocaleString()} XP</Text>
          </View>
        </Pressable>
      ) : (
        <Text style={r.nextTitle}>Every milestone reached</Text>
      )}
      <View accessible accessibilityRole="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}
        accessibilityLabel={`XP progress to next milestone, ${Math.round(pct * 100)} percent`} style={r.bar}>
        <View style={[r.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={r.stat}>
      <Text style={r.statVal}>{value}</Text>
      <Text style={r.statLbl}>{label}</Text>
    </View>
  );
}

export function RoadZones({ xp, claimed, onInspect, onClaim, busyId }: {
  xp: number; claimed: string[]; busyId: string | null;
  onInspect: (ms: TrophyMilestone) => void; onClaim: (ms: TrophyMilestone) => void;
}) {
  const reachedIdx = TROPHY_ROAD.reduce((acc, m, i) => (xp >= m.xp ? i : acc), -1);
  return (
    <View style={{ gap: 18 }}>
      {ROAD_ZONES.map((zone, zi) => (
        <View key={zone.name}>
          <View style={r.zone}>
            <Text style={r.kicker}>ZONE {zi + 1} OF 5 . {fmtXP(zone.milestones[0].xp)} TO {fmtXP(zone.milestones[4].xp)} XP</Text>
            <Text style={r.zoneName} accessibilityRole="header">{zone.name.toUpperCase()}</Text>
            <Text style={r.sub}>{zone.subtitle}</Text>
          </View>
          {zone.milestones.map((ms, mi) => {
            const gi = zi * 5 + mi;
            const state = milestoneState(ms, xp, claimed);
            const view = trophyRewardView(ms.reward);
            const current = gi === reachedIdx;
            const busy = busyId === ms.id;
            return (
              <View key={ms.id} style={r.msRow}>
                <View style={r.railCol}>
                  <View style={[r.railLine, xp >= ms.xp && { backgroundColor: palette.primary, borderColor: palette.primaryEdge }]} />
                  <View style={[r.node, xp >= ms.xp && r.nodeOn, current && r.nodeCurrent]}>
                    <Text style={[r.nodeTxt, xp >= ms.xp && { color: palette.onAccent }]}>{gi + 1}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Pressable onPress={() => onInspect(ms)} accessibilityRole="button"
                  aria-label={`Milestone ${gi + 1}, ${view.title}, ${ms.xp} XP, ${state === 'claimable' ? 'ready to claim' : state}. Opens details.`}
                  style={({ pressed }) => [r.msCard, state === 'claimable' && { borderColor: palette.primary, borderBottomColor: palette.primaryEdge }, state === 'claimed' && { backgroundColor: palette.inset }, pressed && { opacity: 0.85 }]}>
                  <RewardArt view={view} size={view.skinId ? 88 : 56} dim={state === 'locked'} />
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    {current && <Text style={r.here}>YOU ARE HERE</Text>}
                    <Text style={r.msTitle}>{view.title}</Text>
                    <Text style={r.sub}>{ms.xp.toLocaleString()} XP</Text>
                    <StateChip state={state} />
                  </View>
                </Pressable>
                {state === 'claimable' && (
                  <Pressable onPress={() => onClaim(ms)} disabled={!!busyId} accessibilityRole="button"
                    accessibilityState={{ disabled: !!busyId, busy }} aria-label={`Claim ${view.title}`}
                    style={[r.claim, { opacity: busyId && !busy ? 0.5 : 1 }]}>
                    <Text style={r.claimTxt}>{busy ? '...' : 'CLAIM'}</Text>
                  </Pressable>
                )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const r = StyleSheet.create({
  card: { padding: 16, gap: 12, backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 5, borderColor: palette.border, borderBottomColor: palette.edge },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { flexGrow: 1, flexBasis: 80, padding: 8, backgroundColor: palette.inset, borderRadius: 14, borderWidth: 1.5, borderColor: palette.border },
  statVal: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, fontVariant: ['tabular-nums'] },
  statLbl: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.supporting },
  ready: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.onAccent, backgroundColor: palette.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  next: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, minHeight: 44, backgroundColor: palette.raised, borderRadius: 16, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge },
  kicker: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2, color: palette.gold },
  nextTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: palette.foreground, textTransform: 'uppercase' },
  sub: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 19, color: palette.supporting },
  bar: { height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: palette.border, backgroundColor: palette.inset, padding: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: palette.primary },
  zone: { paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, borderLeftWidth: 5, borderLeftColor: palette.gold },
  zoneName: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: 1, color: palette.foreground },
  msRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 8 },
  railCol: { width: 36, alignItems: 'center' },
  railLine: { position: 'absolute', top: -8, bottom: -8, width: 6, borderRadius: 3, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.border },
  node: { marginTop: 14, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.raised, borderRadius: 17, borderWidth: 1.5, borderBottomWidth: 3, borderColor: palette.border, borderBottomColor: palette.edge },
  nodeOn: { backgroundColor: palette.primary, borderColor: palette.primary, borderBottomColor: palette.primaryEdge },
  nodeCurrent: { borderColor: palette.gold, borderWidth: 3 },
  nodeTxt: { fontFamily: fonts.display, fontSize: 17, color: palette.foreground },
  msCard: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: 10, backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge },
  here: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.gold },
  msTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, lineHeight: 20, color: palette.foreground },
  claim: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary, borderRadius: 22, borderBottomWidth: 4, borderBottomColor: palette.primaryEdge, paddingHorizontal: 16 },
  claimTxt: { fontFamily: fonts.display, fontSize: 17, color: palette.onAccent },
});
