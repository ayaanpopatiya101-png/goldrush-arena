import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  usePlayer, SKINS, RELICS, MAPS,
  getRelicLevel, getRankFromXP, getRankIndex,
  type ArenaMap,
} from '@/context/PlayerContext';

const BG0  = '#08071A';
const BG1  = '#0F0C24';
const GOLD = '#F0B429';
const WHITE= '#FFFFFF';
const MUTED= '#FFFFFF55';
const DIM  = '#FFFFFF18';
const CARD = '#FFFFFF07';
const BORDR= '#FFFFFF12';

const TABS = ['SKINS', 'RELICS', 'ARENAS'] as const;
type Tab = typeof TABS[number];

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile, equipSkin, equipRelic, upgradeRelic, equipTheme } = usePlayer();
  const [tab, setTab] = useState<Tab>('SKINS');

  function haptic() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const myRankIndex  = getRankIndex(getRankFromXP(profile?.xp ?? 0));
  const ownedSkins   = SKINS.filter(s => profile?.ownedSkins?.includes(s.id));
  const lockedSkins  = SKINS.filter(s => !profile?.ownedSkins?.includes(s.id));
  const unlockedRelics = RELICS.filter(r => myRankIndex >= r.unlockRankIndex);
  const lockedRelics   = RELICS.filter(r => myRankIndex < r.unlockRankIndex);

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[BG1, BG0]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>GEAR</Text>
          <Text style={S.headerSub}>Customize your loadout</Text>
        </View>
        <View style={S.coinChip}>
          <Text style={{ fontSize: 13 }}>🪙</Text>
          <Text style={S.chipVal}>{profile?.coins ?? 0}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabBar}>
        {TABS.map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[S.tabBtn, tab === t && S.tabBtnActive]}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* SKINS */}
        {tab === 'SKINS' && (
          <>
            <Text style={S.secTitle}>{`OWNED  ·  ${ownedSkins.length} / ${SKINS.length}`}</Text>
            {ownedSkins.length === 0 && (
              <View style={S.emptyBox}>
                <Text style={{ fontSize: 32 }}>🛒</Text>
                <Text style={S.emptyTxt}>Visit the Shop to get skins</Text>
              </View>
            )}
            <View style={S.grid}>
              {ownedSkins.map(skin => {
                const equipped = profile?.currentSkin === skin.id;
                return (
                  <Pressable key={skin.id} onPress={() => { haptic(); equipSkin(skin.id); }}
                    style={[S.skinCard, { borderColor: equipped ? skin.color : BORDR }]}>
                    {equipped && <View style={[S.activeBar, { backgroundColor: skin.color }]} />}
                    <View style={[S.skinSwatch, { backgroundColor: skin.color }]} />
                    <Text style={S.skinName}>{skin.name}</Text>
                    <View style={[S.badge, equipped
                      ? { backgroundColor: skin.color + '30', borderColor: skin.color + '70' }
                      : { backgroundColor: DIM, borderColor: BORDR }]}>
                      <Text style={[S.badgeTxt, equipped && { color: skin.color }]}>{equipped ? 'EQUIPPED' : 'EQUIP'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {lockedSkins.length > 0 && (
              <>
                <Text style={[S.secTitle, { marginTop: 20 }]}>LOCKED</Text>
                <View style={S.grid}>
                  {lockedSkins.map(skin => (
                    <View key={skin.id} style={[S.skinCard, { borderColor: BORDR, opacity: 0.4 }]}>
                      <View style={[S.skinSwatch, { backgroundColor: skin.color }]} />
                      <Text style={S.skinName}>{skin.name}</Text>
                      <View style={[S.badge, { backgroundColor: DIM, borderColor: BORDR }]}>
                        <Text style={[S.badgeTxt, { color: MUTED }]}>🔒 {skin.price} 🪙</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* RELICS */}
        {tab === 'RELICS' && (
          <>
            <Text style={S.secTitle}>{`UNLOCKED  ·  ${unlockedRelics.length} / ${RELICS.length}`}</Text>
            {unlockedRelics.length === 0 && (
              <View style={S.emptyBox}>
                <Text style={{ fontSize: 32 }}>⬆️</Text>
                <Text style={S.emptyTxt}>Rank up to unlock relics</Text>
              </View>
            )}
            {unlockedRelics.map(relic => {
              const equipped = profile?.currentRelic === relic.id;
              const level    = profile ? getRelicLevel(profile, relic.id) : 1;
              return (
                <View key={relic.id} style={[S.relicCard, { borderColor: equipped ? relic.color + '70' : BORDR }]}>
                  {equipped && <LinearGradient colors={[relic.color + '20', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
                  <View style={[S.relicIcon, { borderColor: equipped ? relic.color + '55' : BORDR }]}>
                    <Text style={{ fontSize: 26 }}>{relic.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.relicName}>{relic.name}</Text>
                    <Text style={S.relicDesc} numberOfLines={2}>{relic.desc}</Text>
                    <View style={S.levelRow}>
                      <Text style={S.levelTxt}>Lv.{level}</Text>
                      <View style={S.levelBar}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <View key={i} style={[S.levelSeg, { backgroundColor: i < level ? relic.color : DIM }]} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <Pressable onPress={() => { haptic(); equipRelic(relic.id); }}
                      style={[S.relicBtn, equipped
                        ? { backgroundColor: relic.color + '30', borderColor: relic.color + '70' }
                        : { backgroundColor: DIM, borderColor: BORDR }]}>
                      <Text style={[S.relicBtnTxt, equipped && { color: relic.color }]}>{equipped ? 'EQUIPPED' : 'EQUIP'}</Text>
                    </Pressable>
                    {level < 10 && (
                      <Pressable onPress={() => {
                        haptic();
                        upgradeRelic(relic.id).then(ok => { if (!ok) Alert.alert('Not enough coins'); });
                      }} style={[S.relicBtn, { backgroundColor: GOLD + '22', borderColor: GOLD + '55' }]}>
                        <Text style={[S.relicBtnTxt, { color: GOLD }]}>UPGRADE</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {lockedRelics.length > 0 && (
              <>
                <Text style={[S.secTitle, { marginTop: 20 }]}>LOCKED — RANK UP TO UNLOCK</Text>
                {lockedRelics.map(relic => (
                  <View key={relic.id} style={[S.relicCard, { opacity: 0.35 }]}>
                    <View style={[S.relicIcon, { borderColor: BORDR }]}>
                      <Text style={{ fontSize: 26 }}>{relic.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.relicName}>{relic.name}</Text>
                      <Text style={S.relicDesc} numberOfLines={1}>{relic.desc}</Text>
                    </View>
                    <Text style={S.lockTxt}>🔒</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* ARENAS */}
        {tab === 'ARENAS' && (
          <>
            <Text style={S.secTitle}>ARENA THEMES</Text>
            {MAPS.map((theme: ArenaMap) => {
              const equipped = profile?.currentArenaTheme === theme.id;
              const unlocked = myRankIndex >= theme.unlockRankIndex;
              return (
                <Pressable key={theme.id}
                  onPress={() => { if (!unlocked) return; haptic(); equipTheme(theme.id); }}
                  style={[S.arenaCard, { borderColor: equipped ? theme.accent + '70' : BORDR, opacity: unlocked ? 1 : 0.45 }]}>
                  {equipped && <LinearGradient colors={[theme.accent + '20', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
                  <View style={[S.arenaPreview, { backgroundColor: theme.arenaBg[0] }]}>
                    <LinearGradient colors={theme.arenaBg} style={StyleSheet.absoluteFill} />
                    <View style={[S.arenaWallTop, { backgroundColor: theme.accent }]} />
                    <View style={[S.arenaPuck,    { backgroundColor: theme.accent }]} />
                    <View style={[S.arenaWallBot, { backgroundColor: theme.accent }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.arenaName}>{theme.icon}  {theme.name}</Text>
                    <Text style={S.arenaDesc} numberOfLines={1}>{theme.desc}</Text>
                  </View>
                  <View style={[S.badge,
                    equipped
                      ? { backgroundColor: theme.accent + '30', borderColor: theme.accent + '70' }
                      : unlocked ? { backgroundColor: DIM, borderColor: BORDR }
                      : { backgroundColor: DIM, borderColor: BORDR }]}>
                    <Text style={[S.badgeTxt, equipped && { color: theme.accent }]}>
                      {equipped ? 'ACTIVE' : unlocked ? 'USE' : '🔒'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG0 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDR },
  headerTitle: { fontFamily: 'Exo2_900Black', fontSize: 20, color: WHITE, letterSpacing: 2 },
  headerSub:   { fontFamily: 'Exo2_400Regular', fontSize: 11, color: MUTED, marginTop: 2 },
  coinChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD + '18', borderWidth: 1, borderColor: GOLD + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipVal:     { fontFamily: 'Exo2_700Bold', fontSize: 14, color: GOLD },

  tabBar:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: BORDR },
  tabBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: DIM },
  tabBtnActive:{ backgroundColor: GOLD + '22', borderWidth: 1, borderColor: GOLD + '60' },
  tabTxt:      { fontFamily: 'Exo2_700Bold', fontSize: 11, color: MUTED, letterSpacing: 1 },
  tabTxtActive:{ color: GOLD },

  secTitle: { fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED, letterSpacing: 2, marginBottom: 10 },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTxt: { fontFamily: 'Exo2_600SemiBold', fontSize: 13, color: MUTED },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  skinCard:      { width: '47%', backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, alignItems: 'center', overflow: 'hidden' },
  activeBar:     { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  skinSwatch:    { width: 52, height: 52, borderRadius: 26 },
  skinName:      { fontFamily: 'Exo2_700Bold', fontSize: 13, color: WHITE, textAlign: 'center' },
  badge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgeTxt:      { fontFamily: 'Exo2_700Bold', fontSize: 10, color: GOLD, letterSpacing: 0.5 },

  relicCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, overflow: 'hidden' },
  relicIcon:  { width: 52, height: 52, borderRadius: 26, backgroundColor: DIM, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  relicName:  { fontFamily: 'Exo2_700Bold', fontSize: 14, color: WHITE },
  relicDesc:  { fontFamily: 'Exo2_400Regular', fontSize: 10, color: MUTED, marginTop: 2 },
  levelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  levelTxt:   { fontFamily: 'Exo2_600SemiBold', fontSize: 10, color: MUTED, minWidth: 28 },
  levelBar:   { flex: 1, flexDirection: 'row', gap: 2 },
  levelSeg:   { flex: 1, height: 3, borderRadius: 2 },
  relicBtn:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  relicBtnTxt:{ fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED },
  lockTxt:    { fontFamily: 'Exo2_600SemiBold', fontSize: 14, color: MUTED },

  arenaCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, overflow: 'hidden' },
  arenaPreview: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative', flexShrink: 0 },
  arenaWallTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 7 },
  arenaWallBot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 7 },
  arenaPuck:    { position: 'absolute', width: 10, height: 10, borderRadius: 5, top: '50%', left: '50%', marginTop: -5, marginLeft: -5 },
  arenaName:    { fontFamily: 'Exo2_700Bold', fontSize: 14, color: WHITE },
  arenaDesc:    { fontFamily: 'Exo2_400Regular', fontSize: 10, color: MUTED, marginTop: 2 },
});
