import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, RELICS, RANKS, getRankIndex, usePlayer, getRelicLevel, getRelicUpgradeCost, RELIC_MAX_LEVEL } from '@/context/PlayerContext';

const ARENA_THEMES = [
  { id: 'default', emoji: '🌌', name: 'Dark Void',      desc: 'Classic deep-space',   color: '#6655FF', preview: ['#0D0A06', '#181208'] as [string,string] },
  { id: 'solar',   emoji: '☀️', name: 'Solar Flare',    desc: 'Scorching red arena',  color: '#FF6B35', preview: ['#350000', '#5A1000'] as [string,string] },
  { id: 'arctic',  emoji: '❄️', name: 'Arctic Ice',     desc: 'Cool blue frost',      color: '#1E8AAA', preview: ['#001828', '#003050'] as [string,string] },
  { id: 'toxic',   emoji: '☢️', name: 'Toxic Wasteland',desc: 'Neon hazard zone',     color: '#4A8A38', preview: ['#001A08', '#003020'] as [string,string] },
  { id: 'cosmic',  emoji: '🌸', name: 'Cosmic Dream',   desc: 'Purple nebula',        color: '#7A50A0', preview: ['#180030', '#2A0060'] as [string,string] },
  { id: 'golden',  emoji: '👑', name: 'Gold Rush',      desc: 'Prestige arena',       color: '#C8820A', preview: ['#1A1200', '#2A2000'] as [string,string] },
];

type Tab = 'skins' | 'relics' | 'themes';

// ─── Skin card ────────────────────────────────────────────────────────────────
function SkinCard({ skin, equipped, onEquip }: {
  skin: typeof SKINS[0]; equipped: boolean; onEquip: () => void;
}) {
  return (
    <Pressable onPress={onEquip} style={[INV.card, { borderColor: equipped ? skin.color : skin.color + '44', shadowColor: skin.color, shadowOpacity: equipped ? 0.6 : 0.1 }]}>
      <LinearGradient colors={[skin.color + (equipped ? '44' : '22'), skin.color + '08', '#00000000']} style={StyleSheet.absoluteFill} />
      {equipped && <View style={[INV.equippedBar, { backgroundColor: skin.color }]} />}
      <Text style={INV.skinDot}>🎨</Text>
      <View style={[INV.colorSwatch, { backgroundColor: skin.color, shadowColor: skin.color, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }]} />
      <Text style={[INV.cardName, { color: skin.color }]}>{skin.name}</Text>
      {equipped ? (
        <View style={[INV.equippedChip, { backgroundColor: skin.color + '33', borderColor: skin.color + '88' }]}>
          <Feather name="check-circle" size={9} color={skin.color} />
          <Text style={[INV.equippedTxt, { color: skin.color }]}>ON</Text>
        </View>
      ) : (
        <View style={INV.equipChip}>
          <Text style={INV.equipTxt}>EQUIP</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Relic card ───────────────────────────────────────────────────────────────
function RelicCard({ relic, equipped, trophyUnlocked, playerRankIdx, relicLevel, upgradeCost, coinsAvail, onEquip, onUpgrade }: {
  relic: typeof RELICS[0]; equipped: boolean; trophyUnlocked: boolean;
  playerRankIdx: number; relicLevel: number; upgradeCost: number; coinsAvail: number;
  onEquip: () => void; onUpgrade: () => void;
}) {
  const unlocked = playerRankIdx >= relic.unlockRankIndex || trophyUnlocked;
  const pct = relicLevel / RELIC_MAX_LEVEL;
  return (
    <View style={[INV.relicCard, {
      borderColor: equipped ? relic.color : (unlocked ? relic.color + '44' : '#FFFFFF15'),
      opacity: unlocked ? 1 : 0.45,
      shadowColor: relic.color, shadowOpacity: equipped ? 0.6 : 0.1,
    }]}>
      <LinearGradient colors={[relic.color + (equipped ? '44' : '18'), relic.color + '06']} style={StyleSheet.absoluteFill} />
      {equipped && <View style={[INV.equippedBar, { backgroundColor: relic.color }]} />}

      <View style={INV.relicTop}>
        <Text style={INV.relicIcon}>{relic.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[INV.relicName, { color: equipped ? relic.color : '#FFFFFF' }]}>{relic.name}</Text>
          <Text style={INV.relicDesc} numberOfLines={2}>{relic.desc}</Text>
        </View>
      </View>

      {unlocked ? (
        <>
          {/* Level bar */}
          <View style={INV.levelRow}>
            <Text style={INV.levelTxt}>LV {relicLevel}/{RELIC_MAX_LEVEL}</Text>
            <View style={INV.levelBar}>
              <View style={[INV.levelFill, { width: `${pct * 100}%` as never, backgroundColor: relic.color }]} />
            </View>
          </View>
          <View style={INV.relicBtns}>
            <Pressable onPress={onEquip} style={[INV.relicBtn, { flex: 1, borderColor: equipped ? relic.color + '88' : '#FFFFFF22', backgroundColor: equipped ? relic.color + '22' : '#FFFFFF06' }]}>
              <Text style={[INV.relicBtnTxt, { color: equipped ? relic.color : '#FFFFFF88' }]}>
                {equipped ? '✓ ACTIVE' : 'EQUIP'}
              </Text>
            </Pressable>
            {relicLevel < RELIC_MAX_LEVEL && (
              <Pressable onPress={onUpgrade} style={[INV.relicBtn, { flex: 1, borderColor: coinsAvail >= upgradeCost ? '#FFD70066' : '#FFFFFF22', backgroundColor: '#FFD70011' }]}>
                <Text style={INV.relicBtnTxt}>🪙{upgradeCost}</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <View style={INV.lockRow}>
          <Feather name="lock" size={12} color="#FFFFFF33" />
          <Text style={INV.lockTxt}>Reach {RANKS[relic.unlockRankIndex]?.name ?? '?'}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Theme card ───────────────────────────────────────────────────────────────
function ThemeCard({ theme, owned, equipped, onEquip }: {
  theme: typeof ARENA_THEMES[0]; owned: boolean; equipped: boolean; onEquip: () => void;
}) {
  return (
    <Pressable onPress={owned ? onEquip : undefined} style={{ width: '47%' }}>
      <View style={[INV.themeCard, { borderColor: equipped ? theme.color : theme.color + '33', opacity: owned ? 1 : 0.5, shadowColor: theme.color, shadowOpacity: equipped ? 0.5 : 0.1 }]}>
        <LinearGradient colors={theme.preview} style={INV.themePreview}>
          <Text style={{ fontSize: 30 }}>{theme.emoji}</Text>
          <View style={[INV.arenaWall, { top: 0 }]} />
          <View style={[INV.arenaWall, { bottom: 0 }]} />
        </LinearGradient>
        <View style={INV.themeInfo}>
          <Text style={[INV.themeName, { color: equipped ? theme.color : '#FFFFFF' }]}>{theme.name}</Text>
          {equipped && (
            <View style={[INV.equippedChip, { backgroundColor: theme.color + '33', borderColor: theme.color + '88' }]}>
              <Text style={[INV.equippedTxt, { color: theme.color }]}>ACTIVE</Text>
            </View>
          )}
          {!owned && <Text style={INV.lockedTxt}>🔒 LOCKED</Text>}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Inventory screen ─────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile, equipSkin, equipTheme, equipRelic, upgradeRelic } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 56) : insets.top;

  const ownedSkins   = SKINS.filter(s => profile.ownedSkins.includes(s.id));
  const ownedThemes  = ARENA_THEMES.filter(t => profile.ownedThemes?.includes(t.id));
  const playerRankIdx = getRankIndex(profile.rank);
  const unlockedRelics = RELICS.filter(r => playerRankIdx >= r.unlockRankIndex || (profile.trophyUnlockedRelics ?? []).includes(r.id));
  const lockedRelics   = RELICS.filter(r => playerRankIdx < r.unlockRankIndex && !(profile.trophyUnlockedRelics ?? []).includes(r.id));

  async function handleEquipSkin(skinId: string) {
    await equipSkin(skinId); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  async function handleEquipTheme(themeId: string) {
    await equipTheme(themeId); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  async function handleEquipRelic(relicId: string) {
    await equipRelic(relicId); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  async function handleUpgradeRelic(relicId: string) {
    const ok = await upgradeRelic(relicId);
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }

  const equippedSkin  = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];
  const equippedTheme = ARENA_THEMES.find(t => t.id === profile.currentArenaTheme) ?? ARENA_THEMES[0];
  const equippedRelic = RELICS.find(r => r.id === profile.currentRelic);

  return (
    <View style={{ flex: 1, backgroundColor: '#07051A' }}>
      <LinearGradient colors={['#0E0B22', '#07051A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <LinearGradient colors={['#1A1530', '#0E0B22']} style={[INV.header, { paddingTop: topPad + 6 }]}>
        <View>
          <Text style={INV.title}>📦 GEAR</Text>
          <Text style={INV.sub}>{ownedSkins.length} skins · {unlockedRelics.length} relics · {ownedThemes.length} arenas</Text>
        </View>
        {/* Currently equipped mini display */}
        <View style={INV.equipped}>
          <View style={[INV.miniEquip, { borderColor: equippedSkin.color + '88' }]}>
            <Text style={{ fontSize: 16 }}>🎨</Text>
          </View>
          {equippedRelic && (
            <View style={[INV.miniEquip, { borderColor: equippedRelic.color + '88' }]}>
              <Text style={{ fontSize: 16 }}>{equippedRelic.icon}</Text>
            </View>
          )}
          <View style={[INV.miniEquip, { borderColor: '#6655FF88' }]}>
            <Text style={{ fontSize: 14 }}>{equippedTheme.emoji}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={INV.tabRow}>
        {([
          { id: 'skins',  label: `🎨 SKINS (${ownedSkins.length})` },
          { id: 'relics', label: `⚡ RELICS (${unlockedRelics.length})` },
          { id: 'themes', label: `🌌 ARENAS (${ownedThemes.length})` },
        ] as { id: Tab; label: string }[]).map(t => (
          <Pressable key={t.id} onPress={() => setActiveTab(t.id)} style={[INV.tab, activeTab === t.id && INV.tabActive]}>
            <Text style={[INV.tabTxt, activeTab === t.id && INV.tabTxtActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>

        {activeTab === 'skins' && (
          <>
            {/* Currently equipped banner */}
            <View style={[INV.equippedBanner, { borderColor: equippedSkin.color + '55' }]}>
              <LinearGradient colors={[equippedSkin.color + '33', equippedSkin.color + '11']} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 36 }}>🎨</Text>
              <View style={{ flex: 1 }}>
                <Text style={INV.bannerSub}>EQUIPPED SKIN</Text>
                <Text style={[INV.bannerName, { color: equippedSkin.color }]}>{equippedSkin.name}</Text>
              </View>
              <View style={[INV.colorSwatch, { backgroundColor: equippedSkin.color, width: 32, height: 32, borderRadius: 8 }]} />
            </View>

            <View style={INV.grid}>
              {ownedSkins.map(skin => (
                <SkinCard key={skin.id} skin={skin} equipped={profile.currentSkin === skin.id} onEquip={() => handleEquipSkin(skin.id)} />
              ))}
            </View>
          </>
        )}

        {activeTab === 'relics' && (
          <>
            {equippedRelic && (
              <View style={[INV.equippedBanner, { borderColor: equippedRelic.color + '55' }]}>
                <LinearGradient colors={[equippedRelic.color + '33', equippedRelic.color + '11']} style={StyleSheet.absoluteFill} />
                <Text style={{ fontSize: 32 }}>{equippedRelic.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={INV.bannerSub}>EQUIPPED RELIC</Text>
                  <Text style={[INV.bannerName, { color: equippedRelic.color }]}>{equippedRelic.name}</Text>
                </View>
              </View>
            )}

            {/* Unequip option */}
            {profile.currentRelic !== 'none' && (
              <Pressable onPress={() => handleEquipRelic('none')} style={INV.unequipBtn}>
                <Text style={INV.unequipTxt}>REMOVE RELIC</Text>
              </Pressable>
            )}

            {unlockedRelics.map(relic => (
              <RelicCard key={relic.id} relic={relic}
                equipped={profile.currentRelic === relic.id}
                trophyUnlocked={(profile.trophyUnlockedRelics ?? []).includes(relic.id)}
                playerRankIdx={playerRankIdx}
                relicLevel={getRelicLevel(profile, relic.id)}
                upgradeCost={getRelicUpgradeCost(getRelicLevel(profile, relic.id))}
                coinsAvail={profile.coins}
                onEquip={() => handleEquipRelic(relic.id)}
                onUpgrade={() => handleUpgradeRelic(relic.id)}
              />
            ))}

            {lockedRelics.length > 0 && (
              <>
                <Text style={INV.lockedSectionTitle}>🔒 LOCKED RELICS ({lockedRelics.length})</Text>
                {lockedRelics.slice(0, 3).map(relic => (
                  <RelicCard key={relic.id} relic={relic}
                    equipped={false} trophyUnlocked={false}
                    playerRankIdx={playerRankIdx}
                    relicLevel={1} upgradeCost={0} coinsAvail={0}
                    onEquip={() => {}} onUpgrade={() => {}}
                  />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'themes' && (
          <>
            <View style={[INV.equippedBanner, { borderColor: equippedTheme.color + '55' }]}>
              <LinearGradient colors={[...equippedTheme.preview, '#00000000'] as [string,string,string]} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 32 }}>{equippedTheme.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={INV.bannerSub}>EQUIPPED ARENA</Text>
                <Text style={[INV.bannerName, { color: equippedTheme.color }]}>{equippedTheme.name}</Text>
              </View>
            </View>
            <View style={INV.themeGrid}>
              {ARENA_THEMES.map(theme => (
                <ThemeCard key={theme.id} theme={theme}
                  owned={profile.ownedThemes?.includes(theme.id) ?? false}
                  equipped={profile.currentArenaTheme === theme.id}
                  onEquip={() => handleEquipTheme(theme.id)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const INV = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E',
  },
  title: { fontFamily: 'Inter_900Black', fontSize: 22, color: '#FFD700', letterSpacing: 1 },
  sub:   { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF44', marginTop: 2 },
  equipped: { flexDirection: 'row', gap: 6 },
  miniEquip: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1.5,
    backgroundColor: '#FFFFFF0A', alignItems: 'center', justifyContent: 'center',
  },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E', backgroundColor: '#0A0818' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E5A020' },
  tabTxt: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 0.5 },
  tabTxtActive: { color: '#E5A020' },

  equippedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5, padding: 14, overflow: 'hidden',
  },
  bannerSub:  { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFFFFF55', letterSpacing: 1.5 },
  bannerName: { fontFamily: 'Inter_700Bold', fontSize: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  card: {
    width: '47%', borderRadius: 18, borderWidth: 1.5, padding: 12,
    alignItems: 'center', gap: 5, overflow: 'hidden',
    backgroundColor: '#FFFFFF06',
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  equippedBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  skinDot:    { fontSize: 30 },
  colorSwatch: { width: 26, height: 10, borderRadius: 5 },
  cardName:   { fontFamily: 'Inter_700Bold', fontSize: 11, textAlign: 'center' },
  equippedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3,
  },
  equippedTxt: { fontFamily: 'Inter_700Bold', fontSize: 8 },
  equipChip: {
    backgroundColor: '#FFFFFF0E', borderWidth: 1, borderColor: '#FFFFFF22',
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3,
  },
  equipTxt: { color: '#FFFFFF66', fontFamily: 'Inter_700Bold', fontSize: 8 },

  relicCard: {
    borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 10, overflow: 'hidden',
    backgroundColor: '#FFFFFF06',
    shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  relicTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  relicIcon: { fontSize: 32, width: 40, textAlign: 'center' },
  relicName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  relicDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF66', marginTop: 2, lineHeight: 14 },
  levelRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelTxt:  { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFD700', width: 60 },
  levelBar:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF15', overflow: 'hidden' },
  levelFill: { height: 6, borderRadius: 3 },
  relicBtns: { flexDirection: 'row', gap: 8 },
  relicBtn:  { borderWidth: 1.5, borderRadius: 10, padding: 8, alignItems: 'center' },
  relicBtnTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 10 },
  lockRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockTxt:   { color: '#FFFFFF33', fontFamily: 'Inter_500Medium', fontSize: 11 },

  lockedSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF33', letterSpacing: 2, marginTop: 6 },
  unequipBtn: {
    borderWidth: 1, borderColor: '#FF475533', borderRadius: 10, padding: 8,
    alignItems: 'center', backgroundColor: '#FF475511',
  },
  unequipTxt: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 10 },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  themeCard: {
    borderRadius: 18, borderWidth: 1.5, overflow: 'hidden',
    backgroundColor: '#FFFFFF06',
    shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  themePreview: {
    height: 90, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  arenaWall: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: '#C8820A44' },
  themeInfo: { padding: 10, gap: 4 },
  themeName: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  lockedTxt: { fontFamily: 'Inter_500Medium', fontSize: 9, color: '#FFFFFF33' },
});
