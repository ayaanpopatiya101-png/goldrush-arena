// Shared reward vocabulary for Battle Pass and Trophy Road.
// Converts configured rewards into honest labels plus real cosmetic art.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '@/constants/colors';
import {
  LUCKY_BLOCK_META, RELICS, SKINS,
  type BPReward, type TrophyReward,
} from '@/context/PlayerContext';
import { CosmeticPreview } from '@/components/CosmeticPreview';
import { RelicCharacter } from '@/components/RelicCharacter';
import { stripEmoji } from '@/components/ui/Glyph';
import { Text } from '@/components/ui/Text';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type RewardView = {
  title: string;
  kindLabel: string;
  detail: string;
  icon: IconName;
  skinId?: string;
  relicId?: string;
};

export type RewardState = 'claimable' | 'claimed' | 'locked' | 'needsPlus';

export const STATE_LABEL: Record<RewardState, string> = {
  claimable: 'Ready to claim',
  claimed: 'Claimed',
  locked: 'Locked',
  needsPlus: 'Plus only',
};

function skinName(id: string) {
  return SKINS.find(s => s.id === id)?.name ?? id.replace(/_/g, ' ');
}

export function bpRewardView(r: BPReward): RewardView {
  const label = r.label ? stripEmoji(r.label) : '';
  const n = r.amount ?? 1;
  switch (r.type) {
    case 'coins':
      return { title: label || `${(r.amount ?? 0).toLocaleString()} Coins`, kindLabel: 'Coins', icon: 'circle-multiple-outline', detail: 'Added to your coin balance when claimed.' };
    case 'credits':
      return { title: label || `${r.amount ?? 0} Credits`, kindLabel: 'Credits', icon: 'lightning-bolt-outline', detail: 'Added to your Credits when claimed.' };
    case 'skin': {
      const id = r.id ?? '';
      return { title: label || `${skinName(id)} Skin`, kindLabel: 'Paddle skin', icon: 'palette-outline', skinId: id, detail: 'Season paddle skin added to your collection. Cosmetic only, no gameplay effect.' };
    }
    case 'ultradrop':
      return { title: label || (n === 1 ? 'Ultra Drop' : `${n}x Ultra Drop`), kindLabel: 'Ultra Drop', icon: 'diamond-stone', detail: `${n} ${LUCKY_BLOCK_META.legendary.name} block${n > 1 ? 's' : ''} added to your blocks. The first one opens right after claiming.` };
    case 'bank_life':
      return { title: label || `${n} Bank Life`, kindLabel: 'Bank life', icon: 'heart-outline', detail: 'A spare life added to your Lives Bank, usable at the start of a match.' };
    case 'luckyblock': {
      const m = r.tier ? LUCKY_BLOCK_META[r.tier] : null;
      const name = m?.name ?? 'Lucky Block';
      return { title: label || `${n > 1 ? `${n}x ` : ''}${name}`, kindLabel: 'Lucky block', icon: 'cube-outline', detail: `${name} added to your blocks. It opens right after claiming.` };
    }
    default:
      return { title: label || 'Reward', kindLabel: 'Reward', icon: 'gift-outline', detail: 'Added to your account when claimed.' };
  }
}

export function trophyRewardView(r: TrophyReward): RewardView {
  if (r.type === 'coins') return { title: `${r.amount.toLocaleString()} Coins`, kindLabel: 'Coins', icon: 'circle-multiple-outline', detail: 'Added to your coin balance when claimed.' };
  if (r.type === 'skin') return { title: `${skinName(r.id)} Skin`, kindLabel: 'Paddle skin', icon: 'palette-outline', skinId: r.id, detail: 'Paddle skin added to your collection. Cosmetic only, no gameplay effect.' };
  if (r.type === 'relic') {
    const rel = RELICS.find(x => x.id === r.id);
    return { title: `${rel?.name ?? r.id} Relic`, kindLabel: 'Relic', icon: 'sword-cross', relicId: r.id, detail: rel ? `${rel.desc} Unlocked for equipping when claimed.` : 'Relic unlocked for equipping when claimed.' };
  }
  if (r.type === 'luckyblock') {
    const m = LUCKY_BLOCK_META[r.tier];
    return { title: m.name, kindLabel: 'Lucky block', icon: 'cube-outline', detail: `${m.name} added to your blocks. It opens right after claiming.` };
  }
  return { title: 'Reward', kindLabel: 'Reward', icon: 'gift-outline', detail: 'Added to your account when claimed.' };
}

/** Real art: actual paddle skin preview, actual relic character, otherwise a stamped icon plate. */
export function RewardArt({ view, size = 56, dim = false }: { view: RewardView; size?: number; dim?: boolean }) {
  const op = dim ? 0.5 : 1;
  if (view.skinId) {
    const skin = SKINS.find(s => s.id === view.skinId) ?? { id: view.skinId, name: view.title };
    return <View style={{ opacity: op }}><CosmeticPreview skin={skin} size={size} showLabel={false} /></View>;
  }
  if (view.relicId) {
    return (
      <View style={[a.plate, { width: size, height: size, opacity: op }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RelicCharacter relicId={view.relicId} size={size * 0.92} />
      </View>
    );
  }
  return (
    <View style={[a.plate, { width: size, height: size, opacity: op }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <MaterialCommunityIcons name={view.icon} size={Math.round(size * 0.5)} color={palette.gold} />
    </View>
  );
}

export function StateChip({ state, owned }: { state: RewardState; owned?: boolean }) {
  const label = owned && state !== 'claimed' ? 'Already owned' : STATE_LABEL[state];
  const bg = state === 'claimable' ? palette.primary : state === 'claimed' ? palette.raised : palette.inset;
  const fg = state === 'claimable' ? palette.onAccent : state === 'claimed' ? palette.foreground : palette.supporting;
  const icon: IconName = state === 'claimable' ? 'gift-open-outline' : state === 'claimed' ? 'check' : 'lock-outline';
  return (
    <View style={[a.chip, { backgroundColor: bg, borderColor: state === 'claimable' ? palette.edge : palette.border }]}>
      <MaterialCommunityIcons name={icon} size={12} color={fg} />
      <ChipText color={fg}>{label}</ChipText>
    </View>
  );
}

function ChipText({ children, color }: { children: React.ReactNode; color: string }) {
  return <Text style={[a.chipTxt, { color }]}>{children}</Text>;
}

export const a = StyleSheet.create({
  plate: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inset, borderRadius: 10, borderWidth: 2, borderColor: palette.border },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 10, borderWidth: 2, paddingHorizontal: 6, paddingVertical: 2 },
  chipTxt: { flexShrink: 1, fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.4 },
});
