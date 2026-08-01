import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/hooks/useSettings';
import { usePlayer } from '@/context/PlayerContext';
import { FloatingOrbs, GlowBorder } from '@/components/effects';

const SENSITIVITY_OPTIONS = [
  { value: 0.6,  label: 'Slow',   desc: 'Easier to control' },
  { value: 1.0,  label: 'Normal', desc: 'Default feel'      },
  { value: 1.5,  label: 'Fast',   desc: 'Hair-trigger'      },
];

function SettingRow({ icon, title, subtitle, right }: {
  icon: string; title: string; subtitle?: string; right: React.ReactNode;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Feather name={icon as never} size={18} color="#C8820A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const { profile, logout } = usePlayer();
  const safe   = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(safe.top, 44) : safe.top;

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out? You will be returned to the login screen.')) logout();
      return;
    }
    Alert.alert('Sign Out', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <Reanimated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
      <LinearGradient colors={['#07090F', '#0D1428', '#07090F']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs opacity={0.4} />
      <LinearGradient
        colors={['#C8820A14', '#C8820A06', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={22} color="#F0F0FF" />
        </Pressable>
        <Text style={s.title}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: safe.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#C8820A', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>ACCOUNT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <View style={s.accountCard}>
              <GlowBorder color={profile.avatarFrameColor} borderRadius={22} spread={5} pulse style={{ borderRadius: 22 }}>
                <View style={[s.accountAvatar, { backgroundColor: profile.avatarFrameColor + '22', borderColor: profile.avatarFrameColor }]}>
                  <Text style={s.accountEmoji}>{profile.avatarEmoji}</Text>
                </View>
              </GlowBorder>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{profile.name}</Text>
                <Text style={s.accountSub}>{profile.rank} · LVL {profile.competitiveLevel ?? 1}/50</Text>
              </View>
              <View style={s.accountStats}>
                <Text style={s.accountStatVal}>{profile.wins}</Text>
                <Text style={s.accountStatLbl}>Wins</Text>
              </View>
              <View style={s.accountStats}>
                <Text style={s.accountStatVal}>{profile.totalGames}</Text>
                <Text style={s.accountStatLbl}>Games</Text>
              </View>
            </View>
            <View style={s.divider} />
            <Pressable onPress={handleLogout} style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: '#FF475715' }]}>
                <Feather name="log-out" size={18} color="#FF4757" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: '#FF4757' }]}>Sign Out</Text>
                <Text style={s.rowSub}>Return to login screen</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#FF475755" />
            </Pressable>
          </View>
        </View>

        {/* ── Audio ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#1E8AAA', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>AUDIO</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <SettingRow
              icon="music"
              title="Background Music"
              subtitle="Looping arcade soundtrack"
              right={
                <Switch
                  value={settings.musicEnabled}
                  onValueChange={v => updateSetting('musicEnabled', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#C8820A55' }}
                  thumbColor={settings.musicEnabled ? '#C8820A' : '#888'}
                />
              }
            />
            <View style={s.divider} />
            <SettingRow
              icon="volume-2"
              title="Sound Effects"
              subtitle="Hits, goals & match events"
              right={
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={v => updateSetting('soundEnabled', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#C8820A55' }}
                  thumbColor={settings.soundEnabled ? '#C8820A' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── Visual ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#BF5FFF', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>VISUAL</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <SettingRow
              icon="droplet"
              title="Color-Shifting Board"
              subtitle="Arena shifts hue (more intense with more balls)"
              right={
                <Switch
                  value={settings.colorBoard}
                  onValueChange={v => updateSetting('colorBoard', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#C8820A55' }}
                  thumbColor={settings.colorBoard ? '#C8820A' : '#888'}
                />
              }
            />
            <View style={s.divider} />
            <SettingRow
              icon="smile"
              title="Goal Emojis"
              subtitle="Floating emojis when a goal is scored"
              right={
                <Switch
                  value={settings.showEmojis}
                  onValueChange={v => updateSetting('showEmojis', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#C8820A55' }}
                  thumbColor={settings.showEmojis ? '#C8820A' : '#888'}
                />
              }
            />
            <View style={s.divider} />
            <SettingRow
              icon="zap"
              title="Screen Shake"
              subtitle="Arena shakes on every goal"
              right={
                <Switch
                  value={settings.screenShake}
                  onValueChange={v => updateSetting('screenShake', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#C8820A55' }}
                  thumbColor={settings.screenShake ? '#C8820A' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── Controls ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#00FF88', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>CONTROLS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <Text style={[s.rowTitle, { paddingHorizontal: 14, paddingTop: 14 }]}>Paddle Sensitivity</Text>
            <Text style={[s.rowSub, { paddingHorizontal: 14, marginBottom: 10 }]}>How fast your paddle reacts to swipes</Text>
            <View style={s.sensitivityRow}>
              {SENSITIVITY_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSetting('sensitivity', opt.value)}
                  style={[s.sensBtn, settings.sensitivity === opt.value && s.sensBtnActive]}
                >
                  <Text style={[s.sensBtnLabel, settings.sensitivity === opt.value && { color: '#C8820A' }]}>
                    {opt.label}
                  </Text>
                  <Text style={[s.sensBtnDesc, settings.sensitivity === opt.value && { color: '#C8820A99' }]}>
                    {opt.desc}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Gameplay ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#FF6B35', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>GAMEPLAY</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <SettingRow
              icon="smartphone"
              title="Haptic Feedback"
              subtitle="Vibrations on hits, goals and match events"
              right={
                <Switch
                  value={settings.hapticsEnabled ?? true}
                  onValueChange={v => updateSetting('hapticsEnabled', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#FF6B3555' }}
                  thumbColor={(settings.hapticsEnabled ?? true) ? '#FF6B35' : '#888'}
                />
              }
            />
            <View style={s.divider} />
            <SettingRow
              icon="book-open"
              title="Show Rules in Lobby"
              subtitle="Display variant rules before every match"
              right={
                <Switch
                  value={settings.showLobbyRules ?? true}
                  onValueChange={v => updateSetting('showLobbyRules', v)}
                  trackColor={{ false: '#FFFFFF22', true: '#FF6B3555' }}
                  thumbColor={(settings.showLobbyRules ?? true) ? '#FF6B35' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── About ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#FFFFFF44', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>ABOUT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            {[
              { l: 'Game',    v: 'GoldRush Arena'  },
              { l: 'Version', v: '1.0.0'           },
              { l: 'Engine',  v: 'Expo SDK 54'     },
              { l: 'Mode',    v: '4-Player Arena'  },
            ].map((item, i, arr) => (
              <React.Fragment key={item.l}>
                <View style={s.aboutRow}>
                  <Text style={s.aboutLabel}>{item.l}</Text>
                  <Text style={s.aboutValue}>{item.v}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Legal & Support ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#FFD700', borderRadius: 2 }} />
            <Text style={s.sectionTitle}>LEGAL & SUPPORT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#FFFFFF0E' }} />
          </View>
          <View style={s.card}>
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="shield" size={18} color="#C8820A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Privacy Policy</Text>
                <Text style={s.rowSub}>How we handle your data</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#FFFFFF33" />
            </Pressable>
            <View style={s.divider} />
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="file-text" size={18} color="#C8820A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Terms of Service</Text>
                <Text style={s.rowSub}>Rules and license agreement</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#FFFFFF33" />
            </Pressable>
            <View style={s.divider} />
            <Pressable
              onPress={async () => {
                if (Platform.OS !== 'web' && await StoreReview.hasAction()) {
                  StoreReview.requestReview();
                } else {
                  Alert.alert(
                    'Rate GoldRush Arena',
                    'Thank you for playing! You can rate us once the app is live on the App Store and Google Play.',
                    [{ text: 'OK' }],
                  );
                }
              }}
              style={s.row}
            >
              <View style={[s.rowIcon, { backgroundColor: '#FFD70015' }]}>
                <Feather name="star" size={18} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: '#FFD700' }]}>Rate GoldRush Arena</Text>
                <Text style={s.rowSub}>Enjoying the game? Leave a review!</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#FFD70033" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  back:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:     { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2, color: '#F0F0FF' },
  section:   { gap: 10 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: '#FFFFFF55', paddingLeft: 4 },
  card:      { borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF14', backgroundColor: '#FFFFFF07', overflow: 'hidden' },
  divider:   { height: 1, backgroundColor: '#FFFFFF0E', marginHorizontal: 14 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIcon:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#C8820A15', alignItems: 'center', justifyContent: 'center' },
  rowTitle:  { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#F0F0FF' },
  rowSub:    { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF55', marginTop: 2 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  accountAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  accountEmoji: { fontSize: 22 },
  accountName: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#F0F0FF' },
  accountSub:  { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF55', marginTop: 2 },
  accountStats: { alignItems: 'center', gap: 2, minWidth: 38 },
  accountStatVal: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#C8820A' },
  accountStatLbl: { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF44', letterSpacing: 0.5 },
  sensitivityRow: { flexDirection: 'row', padding: 12, gap: 8 },
  sensBtn:   { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF18', backgroundColor: '#FFFFFF08', padding: 10, alignItems: 'center', gap: 3 },
  sensBtnActive: { borderColor: '#C8820A', backgroundColor: '#C8820A15' },
  sensBtnLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFFFFF66' },
  sensBtnDesc:  { fontFamily: 'Inter_400Regular', fontSize: 9, color: '#FFFFFF33', textAlign: 'center' },
  aboutRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  aboutLabel:{ fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF55' },
  aboutValue:{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#F0F0FF' },
});
