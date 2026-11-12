// Quest sections with honest progress, Plus gating and guarded claims.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';
import type { QuestDefinition, PlayerProfile } from '@/context/PlayerContext';

export function questProgress(q: QuestDefinition, p: PlayerProfile): number {
  const map = q.period === 'daily' ? p.dailyQuestProgress : q.period === 'weekly' ? p.weeklyQuestProgress : p.seasonalQuestProgress;
  return (map ?? {})[q.trackKey] ?? 0;
}
export function questClaimed(q: QuestDefinition, p: PlayerProfile): boolean {
  const arr = q.period === 'daily' ? p.dailyQuestClaimed : q.period === 'weekly' ? p.weeklyQuestClaimed : p.seasonalQuestClaimed;
  return (arr ?? []).includes(q.id);
}

const ICON = { daily: 'weather-sunny', weekly: 'calendar-outline', seasonal: 'trophy-outline' } as const;

export function QuestSection({ title, period, quests, profile, hasPlus, busyId, onClaim, defaultOpen = true }: {
  title: string; period: 'daily' | 'weekly' | 'seasonal';
  quests: QuestDefinition[]; profile: PlayerProfile; hasPlus: boolean;
  busyId: string | null; onClaim: (id: string) => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const claimed = quests.filter(q => questClaimed(q, profile)).length;
  const eligible = quests.filter(q => !q.premiumOnly || hasPlus).length;
  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open}
        aria-label={`${title} quests, ${claimed} of ${eligible} claimed`} style={q.head}>
        <MaterialCommunityIcons name={ICON[period]} size={18} color={palette.gold} />
        <Text style={q.headTxt}>{title.toUpperCase()} QUESTS</Text>
        <Text style={q.count}>{claimed}/{eligible} claimed</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={palette.supporting} />
      </Pressable>
      {open && quests.map(quest => {
        const prog = questProgress(quest, profile);
        const isClaimed = questClaimed(quest, profile);
        const locked = !!quest.premiumOnly && !hasPlus;
        const ready = !isClaimed && !locked && prog >= quest.target;
        const pct = Math.min(1, prog / quest.target);
        const busy = busyId === quest.id;
        return (
          <View key={quest.id} style={[q.row, ready && { borderColor: palette.primary }, isClaimed && { backgroundColor: palette.background }]}>
            <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Text style={q.title}>{quest.title}</Text>
                {quest.premiumOnly && <Text style={q.plus}>PLUS</Text>}
              </View>
              <Text style={q.desc}>{quest.description}</Text>
              <View style={q.barBg}><View style={[q.barFill, { width: `${pct * 100}%`, backgroundColor: isClaimed ? palette.border : palette.primary }]} /></View>
              <Text style={q.prog}>
                {isClaimed ? 'Claimed' : locked ? 'Requires Plus' : `${Math.min(prog, quest.target)} / ${quest.target}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={q.reward}>+{quest.reward} BP</Text>
              {ready ? (
                <Pressable onPress={() => onClaim(quest.id)} disabled={!!busyId} accessibilityRole="button"
                  accessibilityState={{ disabled: !!busyId, busy }} aria-label={`Claim ${quest.title}, ${quest.reward} points`}
                  style={[q.claim, { opacity: busyId && !busy ? 0.5 : 1 }]}>
                  <Text style={q.claimTxt}>{busy ? 'SAVING' : 'CLAIM'}</Text>
                </Pressable>
              ) : (
                <MaterialCommunityIcons name={isClaimed ? 'check' : locked ? 'lock-outline' : 'progress-clock'} size={20} color={palette.supporting} accessibilityElementsHidden />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const q = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 6 },
  headTxt: { flex: 1, fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, letterSpacing: 1, color: palette.foreground },
  count: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.supporting },
  row: { flexDirection: 'row', gap: 10, padding: 12, marginBottom: 8, backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.border },
  title: { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.foreground },
  plus: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1, color: palette.onAccent, backgroundColor: palette.gold, paddingHorizontal: 5 },
  desc: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 19, color: palette.supporting },
  barBg: { height: 12, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.inset, overflow: 'hidden' },
  barFill: { height: '100%' },
  prog: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground },
  reward: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.onAccent, backgroundColor: palette.gold, paddingHorizontal: 6, paddingVertical: 2 },
  claim: { minHeight: 44, minWidth: 72, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.primary, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, paddingHorizontal: 10 },
  claimTxt: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 17, letterSpacing: 1, color: palette.onAccent },
});
