import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer, SKINS, RELICS, getRankFromXP, getRankIndex } from '@/context/PlayerContext';

const BG0  = '#08071A';
const BG1  = '#0F0C24';
const GOLD = '#F0B429';
const WHITE= '#FFFFFF';
const MUTED= '#FFFFFF55';
const DIM  = '#FFFFFF18';
const CARD = '#FFFFFF07';
const BORDR= '#FFFFFF12';

const TABS = ['SKINS', 'RELICS', 'BUNDLES'] as const;
type Tab = typeof TABS[number];

const BUNDLES = [
  { id: 'starter', name: 'Starter Pack',  desc: '3 skins + 500 coins',  price: 800,  icon: '🎁', color: '#8B5CF6' },
  { id: 'gold',    name: 'Gold Rush Pack', desc: '5 skins + 1000 coins', price: 1500, icon: '💰', color: GOLD },
  { id: 'legend',  name: 'Legend Bundle',  desc: 'All relics at rank',   price: 3000, icon: '👑', color: '#EF4444' },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { profile, purchaseSkin } = usePlayer();
  const [tab, setTab] = useState<Tab>('SKINS');

  function haptic() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleBuySkin(skin: typeof SKINS[0]) {
    haptic();
    if (profile?.ownedSkins?.includes(skin.id)) { Alert.alert('Already owned'); return; }
    if ((profile?.coins ?? 0) < skin.price)     { Alert.alert('Not enough coins'); return; }
    Alert.alert(`Buy ${skin.name}?`, `Cost: ${skin.price} 🪙`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: () => purchaseSkin(skin.id) },
    ]);
  }

  const myRankIndex = getRankIndex(getRankFromXP(profile?.xp ?? 0));

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[BG1, BG0]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>SHOP</Text>
          <Text style={S.headerSub}>Spend your hard-earned coins</Text>
        </View>
        <View style={S.coinChip}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={S.coinVal}>{profile?.coins ?? 0}</Text>
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

        {tab === 'SKINS' && (
          <>
            <Text style={S.secTitle}>FEATURED</Text>
            {(() => {
              const featured = SKINS[0];
              const owned = profile?.ownedSkins?.includes(featured.id);
              return (
                <Pressable onPress={() => handleBuySkin(featured)} style={[S.featCard, { borderColor: featured.color + '55' }]}>
                  <LinearGradient colors={[featured.color + '25', CARD]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={[S.featSwatch, { backgroundColor: featured.color }]} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={S.featName}>{featured.name}</Text>
                    <Text style={S.featDesc}>Paddle skin</Text>
                  </View>
                  <View style={[S.priceTag, owned && S.priceTagOwned]}>
                    <Text style={[S.priceTxt, owned && { color: MUTED }]}>{owned ? 'OWNED' : `${featured.price} 🪙`}</Text>
                  </View>
                </Pressable>
              );
            })()}

            <View style={S.divider} />
            <Text style={S.secTitle}>ALL SKINS</Text>
            <View style={S.grid}>
              {SKINS.slice(1).map(skin => {
                const owned = profile?.ownedSkins?.includes(skin.id);
                return (
                  <Pressable key={skin.id} onPress={() => handleBuySkin(skin)}
                    style={[S.gridCard, { borderColor: skin.color + '40' }]}>
                    <View style={[S.skinSwatch, { backgroundColor: skin.color }]} />
                    <Text style={S.gridName}>{skin.name}</Text>
                    <View style={[S.gridPrice, owned && S.gridPriceOwned]}>
                      <Text style={[S.gridPriceTxt, owned && { color: MUTED }]}>{owned ? 'OWNED' : `${skin.price} 🪙`}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {tab === 'RELICS' && (
          <>
            <Text style={S.secTitle}>RANK-UNLOCKED RELICS</Text>
            <View style={S.relicNote}>
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
              <Text style={S.relicNoteTxt}>Relics unlock as you rank up. Equip them in the Gear tab.</Text>
            </View>
            {RELICS.map(relic => {
              const unlocked = myRankIndex >= relic.unlockRankIndex;
              return (
                <View key={relic.id} style={[S.relicRow, { borderColor: unlocked ? relic.color + '55' : BORDR, opacity: unlocked ? 1 : 0.45 }]}>
                  {unlocked && <LinearGradient colors={[relic.color + '18', CARD]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
                  <View style={[S.relicIcon, { borderColor: unlocked ? relic.color + '60' : BORDR }]}>
                    <Text style={{ fontSize: 26 }}>{relic.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={S.relicName}>{relic.name}</Text>
                    <Text style={S.relicDesc} numberOfLines={2}>{relic.desc}</Text>
                  </View>
                  <View style={[S.relicBadge, { backgroundColor: unlocked ? relic.color + '22' : DIM, borderColor: unlocked ? relic.color + '55' : BORDR }]}>
                    <Text style={[S.relicBadgeTxt, { color: unlocked ? relic.color : MUTED }]}>
                      {unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'BUNDLES' && (
          <>
            <Text style={S.secTitle}>VALUE PACKS</Text>
            {BUNDLES.map(bundle => (
              <Pressable key={bundle.id} style={[S.bundleCard, { borderColor: bundle.color + '55' }]}
                onPress={() => Alert.alert(bundle.name, `${bundle.desc}\n\nCost: ${bundle.price} 🪙`)}>
                <LinearGradient colors={[bundle.color + '20', CARD]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={{ fontSize: 32 }}>{bundle.icon}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={S.bundleName}>{bundle.name}</Text>
                  <Text style={S.bundleDesc}>{bundle.desc}</Text>
                </View>
                <View style={[S.priceTag, { borderColor: bundle.color + '60' }]}>
                  <Text style={S.priceTxt}>{bundle.price} 🪙</Text>
                </View>
              </Pressable>
            ))}
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
  coinVal:     { fontFamily: 'Exo2_700Bold', fontSize: 15, color: GOLD },

  tabBar:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: BORDR },
  tabBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: DIM },
  tabBtnActive:{ backgroundColor: GOLD + '22', borderWidth: 1, borderColor: GOLD + '60' },
  tabTxt:      { fontFamily: 'Exo2_700Bold', fontSize: 11, color: MUTED, letterSpacing: 1 },
  tabTxtActive:{ color: GOLD },

  secTitle: { fontFamily: 'Exo2_700Bold', fontSize: 10, color: MUTED, letterSpacing: 2, marginBottom: 10 },
  divider:  { height: 1, backgroundColor: BORDR, marginVertical: 18 },

  featCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 16, overflow: 'hidden', marginBottom: 4 },
  featSwatch:{ width: 52, height: 52, borderRadius: 10 },
  featName:  { fontFamily: 'Exo2_700Bold', fontSize: 16, color: WHITE },
  featDesc:  { fontFamily: 'Exo2_400Regular', fontSize: 12, color: MUTED },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard:     { width: '47%', backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, overflow: 'hidden', alignItems: 'center' },
  skinSwatch:   { width: 56, height: 56, borderRadius: 28 },
  gridName:     { fontFamily: 'Exo2_700Bold', fontSize: 13, color: WHITE, textAlign: 'center' },
  gridPrice:    { backgroundColor: GOLD + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: GOLD + '50' },
  gridPriceOwned:{ backgroundColor: DIM, borderColor: BORDR },
  gridPriceTxt: { fontFamily: 'Exo2_700Bold', fontSize: 11, color: GOLD },

  priceTag:      { backgroundColor: GOLD + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: GOLD + '50' },
  priceTagOwned: { backgroundColor: DIM, borderColor: BORDR },
  priceTxt:      { fontFamily: 'Exo2_700Bold', fontSize: 12, color: GOLD },

  relicNote:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: DIM, borderRadius: 12, padding: 12, marginBottom: 14 },
  relicNoteTxt: { fontFamily: 'Exo2_500Medium', fontSize: 12, color: MUTED, flex: 1 },
  relicRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, overflow: 'hidden', marginBottom: 10 },
  relicIcon:    { width: 52, height: 52, borderRadius: 26, backgroundColor: DIM, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  relicName:    { fontFamily: 'Exo2_700Bold', fontSize: 15, color: WHITE },
  relicDesc:    { fontFamily: 'Exo2_400Regular', fontSize: 11, color: MUTED },
  relicBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1 },
  relicBadgeTxt:{ fontFamily: 'Exo2_700Bold', fontSize: 10 },

  bundleCard:{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 16, overflow: 'hidden', marginBottom: 10 },
  bundleName:{ fontFamily: 'Exo2_700Bold', fontSize: 15, color: WHITE },
  bundleDesc:{ fontFamily: 'Exo2_400Regular', fontSize: 12, color: MUTED },
});
