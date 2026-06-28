import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RELICS, RANKS, getRankIndex, usePlayer } from '@/context/PlayerContext';
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
  const { profile, equipSkin, equipTheme, equipRelic } = usePlayer();
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

        {/* ── Relics tab ── */}
        {activeTab === 'relics' && (
          <>
            <View style={[s.relicInfo, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="award" size={15} color="#C8820A" />
              <Text style={[s.hintText, { color: colors.mutedForeground }]}>
                Relics are battle artifacts unlocked by climbing ranks. Equip one for a passive edge in every match.
              </Text>
            </View>

            {/* No relic */}
            <Pressable
              onPress={() => handleEquipRelic('none')}
              style={({ pressed }) => [s.relicCard, {
                backgroundColor: profile.currentRelic === 'none' ? '#FFFFFF12' : colors.card,
                borderColor: profile.currentRelic === 'none' ? colors.foreground : colors.border,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <View style={[s.relicIconWrap, { backgroundColor: '#FFFFFF0A', borderColor: colors.border }]}>
                <Feather name="slash" size={20} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.relicName, { color: colors.foreground }]}>No Relic</Text>
                <Text style={[s.relicDesc, { color: colors.mutedForeground }]}>Play with no passive ability equipped.</Text>
              </View>
              {profile.currentRelic === 'none'
                ? <View style={[s.equippedBadge, { backgroundColor: colors.foreground }]}><Feather name="check" size={10} color="#0D0A06" /><Text style={s.equippedText}>ON</Text></View>
                : <View style={[s.equipBtn, { borderColor: colors.border }]}><Text style={[s.equipBtnText, { color: colors.mutedForeground }]}>EQUIP</Text></View>}
            </Pressable>

            {RELICS.map(relic => {
              const unlocked = playerRankIdx >= relic.unlockRankIndex;
              const equipped = profile.currentRelic === relic.id;
              const reqRank  = RANKS[relic.unlockRankIndex];
              return (
                <Pressable
                  key={relic.id}
                  disabled={!unlocked}
                  onPress={() => handleEquipRelic(relic.id)}
                  style={({ pressed }) => [s.relicCard, {
                    backgroundColor: equipped ? relic.color + '18' : colors.card,
                    borderColor: equipped ? relic.color : colors.border,
                    opacity: !unlocked ? 0.5 : pressed ? 0.8 : 1,
                  }]}
                >
                  <View style={[s.relicIconWrap, { backgroundColor: relic.color + '1A', borderColor: relic.color + '55' }]}>
                    <Text style={s.relicIcon}>{relic.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[s.relicName, { color: equipped ? relic.color : colors.foreground }]}>{relic.name}</Text>
                    <Text style={[s.relicDesc, { color: colors.mutedForeground }]}>{relic.desc}</Text>
                    {!unlocked && (
                      <View style={s.relicLockRow}>
                        <Feather name="lock" size={10} color={reqRank.color} />
                        <Text style={[s.relicLockText, { color: reqRank.color }]}>Unlocks at {reqRank.name}</Text>
                      </View>
                    )}
                  </View>
                  {unlocked
                    ? (equipped
                        ? <View style={[s.equippedBadge, { backgroundColor: relic.color }]}><Feather name="check" size={10} color="#0D0A06" /><Text style={s.equippedText}>ON</Text></View>
                        : <View style={[s.equipBtn, { borderColor: relic.color }]}><Text style={[s.equipBtnText, { color: relic.color }]}>EQUIP</Text></View>)
                    : <Feather name="lock" size={16} color={colors.mutedForeground} />}
                </Pressable>
              );
            })}
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

  // Relics
  relicInfo:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  relicCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 12 },
  relicIconWrap:{ width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  relicIcon:    { fontSize: 24 },
  relicName:    { fontFamily: 'Inter_700Bold', fontSize: 14 },
  relicDesc:    { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  relicLockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  relicLockText:{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.3 },

  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF44' },
  emptySub:    { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF22', textAlign: 'center' },
});
