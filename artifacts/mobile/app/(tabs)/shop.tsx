import { CURRENT_SEASON } from '@/constants/season';
import { Feather } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenTitle, Shell, paperText } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
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

const STORE_COIN_PACKS = [
  { key: 'Starter Sack',    emoji: '🪙', name: 'Starter Sack',    desc: '1,000 Coins',                   usd: '$0.99',  highlight: false },
  { key: 'Gold Pouch',      emoji: '💰', name: 'Gold Pouch',      desc: '5,000 Coins',                   usd: '$3.99',  highlight: false },
  { key: 'Treasure Chest',  emoji: '🎁', name: 'Treasure Chest',  desc: '15,000 Coins, best deal!',     usd: '$9.99',  highlight: true  },
  { key: 'Dragon Vault',    emoji: '🐉', name: 'Dragon Vault',    desc: '50,000 Coins',                  usd: '$24.99', highlight: false },
];
const STORE_SKIN_PACKS = [
  { key: 'Void Striker Pack', emoji: '🌑', name: 'Void Striker Pack', desc: 'Exclusive Void paddle skin',         usd: '$1.99' },
  { key: 'Inferno Pack',      emoji: '🔥', name: 'Inferno Pack',      desc: 'Blazing Inferno paddle skin',         usd: '$1.99' },
  { key: 'Elite Bundle',      emoji: '💎', name: 'Elite Bundle',      desc: 'Chrome + Cosmic skins (2 for 1)',     usd: '$4.99' },
];
const STORE_SEASON_PASS = {
  key: 'GoldRush Season Pass', emoji: '🌟', name: 'GoldRush Season Pass',
  desc: 'Supporter purchase. In this build it records ownership only and does not unlock Pass tiers or items.',
  usd: '$4.99',
};
const STORE_BATTLE_PASS = {
  key: 'GoldRush Battle Pass Premium', emoji: '👑', name: 'GoldRush Battle Pass Premium',
  desc: `${CURRENT_SEASON.label} only. Unlocks the premium reward track on the 50 Pass tiers; rewards are still earned by reaching each tier.`,
  usd: '$4.99',
};





export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, applyStorePurchases } = usePlayer();
  const revenueCat = useRevenueCat();
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'extras' | 'store'>('skins');
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
      .catch(() => {
        setStoreError('Could not load store. Check your connection.');
        setStoreLoading(false);
      });
  }, [activeTab, catalogAttempt]);

  function nativePrice(productName: string, _webFallback: string) {
    if (Platform.OS === 'web') return webPrices[productName] ?? 'Unavailable';
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
      <LinearGradient colors={['#EEE9DE', '#EEE9DE', '#EEE9DE']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#EDBA3C20', '#EDBA3C08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#EEE9DE88']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <ScreenTitle kicker="GoldRush Arena" title="Shop" style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.coinDisplay, { backgroundColor: tactile.brass, borderColor: tactile.brassEdge, borderWidth: 2, borderRadius: 0 }]}>
            <Feather name="circle" size={14} color={paperText.ink} />
            <Text style={[styles.coinAmount, { color: paperText.ink }]} accessibilityLabel={`${profile.coins} device coins`}>{profile.coins} device</Text>
          </View>
          <Pressable
            onPress={() => setRedeemVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Redeem a code"
            style={({ pressed }) => [styles.redeemCodeBtn, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }]}
          >
            <Feather name="gift" size={13} color="#252A2B" />
            <Text style={styles.redeemCodeTxt}>REDEEM</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View accessibilityRole="tablist" style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'extras', 'store'] as const).map(t => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: activeTab === t }} aria-selected={activeTab === t} accessibilityLabel={t === 'themes' ? 'Court themes and hit effects' : t.charAt(0).toUpperCase() + t.slice(1)} onPress={() => setActiveTab(t)} style={({ pressed }) => [styles.tab, activeTab === t && styles.tabOn, pressed && { transform: [{ translateY: 2 }] }]}>
            {activeTab === t ? (
              <Text style={[styles.tabText, { color: paperText.ink }]}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E3DFD3', borderRadius: 3, borderWidth: 1, borderColor: '#575D5C', padding: 12, marginBottom: 4 }}>
                <Glyph style={{ fontSize: 20 }} value="❤️" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#252A2B' }}>
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
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>EXTRA LIVES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
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
                  backgroundColor: colors.card, borderColor: '#575D5C', borderBottomWidth: pressed ? 2 : 5, transform: [{ translateY: pressed ? 3 : 0 }],
                }]}
              >
                <LinearGradient colors={['#F36B3F12', '#E3DFD308']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#F36B3F18', borderColor: '#575D5C' }]}>
                  <Glyph style={{ fontSize: 22 }} value={item.emoji} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <ShimmerCard active={!checkingOut} borderRadius={3} shimmerColor="rgba(255,255,255,0.1)">
                  <View style={[storeStyles.usdBtn, { backgroundColor: '#F36B3F', borderColor: '#252A2B' }]}>
                    <Text style={[storeStyles.usdBtnText, { color: '#252A2B' }]}>
                      {checkingOut === item.storeKey ? '…' : nativePrice(item.storeKey, item.usd)}
                    </Text>
                  </View>
                </ShimmerCard>
              </Pressable>
            ))}

            {/* Coin Packs, redirect to STORE tab */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>COIN PACKS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#575D5C44' }} />
            </View>
            <Pressable
              onPress={() => setActiveTab('store')}
              style={({ pressed }) => [styles.bundleCard, {
                backgroundColor: '#E3DFD3', borderColor: '#575D5C', opacity: pressed ? 0.8 : 1,
              }]}
            >
              <LinearGradient colors={['#EDBA3C18', '#EDBA3C06']} style={StyleSheet.absoluteFill} />
              <View style={[styles.bundleIcon, { backgroundColor: '#EDBA3C22', borderColor: '#EDBA3C66' }]}>
                <Glyph style={{ fontSize: 22 }} value="🪙" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: '#252A2B' }]}>Coin Packs</Text>
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>From $0.99, up to 50,000 coins</Text>
              </View>
              <View style={[styles.buyBtn, { backgroundColor: '#F36B3F', borderColor: '#252A2B' }]}>
                <Text style={[styles.buyBtnText, { color: '#252A2B' }]}>STORE →</Text>
              </View>
            </Pressable>
          </>
        )}

        {activeTab === 'store' && (
          <>
            {/* Header banner */}
            <View style={[storeStyles.banner, { borderColor: '#EDBA3C', backgroundColor: '#E3DFD3' }]}>
              <LinearGradient colors={['#EDBA3C18', '#E3DFD308']} style={StyleSheet.absoluteFill} />
              <Glyph style={{ fontSize: 28 }} value="🏆" />
              <View style={{ flex: 1 }}>
                <Text style={storeStyles.bannerTitle}>GOLDRUSH STORE</Text>
                <Text style={[storeStyles.bannerSub, { color: colors.mutedForeground }]}>
                  {Platform.OS === 'web' ? 'Stripe checkout · redeem your purchase code in-game' : 'App-store purchases through RevenueCat · localized prices'}
                </Text>
              </View>
            </View>

            {catalogLoading && (
              <View accessibilityLabel="Loading store products" accessibilityState={{ busy: true }} style={{ gap: 12, paddingVertical: 20 }}>
                {[0, 1, 2, 3].map(i => <View key={i} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minHeight: 76, padding: 16, gap: 12 }}>
                  <View style={{ backgroundColor: colors.muted, width: '55%', height: 14 }} />
                  <View style={{ backgroundColor: colors.muted, width: '80%', height: 10 }} />
                </View>)}
                <Text style={{ color: colors.foreground, fontFamily: 'SourceSans3_400Regular', fontSize: 14 }}>Loading store…</Text>
              </View>
            )}
            {catalogError && !catalogLoading && (
              <View style={[storeStyles.errorBox, { borderColor: '#F36B3F', backgroundColor: '#E3DFD3' }]}>
                <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_400Regular', fontSize: 13, textAlign: 'center' }}>{catalogError}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Retry loading store" onPress={() => {
                  if (Platform.OS !== 'web') { void revenueCat.retry(); return; }
                  priceCache.current = {};
                  setCatalogAttempt(n => n + 1);
                }}>
                  <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold', fontSize: 12, marginTop: 8 }}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!catalogLoading && !catalogError && (
              <>
                {/* Battle Pass Premium */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>BATTLE PASS</Text>
                </View>
                <HolographicShimmer borderRadius={3}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_BATTLE_PASS.key)}
                    disabled={checkingOut === STORE_BATTLE_PASS.key || !!profile.battlePassPremiumOwned}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#575D5C', backgroundColor: '#E3DFD3' }]}
                  >
                    <LinearGradient colors={['#EDBA3C12', '#E3DFD308']} style={StyleSheet.absoluteFill} />
                    <Glyph style={{ fontSize: 32 }} value={STORE_BATTLE_PASS.emoji} />
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="medium" color='#252A2B' style={storeStyles.passName}>{STORE_BATTLE_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_BATTLE_PASS.desc}</Text>
                      {profile.battlePassPremiumOwned && (
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 1, marginTop: 4 }}>{`OWNED, ${CURRENT_SEASON.label.toUpperCase()}`}</Text>
                      )}
                    </View>
                    {!profile.battlePassPremiumOwned && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: '#F36B3F', borderColor: '#252A2B' }]}>
                        <Text style={[storeStyles.usdBtnText, { color: '#252A2B' }]}>{checkingOut === STORE_BATTLE_PASS.key ? '…' : nativePrice(STORE_BATTLE_PASS.key, STORE_BATTLE_PASS.usd)}</Text>
                      </View>
                    )}
                  </Pressable>
                </HolographicShimmer>

                {/* Season Pass */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, marginTop: 6 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>SEASON PASS</Text>
                </View>
                <ShimmerCard shimmerColor="rgba(255,215,0,0.18)" duration={1800} borderRadius={3}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Season Pass unavailable for purchase"
                    accessibilityState={{ disabled: true }}
                    disabled
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#EDBA3C', backgroundColor: '#E3DFD3' }]}
                  >
                    <LinearGradient colors={['#EDBA3C18', '#E3DFD308']} style={StyleSheet.absoluteFill} />
                    <Glyph style={{ fontSize: 32 }} value={STORE_SEASON_PASS.emoji} />
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="soft" color='#252A2B' style={storeStyles.passName}>{STORE_SEASON_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>Unavailable for purchase. This legacy product has no active gameplay benefits. Existing ownership is preserved.</Text>
                      {profile.seasonPassPurchased && (
                        <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 1, marginTop: 4 }}>OWNED (SUPPORTER)</Text>
                      )}
                    </View>
                    {!profile.seasonPassPurchased && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: '#E3DFD3', borderColor: '#575D5C', borderBottomWidth: 2 }]}>
                        <Text style={[storeStyles.usdBtnText, { color: '#575D5C' }]}>Unavailable</Text>
                      </View>
                    )}
                  </Pressable>
                </ShimmerCard>

                {/* Coin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>COIN PACKS</Text>
                </View>
                {STORE_COIN_PACKS.map(pack => {
                  const cardContent = (
                    <Pressable
                      key={pack.key}
                      onPress={() => handleBuyFromStore(pack.key)}
                      disabled={checkingOut === pack.key}
                      style={({ pressed }) => [storeStyles.storeCard, {
                        borderColor: pack.highlight ? '#252A2B' : colors.border,
                        backgroundColor: colors.card,
                        opacity: pressed ? 0.82 : 1,
                      }]}
                    >
                      {pack.highlight && <LinearGradient colors={['#EDBA3C', '#EDBA3C']} style={StyleSheet.absoluteFill} />}
                      <Glyph style={{ fontSize: 26, width: 36, textAlign: 'center' }} value={pack.emoji} />
                      <View style={{ flex: 1 }}>
                        <Text style={[storeStyles.storeName, { color: '#252A2B' }]}>{pack.name}</Text>
                        <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                      </View>
                      <View style={[storeStyles.usdBtn, pack.highlight && { backgroundColor: '#EEE9DE', borderColor: '#252A2B' }]}>
                        <Text style={[storeStyles.usdBtnText, pack.highlight && { color: '#252A2B' }]}>
                          {checkingOut === pack.key ? '…' : nativePrice(pack.key, pack.usd)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                  return pack.highlight ? (
                    <GlowBorder key={pack.key} color='#EDBA3C' borderRadius={3} spread={8}>
                      {cardContent}
                    </GlowBorder>
                  ) : cardContent;
                })}

                {/* Skin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 2, color: '#252A2B' }}>SKIN PACKS</Text>
                </View>
                {STORE_SKIN_PACKS.map(pack => (
                  <Pressable
                    key={pack.key}
                    onPress={() => handleBuyFromStore(pack.key)}
                    disabled={checkingOut === pack.key}
                    style={({ pressed }) => [storeStyles.storeCard, { borderColor: '#575D5C66', backgroundColor: colors.card, opacity: pressed ? 0.82 : 1 }]}
                  >
                    <Glyph style={{ fontSize: 26, width: 36, textAlign: 'center' }} value={pack.emoji} />
                    <View style={{ flex: 1 }}>
                      <Text style={[storeStyles.storeName, { color: colors.foreground }]}>{pack.name}</Text>
                      <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                    </View>
                    <ShimmerCard active={!checkingOut} borderRadius={3} shimmerColor="rgba(255,255,255,0.1)">
                      <View style={storeStyles.usdBtn}>
                        <Text style={storeStyles.usdBtnText}>{checkingOut === pack.key ? '…' : nativePrice(pack.key, pack.usd)}</Text>
                      </View>
                    </ShimmerCard>
                  </Pressable>
                ))}

                {/* How it works */}
                <View style={[storeStyles.howItWorks, { borderColor: '#575D5C66' }]}>
                  <Text style={[storeStyles.howTitle, { color: colors.foreground }]}>How it works</Text>
                  {Platform.OS === 'web' ? (
                    <>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and complete secure Stripe checkout</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your receipt page shows a unique code (e.g. GR-A1B2-C3D4)</Text>
                      <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>3. Return here → tap <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>REDEEM</Text> → enter your code</Text>
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
        </Shell>
      </ScrollView>

      <RedeemCodeModal visible={redeemVisible} onClose={() => setRedeemVisible(false)} />
      <Modal visible={nativeConfirmationVisible} transparent animationType="fade" onRequestClose={() => setPendingNativeProduct(null)}>
        <View style={storeStyles.confirmBackdrop}>
          <View style={[storeStyles.confirmCard, { backgroundColor: colors.card }]}>
            <Text style={[storeStyles.confirmTitle, { color: colors.foreground }]}>Test purchase</Text>
            <Text style={[storeStyles.confirmText, { color: colors.mutedForeground }]}>
              Complete a RevenueCat test purchase for {pendingNativeProduct}?
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
                <Text style={{ color: '#252A2B', fontFamily: 'SourceSans3_700Bold' }}>PURCHASE</Text>
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
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3DFD3', borderRadius: 3, borderWidth: 2, borderColor: '#252A2B', paddingHorizontal: 9, paddingVertical: 4 },
  coinAmount: { color: '#252A2B', fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 6, flexShrink: 0, minHeight: 48, borderBottomWidth: 2, paddingHorizontal: 16, paddingBottom: 12, marginBottom: 4 },
  tab: { flex: 1, minHeight: 46, minWidth: 0, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: '#575D5C', backgroundColor: '#E3DFD3' },
  tabOn: { backgroundColor: '#F36B3F', borderColor: '#252A2B' },
  tabText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, letterSpacing: 0.6 },
  sectionInfo: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18 },
  subsectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 17, letterSpacing: 1.4, marginTop: 14, marginBottom: 4, color: '#252A2B', textTransform: 'uppercase' },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: { borderRadius: 0, borderWidth: 2, borderBottomWidth: 5, overflow: 'hidden' },
  skinPreview: { height: 88, alignItems: 'center', justifyContent: 'center' },
  paddlePreview: { width: 72, height: 13, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  ownedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 0, paddingHorizontal: 5, paddingVertical: 2 },
  ownedText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  equippedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 0, paddingHorizontal: 6, paddingVertical: 2 },
  equippedText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, color: '#252A2B', letterSpacing: 0.5 },
  skinInfo: { padding: 10, gap: 3 },
  skinName: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: '#252A2B', fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  ownedLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 12 },
  trailDot: { width: 26, height: 26, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  itemName: { fontFamily: 'SourceSans3_700Bold', fontSize: 15 },
  itemDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 1 },
  bundleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 2, borderBottomWidth: 5, padding: 14, gap: 12, overflow: 'hidden' },
  bundleIcon: { width: 48, height: 48, borderRadius: 0, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, paddingHorizontal: 10, paddingVertical: 6, minHeight: 44 },
  buyBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13 },
  iapBtn: { borderRadius: 0, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 7 },
  iapText: { fontFamily: 'SourceSans3_700Bold', fontSize: 12 },
  earnCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 10 },
  earnTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  earnDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2 },
  themePreview: { width: 64, height: 64, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  themeArena: { width: 50, height: 50, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  themePaddle: { width: 30, height: 5, borderRadius: 3, opacity: 0.9 },
  redeemCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E3DFD3', borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, minHeight: 44, borderColor: '#252A2B', paddingHorizontal: 10, paddingVertical: 6 },
  redeemCodeTxt: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: '#252A2B' },
});

const storeStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, padding: 14, overflow: 'hidden' },
  bannerTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, letterSpacing: 2, color: '#252A2B' },
  bannerSub: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 16, marginTop: 2 },
  errorBox: { alignItems: 'center', borderRadius: 0, borderWidth: 2, padding: 16 },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 0, borderWidth: 2, borderBottomWidth: 6, padding: 18, overflow: 'hidden' },
  passName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: '#252A2B', letterSpacing: 0.5, textTransform: 'uppercase' },
  passDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  storeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, padding: 14, gap: 10, overflow: 'hidden' },
  storeName: { fontFamily: 'SourceSans3_700Bold', fontSize: 14 },
  storeDesc: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, marginTop: 1 },
  usdBtn: { backgroundColor: '#F36B3F', borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, borderColor: '#252A2B', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 7 },
  usdBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: '#252A2B' },
  howItWorks: { backgroundColor: '#E3DFD3', borderRadius: 0, borderWidth: 2, padding: 14, gap: 6 },
  howTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, marginBottom: 4 },
  howStep: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, lineHeight: 18 },
  restoreBtn: { alignSelf: 'flex-start', marginTop: 6, borderRadius: 0, borderWidth: 2, borderColor: '#252A2B', backgroundColor: '#E3DFD3', paddingHorizontal: 12, paddingVertical: 8 },
  restoreText: { color: '#252A2B', fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1 },
  confirmBackdrop: { flex: 1, backgroundColor: '#252A2BCC', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 360, borderRadius: 0, borderWidth: 2, borderBottomWidth: 6, borderColor: '#252A2B', padding: 20 },
  confirmTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, letterSpacing: 0.5, textTransform: 'uppercase' },
  confirmText: { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  confirmCancel: { borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, borderColor: '#575D5C', paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  confirmBuy: { borderRadius: 0, borderWidth: 2, borderBottomWidth: 4, borderColor: '#252A2B', backgroundColor: '#F36B3F', paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
});
