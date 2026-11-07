import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Shell, gridItemWidth } from '@/components/ui/Primitives';
import Reanimated from 'react-native-reanimated';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RANKS, getRankIndex, usePlayer, LUCKY_BLOCK_META, GOLD_STRIKE_NAME, type LuckyBlock } from '@/context/PlayerContext';
import { LuckyBlockOpener } from '@/components/LuckyBlockOpener';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_ARCANE, GlowText, ShimmerCard, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';

const ARENA_THEMES = [
  { id: 'default', name: 'Dark Void',      desc: 'Classic deep-space arena',   color: '#EDE3CC', preview: ['#14231F', '#20372F'] as [string,string] },
  { id: 'solar',   name: 'Solar Flare',    desc: 'Scorching red-orange arena',  color: '#CE7863', preview: ['#20372F', '#1E4A3F'] as [string,string] },
  { id: 'arctic',  name: 'Arctic Ice',     desc: 'Cool blue frost arena',       color: '#EDE3CC', preview: ['#14231F', '#1E4A3F'] as [string,string] },
  { id: 'toxic',   name: 'Toxic Wasteland',desc: 'Neon green hazard zone',      color: '#9BB77A', preview: ['#14231F', '#14231F'] as [string,string] },
  { id: 'cosmic',  name: 'Cosmic Dream',   desc: 'Purple nebula atmosphere',    color: '#EDE3CC', preview: ['#14231F', '#1E4A3F'] as [string,string] },
  { id: 'golden',  name: 'Gold Rush',      desc: 'Prestige golden arena',       color: '#D7A83B', preview: ['#14231F', '#14231F'] as [string,string] },
];

type Tab = 'skins' | 'themes' | 'strikes';

const TIER_ORDER: Array<import('@/context/PlayerContext').LuckyBlockTier> = ['ultra', 'legendary', 'mythic', 'epic', 'rare'];

export default function InventoryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { profile, equipSkin, equipTheme } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');
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
      <LinearGradient colors={['#14231F', '#14231F', '#14231F']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#D7A83B22', '#D7A83B0E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#14231F88']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 2.5, color: '#EEE7D744', marginBottom: 2 }}>Owned items</Text>
          <Text style={[s.title, { color: '#EEE7D7' }]} accessibilityRole="header">Collection</Text>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countText}>{ownedSkins.length + ownedThemes.length} items</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'strikes'] as Tab[]).map(tab => {
          const label =
            tab === 'skins'   ? `SKINS (${ownedSkins.length})` :
            tab === 'themes'  ? `THEMES (${ownedThemes.length})` :
            pendingBlocks.length > 0 ? `STRIKES (${pendingBlocks.length})` : 'STRIKES';
          const isActive = activeTab === tab;
          const accentColor = tab === 'strikes' ? '#D7A83B' : colors.primary;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tab, isActive && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
            >
              {tab === 'strikes' && pendingBlocks.length > 0 && (
                <View style={s.strikeBadge}>
                  <Text style={s.strikeBadgeText}>{pendingBlocks.length}</Text>
                </View>
              )}
              <Text style={[s.tabText, { color: isActive ? accentColor : colors.mutedForeground }]}>
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
        {activeTab === 'skins' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GlowText intensity="medium" color='#D7A83B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>PADDLE SKINS</GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D70E' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: '#EEE7D733', letterSpacing: 1 }}>{ownedSkins.length}/{SKINS.length} OWNED</Text>
            </View>
            {ownedSkins.length === 0 ? (
              <EmptyState icon="shopping-bag" message="No skins yet" sub="Visit the Shop to buy paddle skins" />
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
                        {/* Paddle preview */}
                        <LinearGradient colors={[skin.color + '33', skin.color + '0A']} style={s.skinPreview}>
                          <View style={[s.paddlePreview, { backgroundColor: skin.color, shadowColor: skin.glowColor }]} />
                        </LinearGradient>

                        {/* Info */}
                        <GlowText intensity="soft" color={skin.color ?? '#D7A83B'} style={s.skinName}>{skin.name}</GlowText>

                      {equipped ? (
                        <View style={[s.equippedBadge, { backgroundColor: skin.color }]}>
                          <Feather name="check" size={10} color="#14231F" />
                          <Text style={s.equippedText}>EQUIPPED</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleEquipSkin(skin.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Equip ${skin.name}`}
                          style={({ pressed }) => [s.equipBtn, { borderColor: skin.color, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={[s.equipBtnText, { color: skin.color }]}>Equip</Text>
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
                  {SKINS.length - ownedSkins.length} more skin{SKINS.length - ownedSkins.length !== 1 ? 's' : ''} available in the Shop
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Themes tab ── */}
        {activeTab === 'themes' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GlowText intensity="medium" color='#D7A83B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>ARENA THEMES</GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D70E' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: '#EEE7D733', letterSpacing: 1 }}>{ownedThemes.length} OWNED</Text>
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
                      backgroundColor: equipped ? theme.color + '18' : colors.card,
                      borderColor: equipped ? theme.color : colors.border,
                    }]}
                  >
                    {/* Theme preview swatch */}
                    <LinearGradient colors={theme.preview} style={s.themeSwatch}>
                      <View style={[s.themeSwatchDot, { backgroundColor: theme.color + '88' }]} />
                    </LinearGradient>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.themeName, { color: equipped ? theme.color : colors.foreground }]}>{theme.name}</Text>
                      <Text style={[s.themeDesc, { color: colors.mutedForeground }]}>{theme.desc}</Text>
                    </View>

                    {equipped ? (
                      <View style={[s.equippedBadge, { backgroundColor: theme.color }]}>
                        <Feather name="check" size={10} color="#14231F" />
                        <Text style={s.equippedText}>SAVED CHOICE</Text>
                      </View>
                    ) : (
                      <View
                        accessibilityLabel={`${theme.name}: unavailable in this build`}
                        style={[s.equipBtn, { borderColor: '#3B5A4E' }]}
                      >
                        <Text style={[s.equipBtnText, { color: '#C9D2C6' }]}>UNAVAILABLE</Text>
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
              <GlowText intensity="medium" color='#D7A83B' style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2 }}>
                {GOLD_STRIKE_NAME.toUpperCase()}S
              </GlowText>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D70E' }} />
              <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: '#EEE7D733', letterSpacing: 1 }}>
                {pendingBlocks.length} PENDING
              </Text>
            </View>

            {pendingBlocks.length === 0 ? (
              <EmptyState icon="box" message="No Gold Strikes" sub="Earn them from Trophy Road, win streaks, or redeem a code" />
            ) : (
              <>
                <View style={s.strikesInfoRow}>
                  <Text style={[s.strikesInfo, { color: '#EEE7D755' }]}>
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
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 1.5, color: meta.color }}>
                          {meta.name.toUpperCase()}
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: meta.color + '22' }} />
                        <Text style={{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 9, color: meta.color + '88', letterSpacing: 0.5 }}>
                          ×{tierBlocks.length}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                        {tierBlocks.map((block, i) => (
                          <Pressable
                            key={block.id}
                            onPress={() => setActiveLuckyBlock(block)}
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
      <Feather name={icon as never} size={40} color="#EEE7D722" />
      <Text style={s.emptyTitle}>{message}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  title:       { fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 2 },
  countBadge:  { backgroundColor: '#D7A83B1A', borderRadius: 3, borderWidth: 1, borderColor: '#D7A83B44', paddingHorizontal: 8, paddingVertical: 4 },
  countText:   { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#D7A83B', letterSpacing: 0.5 },
  tabRow:      { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:     { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 1.2 },

  // Skin grid
  skinGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard:    { borderRadius: 3, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', paddingBottom: 12 },
  skinPreview: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  paddlePreview: { width: 70, height: 12, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
  skinName:    { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5, marginBottom: 8 },

  // Theme list
  themeRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 3, borderWidth: 1.5, padding: 12, gap: 12 },
  themeSwatch: { width: 52, height: 52, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  themeSwatchDot: { width: 18, height: 18, borderRadius: 3 },
  themeName:   { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  themeDesc:   { fontFamily: 'SourceSans3_400Regular', fontSize: 11 },

  // Shared
  equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 5 },
  equippedText:  { fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: '#14231F', letterSpacing: 0.5 },
  equipBtn:    { borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  equipBtnText:{ fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  hintCard:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 3, borderWidth: 1, padding: 12 },
  hintText:    { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },


  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontFamily: 'SourceSans3_700Bold', fontSize: 16, color: '#EEE7D744' },
  emptySub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#EEE7D722', textAlign: 'center' },

  // Gold Strikes tab
  strikeBadge:     { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 3, backgroundColor: '#D7A83B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  strikeBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: '#14231F', letterSpacing: 0 },
  strikesInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D7A83B10', borderRadius: 3, borderWidth: 1, borderColor: '#D7A83B22', paddingHorizontal: 12, paddingVertical: 9, marginBottom: 4 },
  strikesInfo:     { fontFamily: 'SourceSans3_400Regular', fontSize: 12, flex: 1 },
  strikeCard:      { aspectRatio: 0.85, borderRadius: 3, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 },
  strikeCardNum:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
  openChip:        { borderRadius: 3, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  openChipText:    { fontFamily: 'SourceSans3_700Bold', fontSize: 9, color: '#14231F', letterSpacing: 1 },
});
