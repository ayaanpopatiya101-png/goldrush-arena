import { CURRENT_SEASON } from '@/constants/season';
import { Feather } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { tactile, palette } from '@/constants/colors';
import { ShopCatalogPanel } from '@/components/cosmetics/ShopCatalog';
import { useBlockingOverlay } from '@/context/OverlayQueue';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { usePlayer } from '@/context/PlayerContext';
import { RedeemCodeModal } from '@/components/RedeemCodeModal';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_GOLD, GlowText, HolographicShimmer, ShimmerCard, PulseRing, GlowBorder } from '@/components/effects';
import { trackEvent } from '@/utils/analytics';
import { useRevenueCat } from '@/lib/revenuecat';
import { apiUrl } from '@/utils/api';
import { withTimeout } from '@/utils/withTimeout';
import { Glyph } from '@/components/ui/Glyph';
import { useLocalSearchParams } from 'expo-router';
import { LimitedOffers, identifyNativeCustomer } from '@/components/store/LimitedOffers';
import { SKINS } from '@/context/PlayerContext';

import { fonts } from '@/constants/typography';
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

const DURABLE_SUFFIXES = ['inferno_pack', 'void_striker_pack', 'elite_bundle', 'battle_pass_premium_s1', 'season_pass'];

const STORE_COIN_PACKS = [
  { key: 'Starter Sack',    emoji: '🪙', name: 'Starter Sack',    desc: '1,000 device coins',  highlight: false },
  { key: 'Gold Pouch',      emoji: '💰', name: 'Gold Pouch',      desc: '5,000 device coins',  highlight: false },
  { key: 'Treasure Chest',  emoji: '🎁', name: 'Treasure Chest',  desc: '15,000 device coins', highlight: false },
  { key: 'Dragon Vault',    emoji: '🐉', name: 'Dragon Vault',    desc: '50,000 device coins', highlight: false },
];
const STORE_SKIN_PACKS = [
  { key: 'Void Striker Pack', emoji: '🌑', name: 'Void Striker Pack', desc: 'Void paddle skin',            skins: ['void'] },
  { key: 'Inferno Pack',      emoji: '🔥', name: 'Inferno Pack',      desc: 'Inferno paddle skin',         skins: ['inferno'] },
  { key: 'Elite Bundle',      emoji: '💎', name: 'Elite Bundle',      desc: 'Chrome and Cosmic paddle skins', skins: ['chrome', 'cosmic'] },
];
const STORE_SEASON_PASS = {
  key: 'GoldRush Season Pass', emoji: '🌟', name: 'GoldRush Season Pass',
  desc: 'Supporter purchase. In this build it records ownership only and does not unlock Pass tiers or items.',
};
const STORE_BATTLE_PASS = {
  key: 'GoldRush Battle Pass Premium', emoji: '👑', name: 'GoldRush Battle Pass Premium',
  desc: `${CURRENT_SEASON.label} only. Unlocks the premium reward track on the 50 Pass tiers; rewards are still earned by reaching each tier.`,
};





export default function ShopScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, applyStorePurchases, replayPendingStorePurchases, currentUsername } = usePlayer();
  const buyLock = useRef(false);
  const revenueCat = useRevenueCat();
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'extras' | 'store'>('skins');
  useEffect(() => {
    if (section === 'store') setActiveTab('store');
  }, [section]);
  const [redeemVisible, setRedeemVisible] = useState(false);
  const focusStyle = useFocusAnimation();

  // Store: product price ID cache (keyed by product name)
  const priceCache = useRef<Record<string, string>>({});
  const [webPrices, setWebPrices] = useState<Record<string, string>>({});
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [pendingNativeProduct, setPendingNativeProduct] = useState<string | null>(null);
  const nativeConfirmationVisible = useBlockingOverlay(Boolean(pendingNativeProduct));
  const catalogLoading = Platform.OS === 'web' ? storeLoading : revenueCat.isLoading;
  const catalogError = Platform.OS === 'web'
    ? storeError
    : !revenueCat.available ? 'Native purchases are not configured for this build. Gameplay remains available.'
      : revenueCat.error ? 'Could not load App Store products. Try again shortly.' : null;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (activeTab !== 'store' && activeTab !== 'extras') return;
    if (Object.keys(priceCache.current).length > 0) return;
    setStoreLoading(true);
    setStoreError(null);
    withTimeout(Promise.resolve().then(() => fetch(apiUrl('/store/products'))))
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Could not load store.');
        return data;
      })
      .then((data: any) => {
        const cache: Record<string, string> = {};
        const display: Record<string, string> = {};
        for (const p of (data.data ?? [])) {
          const price = p.prices?.[0];
          if (price?.id && typeof price.unit_amount === 'number' && price.currency) {
            cache[p.name] = price.id;
            display[p.name] = new Intl.NumberFormat(undefined, {
              style: 'currency', currency: price.currency,
            }).format(price.unit_amount / (['jpy', 'krw', 'vnd', 'clp', 'xaf', 'xof', 'xpf', 'djf', 'gnf', 'bif', 'kmf', 'mga', 'pyg', 'rwf', 'ugx', 'vuv'].includes(price.currency.toLowerCase()) ? 1 : 100));
          }
        }
        if (Object.keys(cache).length === 0) throw new Error('No store products are available.');
        priceCache.current = cache;
        setWebPrices(display);
        setStoreLoading(false);
      })
      .catch((error: unknown) => {
        setStoreError(error instanceof Error ? error.message : 'Could not load the Stripe store. No purchase can start; try again later.');
        setStoreLoading(false);
      });
  }, [activeTab, catalogAttempt]);

  function nativePrice(productName: string) {
    if (Platform.OS === 'web') return webPrices[productName] ?? 'Unavailable';
    return revenueCat.getPackage(NATIVE_PACKAGE_IDS[productName])?.product.priceString ?? 'Unavailable';
  }
  function productReady(productName: string) {
    if (Platform.OS === 'web') return !!webPrices[productName] && !!priceCache.current[productName];
    return revenueCat.available && !revenueCat.error && !!revenueCat.getPackage(NATIVE_PACKAGE_IDS[productName]);
  }
  /** One lock for every purchase button; also blocks when the provider has no product. */
  function buyDisabled(productName: string) {
    return !!checkingOut || revenueCat.isRestoring || !productReady(productName);
  }

  async function completeNativePurchase(productName: string) {
    if (productName === STORE_BATTLE_PASS.key && profile.battlePassPremiumOwned) return;
    const pkg = revenueCat.getPackage(NATIVE_PACKAGE_IDS[productName]);
    if (!pkg) {
      xAlert('Store unavailable', 'This item is not available from your app store yet.');
      return;
    }
    if (checkingOut || buyLock.current) return;
    buyLock.current = true;
    setCheckingOut(productName);
    trackEvent('store_checkout_started', { product: productName, provider: 'revenuecat' });
    try {
      await identifyNativeCustomer(revenueCat, currentUsername);
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
      buyLock.current = false;
      setCheckingOut(null);
    }
  }

  async function handleBuyFromStore(productName: string) {
    if (checkingOut || !productReady(productName)) return;
    const skinPack = STORE_SKIN_PACKS.find(p => p.key === productName);
    if (skinPack && skinPack.skins.every(id => profile.ownedSkins.includes(id))) return;
    if (productName === STORE_BATTLE_PASS.key && profile.battlePassPremiumOwned) return;
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
    if (buyLock.current) return;
    buyLock.current = true;
    setCheckingOut(productName);
    trackEvent('store_checkout_started', { product: productName });
    try {
      const resp = await fetch(apiUrl('/store/checkout'), {
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
      buyLock.current = false;
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

  return (
    <Reanimated.View style={[styles.root, { backgroundColor: colors.background }, focusStyle]}>
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.7} />
      <LinearGradient colors={[palette.background, palette.background, palette.background]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <ScreenTitle kicker="GoldRush Arena" title="Shop" style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.coinDisplay, { backgroundColor: tactile.brass, borderColor: palette.edge, borderWidth: 2, borderRadius: 10 }]}>
            <Feather name="circle" size={14} color={palette.onAccent} />
            <Text style={[styles.coinAmount, { color: palette.onAccent }]} accessibilityLabel={`${profile.coins} device coins`}>{profile.coins} device</Text>
          </View>
          <Pressable
            onPress={() => setRedeemVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Redeem a code"
            style={({ pressed }) => [styles.redeemCodeBtn, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}
          >
            <Feather name="gift" size={13} color={palette.foreground} />
            <Text style={styles.redeemCodeTxt}>REDEEM</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View accessibilityRole="tablist" style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'extras', 'store'] as const).map(t => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: activeTab === t }} aria-selected={activeTab === t} accessibilityLabel={t === 'themes' ? 'Court themes and hit effects' : t.charAt(0).toUpperCase() + t.slice(1)} onPress={() => setActiveTab(t)} style={({ pressed }) => [styles.tab, activeTab === t && styles.tabOn, pressed && { transform: [{ translateY: 2 }] }]}>
            {activeTab === t ? (
              <Text style={[styles.tabText, { color: palette.onAccent }]}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'COURT & HITS' : t === 'store' ? 'STORE' : 'EXTRAS'}
              </Text>
            ) : (
              <Text style={[styles.tabText, { color: colors.mutedForeground }]}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'COURT & HITS' : t === 'store' ? 'STORE' : 'EXTRAS'}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14, paddingBottom: insets.bottom + 80 }}>
        <Shell style={{ gap: 10 }}>
        {activeTab === 'skins' && <ShopCatalogPanel section="skins" />}
        {activeTab === 'themes' && <ShopCatalogPanel section="court" />}

        {activeTab === 'extras' && (
          <>
            {/* Inventory badge */}
            {(profile.extraLivesInventory ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.surface, borderRadius: 8, borderWidth: 1, borderColor: palette.border, padding: 12, marginBottom: 4 }}>
                <Glyph style={{ fontSize: 20 }} value="❤️" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.foreground }}>
                    {profile.extraLivesInventory} Extra {(profile.extraLivesInventory ?? 0) === 1 ? 'Life' : 'Lives'} Ready
                  </Text>
                  <Text style={{ fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                    You start your next {(profile.extraLivesInventory ?? 0) === 1 ? 'match' : `${profile.extraLivesInventory} matches`} with 1 bonus life.
                  </Text>
                </View>
              </View>
            )}

            {/* Extra Lives, real Stripe checkout */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>EXTRA LIVES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
            </View>

            {[
              { storeKey: '1 Extra Life',  emoji: '❤️',  name: '1 Extra Life',  desc: 'Start your next match with 1 bonus life' },
              { storeKey: '3 Extra Lives', emoji: '💖',  name: '3 Extra Lives', desc: 'Start your next 3 matches each with 1 bonus life' },
            ].map(item => (
              <Pressable
                key={item.storeKey}
                onPress={() => handleBuyFromStore(item.storeKey)}
                disabled={buyDisabled(item.storeKey)}
                style={({ pressed }) => [styles.bundleCard, {
                  backgroundColor: colors.card, borderColor: palette.border, borderBottomWidth: pressed ? 2 : 5, transform: [{ translateY: pressed ? 3 : 0 }],
                }]}
              >
                <LinearGradient colors={[palette.inset, palette.inset]} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: palette.primary + '18', borderColor: palette.border }]}>
                  <Glyph style={{ fontSize: 22 }} value={item.emoji} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <ShimmerCard active={!checkingOut} borderRadius={3} shimmerColor="rgba(255,255,255,0.1)">
                  <View style={[storeStyles.usdBtn, { backgroundColor: palette.primary, borderColor: palette.edge }]}>
                    <Text style={[storeStyles.usdBtnText, { color: palette.onAccent }]}>
                      {checkingOut === item.storeKey ? '…' : nativePrice(item.storeKey)}
                    </Text>
                  </View>
                </ShimmerCard>
              </Pressable>
            ))}

            {/* Coin Packs, redirect to STORE tab */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>COIN PACKS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
            </View>
            <Pressable
              onPress={() => setActiveTab('store')}
              style={({ pressed }) => [styles.bundleCard, {
                backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.8 : 1,
              }]}
            >
              <LinearGradient colors={[palette.inset, palette.inset]} style={StyleSheet.absoluteFill} />
              <View style={[styles.bundleIcon, { backgroundColor: palette.gold + '22', borderColor: palette.gold + '66' }]}>
                <Glyph style={{ fontSize: 22 }} value="🪙" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: palette.foreground }]}>Coin Packs</Text>
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>Up to 50,000 device coins, priced by your store</Text>
              </View>
              <View style={[styles.buyBtn, { backgroundColor: palette.primary, borderColor: palette.edge }]}>
                <Text style={[styles.buyBtnText, { color: palette.onAccent }]}>STORE →</Text>
              </View>
            </Pressable>
          </>
        )}

        {activeTab === 'store' && (
          <>
            {/* Header banner */}
            <View style={[storeStyles.banner, { borderColor: palette.gold, backgroundColor: palette.surface }]}>
              <LinearGradient colors={[palette.inset, palette.inset]} style={StyleSheet.absoluteFill} />
              <Glyph style={{ fontSize: 28 }} value="🏆" />
              <View style={{ flex: 1 }}>
                <Text style={storeStyles.bannerTitle}>GOLDRUSH STORE</Text>
                <Text style={[storeStyles.bannerSub, { color: colors.mutedForeground }]}>
                  {Platform.OS === 'web' ? 'Stripe checkout · redeem your purchase code in-game' : 'App-store purchases through RevenueCat · localized prices'}
                </Text>
              </View>
            </View>

            <View style={storeStyles.boundary}>
              <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>Coins, skins and lives are saved on this device for your current player, including guest players. Device coins are separate from any verified online balance, and clearing app data or switching devices can lose items that are not store-verified. Limited offers contain cosmetics only; extra lives are a gameplay item.</Text>
            </View>
            <LimitedOffers busyKey={checkingOut} setBusyKey={setCheckingOut} />

            {catalogLoading && (
              <View accessibilityLabel="Loading store products" accessibilityState={{ busy: true }} style={{ gap: 12, paddingVertical: 20 }}>
                {[0, 1, 2, 3].map(i => <View key={i} style={{ backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, minHeight: 76, padding: 16, gap: 12 }}>
                  <View style={{ backgroundColor: colors.muted, width: '55%', height: 14 }} />
                  <View style={{ backgroundColor: colors.muted, width: '80%', height: 10 }} />
                </View>)}
                <Text style={{ color: colors.foreground, fontFamily: 'SourceSans3_400Regular', fontSize: 14 }}>Loading store…</Text>
              </View>
            )}
            {catalogError && !catalogLoading && (
              <View style={[storeStyles.errorBox, { borderColor: palette.primary, backgroundColor: palette.surface }]}>
                <Text style={{ color: palette.foreground, fontFamily: 'SourceSans3_400Regular', fontSize: 13, textAlign: 'center' }}>{catalogError}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Retry loading store" onPress={() => {
                  if (Platform.OS !== 'web') { void revenueCat.retry(); return; }
                  priceCache.current = {};
                  setCatalogAttempt(n => n + 1);
                }}>
                  <Text style={{ color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 12, marginTop: 8 }}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!catalogLoading && !catalogError && (
              <>
                {/* Battle Pass Premium */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>BATTLE PASS</Text>
                </View>
                <HolographicShimmer borderRadius={3}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_BATTLE_PASS.key)}
                    disabled={buyDisabled(STORE_BATTLE_PASS.key) || !!profile.battlePassPremiumOwned}
                    accessibilityRole="button"
                    accessibilityLabel={profile.battlePassPremiumOwned ? 'Battle Pass Plus owned' : `Battle Pass Plus, ${nativePrice(STORE_BATTLE_PASS.key)}`}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: palette.border, backgroundColor: palette.surface }]}
                  >
                    <LinearGradient colors={[palette.inset, palette.inset]} style={StyleSheet.absoluteFill} />
                    <Glyph style={{ fontSize: 32 }} value={STORE_BATTLE_PASS.emoji} />
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="medium" color={palette.foreground} style={storeStyles.passName}>{STORE_BATTLE_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_BATTLE_PASS.desc}</Text>
                      {profile.battlePassPremiumOwned && (
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 1, marginTop: 4 }}>{`OWNED, ${CURRENT_SEASON.label.toUpperCase()}`}</Text>
                      )}
                    </View>
                    {!profile.battlePassPremiumOwned && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: palette.primary, borderColor: palette.edge }]}>
                        <Text style={[storeStyles.usdBtnText, { color: palette.onAccent }]}>{checkingOut === STORE_BATTLE_PASS.key ? '…' : nativePrice(STORE_BATTLE_PASS.key)}</Text>
                      </View>
                    )}
                  </Pressable>
                </HolographicShimmer>

                {/* Season Pass */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, marginTop: 6 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>SEASON PASS</Text>
                </View>
                <ShimmerCard shimmerColor="rgba(255,215,0,0.18)" duration={1800} borderRadius={3}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Season Pass unavailable for purchase"
                    accessibilityState={{ disabled: true }}
                    disabled
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: palette.gold, backgroundColor: palette.surface }]}
                  >
                    <LinearGradient colors={[palette.inset, palette.inset]} style={StyleSheet.absoluteFill} />
                    <Glyph style={{ fontSize: 32 }} value={STORE_SEASON_PASS.emoji} />
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="soft" color={palette.foreground} style={storeStyles.passName}>{STORE_SEASON_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>Unavailable for purchase. This legacy product has no active gameplay benefits. Existing ownership is preserved.</Text>
                      {profile.seasonPassPurchased && (
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 1, marginTop: 4 }}>OWNED (SUPPORTER)</Text>
                      )}
                    </View>
                    {!profile.seasonPassPurchased && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: palette.surface, borderColor: palette.border, borderBottomWidth: 2 }]}>
                        <Text style={[storeStyles.usdBtnText, { color: palette.supporting }]}>Unavailable</Text>
                      </View>
                    )}
                  </Pressable>
                </ShimmerCard>

                {/* Coin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>COIN PACKS</Text>
                </View>
                {STORE_COIN_PACKS.map(pack => {
                  const cardContent = (
                    <Pressable
                      key={pack.key}
                      onPress={() => handleBuyFromStore(pack.key)}
                      disabled={buyDisabled(pack.key)}
                      style={({ pressed }) => [storeStyles.storeCard, {
                        borderColor: pack.highlight ? palette.primary : colors.border,
                        backgroundColor: colors.card,
                        opacity: pressed ? 0.82 : 1,
                      }]}
                    >
                      {pack.highlight && <LinearGradient colors={[palette.gold, palette.gold]} style={StyleSheet.absoluteFill} />}
                      <Glyph style={{ fontSize: 26, width: 36, textAlign: 'center' }} value={pack.emoji} />
                      <View style={{ flex: 1 }}>
                        <Text style={[storeStyles.storeName, { color: palette.foreground }]}>{pack.name}</Text>
                        <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                      </View>
                      <View style={[storeStyles.usdBtn, pack.highlight && { backgroundColor: palette.background, borderColor: palette.edge }]}>
                        <Text style={[storeStyles.usdBtnText, pack.highlight && { color: palette.foreground }]}>
                          {checkingOut === pack.key ? '…' : nativePrice(pack.key)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                  return pack.highlight ? (
                    <GlowBorder key={pack.key} color={palette.gold} borderRadius={3} spread={8}>
                      {cardContent}
                    </GlowBorder>
                  ) : cardContent;
                })}

                {/* Skin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: palette.foreground }}>SKIN PACKS</Text>
                </View>
                {STORE_SKIN_PACKS.map(pack => {
                  const allOwned = pack.skins.every(id => profile.ownedSkins.includes(id));
                  const off = allOwned || buyDisabled(pack.key);
                  return (
                    <Pressable
                      key={pack.key}
                      onPress={() => handleBuyFromStore(pack.key)}
                      disabled={off}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: off }}
                      accessibilityLabel={allOwned ? `${pack.name}, all skins owned` : `${pack.name}, ${nativePrice(pack.key)}`}
                      style={({ pressed }) => [storeStyles.storeCard, { borderColor: palette.border, backgroundColor: colors.card, opacity: pressed ? 0.82 : 1 }]}
                    >
                      <View style={{ gap: 4 }}>
                        {pack.skins.map(id => (
                          <View key={id} style={storeStyles.packCourt}>
                            <View style={[storeStyles.packPaddle, { backgroundColor: SKINS.find(k => k.id === id)?.color ?? palette.muted }]} />
                          </View>
                        ))}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[storeStyles.storeName, { color: colors.foreground }]}>{pack.name}</Text>
                        <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                        <Text style={[storeStyles.storeDesc, { color: palette.supporting }]}>
                          {pack.skins.map(id => `${SKINS.find(k => k.id === id)?.name ?? id}${profile.ownedSkins.includes(id) ? ' (owned)' : ''}`).join(' / ')}
                        </Text>
                      </View>
                      <View style={[storeStyles.usdBtn, off && { backgroundColor: palette.raised, borderColor: palette.border }]}>
                        <Text style={[storeStyles.usdBtnText, off && { color: palette.muted }]}>{allOwned ? 'OWNED' : checkingOut === pack.key ? '...' : nativePrice(pack.key)}</Text>
                      </View>
                    </Pressable>
                  );
                })}

                {/* How it works */}
                <View style={[storeStyles.howItWorks, { borderColor: palette.border }]}>
                  <Text style={[storeStyles.howTitle, { color: colors.foreground }]}>How it works</Text>
                  {Platform.OS === 'web' ? (
                    <>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and complete secure Stripe checkout</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your receipt page shows a unique code (e.g. GR-A1B2-C3D4)</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>3. Return here → tap <Text style={{ color: palette.foreground, fontFamily: 'SourceSans3_700Bold' }}>REDEEM</Text> → enter your code</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>4. Your reward is added instantly!</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and confirm with the App Store or Google Play</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your reward is added automatically after payment</Text>
                      <Pressable
                        disabled={revenueCat.isRestoring || !!checkingOut || !revenueCat.available}
                        style={storeStyles.restoreBtn}
                        onPress={async () => {
                          if (checkingOut || buyLock.current) return;
                          buyLock.current = true;
                          setCheckingOut('restore');
                          try {
                            await replayPendingStorePurchases();
                            await identifyNativeCustomer(revenueCat, currentUsername);
                            const info = await revenueCat.restore();
                            const durable = info.nonSubscriptionTransactions
                              .filter(t => !!t.transactionIdentifier && DURABLE_SUFFIXES.some(sfx => t.productIdentifier.endsWith(sfx)))
                              .map(t => ({ productIdentifier: t.productIdentifier, transactionIdentifier: t.transactionIdentifier }));
                            if (durable.length === 0) {
                              xAlert('Nothing to restore', 'No restorable skin pack or pass receipts were found for this store account. Coins and extra lives are consumables and are not restored.');
                              return;
                            }
                            const restored = await applyStorePurchases(durable);
                            xAlert('Restore checked', restored.message);
                          } catch (error: any) {
                            xAlert('Restore failed', error?.message ?? 'Could not restore purchases.');
                          } finally {
                            buyLock.current = false;
                            setCheckingOut(null);
                          }
                        }}
                      >
                        <Text style={storeStyles.restoreText}>{revenueCat.isRestoring ? 'RESTORING…' : 'RESTORE PURCHASES'}</Text>
                      </Pressable>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>Restore first retries any receipts saved on this device, then links your store account to this player and re-verifies skin pack and pass receipts with the server. Coins and extra lives are consumables and are not restored. If a receipt is still pending, tap Restore again later to retry verification.</Text>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        )}
        </Shell>
      </ScrollView>

      <RedeemCodeModal visible={redeemVisible} onClose={() => setRedeemVisible(false)} />
      <Modal visible={nativeConfirmationVisible} transparent animationType="fade" onRequestClose={() => setPendingNativeProduct(null)}>
        <View style={storeStyles.confirmBackdrop}>
          <View style={[storeStyles.confirmCard, { backgroundColor: colors.card }]}>
            <Text style={[storeStyles.confirmTitle, { color: colors.foreground }]}>Confirm store purchase</Text>
            <Text style={[storeStyles.confirmText, { color: colors.mutedForeground }]}>
              Open your app store for {pendingNativeProduct}? Development mode does not guarantee a sandbox purchase. Check the store sheet for the actual price and test environment.
            </Text>
            <View style={storeStyles.confirmActions}>
              <Pressable style={storeStyles.confirmCancel} onPress={() => setPendingNativeProduct(null)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'SourceSans3_700Bold' }}>CANCEL</Text>
              </Pressable>
              <Pressable style={storeStyles.confirmBuy} onPress={() => {
                const product = pendingNativeProduct;
                setPendingNativeProduct(null);
                if (product) void completeNativePurchase(product);
              }}>
                <Text style={{ color: palette.foreground, fontFamily: 'SourceSans3_700Bold' }}>PURCHASE</Text>
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
  headerTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 2 },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.surface, borderRadius: 8, borderWidth: 2, borderColor: palette.edge, paddingHorizontal: 9, paddingVertical: 4 },
  coinAmount: { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 6, flexShrink: 0, minHeight: 48, borderBottomWidth: 2, paddingHorizontal: 16, paddingBottom: 12, marginBottom: 4 },
  tab: { flex: 1, minHeight: 46, minWidth: 0, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.surface },
  tabOn: { backgroundColor: palette.primary, borderColor: palette.edge },
  tabText: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.6 },
  sectionInfo: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18 },
  subsectionTitle: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 1.4, marginTop: 14, marginBottom: 4, color: palette.foreground, textTransform: 'uppercase' },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, overflow: 'hidden' },
  skinPreview: { height: 88, alignItems: 'center', justifyContent: 'center' },
  paddlePreview: { width: 72, height: 13, borderRadius: 8, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  ownedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  ownedText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  equippedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  equippedText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: palette.foreground, letterSpacing: 0.5 },
  skinInfo: { padding: 10, gap: 3 },
  skinName: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  ownedLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 12 },
  trailDot: { width: 26, height: 26, borderRadius: 8, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  itemName: { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  itemDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 1 },
  bundleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, padding: 14, gap: 12, overflow: 'hidden' },
  bundleIcon: { width: 48, height: 48, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, paddingHorizontal: 10, paddingVertical: 6, minHeight: 44 },
  buyBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  iapBtn: { borderRadius: 10, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 7 },
  iapText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12 },
  earnCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 10 },
  earnTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  earnDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2 },
  themePreview: { width: 64, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  themeArena: { width: 50, height: 50, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  themePaddle: { width: 30, height: 5, borderRadius: 8, opacity: 0.9 },
  redeemCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, minHeight: 44, borderColor: palette.edge, paddingHorizontal: 10, paddingVertical: 6 },
  redeemCodeTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: palette.foreground },
});

const storeStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, padding: 14, overflow: 'hidden' },
  bannerTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, letterSpacing: 2, color: palette.foreground },
  bannerSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 16, marginTop: 2 },
  errorBox: { alignItems: 'center', borderRadius: 10, borderWidth: 2, padding: 16 },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 2, borderBottomWidth: 6, padding: 18, overflow: 'hidden' },
  passName: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, letterSpacing: 0.5, textTransform: 'uppercase' },
  passDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  storeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 10, overflow: 'hidden' },
  storeName: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  storeDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 1 },
  usdBtn: { backgroundColor: palette.primary, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 7 },
  usdBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.onAccent },
  howItWorks: { backgroundColor: palette.surface, borderRadius: 10, borderWidth: 2, padding: 14, gap: 6 },
  howTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, marginBottom: 4 },
  howStep: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18 },
  boundary: { backgroundColor: palette.inset, borderRadius: 10, borderWidth: 1, borderColor: palette.border, padding: 12 },
  packCourt: { width: 40, height: 18, borderRadius: 5, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.inset, alignItems: 'center', justifyContent: 'center' },
  packPaddle: { width: 26, height: 6, borderRadius: 3 },
  restoreBtn: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 8 },
  restoreText: { color: palette.foreground, fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },
  confirmBackdrop: { flex: 1, backgroundColor: palette.deepest + 'CC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 360, borderRadius: 10, borderWidth: 2, borderBottomWidth: 6, borderColor: palette.edge, padding: 20 },
  confirmTitle: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5, textTransform: 'uppercase' },
  confirmText: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  confirmCancel: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  confirmBuy: { borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.primary, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
});
