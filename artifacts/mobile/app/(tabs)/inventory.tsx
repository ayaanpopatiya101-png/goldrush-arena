import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ScreenTitle, Shell, gridItemWidth, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { useCosmetics } from '@/hooks/useCosmetics';
import { CollectionPanel } from '@/components/cosmetics/ShopCollection';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RANKS, getRankIndex, usePlayer, LUCKY_BLOCK_META, GOLD_STRIKE_NAME, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_ARCANE, GlowText } from '@/components/effects';
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
      <FloatingOrbs orbs={ORBS_ARCANE} opacity={0.7} />
      <LinearGradient colors={['#EEE9DE', '#EEE9DE', '#EEE9DE']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#EDBA3C18', '#EDBA3C08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#EEE9DE88']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <ScreenTitle kicker="Owned items" title="Collection" style={{ flex: 1 }} />
        <View style={[s.countBadge, { backgroundColor: tactile.brass, borderColor: tactile.brassEdge, borderWidth: 2, borderRadius: 0 }]}>
          <Text style={[s.countText, { color: paperText.ink }]}>{totalOwned} items</Text>
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
              style={[s.tab, isActive && { backgroundColor: colors.primary, borderBottomColor: tactile.brassEdge, borderBottomWidth: 2 }]}
            >
              {tab === 'strikes' && pendingBlocks.length > 0 && (
                <View style={s.strikeBadge}>
                  <Text style={s.strikeBadgeText}>{pendingBlocks.length}</Text>
                </View>
              )}
              <Text style={[s.tabText, { color: isActive ? paperText.ink : colors.mutedForeground }]}>
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
              <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>
                {GOLD_STRIKE_NAME.toUpperCase()}S
              </GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>
                {pendingBlocks.length} PENDING
              </Text>
            </View>

            {pendingBlocks.length === 0 ? (
              <EmptyState icon="box" message="No Gold Strikes" sub="Earn them from Trophy Road, win streaks, or redeem a code" />
            ) : (
              <>
                <View style={s.strikesInfoRow}>
                  <Text style={[s.strikesInfo, { color: '#575D5C' }]}>
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
                            <LinearGradient
                              colors={[meta.color + '40', meta.color + '10']}
                              style={StyleSheet.absoluteFill}
                            />
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
      <Feather name={icon as never} size={40} color="#575D5C" />
      <Text style={s.emptyTitle}>{message}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  title:       { fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 2 },
  countBadge:  { backgroundColor: '#EDBA3C', borderRadius: 0, borderWidth: 2, borderColor: '#252A2B', paddingHorizontal: 8, paddingVertical: 4 },
  countText:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#252A2B', letterSpacing: 0.5 },
  tabRow:      { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab:         { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:     { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2 },

  // Skin grid
  skinGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard:    { borderRadius: 0, borderWidth: 2, overflow: 'hidden', alignItems: 'center', paddingBottom: 12 },
  skinPreview: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  paddlePreview: { width: 70, height: 12, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  skinName:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5, marginBottom: 8 },

  // Theme list
  themeRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 2, padding: 12, gap: 12 },
  themeSwatch: { width: 52, height: 52, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  themeSwatchDot: { width: 18, height: 18, borderRadius: 3 },
  themeName:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  themeDesc:   { fontFamily: 'SourceSans3_400Regular', fontSize: 12 },

  // Shared
  equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 0, paddingHorizontal: 10, paddingVertical: 5 },
  equippedText:  { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 0.5 },
  equipBtn:    { borderWidth: 2, borderRadius: 0, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  equipBtnText:{ fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  hintCard:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 0, borderWidth: 2, padding: 12 },
  hintText:    { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },


  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: '#252A2B' },
  featureCard: { borderWidth: 2, borderColor: '#575D5C', backgroundColor: '#E3DFD3', padding: 18, gap: 20, alignItems: 'center' },
  featureKicker: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.2, color: '#575D5C', textTransform: 'uppercase' },
  featureName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 36, color: '#252A2B', textTransform: 'uppercase' },
  featureBody: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, color: '#575D5C' },
  emptySub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 14, color: '#575D5C', textAlign: 'center' },

  // Gold Strikes tab
  strikeBadge:     { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 0, backgroundColor: '#EFBD3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  strikeBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 0 },
  strikesInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E3DFD3', borderRadius: 0, borderWidth: 2, borderColor: '#575D5C', paddingHorizontal: 12, paddingVertical: 9, marginBottom: 4 },
  strikesInfo:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },
  strikeCard:      { aspectRatio: 0.85, borderRadius: 0, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 },
  strikeCardNum:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, letterSpacing: 0.5 },
  openChip:        { borderRadius: 3, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  openChipText:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 1 },
});
