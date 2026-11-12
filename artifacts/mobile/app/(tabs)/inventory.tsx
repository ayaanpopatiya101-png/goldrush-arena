import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ScreenTitle, Shell, gridItemWidth, paperText } from '@/components/ui/Primitives';
import { tactile, palette } from '@/constants/colors';
import { useCosmetics } from '@/hooks/useCosmetics';
import { CollectionPanel } from '@/components/cosmetics/ShopCollection';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RANKS, getRankIndex, usePlayer, LUCKY_BLOCK_META, GOLD_STRIKE_NAME, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { useColors } from '@/hooks/useColors';
import { GlowText } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';

const ARENA_THEMES = [
  { id: 'default', name: 'Dark Void',      desc: 'Classic deep-space arena',   color: '#EDE3CC', preview: ['#213D39', '#294C44'] as [string,string] },
  { id: 'solar',   name: 'Solar Flare',    desc: 'Scorching red-orange arena',  color: '#CE7863', preview: ['#294C44', '#1E4A3F'] as [string,string] },
  { id: 'arctic',  name: 'Arctic Ice',     desc: 'Cool blue frost arena',       color: '#EDE3CC', preview: ['#213D39', '#1E4A3F'] as [string,string] },
  { id: 'toxic',   name: 'Toxic Wasteland',desc: 'Neon green hazard zone',      color: '#9BB77A', preview: ['#213D39', '#213D39'] as [string,string] },
  { id: 'cosmic',  name: 'Cosmic Dream',   desc: 'Purple nebula atmosphere',    color: '#EDE3CC', preview: ['#213D39', '#1E4A3F'] as [string,string] },
  { id: 'golden',  name: 'Gold Rush',      desc: 'Prestige golden arena',       color: '#EFBD3C', preview: ['#213D39', '#213D39'] as [string,string] },
];

type Tab = 'skins' | 'themes' | 'hits' | 'strikes';

const TIER_ORDER: Array<import('@/context/PlayerContext').LuckyBlockTier> = ['ultra', 'legendary', 'mythic', 'epic', 'rare'];

export default function InventoryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { profile } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);

  const pendingBlocks = profile.luckyBlocks ?? [];
  const cosState = useCosmetics().state;

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const ownedSkins  = SKINS.filter(s => profile.ownedSkins.includes(s.id));
  const totalOwned=new Set([...profile.ownedSkins.map(id=>`skin:${id}`),...profile.ownedThemes.map(id=>`theme:${id}`),...(cosState?.owned??[]),...(cosState?.designs.map(d=>d.id)??[])]).size;
  const ownedThemes = ARENA_THEMES.filter(t => profile.ownedThemes.includes(t.id) || !!cosState?.owned.includes(`theme:${t.id}`));
  const focusStyle = useFocusAnimation();
  const { width: winW } = useWindowDimensions();
  const avail = Math.min(winW, 1160) - 36;
  const strikeW = gridItemWidth(avail, 100, 10);

  return (
    <Reanimated.View style={[{ flex: 1, backgroundColor: colors.background }, focusStyle]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <ScreenTitle kicker="Owned items" title="Collection" style={{ flex: 1 }} />
        <View style={[s.countBadge, { backgroundColor: tactile.brass, borderColor: palette.edge, borderWidth: 2, borderRadius: 10 }]}>
          <Text style={[s.countText, { color: palette.onAccent }]}>{totalOwned} items</Text>
        </View>
      </View>

      {/* Tabs */}
      <View accessibilityRole="tablist" style={[s.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'hits', 'strikes'] as Tab[]).map(tab => {
          const label =
            tab === 'skins'   ? `SKINS (${ownedSkins.length})` :
            tab === 'themes'  ? `THEMES (${ownedThemes.length})` :
            tab === 'hits'    ? 'HITS' :
            pendingBlocks.length > 0 ? `GOLD (${pendingBlocks.length})` : 'GOLD';
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              aria-selected={isActive}
              accessibilityLabel={label.toLowerCase()}
              style={({ pressed }) => [s.tab, isActive && s.tabOn, pressed && { transform: [{ translateY: 2 }] }]}
            >
              {tab === 'strikes' && pendingBlocks.length > 0 && (
                <View style={s.strikeBadge}>
                  <Text style={s.strikeBadgeText}>{pendingBlocks.length}</Text>
                </View>
              )}
              <Text style={[s.tabText, { color: isActive ? palette.onAccent : colors.mutedForeground }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 90 }}
      >
        <Shell style={{ gap: 12 }}>
        {activeTab === 'skins' && <CollectionPanel section="skins" />}
        {activeTab === 'themes' && <CollectionPanel section="themes" />}
        {activeTab === 'hits' && <CollectionPanel section="hits" />}

        {/* ── Gold Strikes tab ── */}
        {activeTab === 'strikes' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GlowText intensity="medium" color={palette.foreground} style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>
                {GOLD_STRIKE_NAME.toUpperCase()}S
              </GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: palette.supporting, letterSpacing: 1 }}>
                {pendingBlocks.length} PENDING
              </Text>
            </View>

            {pendingBlocks.length === 0 ? (
              <EmptyState icon="box" message="No Gold Strikes" sub="Earn them from Trophy Road, win streaks, or redeem a code" />
            ) : (
              <>
                <View style={s.strikesInfoRow}>
                  <Text style={[s.strikesInfo, { color: palette.supporting }]}>
                    Tap any {GOLD_STRIKE_NAME} to open it and reveal your reward
                  </Text>
                </View>
                {TIER_ORDER.map(tier => {
                  const tierBlocks = pendingBlocks.filter(b => b.tier === tier);
                  if (tierBlocks.length === 0) return null;
                  const meta = LUCKY_BLOCK_META[tier];
                  return (
                    <View key={tier}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Glyph style={{ fontSize: 14 }} value={meta.emoji} />
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: meta.color }}>
                          {meta.name.toUpperCase()}
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: meta.color + '22' }} />
                        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: meta.color + '88', letterSpacing: 0.5 }}>
                          ×{tierBlocks.length}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                        {tierBlocks.map((block, i) => (
                          <Pressable
                            key={block.id}
                            onPress={() => setActiveLuckyBlock(block)}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${meta.name} ${GOLD_STRIKE_NAME} number ${i + 1}`}
                            style={({ pressed }) => [s.strikeCard, { width: strikeW,
                              borderColor: meta.color + (pressed ? 'FF' : '66'),
                              backgroundColor: meta.color + (pressed ? '22' : '10'),
                            }]}
                          >
                            <Glyph style={{ fontSize: 36 }} value={meta.emoji} />
                            <Text style={[s.strikeCardNum, { color: meta.color }]}>#{i + 1}</Text>
                            <View style={[s.openChip, { backgroundColor: meta.color }]}>
                              <Text style={s.openChipText}>OPEN</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        </Shell>
      </ScrollView>

      {activeLuckyBlock && (
        <LuckyBlockOpener
          block={activeLuckyBlock}
          onClose={() => setActiveLuckyBlock(null)}
        />
      )}
    </Reanimated.View>
  );
}

function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <View style={s.emptyState}>
      <Feather name={icon as never} size={40} color={palette.supporting} />
      <Text style={s.emptyTitle}>{message}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  title:       { fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 2 },
  countBadge:  { backgroundColor: palette.gold, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, paddingHorizontal: 8, paddingVertical: 4 },
  countText:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.onAccent, letterSpacing: 0.5 },
  tabRow:      { flexDirection: 'row', gap: 6, borderBottomWidth: 2, paddingHorizontal: 16, paddingBottom: 12 },
  tab:         { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.surface },
  tabOn:       { backgroundColor: palette.primary, borderColor: palette.edge },
  tabText:     { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2 },

  // Skin grid
  skinGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard:    { borderRadius: 10, borderWidth: 2, overflow: 'hidden', alignItems: 'center', paddingBottom: 12 },
  skinPreview: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  paddlePreview: { width: 70, height: 12, borderRadius: 8, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  skinName:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5, marginBottom: 8 },

  // Theme list
  themeRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 2, padding: 12, gap: 12 },
  themeSwatch: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  themeSwatchDot: { width: 18, height: 18, borderRadius: 8 },
  themeName:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  themeDesc:   { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },

  // Shared
  equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  equippedText:  { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 0.5 },
  equipBtn:    { borderWidth: 2, borderRadius: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  equipBtnText:{ fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  hintCard:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 2, padding: 12 },
  hintText:    { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },


  emptyState:  { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 10, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.surface },
  emptyTitle:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: palette.foreground },
  featureCard: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, backgroundColor: palette.surface, padding: 18, gap: 20, alignItems: 'center' },
  featureKicker: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2, color: palette.supporting, textTransform: 'uppercase' },
  featureName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 36, color: palette.foreground, textTransform: 'uppercase' },
  featureBody: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, color: palette.supporting },
  emptySub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: palette.supporting, textAlign: 'center' },

  // Gold Strikes tab
  strikeBadge:     { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 10, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  strikeBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.onAccent, letterSpacing: 0 },
  strikesInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderColor: palette.border, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 4 },
  strikesInfo:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },
  strikeCard:      { aspectRatio: 0.85, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 },
  strikeCardNum:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 0.5 },
  openChip:        { borderRadius: 10, borderWidth: 2, borderColor: palette.edge, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  openChipText:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 1 },
});
