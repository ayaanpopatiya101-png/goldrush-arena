import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, FORGE_ABILITIES, RELICS, getRankIndex, usePlayer } from '@/context/PlayerContext';
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
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'powerups' | 'extras' | 'forge'>('skins');
  const [purchasing, setPurchasing] = useState<string | null>(null);

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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#0B0D14', '#07090F']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['#C8820A10', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2.5, color: '#FFFFFF44', marginBottom: 2 }}>GOLDRUSH ARENA</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>SHOP</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['skins', 'themes', 'powerups', 'extras', ...(allRelicsOwned ? ['forge' as const] : [])] as const).map(t => (
          <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && { borderBottomColor: t === 'forge' ? '#7A50A0' : colors.primary }]}>
            <Text style={[styles.tabText, { color: activeTab === t ? (t === 'forge' ? '#B9A0E0' : colors.primary) : colors.mutedForeground }]}>
              {t === 'skins' ? 'SKINS' : t === 'themes' ? 'THEMES' : t === 'powerups' ? 'POWER-UPS' : t === 'forge' ? '⚡ FORGE' : 'EXTRAS'}
            </Text>
          </Pressable>
        ))}
      </View>

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
            {ARENA_THEMES.map(theme => {
              const owned = (profile.ownedThemes ?? ['default']).includes(theme.id);
              const equipped = (profile.currentArenaTheme ?? 'default') === theme.id;
              return (
                <Pressable
                  key={theme.id}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#FF69B4', borderRadius: 2 }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2, color: '#FF69B4' }}>EXTRA LIVES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>COMING SOON</Text>
            </View>

            {EXTRA_LIVES.map(item => (
              <View
                key={item.id}
                style={[styles.bundleCard, { backgroundColor: colors.card, borderColor: '#FF69B422', opacity: 0.38 }]}
              >
                <LinearGradient colors={['#FF69B411', '#FF69B405']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#FF69B411', borderColor: '#FF69B422' }]}>
                  <Feather name="heart" size={22} color="#FF69B466" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <View style={[styles.iapBtn, { backgroundColor: '#FFFFFF0A', borderColor: '#FFFFFF18' }]}>
                  <Text style={[styles.iapText, { color: '#FFFFFF33' }]}>SOON</Text>
                </View>
              </View>
            ))}

            {/* Coin IAP */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 }}>
              <View style={{ width: 3, height: 16, backgroundColor: '#FFD700', borderRadius: 2 }} />
              <Text style={[styles.subsectionTitle, { color: colors.foreground, marginBottom: 0 }]}>COIN PACKS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#FFFFFF33', letterSpacing: 1 }}>COMING SOON</Text>
            </View>
            {[
              { label: '100 Coins', price: '$0.99', coins: 100 },
              { label: '500 Coins', price: '$3.99', coins: 500 },
              { label: '1200 Coins', price: '$7.99', coins: 1200 },
            ].map(pack => (
              <View
                key={pack.label}
                style={[styles.bundleCard, { backgroundColor: colors.card, borderColor: '#FFD70018', opacity: 0.38 }]}
              >
                <LinearGradient colors={['#FFD70011', '#FFD70005']} style={StyleSheet.absoluteFill} />
                <View style={[styles.bundleIcon, { backgroundColor: '#FFD70011', borderColor: '#FFD70022' }]}>
                  <Feather name="circle" size={22} color="#FFD70066" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{pack.label}</Text>
                  <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>Coming soon</Text>
                </View>
                <View style={[styles.iapBtn, { backgroundColor: '#FFFFFF0A', borderColor: '#FFFFFF18' }]}>
                  <Text style={[styles.iapText, { color: '#FFFFFF33' }]}>{pack.price}</Text>
                </View>
              </View>
            ))}
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
      </ScrollView>
    </View>
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
});
