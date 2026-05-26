import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

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
  { id: 'trail_ice', name: 'Ice Trail', desc: 'Balls leave ice trails', price: 200, color: '#00BFFF' },
  { id: 'trail_neon', name: 'Neon Trail', desc: 'Rainbow neon trails', price: 300, color: '#FF00FF' },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, purchaseSkin, equipSkin, spendCoins } = usePlayer();
  const [activeTab, setActiveTab] = useState<'skins' | 'powerups' | 'extras'>('skins');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  async function handleBuySkin(skinId: string, price: number, skinName: string) {
    if (profile.ownedSkins.includes(skinId)) {
      await equipSkin(skinId);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (profile.coins < price) {
      Alert.alert('Not enough coins', `You need ${price - profile.coins} more coins.`);
      return;
    }
    Alert.alert(`Buy ${skinName}?`, `Cost: ${price} coins`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy', onPress: async () => {
          setPurchasing(skinId);
          const ok = await purchaseSkin(skinId);
          setPurchasing(null);
          if (ok) {
            await equipSkin(skinId);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Purchased!', `${skinName} equipped.`);
          }
        }
      },
    ]);
  }

  async function handleBuyBundle(item: { id: string; name: string; price: number }) {
    if (profile.coins < item.price) {
      Alert.alert('Not enough coins', `You need ${item.price - profile.coins} more coins.`);
      return;
    }
    Alert.alert(`Buy ${item.name}?`, `Cost: ${item.price} coins`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy', onPress: async () => {
          const ok = await spendCoins(item.price);
          if (ok) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Purchased!', `${item.name} added to your inventory!`);
          }
        },
      },
    ]);
  }

  function handleExtraLife(item: { id: string; name: string; price: number }) {
    Alert.alert(
      item.name,
      `This would purchase "${item.name}" as an in-app purchase.\n\nIn-app purchases coming soon!`,
      [{ text: 'OK' }]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#080814', '#0C0C22']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>SHOP</Text>
        <View style={styles.coinDisplay}>
          <Feather name="circle" size={14} color="#FFD700" />
          <Text style={styles.coinAmount}>{profile.coins}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'powerups', 'extras'] as const).map(t => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary }]}>
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {t === 'skins' ? 'SKINS' : t === 'powerups' ? 'POWER-UPS' : 'EXTRAS'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 80, gap: 10 }}>
        {activeTab === 'skins' && (
          <>
            <Text style={[styles.sectionInfo, { color: colors.mutedForeground }]}>
              Customize your paddle skin. Tap to equip owned skins or purchase new ones.
            </Text>
            <View style={styles.skinGrid}>
              {SKINS.map(skin => {
                const owned = profile.ownedSkins.includes(skin.id);
                const equipped = profile.currentSkin === skin.id;
                return (
                  <Pressable
                    key={skin.id}
                    onPress={() => handleBuySkin(skin.id, skin.price, skin.name)}
                    disabled={purchasing === skin.id}
                    style={({ pressed }) => [styles.skinCard, {
                      backgroundColor: equipped ? skin.color + '22' : colors.card,
                      borderColor: equipped ? skin.color : owned ? skin.color + '55' : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    }]}
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
                );
              })}
            </View>

            {/* Ball Trails */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>BALL TRAILS</Text>
            <Text style={[styles.sectionInfo, { color: colors.mutedForeground }]}>Cosmetic effects for balls (coming soon).</Text>
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

        {activeTab === 'powerups' && (
          <>
            <Text style={[styles.sectionInfo, { color: colors.mutedForeground }]}>
              Stock up on power-up bundles for your next match.
            </Text>
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
            <Text style={[styles.sectionInfo, { color: colors.mutedForeground }]}>
              Extra lives give you an advantage — start matches with more lives.
            </Text>

            {EXTRA_LIVES.map(item => (
              <Pressable
                key={item.id}
                onPress={() => handleExtraLife(item)}
                style={({ pressed }) => [styles.bundleCard, { backgroundColor: colors.card, borderColor: '#FF69B433', opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient colors={['#FF69B422', '#FF69B408']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#FF69B422', borderColor: '#FF69B444' }]}>
                  <Feather name="heart" size={22} color="#FF69B4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <View style={[styles.iapBtn, { backgroundColor: '#FF69B422', borderColor: '#FF69B455' }]}>
                  <Text style={[styles.iapText, { color: '#FF69B4' }]}>IAP</Text>
                </View>
              </Pressable>
            ))}

            {/* Coin IAP */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>COIN PACKS</Text>
            {[
              { label: '100 Coins', price: '$0.99', coins: 100 },
              { label: '500 Coins', price: '$3.99', coins: 500 },
              { label: '1200 Coins', price: '$7.99', coins: 1200 },
            ].map(pack => (
              <Pressable
                key={pack.label}
                onPress={() => Alert.alert('Coming Soon', 'In-app coin purchases are coming soon!')}
                style={({ pressed }) => [styles.bundleCard, { backgroundColor: colors.card, borderColor: '#FFD70033', opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient colors={['#FFD70022', '#FFD70008']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#FFD70022', borderColor: '#FFD70044' }]}>
                  <Feather name="circle" size={22} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{pack.label}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>Best value!</Text>
                </View>
                <View style={[styles.iapBtn, { backgroundColor: '#FFD70022', borderColor: '#FFD70055' }]}>
                  <Text style={[styles.iapText, { color: '#FFD700' }]}>{pack.price}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD70022', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  coinAmount: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 16 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 },
  sectionInfo: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  subsectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 1, marginTop: 4 },
  skinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skinCard: { width: '47%', flex: 1, minWidth: 140, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  skinPreview: { height: 80, alignItems: 'center', justifyContent: 'center' },
  paddlePreview: { width: 70, height: 12, borderRadius: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  ownedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  ownedText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5 },
  equippedBadge: { position: 'absolute', bottom: 4, right: 6, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  equippedText: { fontFamily: 'Inter_700Bold', fontSize: 8, color: '#080814', letterSpacing: 0.5 },
  skinInfo: { padding: 10, gap: 3 },
  skinName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: '#FFD700', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  ownedLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  trailDot: { width: 24, height: 24, borderRadius: 12, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemDesc: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  bundleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, overflow: 'hidden' },
  bundleIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  buyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  iapBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  iapText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  earnCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  earnTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  earnDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 2 },
});
