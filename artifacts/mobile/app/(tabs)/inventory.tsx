import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RELICS, RANKS, getRankIndex, usePlayer, getRelicLevel, getRelicUpgradeCost, RELIC_MAX_LEVEL } from '@/context/PlayerContext';
import { RelicCharacter } from '@/components/RelicCharacter';
import { useColors } from '@/hooks/useColors';

const ARENA_THEMES = [
  { id: 'default', name: 'Dark Void',      desc: 'Classic deep-space arena',   color: '#6655FF', preview: ['#0D0A06', '#181208'] as [string,string] },
  { id: 'solar',   name: 'Solar Flare',    desc: 'Scorching red-orange arena',  color: '#FF6B35', preview: ['#350000', '#5A1000'] as [string,string] },
  { id: 'arctic',  name: 'Arctic Ice',     desc: 'Cool blue frost arena',       color: '#1E8AAA', preview: ['#001828', '#003050'] as [string,string] },
  { id: 'toxic',   name: 'Toxic Wasteland',desc: 'Neon green hazard zone',      color: '#4A8A38', preview: ['#001A08', '#003020'] as [string,string] },
  { id: 'cosmic',  name: 'Cosmic Dream',   desc: 'Purple nebula atmosphere',    color: '#7A50A0', preview: ['#180030', '#2A0060'] as [string,string] },
  { id: 'golden',  name: 'Gold Rush',      desc: 'Prestige golden arena',       color: '#C8820A', preview: ['#1A1200', '#2A2000'] as [string,string] },
];

type Tab = 'skins' | 'themes' | 'relics';

export default function InventoryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { profile, equipSkin, equipTheme, equipRelic, upgradeRelic } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const ownedSkins  = SKINS.filter(s => profile.ownedSkins.includes(s.id));
  const ownedThemes = ARENA_THEMES.filter(t => profile.ownedThemes.includes(t.id));
  const playerRankIdx  = getRankIndex(profile.rank);
  const unlockedRelics = RELICS.filter(r => playerRankIdx >= r.unlockRankIndex);

  async function handleEquipSkin(skinId: string) {
    await equipSkin(skinId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleEquipTheme(themeId: string) {
    await equipTheme(themeId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleEquipRelic(relicId: string) {
    await equipRelic(relicId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={['#0D0A06', '#181208', '#0D0A06']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={[s.title, { color: colors.foreground }]}>INVENTORY</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{ownedSkins.length + ownedThemes.length + unlockedRelics.length} items</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'relics'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab === 'skins'
                ? `SKINS (${ownedSkins.length})`
                : tab === 'themes'
                ? `THEMES (${ownedThemes.length})`
                : `RELICS (${unlockedRelics.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 90, gap: 12 }}
      >
        {/* ── Skins tab ── */}
        {activeTab === 'skins' && (
          <>
            {ownedSkins.length === 0 ? (
              <EmptyState icon="shopping-bag" message="No skins yet" sub="Visit the Shop to buy paddle skins" />
            ) : (
              <View style={s.skinGrid}>
                {ownedSkins.map(skin => {
                  const equipped = profile.currentSkin === skin.id;
                  return (
                    <View
                      key={skin.id}
                      style={[s.skinCard, {
                        backgroundColor: equipped ? skin.color + '18' : colors.card,
                        borderColor: equipped ? skin.color : colors.border,
                      }]}
                    >
                      {/* Paddle preview */}
                      <LinearGradient colors={[skin.color + '33', skin.color + '0A']} style={s.skinPreview}>
                        <View style={[s.paddlePreview, { backgroundColor: skin.color, shadowColor: skin.glowColor }]} />
                      </LinearGradient>

                      {/* Info */}
                      <Text style={[s.skinName, { color: equipped ? skin.color : colors.foreground }]}>{skin.name}</Text>

                      {equipped ? (
                        <View style={[s.equippedBadge, { backgroundColor: skin.color }]}>
                          <Feather name="check" size={10} color="#0D0A06" />
                          <Text style={s.equippedText}>EQUIPPED</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleEquipSkin(skin.id)}
                          style={({ pressed }) => [s.equipBtn, { borderColor: skin.color, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={[s.equipBtnText, { color: skin.color }]}>EQUIP</Text>
                        </Pressable>
                      )}
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
            {ownedThemes.length === 0 ? (
              <EmptyState icon="shopping-bag" message="No themes yet" sub="Visit the Shop to buy arena themes" />
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
                        <Feather name="check" size={10} color="#0D0A06" />
                        <Text style={s.equippedText}>ON</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleEquipTheme(theme.id)}
                        style={({ pressed }) => [s.equipBtn, { borderColor: theme.color, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Text style={[s.equipBtnText, { color: theme.color }]}>EQUIP</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}

            {ownedThemes.length < ARENA_THEMES.length && (
              <View style={[s.hintCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="shopping-bag" size={16} color={colors.mutedForeground} />
                <Text style={[s.hintText, { color: colors.mutedForeground }]}>
                  {ARENA_THEMES.length - ownedThemes.length} more theme{ARENA_THEMES.length - ownedThemes.length !== 1 ? 's' : ''} available in the Shop
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Relics tab — Brawl-Stars-style character collection ── */}
        {activeTab === 'relics' && (
          <>
            {/* Coin balance + hint */}
            <View style={s.relicHeaderRow}>
              <View style={s.coinBadge}>
                <Text style={s.coinBadgeText}>🪙 {profile.coins.toLocaleString()}</Text>
              </View>
              <Text style={[s.relicHint, { color: colors.mutedForeground }]}>
                Unlock by rank · Spend coins to power up
              </Text>
            </View>

            {/* No-relic strip */}
            <Pressable
              onPress={() => handleEquipRelic('none')}
              style={({ pressed }) => [s.noRelicRow, {
                backgroundColor: profile.currentRelic === 'none' ? '#FFFFFF12' : colors.card,
                borderColor: profile.currentRelic === 'none' ? '#FFFFFF66' : colors.border,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Feather name="slash" size={16} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[s.noRelicName, { color: colors.foreground }]}>No Relic</Text>
                <Text style={[s.noRelicSub, { color: colors.mutedForeground }]}>Play without a character equipped</Text>
              </View>
              {profile.currentRelic === 'none' && (
                <View style={[s.equippedBadge, { backgroundColor: '#FFFFFF' }]}>
                  <Feather name="check" size={10} color="#0D0A06" />
                  <Text style={s.equippedText}>ON</Text>
                </View>
              )}
            </Pressable>

            {/* 2-column character grid */}
            <View style={s.relicGrid}>
              {RELICS.map(relic => {
                const unlocked  = playerRankIdx >= relic.unlockRankIndex;
                const equipped  = profile.currentRelic === relic.id;
                const reqRank   = RANKS[relic.unlockRankIndex];
                const level     = getRelicLevel(profile, relic.id);
                const cost      = getRelicUpgradeCost(level);
                const maxed     = level >= RELIC_MAX_LEVEL;
                const canAfford = profile.coins >= cost;
                return (
                  <View
                    key={relic.id}
                    style={[s.relicCard, {
                      borderColor: equipped ? relic.color : unlocked ? colors.border + 'AA' : colors.border + '44',
                      opacity: unlocked ? 1 : 0.5,
                      shadowColor: equipped ? relic.color : '#000',
                      shadowOpacity: equipped ? 0.6 : 0,
                      shadowRadius: 14,
                      elevation: equipped ? 10 : 0,
                    }]}
                  >
                    {/* ── Portrait ── */}
                    <Pressable
                      onPress={() => unlocked && handleEquipRelic(relic.id)}
                      style={[s.relicPortrait, { backgroundColor: relic.color + '14' }]}
                    >
                      <RelicCharacter relicId={relic.id} size={112} />
                      {/* Level badge pill */}
                      <View style={[s.levelBadge, { backgroundColor: maxed ? '#FFD700' : equipped ? relic.color : '#222' }]}>
                        <Text style={[s.levelBadgeText, { color: maxed ? '#1A1200' : '#FFF' }]}>
                          {maxed ? '★ MAX' : `LV ${level}`}
                        </Text>
                      </View>
                      {/* Equipped glow ring */}
                      {equipped && <View style={[s.equippedRing, { borderColor: relic.color }]} />}
                      {/* Lock overlay */}
                      {!unlocked && (
                        <View style={s.lockOverlay}>
                          <Feather name="lock" size={24} color="#FFFFFFAA" />
                          <Text style={s.lockOverlayRank}>{reqRank.name}</Text>
                        </View>
                      )}
                    </Pressable>

                    {/* ── Footer ── */}
                    <View style={s.relicFooter}>
                      {/* Name row */}
                      <View style={s.relicNameRow}>
                        <Text style={[s.relicCardName, { color: equipped ? relic.color : colors.foreground }]} numberOfLines={1}>
                          {relic.name}
                        </Text>
                        {unlocked && (
                          <Pressable
                            onPress={() => handleEquipRelic(relic.id)}
                            style={[s.equipChip, {
                              backgroundColor: equipped ? relic.color + '28' : 'transparent',
                              borderColor: equipped ? relic.color + 'AA' : colors.border + '66',
                            }]}
                          >
                            <Text style={[s.equipChipText, { color: equipped ? relic.color : colors.mutedForeground }]}>
                              {equipped ? '✓ ON' : 'EQUIP'}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Power bar — 10 segments */}
                      <View style={s.levelBarRow}>
                        {Array.from({ length: RELIC_MAX_LEVEL }).map((_, i) => (
                          <View
                            key={i}
                            style={[s.levelBarSeg, {
                              backgroundColor: i < level
                                ? (maxed ? '#FFD700' : relic.color)
                                : (colors.border + '55'),
                            }]}
                          />
                        ))}
                      </View>

                      {/* Upgrade button */}
                      {unlocked && (
                        <Pressable
                          onPress={async () => {
                            if (maxed || !canAfford) return;
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            await upgradeRelic(relic.id);
                          }}
                          disabled={maxed}
                          style={[s.upgradeBtn, {
                            backgroundColor: maxed
                              ? '#FFFFFF06'
                              : canAfford ? relic.color + '20' : '#FF444410',
                            borderColor: maxed
                              ? colors.border + '22'
                              : canAfford ? relic.color + '77' : '#FF444466',
                          }]}
                        >
                          {maxed ? (
                            <Text style={[s.upgradeBtnText, { color: '#FFD700' }]}>★ MAXED</Text>
                          ) : (
                            <>
                              <Text style={s.upgradeCoinIcon}>🪙</Text>
                              <Text style={[s.upgradeBtnText, { color: canAfford ? relic.color : '#FF6666' }]}>
                                {cost.toLocaleString()}
                              </Text>
                              <Text style={[s.upgradeLabel, { color: canAfford ? colors.foreground + 'CC' : '#FF666677' }]}>
                                UPGRADE
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <View style={s.emptyState}>
      <Feather name={icon as never} size={40} color="#FFFFFF22" />
      <Text style={s.emptyTitle}>{message}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, gap: 10 },
  title:       { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  countBadge:  { backgroundColor: '#C8820A22', borderRadius: 12, borderWidth: 1, borderColor: '#C8820A44', paddingHorizontal: 10, paddingVertical: 4 },
  countText:   { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#C8820A', letterSpacing: 0.5 },
  tabRow:      { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:     { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.2 },

  // Skin grid
  skinGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard:    { width: '47%', borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', paddingBottom: 12 },
  skinPreview: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  paddlePreview: { width: 70, height: 12, borderRadius: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10 },
  skinName:    { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5, marginBottom: 8 },

  // Theme list
  themeRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 12 },
  themeSwatch: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  themeSwatchDot: { width: 18, height: 18, borderRadius: 9 },
  themeName:   { fontFamily: 'Inter_700Bold', fontSize: 14 },
  themeDesc:   { fontFamily: 'Inter_400Regular', fontSize: 11 },

  // Shared
  equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  equippedText:  { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#0D0A06', letterSpacing: 0.5 },
  equipBtn:    { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  equipBtnText:{ fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },
  hintCard:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  hintText:    { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },

  // Relics — Brawl-Stars-style character collection
  relicHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  coinBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#C8820A22', borderRadius: 20, borderWidth: 1, borderColor: '#C8820A55', paddingHorizontal: 12, paddingVertical: 5 },
  coinBadgeText:   { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#C8820A' },
  relicHint:       { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  noRelicRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  noRelicName:     { fontFamily: 'Inter_700Bold', fontSize: 13 },
  noRelicSub:      { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 1 },
  relicGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  relicCard:       { width: '47.5%', borderRadius: 18, borderWidth: 2, overflow: 'hidden', backgroundColor: '#0D0A0688' },
  relicPortrait:   { width: '100%', height: 130, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  levelBadge:      { position: 'absolute', bottom: 6, right: 6, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  levelBadgeText:  { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  equippedRing:    { position: 'absolute', inset: 0, borderRadius: 16, borderWidth: 3, opacity: 0.6 },
  lockOverlay:     { position: 'absolute', inset: 0, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', gap: 4 },
  lockOverlayRank: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFFAA', letterSpacing: 0.5 },
  relicFooter:     { padding: 10, gap: 7 },
  relicNameRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  relicCardName:   { fontFamily: 'Inter_700Bold', fontSize: 13, flex: 1 },
  equipChip:       { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 4 },
  equipChipText:   { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  levelBarRow:     { flexDirection: 'row', gap: 2 },
  levelBarSeg:     { flex: 1, height: 5, borderRadius: 3 },
  upgradeBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, paddingVertical: 7 },
  upgradeCoinIcon: { fontSize: 13 },
  upgradeBtnText:  { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.3 },
  upgradeLabel:    { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },

  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF44' },
  emptySub:    { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF22', textAlign: 'center' },
});
