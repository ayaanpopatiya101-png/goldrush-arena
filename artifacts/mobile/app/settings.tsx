import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Button, Shell, ScreenTitle } from '@/components/ui/Primitives';
import { GameArena } from '@/components/GameArena';
import { palette, tactile } from '@/constants/colors';
import { LinearGradient } from '@/components/ui/Flat';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/hooks/useSettings';
import { usePlayer } from '@/context/PlayerContext';
import { FloatingOrbs, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';

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
        <Feather name={icon as never} size={18} color="#EFBD3C" />
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
  const { settings, updateSetting, error } = useSettings();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceKey, setPracticeKey] = useState(0);
  const { width } = useWindowDimensions();
  const practiceSize = Math.min(width - 64, 320);
  const { profile, logout } = usePlayer();
  const safe   = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(safe.top, 67) : safe.top;

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
      <LinearGradient colors={['#213D39', '#294C44', '#213D39']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs opacity={0.4} />
      <LinearGradient
        colors={['#EFBD3C14', '#EFBD3C06', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Play" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.back}>
          <Feather name="arrow-left" size={22} color="#F5E7C4" />
        </Pressable>
        <ScreenTitle title="Settings" kicker="Your arcade" style={{ flex: 1, marginHorizontal: 8 }} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: safe.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Shell variant="prose" style={{ gap: 20 }}>
        {/* ── Account ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>ACCOUNT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F5E7C40E' }} />
          </View>
          <View style={s.card}>
            <View style={s.accountCard}>
              <GlowBorder color={profile.avatarFrameColor} borderRadius={3} spread={5} pulse style={{ borderRadius: 3 }}>
                <View style={[s.accountAvatar, { backgroundColor: profile.avatarFrameColor + '22', borderColor: profile.avatarFrameColor }]}>
                  <Glyph style={s.accountEmoji} value={profile.avatarEmoji} />
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
              <View style={[s.rowIcon, { backgroundColor: '#CE786315' }]}>
                <Feather name="log-out" size={18} color="#CE7863" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: '#CE7863' }]}>Sign Out</Text>
                <Text style={s.rowSub}>Return to login screen</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CE786355" />
            </Pressable>
          </View>
        </View>

        {/* ── Audio ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>AUDIO</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F5E7C40E' }} />
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
                  trackColor={{ false: '#F5E7C422', true: '#EFBD3C55' }}
                  thumbColor={settings.musicEnabled ? '#EFBD3C' : '#888'}
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
                  trackColor={{ false: '#F5E7C422', true: '#EFBD3C55' }}
                  thumbColor={settings.soundEnabled ? '#EFBD3C' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── Visual ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>ACCESSIBILITY</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F5E7C40E' }} />
          </View>
          <View style={s.card}>
            {/* Color-shifting board and goal emoji toggles hidden by the visual rules; stored values are kept. */}
            <SettingRow
              icon="zap"
              title="Screen Shake"
              subtitle="Arena shakes on every goal"
              right={
                <Switch
                  value={settings.screenShake}
                  onValueChange={v => updateSetting('screenShake', v)}
                  trackColor={{ false: '#F5E7C422', true: '#EFBD3C55' }}
                  thumbColor={settings.screenShake ? '#EFBD3C' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── Controls ── */}
        <View style={s.section}>
          {error && <Text accessibilityRole="alert" style={s.rowSub}>{error}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>CONTROLS</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F5E7C40E' }} />
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
                  <Text style={[s.sensBtnLabel, settings.sensitivity === opt.value && { color: palette.ochreInk }]}>
                    {opt.label}
                  </Text>
                  <Text style={[s.sensBtnDesc, settings.sensitivity === opt.value && { color: palette.ochreInk }]}>
                    {opt.desc}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ padding: 12, gap: 12 }}>
              <Button label={practiceOpen ? 'Close practice court' : 'Test sensitivity'} variant="secondary" onPress={() => setPracticeOpen(value => !value)} />
              {practiceOpen && <>
                <Text style={s.rowSub}>Drag to move the bottom paddle. On desktop, click and drag. No rewards or bank lives are used.</Text>
                <View style={{ width: practiceSize, height: practiceSize, alignSelf: 'center' }}>
                  <GameArena key={practiceKey} arenaSize={practiceSize} playerName="You" playerColor={palette.ochre} playerGlowColor={palette.ochre}
                    botNames={['North bot', 'West bot', 'East bot']} botRanks={['Bronze 1', 'Bronze 1', 'Bronze 1']}
                    sensitivity={settings.sensitivity} practice botDifficulty="easy" botSkill={0} soundEnabled={settings.soundEnabled}
                    onGameOver={() => setPracticeKey(key => key + 1)} />
                </View>
              </>}
              <SettingRow icon="eye" title="Reduced effects" subtitle="Reduce decorative motion. OS Reduce Motion also applies."
                right={<Switch accessibilityLabel="Reduced effects" value={settings.reducedEffects} onValueChange={value => updateSetting('reducedEffects', value)} />} />
            </View>
          </View>
        </View>

        {/* ── Controls (continued): match preferences ── */}
        <View style={s.section}>
          <View style={s.card}>
            <SettingRow
              icon="smartphone"
              title="Haptic Feedback"
              subtitle="Vibrations on hits, goals and match events"
              right={
                <Switch
                  value={settings.hapticsEnabled ?? true}
                  onValueChange={v => updateSetting('hapticsEnabled', v)}
                  trackColor={{ false: '#F5E7C422', true: '#CE786355' }}
                  thumbColor={(settings.hapticsEnabled ?? true) ? '#CE7863' : '#888'}
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
                  trackColor={{ false: '#F5E7C422', true: '#CE786355' }}
                  thumbColor={(settings.showLobbyRules ?? true) ? '#CE7863' : '#888'}
                />
              }
            />
          </View>
        </View>

        {/* ── Legal & Support: app information ── */}
        <View style={s.section}>
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
            <Text style={s.sectionTitle}>LEGAL & SUPPORT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#F5E7C40E' }} />
          </View>
          <View style={s.card}>
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="shield" size={18} color="#EFBD3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Privacy Policy</Text>
                <Text style={s.rowSub}>How we handle your data</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#F5E7C433" />
            </Pressable>
            <View style={s.divider} />
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="file-text" size={18} color="#EFBD3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Terms of Service</Text>
                <Text style={s.rowSub}>Rules and license agreement</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#F5E7C433" />
            </Pressable>
            <View style={s.divider} />
            <View style={s.row} accessible accessibilityLabel="Support contact not configured yet">
              <View style={s.rowIcon}>
                <Feather name="help-circle" size={18} color="#CFE0D6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Support</Text>
                <Text style={s.rowSub}>Support contact not configured yet. No email or site is published for this pre-release build.</Text>
              </View>
            </View>
            <View style={s.divider} />
            <Pressable
              onPress={async () => {
                await AsyncStorage.removeItem('@onboarding_flow_done');
                router.push('/onboarding-flow' as never);
              }}
              style={s.row}
            >
              <View style={[s.rowIcon, { backgroundColor: '#EDE3CC15' }]}>
                <Feather name="book-open" size={18} color="#EDE3CC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Replay Tutorial</Text>
                <Text style={s.rowSub}>Replay the playable introduction and practice controls</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#F5E7C433" />
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
              <View style={[s.rowIcon, { backgroundColor: '#EFBD3C15' }]}>
                <Feather name="star" size={18} color="#EFBD3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: '#EFBD3C' }]}>Rate GoldRush Arena</Text>
                <Text style={s.rowSub}>Enjoying the game? Leave a review!</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#EFBD3C33" />
            </Pressable>
          </View>
        </View>
        </Shell>
      </ScrollView>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  back:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.lineStrong },
  title:     { fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 2, color: '#F5E7C4' },
  section:   { gap: 10 },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 17, letterSpacing: 1.5, color: palette.paperDim, paddingLeft: 4 },
  card:      { borderRadius: 0, borderWidth: 2, borderColor: palette.line, backgroundColor: palette.graphite, overflow: 'hidden' },
  divider:   { height: 1, backgroundColor: '#F5E7C40E', marginHorizontal: 14 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIcon:   { width: 32, height: 32, borderRadius: 3, backgroundColor: '#EFBD3C15', alignItems: 'center', justifyContent: 'center' },
  rowTitle:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 14, color: '#F5E7C4' },
  rowSub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 13, lineHeight: 18, color: palette.muted, marginTop: 2 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, backgroundColor: tactile.paperPanel },
  accountAvatar: { width: 44, height: 44, borderRadius: 3, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  accountEmoji: { fontSize: 22 },
  accountName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 23, color: tactile.paperInk },
  accountSub:  { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: tactile.paperMuted, marginTop: 2 },
  accountStats: { alignItems: 'center', gap: 2, minWidth: 38 },
  accountStatVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: tactile.paperInk },
  accountStatLbl: { fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: tactile.paperMuted, letterSpacing: 0.5 },
  sensitivityRow: { flexDirection: 'row', padding: 12, gap: 8 },
  sensBtn:   { flex: 1, borderRadius: 0, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.ink, padding: 10, alignItems: 'center', gap: 3 },
  sensBtnActive: { borderColor: palette.paper, backgroundColor: palette.ochre },
  sensBtnLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 13, color: palette.paper },
  sensBtnDesc:  { fontFamily: 'SourceSans3_400Regular', fontSize: 11, color: palette.paperDim, textAlign: 'center' },
  aboutRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  aboutLabel:{ fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.muted },
  aboutValue:{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: '#F5E7C4' },
});
