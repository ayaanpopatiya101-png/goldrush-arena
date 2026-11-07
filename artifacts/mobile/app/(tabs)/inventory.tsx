import { Feather } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button, ScreenTitle, Shell, gridItemWidth, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { SkinComparison } from '@/components/SkinComparison';
import { CosmeticPreview } from '@/components/CosmeticPreview';
import { router } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RANKS, getRankIndex, usePlayer, LUCKY_BLOCK_META, GOLD_STRIKE_NAME, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_ARCANE, GlowText, ShimmerCard, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';

const ARENA_THEMES = [
  { id: 'default', name: 'Dark Void',      desc: 'Classic deep-space arena',   color: '#EDE3CC', preview: ['#213D39', '#294C44'] as [string,string] },
  { id: 'solar',   name: 'Solar Flare',    desc: 'Scorching red-orange arena',  color: '#CE7863', preview: ['#294C44', '#1E4A3F'] as [string,string] },
  { id: 'arctic',  name: 'Arctic Ice',     desc: 'Cool blue frost arena',       color: '#EDE3CC', preview: ['#213D39', '#1E4A3F'] as [string,string] },
  { id: 'toxic',   name: 'Toxic Wasteland',desc: 'Neon green hazard zone',      color: '#9BB77A', preview: ['#213D39', '#213D39'] as [string,string] },
  { id: 'cosmic',  name: 'Cosmic Dream',   desc: 'Purple nebula atmosphere',    color: '#EDE3CC', preview: ['#213D39', '#1E4A3F'] as [string,string] },
  { id: 'golden',  name: 'Gold Rush',      desc: 'Prestige golden arena',       color: '#EFBD3C', preview: ['#213D39', '#213D39'] as [string,string] },
];

type Tab = 'skins' | 'themes' | 'strikes';

const TIER_ORDER: Array<import('@/context/PlayerContext').LuckyBlockTier> = ['ultra', 'legendary', 'mythic', 'epic', 'rare'];

export default function InventoryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { profile, equipSkin, equipTheme } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');
  const [compareSkinId, setCompareSkinId] = useState<string | null>(null);
  const [activeLuckyBlock, setActiveLuckyBlock] = useState<LuckyBlock | null>(null);

  const pendingBlocks = profile.luckyBlocks ?? [];

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const ownedSkins  = SKINS.filter(s => profile.ownedSkins.includes(s.id));
  const ownedThemes = ARENA_THEMES.filter(t => profile.ownedThemes.includes(t.id));
  const focusStyle = useFocusAnimation();
  const { width: winW } = useWindowDimensions();
  const avail = Math.min(winW, 1160) - 36;
  const cardW = gridItemWidth(avail, 150, 10);
  const strikeW = gridItemWidth(avail, 100, 10);

  async function handleEquipSkin(skinId: string) {
    await equipSkin(skinId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleEquipTheme(_themeId: string) {
    // Ownership is migration-sensitive. Do not claim the uneffected saved
    // selection changes arena rendering in this build.
    if (Platform.OS === 'web') window.alert('Arena themes are preview-only in this build. Saved ownership is preserved.');
    else Alert.alert('Unavailable', 'Arena themes are preview-only in this build. Saved ownership is preserved.');
  }

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
          <Text style={[s.countText, { color: paperText.ink }]}>{ownedSkins.length + ownedThemes.length} items</Text>
        </View>
      </View>

      {/* Tabs */}
      <View accessibilityRole="tablist" style={[s.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'strikes'] as Tab[]).map(tab => {
          const label =
            tab === 'skins'   ? `SKINS (${ownedSkins.length})` :
            tab === 'themes'  ? `THEMES (${ownedThemes.length})` :
            pendingBlocks.length > 0 ? `STRIKES (${pendingBlocks.length})` : 'STRIKES';
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
        {/* ── Skins tab ── */}
        {compareSkinId && <SkinComparison key={compareSkinId} skinId={compareSkinId} onClose={() => setCompareSkinId(null)} />}
        {activeTab === 'skins' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>PADDLE SKINS</GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>{ownedSkins.length}/{SKINS.length} OWNED</Text>
            </View>
            {ownedSkins.length === 0 ? (
              <EmptyState icon="shopping-bag" message="No skins yet" sub="Visit the Shop to buy paddle skins" />
            ) : ownedSkins.length === 1 ? (
              (() => {
                const skin = ownedSkins[0]!;
                const equipped = profile.currentSkin === skin.id;
                return (
                  <View style={[s.featureCard, { flexDirection: winW >= 700 ? 'row' : 'column' }]}>
                    <CosmeticPreview skin={skin} size={winW >= 700 ? 220 : Math.min(avail - 40, 240)} />
                    <View style={{ flex: 1, gap: 8, alignSelf: 'stretch', justifyContent: 'center' }}>
                      <Text style={s.featureKicker}>{equipped ? 'Equipped paddle' : 'Your paddle'}</Text>
                      <Text style={s.featureName}>{skin.name}</Text>
                      <Text style={s.featureBody}>This colour appears on your south-wall paddle when equipped. Skins are cosmetic and never change paddle size or speed.</Text>
                      {equipped ? (
                        <View accessibilityLabel={`${skin.name} equipped`} style={[s.equippedBadge, { backgroundColor: '#EDBA3C', alignSelf: 'flex-start', minHeight: 32 }]}>
                          <Feather name="check" size={12} color="#252A2B" />
                          <Text style={s.equippedText}>EQUIPPED</Text>
                        </View>
                      ) : (
                        <Button label={`Equip ${skin.name}`} onPress={() => handleEquipSkin(skin.id)} />
                      )}
                      <Button label="Compare on court" variant="secondary" icon="play" onPress={() => setCompareSkinId(skin.id)} />
                      <Button label="Browse Shop" variant="ghost" icon="shopping-bag" accessibilityHint="Opens the Shop to see more paddle skins" onPress={() => router.push('/shop')} />
                    </View>
                  </View>
                );
              })()
            ) : (
              <View style={s.skinGrid}>
                {ownedSkins.map(skin => {
                  const equipped = profile.currentSkin === skin.id;
                  return (
                    <View key={skin.id} style={{ width: cardW }}>
                      <View
                        style={[s.skinCard, { width: '100%',
                          backgroundColor: equipped ? skin.color + '18' : colors.card,
                          borderColor: equipped ? skin.color : colors.border,
                        }]}
                      >
                        <View style={{ paddingVertical: 10 }}>
                          <CosmeticPreview skin={skin} size={Math.min(cardW - 28, 132)} />
                        </View>
                        <Text style={[s.skinName, { color: '#252A2B' }]}>{skin.name}</Text>
                        <Button label="Compare on court" size="sm" variant="ghost" style={{ alignSelf: 'stretch', marginHorizontal: 8, marginBottom: 8 }} onPress={() => setCompareSkinId(skin.id)} />
                      {equipped ? (
                        <View accessibilityLabel={`${skin.name} equipped`} style={[s.equippedBadge, { backgroundColor: skin.color, minHeight: 32 }]}>
                          <Feather name="check" size={12} color="#252A2B" />
                          <Text style={s.equippedText}>EQUIPPED</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleEquipSkin(skin.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Equip ${skin.name}`}
                          accessibilityState={{ selected: false }}
                          aria-pressed={false}
                          style={({ pressed }) => [s.equipBtn, { borderColor: skin.color, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={[s.equipBtnText, { color: '#252A2B' }]}>Equip</Text>
                        </Pressable>
                      )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Hint to shop */}
            {ownedSkins.length < SKINS.length && (
              <View style={[s.hintCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="shopping-bag" size={16} color={colors.mutedForeground} />
                <Text style={[s.hintText, { color: colors.mutedForeground }]}>
                  {SKINS.length - ownedSkins.length} more skin{SKINS.length - ownedSkins.length !== 1 ? 's' : ''} in the Shop
                </Text>
                {ownedSkins.length !== 1 ? <Button label="Browse Shop" size="sm" variant="ghost" onPress={() => router.push('/shop')} /> : null}
              </View>
            )}
          </>
        )}

        {/* ── Themes tab ── */}
        {activeTab === 'themes' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GlowText intensity="medium" color='#252A2B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>ARENA THEMES</GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 12, color: '#575D5C', letterSpacing: 1 }}>{ownedThemes.length} OWNED</Text>
            </View>
            {ownedThemes.length === 0 ? (
              <EmptyState icon="slash" message="No themes saved" sub="Arena themes are unavailable in this build. Nothing can be bought or equipped here yet." />
            ) : (
              ownedThemes.map(theme => {
                const equipped = profile.currentArenaTheme === theme.id;
                return (
                  <View
                    key={theme.id}
                    style={[s.themeRow, {
                      backgroundColor: colors.card,
                      borderColor: equipped ? theme.color : colors.border,
                    }]}
                  >
                    {/* Theme preview swatch */}
                    <LinearGradient colors={theme.preview} style={s.themeSwatch}>
                      <View style={[s.themeSwatchDot, { backgroundColor: theme.color + '88' }]} />
                    </LinearGradient>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.themeName, { color: colors.foreground }]}>{theme.name}</Text>
                      <Text style={[s.themeDesc, { color: colors.mutedForeground }]}>{theme.desc}</Text>
                    </View>

                    {equipped ? (
                      <View style={[s.equippedBadge, { backgroundColor: '#EDBA3C' }]}>
                        <Feather name="check" size={10} color="#252A2B" />
                        <Text style={s.equippedText}>SAVED CHOICE</Text>
                      </View>
                    ) : (
                      <View
                        accessibilityLabel={`${theme.name}: unavailable in this build`}
                        style={[s.equipBtn, { borderColor: '#575D5C', backgroundColor: '#E3DFD3' }]}
                      >
                        <Text style={[s.equipBtnText, { color: '#575D5C' }]}>UNAVAILABLE</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {ownedThemes.length < ARENA_THEMES.length && (
              <View style={[s.hintCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="shopping-bag" size={16} color={colors.mutedForeground} />
                <Text style={[s.hintText, { color: colors.mutedForeground }]}>
                  Arena themes are unavailable in this build. Saved ownership is kept and will not be charged again.
                </Text>
              </View>
            )}
          </>
        )}

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
