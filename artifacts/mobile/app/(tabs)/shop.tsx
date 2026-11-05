import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/FlatSurface';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated, { ZoomIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { SKINS, getRankIndex, usePlayer } from '@/context/PlayerContext';
import { RedeemCodeModal } from '@/components/RedeemCodeModal';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_GOLD, GlowText, HolographicShimmer, ShimmerCard, PulseRing, GlowBorder } from '@/components/effects';
import { trackEvent } from '@/utils/analytics';
import { useRevenueCat } from '@/lib/revenuecat';
import { apiUrl } from '@/utils/api';
import { LoadingRows } from '@/components/ui/LoadingCourt';

const NATIVE_PACKAGE_IDS: Record<string, string> = {
  'Starter Sack': 'starter_sack',
  'Gold Pouch': 'gold_pouch',
  'Treasure Chest': 'treasure_chest',
  'Dragon Vault': 'dragon_vault',
  'GoldRush Season Pass': 'season_pass',
  'Inferno Pack': 'inferno_pack',
  'Void Striker Pack': 'void_striker_pack',
  'Elite Bundle': 'elite_bundle',
  '1 Extra Life': 'extra_life_1',
  '3 Extra Lives': 'extra_lives_3',
  'GoldRush Battle Pass Premium': 'battle_pass_premium_s1',
};

const API_BASE = apiUrl('');

const STORE_COIN_PACKS = [
  { key: 'Starter Sack',    emoji: '🪙', name: 'Starter Sack',    desc: '1,000 Coins',                   usd: '$0.99',  highlight: false },
  { key: 'Gold Pouch',      emoji: '💰', name: 'Gold Pouch',      desc: '5,000 Coins',                   usd: '$3.99',  highlight: false },
  { key: 'Treasure Chest',  emoji: '🎁', name: 'Treasure Chest',  desc: '15,000 Coins — best deal!',     usd: '$9.99',  highlight: true  },
  { key: 'Dragon Vault',    emoji: '🐉', name: 'Dragon Vault',    desc: '50,000 Coins',                  usd: '$24.99', highlight: false },
];
const STORE_SKIN_PACKS = [
  { key: 'Void Striker Pack', emoji: '🌑', name: 'Void Striker Pack', desc: 'Exclusive Void paddle skin',         usd: '$1.99' },
  { key: 'Inferno Pack',      emoji: '🔥', name: 'Inferno Pack',      desc: 'Blazing Inferno paddle skin',         usd: '$1.99' },
  { key: 'Elite Bundle',      emoji: '💎', name: 'Elite Bundle',      desc: 'Chrome + Cosmic skins (2 for 1)',     usd: '$4.99' },
];
const STORE_SEASON_PASS = {
  key: 'GoldRush Season Pass', emoji: '🌟', name: 'GoldRush Season Pass',
  desc: 'Instantly unlock all Season Pass tiers — exclusive skins, coins & more',
  usd: '$4.99',
};
const STORE_BATTLE_PASS = {
  key: 'GoldRush Battle Pass Premium', emoji: '👑', name: 'GoldRush Battle Pass Premium',
  desc: 'Season 1 — 2× rewards on all 50 tiers · 2 exclusive skins · 5× Ultra Drop at Tier 50',
  usd: '$4.99',
};

const POWERUP_BUNDLES = [
  { id: 'shield3', name: 'Shield Pack', desc: '3x Shield Power-ups', icon: 'shield', price: 80, color: '#D0AF66' },
  { id: 'speed3', name: 'Speed Pack', desc: '3x Speed Boosts', icon: 'zap', price: 80, color: '#98A581' },
  { id: 'mixed5', name: 'Mixed Bundle', desc: '5x Random Power-ups', icon: 'gift', price: 100, color: '#A6AEA7' },
];

const EXTRA_LIVES = [
  { id: 'life1', name: '1 Extra Life', desc: 'Start with 4 lives', icon: 'heart', price: 60, color: '#BB7865' },
  { id: 'life2', name: '2 Extra Lives', desc: 'Start with 5 lives', icon: 'heart', price: 100, color: '#BB7865' },
];

const BALL_TRAILS = [
  { id: 'trail_fire', name: 'Fire Trail', desc: 'Balls leave fire trails', price: 200, color: '#BB7865' },
  { id: 'trail_ice',  name: 'Ice Trail',  desc: 'Balls leave ice trails', price: 200, color: '#A6AEA7' },
  { id: 'trail_neon', name: 'Neon Trail', desc: 'Rainbow neon trails',   price: 300, color: '#A6AEA7' },
];

const ARENA_THEMES = [
  { id: 'default',   name: 'Dark Void',       desc: 'Classic deep-space arena',     price: 0,   color: '#A6AEA7', preview: ['#191B19','#A6AEA7'] },
  { id: 'solar',     name: 'Solar Flare',      desc: 'Scorching red-orange arena',   price: 300, color: '#BB7865', preview: ['#191B19','#BB7865'] },
  { id: 'arctic',    name: 'Arctic Ice',       desc: 'Cool blue frost arena',        price: 300, color: '#A6AEA7', preview: ['#191B19','#A6AEA7'] },
  { id: 'toxic',     name: 'Toxic Wasteland',  desc: 'Neon green hazard zone',       price: 350, color: '#98A581', preview: ['#191B19','#222520'] },
  { id: 'cosmic',    name: 'Cosmic Dream',     desc: 'Purple nebula atmosphere',     price: 400, color: '#A6AEA7', preview: ['#222520','#A6AEA7'] },
  { id: 'golden',    name: 'Gold Rush',        desc: 'Prestige golden arena',        price: 500, color: '#D0AF66', preview: ['#191B19','#222520'] },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, purchaseSkin, equipSkin, spendCoins, applyStorePurchases } = usePlayer();
  const revenueCat = useRevenueCat();
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'powerups' | 'extras' | 'forge' | 'store'>('skins');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [redeemVisible, setRedeemVisible] = useState(false);
  const focusStyle = useFocusAnimation();

  // Store: product price ID cache (keyed by product name)
  const priceCache = useRef<Record<string, string>>({});
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [pendingNativeProduct, setPendingNativeProduct] = useState<string | null>(null);
  const catalogLoading = Platform.OS === 'web' ? storeLoading : revenueCat.isLoading;
  const catalogError = Platform.OS === 'web'
    ? storeError
    : revenueCat.error ? 'Could not load App Store products. Try again shortly.' : null;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (activeTab !== 'store' && activeTab !== 'extras') return;
    if (Object.keys(priceCache.current).length > 0) return;
    setStoreLoading(true);
    setStoreError(null);
    fetch(`${API_BASE}/store/products`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Could not load store.');
        return data;
      })
      .then((data: any) => {
        const cache: Record<string, string> = {};
        for (const p of (data.data ?? [])) {
          const firstPrice = p.prices?.[0]?.id;
          if (firstPrice) cache[p.name] = firstPrice;
        }
        if (Object.keys(cache).length === 0) throw new Error('No store products are available.');
        priceCache.current = cache;
        setStoreLoading(false);
      })
      .catch(() => {
        setStoreError('Could not load store. Check your connection.');
        setStoreLoading(false);
      });
  }, [activeTab]);

  function nativePrice(productName: string, webFallback: string) {
    if (Platform.OS === 'web') return webFallback;
    return revenueCat.getPackage(NATIVE_PACKAGE_IDS[productName])?.product.priceString ?? 'Unavailable';
  }

  async function completeNativePurchase(productName: string) {
    const pkg = revenueCat.getPackage(NATIVE_PACKAGE_IDS[productName]);
    if (!pkg) {
      xAlert('Store unavailable', 'This item is not available from your app store yet.');
      return;
    }
    setCheckingOut(productName);
    trackEvent('store_checkout_started', { product: productName, provider: 'revenuecat' });
    try {
      const result = await revenueCat.purchase(pkg);
      const transactionIdentifier = result.transaction.transactionIdentifier;
      if (!transactionIdentifier) throw new Error('The app store did not return a transaction receipt.');
      const fulfilled = await applyStorePurchases([{
        productIdentifier: result.productIdentifier,
        transactionIdentifier,
      }]);
      trackEvent('store_purchase_completed', { product: productName, provider: 'revenuecat' });
      xAlert('Purchase complete', fulfilled.message);
    } catch (error: any) {
      if (!error?.userCancelled) xAlert('Purchase failed', error?.message ?? 'Could not complete this purchase.');
    } finally {
      setCheckingOut(null);
    }
  }

  async function handleBuyFromStore(productName: string) {
    if (Platform.OS !== 'web') {
      if (__DEV__) {
        setPendingNativeProduct(productName);
      } else {
        await completeNativePurchase(productName);
      }
      return;
    }
    const priceId = priceCache.current[productName];
    if (!priceId) {
      xAlert('Store unavailable', 'Could not find product. Try again in a moment.');
      return;
    }
    setCheckingOut(productName);
    trackEvent('store_checkout_started', { product: productName });
    try {
      const resp = await fetch(`${API_BASE}/store/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await resp.json() as any;
      if (!resp.ok || !data.url) throw new Error(data.error ?? 'Checkout error');
      trackEvent('store_checkout_opened', { product: productName });
      await Linking.openURL(data.url);
    } catch (err: any) {
      trackEvent('store_checkout_failed', { product: productName });
      xAlert('Checkout failed', err.message ?? 'Could not open checkout.');
    } finally {
      setCheckingOut(null);
    }
  }

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  // Cross-platform helpers (Alert callbacks don't fire on Expo Web)
  function xAlert(title: string, msg?: string) {
    if (Platform.OS === 'web') { window.alert(msg ? `${title}\n\n${msg}` : title); return; }
    Alert.alert(title, msg);
  }
  function xConfirm(title: string, msg: string, onYes: () => void, yesLabel = 'OK') {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}`)) onYes();
      return;
    }
    Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yesLabel, onPress: onYes }]);
  }

  async function handleBuySkin(skinId: string, price: number, skinName: string) {
    if (profile.ownedSkins.includes(skinId)) {
      await equipSkin(skinId);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (profile.coins < price) {
      xAlert('Not enough coins', `You need ${price - profile.coins} more coins.`);
      return;
    }
    xConfirm(`Buy ${skinName}?`, `Cost: ${price} coins`, async () => {
      setPurchasing(skinId);
      const ok = await purchaseSkin(skinId);
      setPurchasing(null);
      if (ok) {
        await equipSkin(skinId);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        xAlert('Purchased!', `${skinName} equipped.`);
      }
    }, 'Buy');
  }

  async function handleBuyBundle(item: { id: string; name: string; price: number }) {
    if (profile.coins < item.price) {
      xAlert('Not enough coins', `You need ${item.price - profile.coins} more coins.`);
      return;
    }
    xConfirm(`Buy ${item.name}?`, `Cost: ${item.price} coins`, async () => {
      const ok = await spendCoins(item.price);
      if (ok) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        xAlert('Purchased!', `${item.name} added to your inventory!`);
      }
    }, 'Buy');
  }

  function handleExtraLife(item: { id: string; name: string; price: number }) {
    xAlert(item.name, `In-app purchases coming soon!`);
  }

  return (
    <Reanimated.View style={[styles.root, { backgroundColor: colors.background }, focusStyle]}>
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.7} />
      <LinearGradient colors={['#191B19', '#191B19', '#191B19']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#BB786524', '#BB78650E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#191B1988']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={{ fontFamily: 'System', fontSize: 10, letterSpacing: 2.5, color: '#EEE7D844', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <GlowText intensity="medium" color='#BB7865' pulse style={[styles.headerTitle, { color: colors.foreground }]}>SHOP</GlowText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={styles.coinDisplay}>
            <Feather name="circle" size={14} color="#D0AF66" />
            <Text style={styles.coinAmount}>{profile.coins}</Text>
          </View>
          {Platform.OS === 'web' && (
            <Pressable
              onPress={() => setRedeemVisible(true)}
              style={({ pressed }) => [styles.redeemCodeBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="gift" size={13} color="#BB7865" />
              <Text style={styles.redeemCodeTxt}>REDEEM</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'powerups', 'extras', 'store'] as const).map(t => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: t === 'store' ? '#D0AF66' : colors.primary }]}>
            {activeTab === t ? (
              <GlowText intensity="soft" color='#BB7865' style={styles.tabText}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'THEMES' : t === 'powerups' ? 'POWER-UPS' : t === 'store' ? '💳 STORE' : 'EXTRAS'}
              </GlowText>
            ) : (
              <Text style={[styles.tabText, { color: colors.mutedForeground }]}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'THEMES' : t === 'powerups' ? 'POWER-UPS' : t === 'store' ? '💳 STORE' : 'EXTRAS'}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 80, gap: 10 }}>
        {activeTab === 'skins' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#BB7865' }}>PADDLE SKINS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
              <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>TAP TO EQUIP</Text>
            </View>
            <View style={styles.skinGrid}>
              {SKINS.map((skin, idx) => {
                const owned = profile.ownedSkins.includes(skin.id);
                const equipped = profile.currentSkin === skin.id;
                return (
                  <Reanimated.View
                    key={skin.id}
                    entering={ZoomIn.delay(idx * 45).duration(300)}
                    style={[styles.skinCard, {
                      backgroundColor: equipped ? skin.color + '22' : colors.card,
                      borderColor: equipped ? skin.color : owned ? skin.color + '55' : colors.border,
                    }]}
                  >
                  <Pressable
                    onPress={() => handleBuySkin(skin.id, skin.price, skin.name)}
                    disabled={purchasing === skin.id}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, width: '100%' }]}
                  >
                    <LinearGradient colors={[skin.color + '33', skin.color + '11']} style={styles.skinPreview}>
                      <View style={[styles.paddlePreview, { backgroundColor: skin.color, shadowColor: skin.glowColor }]} />
                      {owned && !equipped && (
                        <View style={[styles.ownedBadge, { backgroundColor: skin.color + '44' }]}>
                          <Text style={[styles.ownedText, { color: skin.color }]}>OWNED</Text>
                        </View>
                      )}
                      {equipped && (
                        <View style={[styles.equippedBadge, { backgroundColor: skin.color }]}>
                          <Text style={styles.equippedText}>ON</Text>
                        </View>
                      )}
                    </LinearGradient>
                    <View style={styles.skinInfo}>
                      <Text style={[styles.skinName, { color: equipped ? skin.color : colors.foreground }]}>{skin.name}</Text>
                      {!owned ? (
                        <View style={styles.priceRow}>
                          <Feather name="circle" size={10} color="#D0AF66" />
                          <Text style={styles.priceText}>{skin.price}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.ownedLabel, { color: skin.color }]}>
                          {equipped ? '● EQUIPPED' : 'TAP TO EQUIP'}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                  </Reanimated.View>
                );
              })}
            </View>

            {/* Ball Trails */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
              <Text style={[styles.subsectionTitle, { color: colors.foreground, marginBottom: 0 }]}>BALL TRAILS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
              <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>COMING SOON</Text>
            </View>
            {BALL_TRAILS.map(trail => (
              <Pressable
                key={trail.id}
                onPress={() => Alert.alert('Coming Soon', 'Ball trails are coming in a future update!')}
                style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}
              >
                <View style={[styles.trailDot, { backgroundColor: trail.color, shadowColor: trail.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{trail.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{trail.desc}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Feather name="circle" size={12} color="#D0AF66" />
                  <Text style={styles.priceText}>{trail.price}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {activeTab === 'themes' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#A6AEA7' }}>ARENA THEMES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
              <Text style={{ fontFamily: 'System', fontSize: 9, color: '#EEE7D833', letterSpacing: 1 }}>VISUAL ONLY</Text>
            </View>
            {ARENA_THEMES.map((theme, idx) => {
              const owned = (profile.ownedThemes ?? ['default']).includes(theme.id);
              const equipped = (profile.currentArenaTheme ?? 'default') === theme.id;
              return (
                <Reanimated.View key={theme.id} entering={FadeInRight.delay(idx * 60).duration(300)}>
                <Pressable
                  onPress={async () => {
                    if (equipped) return;
                    if (owned) {
                      xAlert('Theme Equipped', `${theme.name} is now your arena theme!`);
                      return;
                    }
                    if (profile.coins < theme.price) {
                      xAlert('Not enough coins', `You need ${theme.price - profile.coins} more coins.`);
                      return;
                    }
                    xConfirm(`Buy ${theme.name}?`, `Cost: ${theme.price} coins`, async () => {
                      const ok = await spendCoins(theme.price);
                      if (ok) {
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        xAlert('Purchased!', `${theme.name} is now your arena theme!`);
                      }
                    }, 'Buy');
                  }}
                  style={({ pressed }) => [styles.bundleCard, {
                    backgroundColor: equipped ? theme.color + '22' : colors.card,
                    borderColor: equipped ? theme.color : owned ? theme.color + '55' : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <LinearGradient colors={theme.preview as [string,string]} style={styles.themePreview}>
                    <View style={[styles.themeArena, { borderColor: theme.color + '66' }]}>
                      <View style={[styles.themePaddle, { backgroundColor: theme.color }]} />
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: equipped ? theme.color : colors.foreground }]}>{theme.name}</Text>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{theme.desc}</Text>
                    {equipped && <Text style={[styles.ownedLabel, { color: theme.color }]}>● EQUIPPED</Text>}
                    {owned && !equipped && <Text style={[styles.ownedLabel, { color: theme.color + '88' }]}>OWNED — TAP TO EQUIP</Text>}
                  </View>
                  {!owned && theme.price > 0 && (
                    <View style={[styles.buyBtn, { backgroundColor: theme.color + '22', borderColor: theme.color + '55' }]}>
                      <Feather name="circle" size={10} color="#D0AF66" />
                      <Text style={[styles.buyBtnText, { color: theme.color }]}>{theme.price}</Text>
                    </View>
                  )}
                  {!owned && theme.price === 0 && (
                    <View style={[styles.buyBtn, { backgroundColor: '#EEE7D811', borderColor: '#EEE7D822' }]}>
                      <Text style={[styles.buyBtnText, { color: '#EEE7D855' }]}>FREE</Text>
                    </View>
                  )}
                </Pressable>
                </Reanimated.View>
              );
            })}
          </>
        )}

        {activeTab === 'powerups' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#98A581' }}>POWER-UP BUNDLES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
            </View>
            {POWERUP_BUNDLES.map(bundle => (
              <Pressable
                key={bundle.id}
                onPress={() => handleBuyBundle(bundle)}
                style={({ pressed }) => [styles.bundleCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient colors={[bundle.color + '22', bundle.color + '08']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: bundle.color + '22', borderColor: bundle.color + '44' }]}>
                  <Feather name={bundle.icon as never} size={22} color={bundle.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{bundle.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{bundle.desc}</Text>
                </View>
                <View style={[styles.buyBtn, { backgroundColor: bundle.color + '22', borderColor: bundle.color + '55' }]}>
                  <Feather name="circle" size={10} color="#D0AF66" />
                  <Text style={[styles.buyBtnText, { color: bundle.color }]}>{bundle.price}</Text>
                </View>
              </Pressable>
            ))}

            {/* Earn coins section */}
            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: '#D0AF6633' }]}>
              <Feather name="star" size={18} color="#D0AF66" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.earnTitle, { color: colors.foreground }]}>Earn Coins</Text>
                <Text style={[styles.earnDesc, { color: colors.mutedForeground }]}>
                  Win matches to earn coins. Victories pay 60 coins, losses pay 15 coins.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'extras' && (
          <>
            {/* Inventory badge */}
            {(profile.extraLivesInventory ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#BB786514', borderRadius: 2, borderWidth: 1, borderColor: '#BB786533', padding: 12, marginBottom: 4 }}>
                <Text style={{ fontSize: 20 }}>❤️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 13, color: '#BB7865' }}>
                    {profile.extraLivesInventory} Extra {(profile.extraLivesInventory ?? 0) === 1 ? 'Life' : 'Lives'} Ready
                  </Text>
                  <Text style={{ fontFamily: 'System', fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                    You start your next {(profile.extraLivesInventory ?? 0) === 1 ? 'match' : `${profile.extraLivesInventory} matches`} with 1 bonus life.
                  </Text>
                </View>
              </View>
            )}

            {/* Extra Lives — native store on mobile, web checkout in browsers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#BB7865' }}>EXTRA LIVES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
            </View>

            {[
              { storeKey: '1 Extra Life',  emoji: '❤️',  name: '1 Extra Life',  desc: 'Start your next match with 1 bonus life',          usd: '$1.99' },
              { storeKey: '3 Extra Lives', emoji: '💖',  name: '3 Extra Lives', desc: 'Start your next 3 matches each with 1 bonus life',   usd: '$2.99' },
            ].map(item => (
              <Pressable
                key={item.storeKey}
                onPress={() => handleBuyFromStore(item.storeKey)}
                disabled={checkingOut === item.storeKey}
                style={({ pressed }) => [styles.bundleCard, {
                  backgroundColor: colors.card, borderColor: '#BB786533', opacity: pressed ? 0.8 : 1,
                }]}
              >
                <LinearGradient colors={['#BB786518', '#BB786508']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#BB786518', borderColor: '#BB786533' }]}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <ShimmerCard active={!checkingOut} borderRadius={8} shimmerColor="rgba(255,255,255,0.1)">
                  <View style={[storeStyles.usdBtn, { backgroundColor: '#BB786522', borderColor: '#BB786566' }]}>
                    <Text style={[storeStyles.usdBtnText, { color: '#BB7865' }]}>
                      {checkingOut === item.storeKey ? '…' : nativePrice(item.storeKey, item.usd)}
                    </Text>
                  </View>
                </ShimmerCard>
              </Pressable>
            ))}

            {/* Coin Packs — redirect to STORE tab */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#D0AF66' }}>COIN PACKS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#EEE7D80E' }} />
            </View>
            <Pressable
              onPress={() => setActiveTab('store')}
              style={({ pressed }) => [styles.bundleCard, {
                backgroundColor: '#BB786514', borderColor: '#BB786544', opacity: pressed ? 0.8 : 1,
              }]}
            >
              <LinearGradient colors={['#BB786518', '#BB786506']} style={StyleSheet.absoluteFill} />
              <View style={[styles.bundleIcon, { backgroundColor: '#BB786522', borderColor: '#BB786544' }]}>
                <Text style={{ fontSize: 22 }}>🪙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: '#BB7865' }]}>Coin Packs</Text>
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>From $0.99 — up to 50,000 coins</Text>
              </View>
              <View style={[styles.buyBtn, { backgroundColor: '#BB786522', borderColor: '#BB786566' }]}>
                <Text style={[styles.buyBtnText, { color: '#D0AF66' }]}>STORE →</Text>
              </View>
            </Pressable>
          </>
        )}

        {activeTab === 'store' && (
          <>
            {/* Header banner */}
            <View style={[storeStyles.banner, { borderColor: '#BB786544' }]}>
              <LinearGradient colors={['#BB786522', '#BB786508']} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 28 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={storeStyles.bannerTitle}>GOLDRUSH STORE</Text>
                <Text style={[storeStyles.bannerSub, { color: colors.mutedForeground }]}>
                  {Platform.OS === 'web'
                    ? 'Secure web checkout • Get a code to redeem in-game'
                    : 'Secure purchases handled by your app store'}
                </Text>
              </View>
            </View>

            {catalogLoading && (
              <LoadingRows label="Loading store…" />
            )}
            {catalogError && !catalogLoading && (
              <View style={[storeStyles.errorBox, { borderColor: '#BB786533' }]}>
                <Text style={{ color: '#BB7865', fontFamily: 'System', fontSize: 13, textAlign: 'center' }}>{catalogError}</Text>
                <Pressable onPress={() => { priceCache.current = {}; setActiveTab('skins'); setTimeout(() => setActiveTab('store'), 50); }}>
                  <Text style={{ color: '#D0AF66', fontFamily: 'System', fontSize: 12, marginTop: 8 }}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!catalogLoading && !catalogError && (
              <>
                {/* Battle Pass Premium */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#A6AEA7' }}>BATTLE PASS</Text>
                </View>
                <HolographicShimmer borderRadius={16}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_BATTLE_PASS.key)}
                    disabled={checkingOut === STORE_BATTLE_PASS.key || !!profile.battlePassPremiumOwned}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#A6AEA766' }]}
                  >
                    <LinearGradient colors={['#A6AEA722', '#A6AEA711']} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 32 }}>{STORE_BATTLE_PASS.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="medium" color='#A6AEA7' style={storeStyles.passName}>{STORE_BATTLE_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_BATTLE_PASS.desc}</Text>
                      {profile.battlePassPremiumOwned && (
                        <Text style={{ fontFamily: 'System', fontSize: 10, color: '#A6AEA7', letterSpacing: 1, marginTop: 4 }}>✓ OWNED — SEASON 1</Text>
                      )}
                    </View>
                    {!profile.battlePassPremiumOwned && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: '#A6AEA7', borderColor: '#A6AEA7' }]}>
                        <Text style={[storeStyles.usdBtnText, { color: '#EEE7D8' }]}>{checkingOut === STORE_BATTLE_PASS.key ? '…' : nativePrice(STORE_BATTLE_PASS.key, STORE_BATTLE_PASS.usd)}</Text>
                      </View>
                    )}
                  </Pressable>
                </HolographicShimmer>

                {/* Season Pass */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, marginTop: 6 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#D0AF66' }}>SEASON PASS</Text>
                </View>
                <ShimmerCard shimmerColor="rgba(255,215,0,0.18)" duration={1800} borderRadius={14}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_SEASON_PASS.key)}
                    disabled={checkingOut === STORE_SEASON_PASS.key || !!profile.seasonPassPurchased}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#D0AF6666' }]}
                  >
                    <LinearGradient colors={['#D0AF6622', '#BB786511']} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 32 }}>{STORE_SEASON_PASS.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="soft" color='#BB7865' style={storeStyles.passName}>{STORE_SEASON_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_SEASON_PASS.desc}</Text>
                      {profile.seasonPassPurchased && (
                        <Text style={{ fontFamily: 'System', fontSize: 10, color: '#D0AF66', letterSpacing: 1, marginTop: 4 }}>✓ OWNED</Text>
                      )}
                    </View>
                    {!profile.seasonPassPurchased && (
                      <View style={storeStyles.usdBtn}>
                        <Text style={storeStyles.usdBtnText}>{checkingOut === STORE_SEASON_PASS.key ? '…' : nativePrice(STORE_SEASON_PASS.key, STORE_SEASON_PASS.usd)}</Text>
                      </View>
                    )}
                  </Pressable>
                </ShimmerCard>

                {/* Coin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#BB7865' }}>COIN PACKS</Text>
                </View>
                {STORE_COIN_PACKS.map(pack => {
                  const cardContent = (
                    <Pressable
                      key={pack.key}
                      onPress={() => handleBuyFromStore(pack.key)}
                      disabled={checkingOut === pack.key}
                      style={({ pressed }) => [storeStyles.storeCard, {
                        borderColor: pack.highlight ? '#BB786588' : '#EEE7D818',
                        backgroundColor: pack.highlight ? '#BB786514' : colors.card,
                        opacity: pressed ? 0.82 : 1,
                      }]}
                    >
                      {pack.highlight && <LinearGradient colors={['#BB786518', '#BB786506']} style={StyleSheet.absoluteFill} />}
                      <Text style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{pack.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[storeStyles.storeName, { color: pack.highlight ? '#BB7865' : colors.foreground }]}>{pack.name}</Text>
                        <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                      </View>
                      <View style={[storeStyles.usdBtn, pack.highlight && { backgroundColor: '#BB786533', borderColor: '#BB786588' }]}>
                        <Text style={[storeStyles.usdBtnText, pack.highlight && { color: '#D0AF66' }]}>
                          {checkingOut === pack.key ? '…' : nativePrice(pack.key, pack.usd)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                  return pack.highlight ? (
                    <GlowBorder key={pack.key} color='#D0AF66' borderRadius={12} spread={8}>
                      {cardContent}
                    </GlowBorder>
                  ) : cardContent;
                })}

                {/* Skin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 12, letterSpacing: 2, color: '#A6AEA7' }}>SKIN PACKS</Text>
                </View>
                {STORE_SKIN_PACKS.map(pack => (
                  <Pressable
                    key={pack.key}
                    onPress={() => handleBuyFromStore(pack.key)}
                    disabled={checkingOut === pack.key}
                    style={({ pressed }) => [storeStyles.storeCard, { borderColor: '#A6AEA722', opacity: pressed ? 0.82 : 1 }]}
                  >
                    <Text style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{pack.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[storeStyles.storeName, { color: colors.foreground }]}>{pack.name}</Text>
                      <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                    </View>
                    <ShimmerCard active={!checkingOut} borderRadius={8} shimmerColor="rgba(255,255,255,0.1)">
                      <View style={storeStyles.usdBtn}>
                        <Text style={storeStyles.usdBtnText}>{checkingOut === pack.key ? '…' : nativePrice(pack.key, pack.usd)}</Text>
                      </View>
                    </ShimmerCard>
                  </Pressable>
                ))}

                {/* How it works */}
                <View style={[storeStyles.howItWorks, { borderColor: '#EEE7D812' }]}>
                  <Text style={[storeStyles.howTitle, { color: colors.foreground }]}>How it works</Text>
                  {Platform.OS === 'web' ? (
                    <>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and complete secure Stripe checkout</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your receipt page shows a unique code (e.g. GR-A1B2-C3D4)</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>3. Return here → tap <Text style={{ color: '#BB7865', fontFamily: 'System' }}>REDEEM</Text> → enter your code</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>4. Your reward is added instantly!</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and confirm with the App Store or Google Play</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your reward is added automatically after payment</Text>
                      <Pressable
                        disabled={revenueCat.isRestoring}
                        style={storeStyles.restoreBtn}
                        onPress={async () => {
                          try {
                            const info = await revenueCat.restore();
                            const durablePurchases = Object.values(info.entitlements.active).map((entitlement: any) => ({
                              productIdentifier: entitlement.productIdentifier,
                              transactionIdentifier: `RESTORE:${entitlement.productIdentifier}`,
                            }));
                            const restored = await applyStorePurchases(durablePurchases);
                            xAlert('Restore complete', restored.message);
                          } catch (error: any) {
                            xAlert('Restore failed', error?.message ?? 'Could not restore purchases.');
                          }
                        }}
                      >
                        <Text style={storeStyles.restoreText}>{revenueCat.isRestoring ? 'RESTORING…' : 'RESTORE PURCHASES'}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <RedeemCodeModal visible={redeemVisible} onClose={() => setRedeemVisible(false)} />
      <Modal visible={Boolean(pendingNativeProduct)} transparent animationType="fade" onRequestClose={() => setPendingNativeProduct(null)}>
        <View style={storeStyles.confirmBackdrop}>
          <View style={[storeStyles.confirmCard, { backgroundColor: colors.card }]}>
            <Text style={[storeStyles.confirmTitle, { color: colors.foreground }]}>Test purchase</Text>
            <Text style={[storeStyles.confirmText, { color: colors.mutedForeground }]}>
              Complete a RevenueCat test purchase for {pendingNativeProduct}?
            </Text>
            <View style={storeStyles.confirmActions}>
              <Pressable style={storeStyles.confirmCancel} onPress={() => setPendingNativeProduct(null)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'System' }}>CANCEL</Text>
              </Pressable>
              <Pressable style={storeStyles.confirmBuy} onPress={() => {
                const product = pendingNativeProduct;
                setPendingNativeProduct(null);
                if (product) void completeNativePurchase(product);
              }}>
                <Text style={{ color: '#191B19', fontFamily: 'System' }}>PURCHASE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: 'System', fontSize: 20, letterSpacing: 2 },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#BB78651A', borderRadius: 2, borderWidth: 1, borderColor: '#BB786544', paddingHorizontal: 9, paddingVertical: 4 },
  coinAmount: { color: '#BB7865', fontFamily: 'System', fontSize: 13 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'System', fontSize: 10, letterSpacing: 1 },
  sectionInfo: { fontFamily: 'System', fontSize: 12, lineHeight: 18 },
  subsectionTitle: { fontFamily: 'System', fontSize: 12, letterSpacing: 1.8, marginTop: 8, marginBottom: 2, color: '#EEE7D899', borderLeftWidth: 2, borderLeftColor: '#BB7865', paddingLeft: 8 },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: { width: '47%', flex: 1, minWidth: 140, borderRadius: 2, borderWidth: 1.5, overflow: 'hidden' },
  skinPreview: { height: 88, alignItems: 'center', justifyContent: 'center' },
  paddlePreview: { width: 72, height: 13, borderRadius: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  ownedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2 },
  ownedText: { fontFamily: 'System', fontSize: 8, letterSpacing: 0.5 },
  equippedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  equippedText: { fontFamily: 'System', fontSize: 8, color: '#191B19', letterSpacing: 0.5 },
  skinInfo: { padding: 10, gap: 3 },
  skinName: { fontFamily: 'System', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: '#BB7865', fontFamily: 'System', fontSize: 13 },
  ownedLabel: { fontFamily: 'System', fontSize: 9, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 2, borderWidth: 1, padding: 14, gap: 12 },
  trailDot: { width: 26, height: 26, borderRadius: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  itemName: { fontFamily: 'System', fontSize: 15 },
  itemDesc: { fontFamily: 'System', fontSize: 12, marginTop: 1 },
  bundleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 2, borderWidth: 1, padding: 14, gap: 12, overflow: 'hidden' },
  bundleIcon: { width: 44, height: 44, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 2, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  buyBtnText: { fontFamily: 'System', fontSize: 13 },
  iapBtn: { borderRadius: 2, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  iapText: { fontFamily: 'System', fontSize: 12 },
  earnCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 2, borderWidth: 1, padding: 14, gap: 10 },
  earnTitle: { fontFamily: 'System', fontSize: 14 },
  earnDesc: { fontFamily: 'System', fontSize: 12, lineHeight: 18, marginTop: 2 },
  themePreview: { width: 64, height: 64, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  themeArena: { width: 50, height: 50, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  themePaddle: { width: 30, height: 5, borderRadius: 2, opacity: 0.9 },
  redeemCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#BB786518', borderRadius: 2, borderWidth: 1, borderColor: '#BB786555', paddingHorizontal: 10, paddingVertical: 6 },
  redeemCodeTxt: { fontFamily: 'System', fontSize: 11, letterSpacing: 1.5, color: '#BB7865' },
});

const storeStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 2, borderWidth: 1, padding: 14, overflow: 'hidden' },
  bannerTitle: { fontFamily: 'System', fontSize: 14, letterSpacing: 2, color: '#D0AF66' },
  bannerSub: { fontFamily: 'System', fontSize: 11, lineHeight: 16, marginTop: 2 },
  errorBox: { alignItems: 'center', borderRadius: 2, borderWidth: 1, padding: 16 },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 2, borderWidth: 1.5, padding: 16, overflow: 'hidden' },
  passName: { fontFamily: 'System', fontSize: 15, color: '#D0AF66', letterSpacing: 0.5 },
  passDesc: { fontFamily: 'System', fontSize: 12, lineHeight: 17, marginTop: 2 },
  storeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 2, borderWidth: 1, padding: 14, gap: 10, overflow: 'hidden' },
  storeName: { fontFamily: 'System', fontSize: 14 },
  storeDesc: { fontFamily: 'System', fontSize: 12, marginTop: 1 },
  usdBtn: { backgroundColor: '#EEE7D80F', borderRadius: 2, borderWidth: 1, borderColor: '#EEE7D822', paddingHorizontal: 12, paddingVertical: 7 },
  usdBtnText: { fontFamily: 'System', fontSize: 13, color: '#EEE7D8' },
  howItWorks: { backgroundColor: '#EEE7D808', borderRadius: 2, borderWidth: 1, padding: 14, gap: 6 },
  howTitle: { fontFamily: 'System', fontSize: 13, marginBottom: 4 },
  howStep: { fontFamily: 'System', fontSize: 12, lineHeight: 18 },
  restoreBtn: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 2, borderWidth: 1, borderColor: '#BB786588', backgroundColor: '#BB786518', paddingHorizontal: 12, paddingVertical: 8 },
  restoreText: { color: '#D0AF66', fontFamily: 'System', fontSize: 11, letterSpacing: 1 },
  confirmBackdrop: { flex: 1, backgroundColor: '#191B19AA', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 360, borderRadius: 2, borderWidth: 1, borderColor: '#BB786566', padding: 20 },
  confirmTitle: { fontFamily: 'System', fontSize: 18, letterSpacing: 1 },
  confirmText: { fontFamily: 'System', fontSize: 14, lineHeight: 21, marginTop: 8 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  confirmCancel: { borderRadius: 2, borderWidth: 1, borderColor: '#EEE7D822', paddingHorizontal: 14, paddingVertical: 10 },
  confirmBuy: { borderRadius: 2, backgroundColor: '#D0AF66', paddingHorizontal: 14, paddingVertical: 10 },
});
