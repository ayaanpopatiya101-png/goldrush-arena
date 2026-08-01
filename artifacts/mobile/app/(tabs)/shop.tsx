import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { ZoomIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusAnimation } from '@/hooks/useFocusAnimation';
import { SKINS, FORGE_ABILITIES, RELICS, getRankIndex, usePlayer } from '@/context/PlayerContext';
import { RedeemCodeModal } from '@/components/RedeemCodeModal';
import { useColors } from '@/hooks/useColors';
import { FloatingOrbs, ORBS_GOLD, GlowText, HolographicShimmer, ShimmerCard, PulseRing, GlowBorder } from '@/components/effects';

const API_BASE = Platform.OS === 'web' ? '/api' : (process.env.EXPO_PUBLIC_API_URL ?? '/api');

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
  { id: 'shield3', name: 'Shield Pack', desc: '3x Shield Power-ups', icon: 'shield', price: 80, color: '#FFD700' },
  { id: 'speed3', name: 'Speed Pack', desc: '3x Speed Boosts', icon: 'zap', price: 80, color: '#00FF88' },
  { id: 'mixed5', name: 'Mixed Bundle', desc: '5x Random Power-ups', icon: 'gift', price: 100, color: '#00E5FF' },
];

const EXTRA_LIVES = [
  { id: 'life1', name: '1 Extra Life', desc: 'Start with 4 lives', icon: 'heart', price: 60, color: '#FF69B4' },
  { id: 'life2', name: '2 Extra Lives', desc: 'Start with 5 lives', icon: 'heart', price: 100, color: '#FF69B4' },
];

const BALL_TRAILS = [
  { id: 'trail_fire', name: 'Fire Trail', desc: 'Balls leave fire trails', price: 200, color: '#FF6B35' },
  { id: 'trail_ice',  name: 'Ice Trail',  desc: 'Balls leave ice trails', price: 200, color: '#00BFFF' },
  { id: 'trail_neon', name: 'Neon Trail', desc: 'Rainbow neon trails',   price: 300, color: '#FF00FF' },
];

const ARENA_THEMES = [
  { id: 'default',   name: 'Dark Void',       desc: 'Classic deep-space arena',     price: 0,   color: '#6655FF', preview: ['#0D0035','#16005A'] },
  { id: 'solar',     name: 'Solar Flare',      desc: 'Scorching red-orange arena',   price: 300, color: '#FF6B35', preview: ['#350000','#5A1000'] },
  { id: 'arctic',    name: 'Arctic Ice',       desc: 'Cool blue frost arena',        price: 300, color: '#00BFFF', preview: ['#001828','#003050'] },
  { id: 'toxic',     name: 'Toxic Wasteland',  desc: 'Neon green hazard zone',       price: 350, color: '#00FF88', preview: ['#001A08','#003020'] },
  { id: 'cosmic',    name: 'Cosmic Dream',     desc: 'Purple nebula atmosphere',     price: 400, color: '#BF5FFF', preview: ['#180030','#2A0060'] },
  { id: 'golden',    name: 'Gold Rush',        desc: 'Prestige golden arena',        price: 500, color: '#FFD700', preview: ['#1A1200','#2A2000'] },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, purchaseSkin, equipSkin, spendCoins, purchaseForgeAbility, equipForgeAbility } = usePlayer();
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'powerups' | 'extras' | 'forge' | 'store'>('skins');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [redeemVisible, setRedeemVisible] = useState(false);
  const focusStyle = useFocusAnimation();

  // Store: product price ID cache (keyed by product name)
  const priceCache = useRef<Record<string, string>>({});
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'store' && activeTab !== 'extras') return;
    if (Object.keys(priceCache.current).length > 0) return;
    setStoreLoading(true);
    setStoreError(null);
    fetch(`${API_BASE}/store/products`)
      .then(r => r.json())
      .then((data: any) => {
        const cache: Record<string, string> = {};
        for (const p of (data.data ?? [])) {
          const firstPrice = p.prices?.[0]?.id;
          if (firstPrice) cache[p.name] = firstPrice;
        }
        priceCache.current = cache;
        setStoreLoading(false);
      })
      .catch(() => {
        setStoreError('Could not load store. Check your connection.');
        setStoreLoading(false);
      });
  }, [activeTab]);

  async function handleBuyFromStore(productName: string) {
    const priceId = priceCache.current[productName];
    if (!priceId) {
      xAlert('Store unavailable', 'Could not find product. Try again in a moment.');
      return;
    }
    setCheckingOut(productName);
    try {
      const resp = await fetch(`${API_BASE}/store/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await resp.json() as any;
      if (!resp.ok || !data.url) throw new Error(data.error ?? 'Checkout error');
      await Linking.openURL(data.url);
    } catch (err: any) {
      xAlert('Checkout failed', err.message ?? 'Could not open checkout.');
    } finally {
      setCheckingOut(null);
    }
  }

  const allRelicsOwned = RELICS.every(r =>
    (profile.trophyUnlockedRelics ?? []).includes(r.id) ||
    getRankIndex(profile.rank) >= r.unlockRankIndex
  );

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
      <LinearGradient colors={['#070B1E', '#04060E', '#06091A']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#C8820A24', '#C8820A0E', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', '#05081888']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2.5, color: '#FFFFFF44', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <GlowText intensity="medium" color='#C8820A' pulse style={[styles.headerTitle, { color: colors.foreground }]}>SHOP</GlowText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {allRelicsOwned && (
            <View style={[styles.coinDisplay, { backgroundColor: '#7A50A022', borderWidth: 1, borderColor: '#7A50A044' }]}>
              <Text style={{ fontSize: 12 }}>⚡</Text>
              <Text style={[styles.coinAmount, { color: '#B9A0E0' }]}>{profile.credits ?? 0}</Text>
            </View>
          )}
          <View style={styles.coinDisplay}>
            <Feather name="circle" size={14} color="#FFD700" />
            <Text style={styles.coinAmount}>{profile.coins}</Text>
          </View>
          <Pressable
            onPress={() => setRedeemVisible(true)}
            style={({ pressed }) => [styles.redeemCodeBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="gift" size={13} color="#C8820A" />
            <Text style={styles.redeemCodeTxt}>REDEEM</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'powerups', 'extras', 'store', ...(allRelicsOwned ? ['forge' as const] : [])] as const).map(t => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: t === 'forge' ? '#7A50A0' : t === 'store' ? '#FFD700' : colors.primary }]}>
            {activeTab === t ? (
              <GlowText intensity="soft" color='#C8820A' style={styles.tabText}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'THEMES' : t === 'powerups' ? 'POWER-UPS' : t === 'forge' ? '⚡ FORGE' : t === 'store' ? '💳 STORE' : 'EXTRAS'}
              </GlowText>
            ) : (
              <Text style={[styles.tabText, { color: colors.mutedForeground }]}>
                {t === 'skins' ? 'SKINS' : t === 'themes' ? 'THEMES' : t === 'powerups' ? 'POWER-UPS' : t === 'forge' ? '⚡ FORGE' : t === 'store' ? '💳 STORE' : 'EXTRAS'}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 80, gap: 10 }}>
        {activeTab === 'skins' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#C8820A', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#C8820A' }}>PADDLE SKINS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>TAP TO EQUIP</Text>
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
                          <Feather name="circle" size={10} color="#FFD700" />
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
              <View style={{ width: 3, height: 16, backgroundColor: '#00BFFF', borderRadius: 2 }} />
              <Text style={[styles.subsectionTitle, { color: colors.foreground, marginBottom: 0 }]}>BALL TRAILS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>COMING SOON</Text>
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
                  <Feather name="circle" size={12} color="#FFD700" />
                  <Text style={styles.priceText}>{trail.price}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {activeTab === 'themes' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#BF5FFF', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#BF5FFF' }}>ARENA THEMES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>VISUAL ONLY</Text>
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
                      <Feather name="circle" size={10} color="#FFD700" />
                      <Text style={[styles.buyBtnText, { color: theme.color }]}>{theme.price}</Text>
                    </View>
                  )}
                  {!owned && theme.price === 0 && (
                    <View style={[styles.buyBtn, { backgroundColor: '#FFFFFF11', borderColor: '#FFFFFF22' }]}>
                      <Text style={[styles.buyBtnText, { color: '#FFFFFF55' }]}>FREE</Text>
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
              <View style={{ width: 3, height: 16, backgroundColor: '#00FF88', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#00FF88' }}>POWER-UP BUNDLES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
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
                  <Feather name="circle" size={10} color="#FFD700" />
                  <Text style={[styles.buyBtnText, { color: bundle.color }]}>{bundle.price}</Text>
                </View>
              </Pressable>
            ))}

            {/* Earn coins section */}
            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: '#FFD70033' }]}>
              <Feather name="star" size={18} color="#FFD700" />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF69B414', borderRadius: 12, borderWidth: 1, borderColor: '#FF69B433', padding: 12, marginBottom: 4 }}>
                <Text style={{ fontSize: 20 }}>❤️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FF69B4' }}>
                    {profile.extraLivesInventory} Extra {(profile.extraLivesInventory ?? 0) === 1 ? 'Life' : 'Lives'} Ready
                  </Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                    You start your next {(profile.extraLivesInventory ?? 0) === 1 ? 'match' : `${profile.extraLivesInventory} matches`} with 1 bonus life.
                  </Text>
                </View>
              </View>
            )}

            {/* Extra Lives — real Stripe checkout */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#FF69B4', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FF69B4' }}>EXTRA LIVES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
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
                  backgroundColor: colors.card, borderColor: '#FF69B433', opacity: pressed ? 0.8 : 1,
                }]}
              >
                <LinearGradient colors={['#FF69B418', '#FF69B408']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#FF69B418', borderColor: '#FF69B433' }]}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <ShimmerCard active={!checkingOut} borderRadius={8} shimmerColor="rgba(255,255,255,0.1)">
                  <View style={[storeStyles.usdBtn, { backgroundColor: '#FF69B422', borderColor: '#FF69B466' }]}>
                    <Text style={[storeStyles.usdBtnText, { color: '#FF69B4' }]}>
                      {checkingOut === item.storeKey ? '…' : item.usd}
                    </Text>
                  </View>
                </ShimmerCard>
              </Pressable>
            ))}

            {/* Coin Packs — redirect to STORE tab */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#FFD700', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FFD700' }}>COIN PACKS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
            </View>
            <Pressable
              onPress={() => setActiveTab('store')}
              style={({ pressed }) => [styles.bundleCard, {
                backgroundColor: '#C8820A14', borderColor: '#C8820A44', opacity: pressed ? 0.8 : 1,
              }]}
            >
              <LinearGradient colors={['#C8820A18', '#C8820A06']} style={StyleSheet.absoluteFill} />
              <View style={[styles.bundleIcon, { backgroundColor: '#C8820A22', borderColor: '#C8820A44' }]}>
                <Text style={{ fontSize: 22 }}>🪙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: '#FFB830' }]}>Coin Packs</Text>
                <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>From $0.99 — up to 50,000 coins</Text>
              </View>
              <View style={[styles.buyBtn, { backgroundColor: '#C8820A22', borderColor: '#C8820A66' }]}>
                <Text style={[styles.buyBtnText, { color: '#FFD700' }]}>STORE →</Text>
              </View>
            </Pressable>
          </>
        )}
        {activeTab === 'forge' && (
          <>
            <View style={[styles.forgeHeader, { backgroundColor: '#7A50A014', borderColor: '#7A50A033' }]}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.forgeTitle, { color: '#B9A0E0' }]}>THE FORGE</Text>
                <Text style={[styles.forgeSubtitle, { color: colors.mutedForeground }]}>
                  Unlock all relics to forge powerful enhancements. Earn Credits by playing matches.
                </Text>
              </View>
              <View style={styles.creditsBox}>
                <Text style={styles.creditsLabel}>CREDITS</Text>
                <Text style={styles.creditsValue}>{profile.credits ?? 0}</Text>
              </View>
            </View>

            {FORGE_ABILITIES.map(forge => {
              const owned = (profile.ownedForgeAbilities ?? []).includes(forge.id);
              const equipped = profile.equippedForgeAbility === forge.id;
              const canAfford = (profile.credits ?? 0) >= forge.cost;
              return (
                <Pressable
                  key={forge.id}
                  onPress={async () => {
                    if (owned) {
                      if (!equipped) {
                        await equipForgeAbility(forge.id);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      return;
                    }
                    if (!canAfford) {
                      xAlert('Not enough Credits', `You need ${forge.cost - (profile.credits ?? 0)} more Credits.`);
                      return;
                    }
                    xConfirm(`Forge ${forge.name}?`, `Cost: ${forge.cost} Credits`, async () => {
                      const ok = await purchaseForgeAbility(forge.id);
                      if (ok) {
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        xAlert('Forged!', `${forge.name} is now equipped.`);
                      }
                    }, 'Forge');
                  }}
                  style={({ pressed }) => [styles.bundleCard, {
                    backgroundColor: equipped ? forge.color + '18' : colors.card,
                    borderColor: equipped ? forge.color : owned ? forge.color + '44' : colors.border,
                    opacity: pressed ? 0.85 : 1,
                    overflow: 'hidden',
                  }]}
                >
                  <LinearGradient colors={[forge.color + '18', forge.color + '06']} style={StyleSheet.absoluteFill} />
                  <View style={[styles.bundleIcon, { backgroundColor: forge.color + '22', borderColor: forge.color + '44' }]}>
                    <Text style={{ fontSize: 22 }}>{forge.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: equipped ? forge.color : colors.foreground }]}>{forge.name}</Text>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{forge.desc}</Text>
                    {equipped && <Text style={[styles.ownedLabel, { color: forge.color }]}>● EQUIPPED</Text>}
                    {owned && !equipped && <Text style={[styles.ownedLabel, { color: forge.color + '88' }]}>OWNED — TAP TO EQUIP</Text>}
                  </View>
                  {!owned && (
                    <View style={[styles.buyBtn, {
                      backgroundColor: canAfford ? forge.color + '22' : '#FFFFFF08',
                      borderColor: canAfford ? forge.color + '66' : '#FFFFFF15',
                    }]}>
                      <Text style={{ fontSize: 10 }}>⚡</Text>
                      <Text style={[styles.buyBtnText, { color: canAfford ? forge.color : '#FFFFFF33' }]}>{forge.cost}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            <View style={[styles.earnCard, { backgroundColor: colors.card, borderColor: '#7A50A033' }]}>
              <Text style={{ fontSize: 18 }}>🔄</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.earnTitle, { color: colors.foreground }]}>Earning Credits</Text>
                <Text style={[styles.earnDesc, { color: colors.mutedForeground }]}>
                  Once all relics are unlocked, every match rewards Credits instead. Win for 2 Credits, lose for 1. Duplicate relic milestones on Trophy Road give 15 Credits each.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'store' && (
          <>
            {/* Header banner */}
            <View style={[storeStyles.banner, { borderColor: '#C8820A44' }]}>
              <LinearGradient colors={['#C8820A22', '#C8820A08']} style={StyleSheet.absoluteFill} />
              <Text style={{ fontSize: 28 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={storeStyles.bannerTitle}>GOLDRUSH STORE</Text>
                <Text style={[storeStyles.bannerSub, { color: colors.mutedForeground }]}>
                  Real-money purchases • Secure Stripe checkout • Get a code to redeem in-game
                </Text>
              </View>
            </View>

            {storeLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: '#FFFFFF55', fontFamily: 'Inter_400Regular', fontSize: 13 }}>Loading store…</Text>
              </View>
            )}
            {storeError && !storeLoading && (
              <View style={[storeStyles.errorBox, { borderColor: '#FF475733' }]}>
                <Text style={{ color: '#FF4757', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' }}>{storeError}</Text>
                <Pressable onPress={() => { priceCache.current = {}; setActiveTab('skins'); setTimeout(() => setActiveTab('store'), 50); }}>
                  <Text style={{ color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 12, marginTop: 8 }}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!storeLoading && !storeError && (
              <>
                {/* Battle Pass Premium */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <View style={{ width: 3, height: 16, backgroundColor: '#C084FC', borderRadius: 2 }} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#C084FC' }}>BATTLE PASS</Text>
                </View>
                <HolographicShimmer borderRadius={16}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_BATTLE_PASS.key)}
                    disabled={checkingOut === STORE_BATTLE_PASS.key || !!profile.battlePassPremiumOwned}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#8B5CF666' }]}
                  >
                    <LinearGradient colors={['#8B5CF622', '#6D28D911']} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 32 }}>{STORE_BATTLE_PASS.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="medium" color='#A855F7' style={storeStyles.passName}>{STORE_BATTLE_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_BATTLE_PASS.desc}</Text>
                      {profile.battlePassPremiumOwned && (
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#C084FC', letterSpacing: 1, marginTop: 4 }}>✓ OWNED — SEASON 1</Text>
                      )}
                    </View>
                    {!profile.battlePassPremiumOwned && (
                      <View style={[storeStyles.usdBtn, { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}>
                        <Text style={[storeStyles.usdBtnText, { color: '#F5F3FF' }]}>{checkingOut === STORE_BATTLE_PASS.key ? '…' : STORE_BATTLE_PASS.usd}</Text>
                      </View>
                    )}
                  </Pressable>
                </HolographicShimmer>

                {/* Season Pass */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, marginTop: 6 }}>
                  <View style={{ width: 3, height: 16, backgroundColor: '#FFD700', borderRadius: 2 }} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FFD700' }}>SEASON PASS</Text>
                </View>
                <ShimmerCard shimmerColor="rgba(255,215,0,0.18)" duration={1800} borderRadius={14}>
                  <Pressable
                    onPress={() => handleBuyFromStore(STORE_SEASON_PASS.key)}
                    disabled={checkingOut === STORE_SEASON_PASS.key || !!profile.seasonPassPurchased}
                    style={({ pressed }) => [storeStyles.passCard, { opacity: pressed ? 0.8 : 1, borderColor: '#FFD70066' }]}
                  >
                    <LinearGradient colors={['#FFD70022', '#C8820A11']} style={StyleSheet.absoluteFill} />
                    <Text style={{ fontSize: 32 }}>{STORE_SEASON_PASS.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <GlowText intensity="soft" color='#C8820A' style={storeStyles.passName}>{STORE_SEASON_PASS.name}</GlowText>
                      <Text style={[storeStyles.passDesc, { color: colors.mutedForeground }]}>{STORE_SEASON_PASS.desc}</Text>
                      {profile.seasonPassPurchased && (
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFD700', letterSpacing: 1, marginTop: 4 }}>✓ OWNED</Text>
                      )}
                    </View>
                    {!profile.seasonPassPurchased && (
                      <View style={storeStyles.usdBtn}>
                        <Text style={storeStyles.usdBtnText}>{checkingOut === STORE_SEASON_PASS.key ? '…' : STORE_SEASON_PASS.usd}</Text>
                      </View>
                    )}
                  </Pressable>
                </ShimmerCard>

                {/* Coin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <View style={{ width: 3, height: 16, backgroundColor: '#FFB830', borderRadius: 2 }} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FFB830' }}>COIN PACKS</Text>
                </View>
                {STORE_COIN_PACKS.map(pack => {
                  const cardContent = (
                    <Pressable
                      key={pack.key}
                      onPress={() => handleBuyFromStore(pack.key)}
                      disabled={checkingOut === pack.key}
                      style={({ pressed }) => [storeStyles.storeCard, {
                        borderColor: pack.highlight ? '#C8820A88' : '#FFFFFF18',
                        backgroundColor: pack.highlight ? '#C8820A14' : colors.card,
                        opacity: pressed ? 0.82 : 1,
                      }]}
                    >
                      {pack.highlight && <LinearGradient colors={['#C8820A18', '#C8820A06']} style={StyleSheet.absoluteFill} />}
                      <Text style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{pack.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[storeStyles.storeName, { color: pack.highlight ? '#FFB830' : colors.foreground }]}>{pack.name}</Text>
                        <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                      </View>
                      <View style={[storeStyles.usdBtn, pack.highlight && { backgroundColor: '#C8820A33', borderColor: '#C8820A88' }]}>
                        <Text style={[storeStyles.usdBtnText, pack.highlight && { color: '#FFD700' }]}>
                          {checkingOut === pack.key ? '…' : pack.usd}
                        </Text>
                      </View>
                    </Pressable>
                  );
                  return pack.highlight ? (
                    <GlowBorder key={pack.key} color='#FFD700' borderRadius={12} spread={8}>
                      {cardContent}
                    </GlowBorder>
                  ) : cardContent;
                })}

                {/* Skin Packs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
                  <View style={{ width: 3, height: 16, backgroundColor: '#00E5FF', borderRadius: 2 }} />
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#00E5FF' }}>SKIN PACKS</Text>
                </View>
                {STORE_SKIN_PACKS.map(pack => (
                  <Pressable
                    key={pack.key}
                    onPress={() => handleBuyFromStore(pack.key)}
                    disabled={checkingOut === pack.key}
                    style={({ pressed }) => [storeStyles.storeCard, { borderColor: '#00E5FF22', opacity: pressed ? 0.82 : 1 }]}
                  >
                    <Text style={{ fontSize: 26, width: 36, textAlign: 'center' }}>{pack.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[storeStyles.storeName, { color: colors.foreground }]}>{pack.name}</Text>
                      <Text style={[storeStyles.storeDesc, { color: colors.mutedForeground }]}>{pack.desc}</Text>
                    </View>
                    <ShimmerCard active={!checkingOut} borderRadius={8} shimmerColor="rgba(255,255,255,0.1)">
                      <View style={storeStyles.usdBtn}>
                        <Text style={storeStyles.usdBtnText}>{checkingOut === pack.key ? '…' : pack.usd}</Text>
                      </View>
                    </ShimmerCard>
                  </Pressable>
                ))}

                {/* How it works */}
                <View style={[storeStyles.howItWorks, { borderColor: '#FFFFFF12' }]}>
                  <Text style={[storeStyles.howTitle, { color: colors.foreground }]}>How it works</Text>
                  <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>1. Tap a product and complete secure checkout</Text>
                  <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>2. Your receipt page shows a unique code (e.g. GR-A1B2-C3D4)</Text>
                  <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>3. Return here → tap <Text style={{ color: '#C8820A', fontFamily: 'Inter_700Bold' }}>REDEEM</Text> → enter your code</Text>
                  <Text style={[storeStyles.howStep, { color: colors.mutedForeground }]}>4. Your reward is added instantly!</Text>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <RedeemCodeModal visible={redeemVisible} onClose={() => setRedeemVisible(false)} />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 2 },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C8820A1A', borderRadius: 10, borderWidth: 1, borderColor: '#C8820A44', paddingHorizontal: 9, paddingVertical: 4 },
  coinAmount: { color: '#FFB830', fontFamily: 'Inter_700Bold', fontSize: 13 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  sectionInfo: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  subsectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.8, marginTop: 8, marginBottom: 2, color: '#FFFFFF99', borderLeftWidth: 2, borderLeftColor: '#C8820A', paddingLeft: 8 },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skinCard: { width: '47%', flex: 1, minWidth: 140, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  skinPreview: { height: 88, alignItems: 'center', justifyContent: 'center' },
  paddlePreview: { width: 72, height: 13, borderRadius: 7, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 4 },
  ownedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  ownedText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5 },
  equippedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  equippedText: { fontFamily: 'Inter_700Bold', fontSize: 8, color: '#07090F', letterSpacing: 0.5 },
  skinInfo: { padding: 10, gap: 3 },
  skinName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: '#FFB830', fontFamily: 'Inter_700Bold', fontSize: 13 },
  ownedLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  trailDot: { width: 26, height: 26, borderRadius: 13, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4 },
  itemName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  itemDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  bundleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, overflow: 'hidden' },
  bundleIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  buyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  iapBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  iapText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  earnCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  earnTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  earnDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2 },
  themePreview: { width: 64, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  themeArena: { width: 50, height: 50, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  themePaddle: { width: 30, height: 5, borderRadius: 3, opacity: 0.9 },
  forgeHeader: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  forgeTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2 },
  forgeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, lineHeight: 16 },
  creditsBox: { alignItems: 'center', gap: 2 },
  creditsLabel: { color: '#B9A0E0', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.5 },
  creditsValue: { color: '#B9A0E0', fontFamily: 'Inter_700Bold', fontSize: 20 },
  redeemCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#C8820A18', borderRadius: 10, borderWidth: 1, borderColor: '#C8820A55', paddingHorizontal: 10, paddingVertical: 6 },
  redeemCodeTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#C8820A' },
});

const storeStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, overflow: 'hidden' },
  bannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 2, color: '#FFD700' },
  bannerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  errorBox: { alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 16 },
  passCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 16, overflow: 'hidden' },
  passName: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#FFD700', letterSpacing: 0.5 },
  passDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  storeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, overflow: 'hidden' },
  storeName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  storeDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  usdBtn: { backgroundColor: '#FFFFFF0F', borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF22', paddingHorizontal: 12, paddingVertical: 7 },
  usdBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF' },
  howItWorks: { backgroundColor: '#FFFFFF08', borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  howTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, marginBottom: 4 },
  howStep: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
});
