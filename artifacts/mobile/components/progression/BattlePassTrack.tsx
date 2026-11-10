// One vertical Battle Pass track: each tier row shows its Free and Plus reward
// side by side. Every cell is inspectable; claims happen only in the inspector.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';
import type { BattlePassTier, BPReward } from '@/context/PlayerContext';
import { RewardArt, StateChip, bpRewardView, type RewardState } from './rewards';

export function bpCellState(tier: BattlePassTier, isPlus: boolean, bpp: number, hasPlus: boolean, freeClaimed: string[], plusClaimed: string[]): RewardState {
  const id = `bp_${tier.slot}`;
  if (isPlus) {
    if (plusClaimed.includes(id)) return 'claimed';
    if (!hasPlus) return 'needsPlus';
  } else if (freeClaimed.includes(id)) return 'claimed';
  return bpp >= tier.bpp ? 'claimable' : 'locked';
}

export function isOwnedCosmetic(r: BPReward, ownedSkins: string[]) {
  return r.type === 'skin' && !!r.id && ownedSkins.includes(r.id);
}

type Props = {
  tiers: BattlePassTier[];
  bpp: number;
  hasPlus: boolean;
  freeClaimed: string[];
  plusClaimed: string[];
  ownedSkins: string[];
  onInspect: (tier: BattlePassTier, isPlus: boolean) => void;
};

export function BattlePassTrack({ tiers, bpp, hasPlus, freeClaimed, plusClaimed, ownedSkins, onInspect }: Props) {
  return (
    <View>
      <View style={t.headRow}>
        <View style={t.rail} />
        <Text style={[t.headTxt, { flex: 1 }]}>FREE</Text>
        <Text style={[t.headTxt, { flex: 1, color: palette.gold }]}>PLUS</Text>
      </View>
      {tiers.map(tier => {
        const reached = bpp >= tier.bpp;
        return (
          <View key={tier.slot} style={t.row}>
            <View style={[t.rail, t.railCell, reached && t.railReached, tier.isMilestone && t.railMilestone]}>
              <Text style={[t.railNum, reached && { color: palette.onAccent }]}>{tier.slot}</Text>
              <Text style={[t.railPts, reached && { color: palette.onAccent }]}>{tier.bpp}</Text>
            </View>
            {[false, true].map(isPlus => {
              const r = isPlus ? tier.premium : tier.free;
              const view = bpRewardView(r);
              const state = bpCellState(tier, isPlus, bpp, hasPlus, freeClaimed, plusClaimed);
              const owned = isOwnedCosmetic(r, ownedSkins);
              const label = `Tier ${tier.slot} ${isPlus ? 'Plus' : 'Free'} reward: ${view.title}. ${owned && state !== 'claimed' ? 'Already owned. ' : ''}${state === 'claimable' ? 'Ready to claim' : state === 'claimed' ? 'Claimed' : state === 'needsPlus' ? 'Requires Plus' : `Locked until ${tier.bpp} points`}. Opens details.`;
              return (
                <Pressable
                  key={String(isPlus)}
                  onPress={() => onInspect(tier, isPlus)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  aria-label={label}
                  style={({ pressed }) => [
                    t.cell,
                    isPlus && t.cellPlus,
                    state === 'claimable' && t.cellReady,
                    state === 'claimed' && t.cellClaimed,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <RewardArt view={view} size={view.skinId ? 84 : 44} dim={state === 'locked' || state === 'needsPlus'} />
                  <Text style={t.cellTitle}>{view.title}</Text>
                  <StateChip state={state} owned={owned} />
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const t = StyleSheet.create({
  headRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  headTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: palette.supporting },
  row: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'stretch' },
  rail: { width: 44 },
  railCell: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset, paddingVertical: 6 },
  railReached: { backgroundColor: palette.primary, borderColor: palette.edge },
  railMilestone: { borderBottomWidth: 5 },
  railNum: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, color: palette.foreground },
  railPts: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: palette.supporting },
  cell: { flex: 1, minWidth: 0, minHeight: 44, padding: 8, gap: 6, alignItems: 'flex-start', backgroundColor: palette.surface, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border },
  cellPlus: { backgroundColor: palette.raised },
  cellReady: { borderColor: palette.primary },
  cellClaimed: { backgroundColor: palette.background },
  cellTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, lineHeight: 18, color: palette.foreground },
});
