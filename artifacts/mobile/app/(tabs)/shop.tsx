import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, usePlayer } from '@/context/PlayerContext';

const BUNDLES = [
  { id: 'shield3', emoji: '🛡️', name: 'Shield Pack',   desc: '3× Shield Power-ups',  price: 80,  color: '#FFD700', hot: false },
  { id: 'speed3',  emoji: '⚡', name: 'Speed Pack',    desc: '3× Speed Boosts',       price: 80,  color: '#00FF88', hot: false },
  { id: 'mixed5',  emoji: '🎁', name: 'Mixed Bundle',  desc: '5× Random Power-ups',   price: 100, color: '#00E5FF', hot: true  },
  { id: 'life1',   emoji: '❤️', name: '1 Extra Life',  desc: 'Start with 4 lives',    price: 60,  color: '#FF69B4', hot: false },
  { id: 'life2',   emoji: '💖', name: '2 Extra Lives', desc: 'Start with 5 lives',    price: 100, color: '#FF69B4', hot: false },
];

const ARENA_THEMES = [
  { id: 'default', emoji: '🌌', name: 'Dark Void',      desc: 'Classic deep-space',   price: 0,   color: '#6655FF', preview: ['#0D0035','#16005A'] as [string,string] },
  { id: 'solar',   emoji: '☀️', name: 'Solar Flare',    desc: 'Scorching red arena',  price: 300, color: '#FF6B35', preview: ['#350000','#5A1000'] as [string,string] },
  { id: 'arctic',  emoji: '❄️', name: 'Arctic Ice',     desc: 'Cool blue frost',      price: 300, color: '#00BFFF', preview: ['#001828','#003050'] as [string,string] },
  { id: 'toxic',   emoji: '☢️', name: 'Toxic Wasteland',desc: 'Neon hazard zone',     price: 350, color: '#00FF88', preview: ['#001A08','#003020'] as [string,string] },
  { id: 'cosmic',  emoji: '🌸', name: 'Cosmic Dream',   desc: 'Purple nebula',        price: 400, color: '#BF5FFF', preview: ['#180030','#2A0060'] as [string,string] },
  { id: 'golden',  emoji: '👑', name: 'Gold Rush',      desc: 'Prestige arena',       price: 500, color: '#FFD700', preview: ['#1A1200','#2A2000'] as [string,string] },
];

type Tab = 'skins' | 'themes' | 'bundles';

// ─── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ emoji, name, desc, price, color, owned, equipped, hot, sale, onPress, loading }: {
  emoji: string; name: string; desc: string; price: number; color: string;
  owned?: boolean; equipped?: boolean; hot?: boolean; sale?: boolean;
  onPress: () => void; loading?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  }
  return (
    <Pressable onPress={press} style={{ width: '47%' }}>
      <Animated.View style={[IC.card, { borderColor: equipped ? color : (owned ? color + '55' : color + '33'), transform: [{ scale }] }]}>
        {equipped && <View style={[IC.equippedStripe, { backgroundColor: color }]} />}
        {hot && <View style={IC.hotBadge}><Text style={IC.hotTxt}>🔥 HOT</Text></View>}
        {sale && <View style={IC.saleBadge}><Text style={IC.saleTxt}>SALE</Text></View>}

        <LinearGradient colors={[color + '28', color + '10', '#00000000']} style={StyleSheet.absoluteFill} />

        <Text style={IC.emoji}>{emoji}</Text>
        <Text style={[IC.name, { color: owned ? color : '#FFFFFF' }]}>{name}</Text>
        <Text style={IC.desc} numberOfLines={1}>{desc}</Text>

        {equipped ? (
          <View style={[IC.ownedBadge, { backgroundColor: color + '33', borderColor: color + '88' }]}>
            <Feather name="check-circle" size={10} color={color} />
            <Text style={[IC.ownedTxt, { color }]}>EQUIPPED</Text>
          </View>
        ) : owned ? (
          <View style={[IC.ownedBadge, { backgroundColor: '#00FF8822', borderColor: '#00FF8866' }]}>
            <Text style={[IC.ownedTxt, { color: '#00FF88' }]}>EQUIP</Text>
          </View>
        ) : (
          <View style={[IC.priceChip, { backgroundColor: '#FFD70022', borderColor: '#FFD70066' }]}>
            <Text style={{ fontSize: 10 }}>🪙</Text>
            <Text style={IC.priceTxt}>{price === 0 ? 'FREE' : price.toLocaleString()}</Text>
          </View>
        )}

        {loading && (
          <View style={IC.loadingOverlay}>
            <Text style={{ color: '#FFD700', fontSize: 12 }}>...</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const IC = StyleSheet.create({
  card: {
    borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 6,
    alignItems: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF06',
    shadowRadius: 8, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 },
  },
  equippedStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  hotBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#FF4757', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  hotTxt: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 7 },
  saleBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#00FF88', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  saleTxt: { color: '#001A00', fontFamily: 'Inter_700Bold', fontSize: 7 },
  emoji:   { fontSize: 38, marginTop: 4 },
  name:    { fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'center' },
  desc:    { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF55', textAlign: 'center' },
  ownedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2,
  },
  ownedTxt: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  priceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
  },
  priceTxt: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 11 },
  loadingOverlay: {
    position: 'absolute', inset: 0, backgroundColor: '#00000066',
    alignItems: 'center', justifyContent: 'center', borderRadius: 18,
  },
});

// ─── Shop screen ──────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { profile, purchaseSkin, equipSkin, spendCoins } = usePlayer();
  const [activeTab, setActiveTab] = useState<Tab>('skins');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 56) : insets.top;

  function xAlert(title: string, msg?: string) {
    if (Platform.OS === 'web') { window.alert(msg ? `${title}\n\n${msg}` : title); return; }
    Alert.alert(title, msg);
  }
  function xConfirm(title: string, msg: string, onYes: () => void, yesLabel = 'OK') {
    if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) onYes(); return; }
    Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yesLabel, onPress: onYes }]);
  }

  async function handleBuySkin(skinId: string, price: number, skinName: string) {
    if (profile.ownedSkins.includes(skinId)) { await equipSkin(skinId); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); return; }
    if (profile.coins < price) { xAlert('Not enough coins 🪙', `You need ${price - profile.coins} more.`); return; }
    xConfirm(`Buy ${skinName}?`, `Cost: ${price} 🪙`, async () => {
      setPurchasing(skinId);
      const ok = await purchaseSkin(skinId);
      setPurchasing(null);
      if (ok) { await equipSkin(skinId); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); xAlert('🎉 Purchased!', `${skinName} equipped!`); }
    }, 'Buy');
  }

  async function handleBuyTheme(item: typeof ARENA_THEMES[0]) {
    if (profile.ownedThemes?.includes(item.id)) return;
    if (item.price === 0) return;
    if (profile.coins < item.price) { xAlert('Not enough coins 🪙', `Need ${item.price - profile.coins} more.`); return; }
    xConfirm(`Buy ${item.name}?`, `Cost: ${item.price} 🪙`, async () => {
      await spendCoins(item.price);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      xAlert('🎉 Unlocked!', `${item.name} added to your collection!`);
    }, 'Buy');
  }

  async function handleBuyBundle(bundle: typeof BUNDLES[0]) {
    if (profile.coins < bundle.price) { xAlert('Not enough coins 🪙', `Need ${bundle.price - profile.coins} more.`); return; }
    xConfirm(`Buy ${bundle.name}?`, `Cost: ${bundle.price} 🪙`, async () => {
      await spendCoins(bundle.price);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      xAlert('🎉 Purchased!', `${bundle.name} added to your inventory!`);
    }, 'Buy');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#07051A' }}>
      <LinearGradient colors={['#0E0B22', '#07051A', '#0A0715']} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <LinearGradient colors={['#1A1530', '#0E0B22']} style={[SH2.header, { paddingTop: topPad + 6 }]}>
        <View style={SH2.headerLeft}>
          <Text style={SH2.title}>🛒 SHOP</Text>
          <Text style={SH2.sub}>Upgrade your arsenal</Text>
        </View>
        <View style={SH2.coinDisplay}>
          <Text style={{ fontSize: 22 }}>🪙</Text>
          <View>
            <Text style={SH2.coinAmt}>{profile.coins.toLocaleString()}</Text>
            <Text style={SH2.coinLbl}>COINS</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={SH2.tabRow}>
        {(['skins', 'themes', 'bundles'] as Tab[]).map(t => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[SH2.tab, activeTab === t && SH2.tabActive]}>
            <Text style={[SH2.tabTxt, activeTab === t && SH2.tabTxtActive]}>
              {t === 'skins' ? '🎨 SKINS' : t === 'themes' ? '🌌 ARENAS' : '📦 BUNDLES'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>

        {activeTab === 'skins' && (
          <>
            {/* Featured skin */}
            {(() => {
              const feat = SKINS.find(s => s.id === 'plasma') ?? SKINS[1];
              const owned = profile.ownedSkins.includes(feat.id);
              return (
                <Pressable onPress={() => handleBuySkin(feat.id, feat.price, feat.name)} style={SH2.featured}>
                  <LinearGradient colors={[feat.color + '44', feat.color + '22', '#00000000']} style={StyleSheet.absoluteFill} />
                  <View style={[SH2.featuredBanner, { backgroundColor: '#FF4757' }]}>
                    <Text style={SH2.featuredBannerTxt}>⭐ FEATURED</Text>
                  </View>
                  <Text style={{ fontSize: 52 }}>🎨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[SH2.featName, { color: feat.color }]}>{feat.name}</Text>
                    <Text style={SH2.featDesc}>Limited edition paddle skin</Text>
                  </View>
                  {owned ? (
                    <View style={[SH2.featBtn, { backgroundColor: feat.color + '33', borderColor: feat.color }]}>
                      <Text style={[SH2.featBtnTxt, { color: feat.color }]}>EQUIP ▶</Text>
                    </View>
                  ) : (
                    <View style={SH2.featPriceBtn}>
                      <Text style={{ fontSize: 14 }}>🪙</Text>
                      <Text style={SH2.featBtnTxt2}>{feat.price}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })()}

            <View style={SH2.grid}>
              {SKINS.map(skin => (
                <ItemCard
                  key={skin.id}
                  emoji="🎨" name={skin.name} desc="Paddle skin" price={skin.price}
                  color={skin.color}
                  owned={profile.ownedSkins.includes(skin.id)}
                  equipped={profile.currentSkin === skin.id}
                  loading={purchasing === skin.id}
                  onPress={() => handleBuySkin(skin.id, skin.price, skin.name)}
                />
              ))}
            </View>
          </>
        )}

        {activeTab === 'themes' && (
          <View style={SH2.grid}>
            {ARENA_THEMES.map(theme => (
              <ItemCard
                key={theme.id}
                emoji={theme.emoji} name={theme.name} desc={theme.desc} price={theme.price}
                color={theme.color}
                owned={profile.ownedThemes?.includes(theme.id)}
                equipped={profile.currentArenaTheme === theme.id}
                onPress={() => handleBuyTheme(theme)}
              />
            ))}
          </View>
        )}

        {activeTab === 'bundles' && (
          <>
            {/* Banner */}
            <LinearGradient colors={['#2A1A00', '#1A1000']} style={SH2.bundleBanner}>
              <Text style={{ fontSize: 32 }}>💰</Text>
              <View>
                <Text style={SH2.bundleBannerTitle}>POWER BUNDLES</Text>
                <Text style={SH2.bundleBannerSub}>One-time use consumables</Text>
              </View>
            </LinearGradient>
            <View style={SH2.grid}>
              {BUNDLES.map(b => (
                <ItemCard
                  key={b.id} emoji={b.emoji} name={b.name} desc={b.desc} price={b.price}
                  color={b.color} hot={b.hot}
                  onPress={() => handleBuyBundle(b)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const SH2 = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E',
  },
  headerLeft: {},
  title: { fontFamily: 'Inter_900Black', fontSize: 22, color: '#FFD700', letterSpacing: 1 },
  sub:   { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF44', marginTop: 2 },
  coinDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFD70018', borderWidth: 1.5, borderColor: '#FFD70055',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8,
  },
  coinAmt: { fontFamily: 'Inter_900Black', fontSize: 18, color: '#FFD700' },
  coinLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: '#FFD70088', letterSpacing: 1.5 },

  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FFFFFF0E',
    backgroundColor: '#0A0818',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E5A020' },
  tabTxt: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF33', letterSpacing: 0.8 },
  tabTxtActive: { color: '#E5A020' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },

  featured: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#C8820A55',
    padding: 16, overflow: 'hidden', backgroundColor: '#FFFFFF06',
  },
  featuredBanner: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  featuredBannerTxt: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 8 },
  featName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  featDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF55', marginTop: 2 },
  featBtn: {
    borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8,
  },
  featBtnTxt: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  featPriceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFD70022', borderWidth: 1.5, borderColor: '#FFD700',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  featBtnTxt2: { color: '#FFD700', fontFamily: 'Inter_900Black', fontSize: 13 },

  bundleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, borderWidth: 1, borderColor: '#C8820A33', padding: 16,
  },
  bundleBannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFD700' },
  bundleBannerSub: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#FFFFFF55', marginTop: 2 },
});
