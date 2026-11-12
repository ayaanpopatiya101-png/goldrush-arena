import { Text } from '@/components/ui/Text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Button, Shell, ScreenTitle } from '@/components/ui/Primitives';
import { GameArena } from '@/components/GameArena';
import { palette, tactile , PLAYER_COLORS } from '@/constants/colors';
import { LinearGradient } from '@/components/ui/Flat';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/hooks/useSettings';
import { usePlayer } from '@/context/PlayerContext';
import { FloatingOrbs, GlowBorder } from '@/components/effects';
import { Glyph } from '@/components/ui/Glyph';
import { SupportHelp } from '@/components/SupportHelp';
import { cancelAutomaticRematch } from '@/store/rematch';
import { SmsReminderPanel } from '@/components/SmsReminderPanel';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
        <Feather name={icon as never} size={18} color={palette.foreground} />
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
  const { settings, updateSetting, resetSettings, error } = useSettings();
  const reducedMotion = useReducedMotion();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [practiceKey, setPracticeKey] = useState(0);
  const { width } = useWindowDimensions();
  const practiceSize = Math.min(width - 64, 320);
  const { profile, logout } = usePlayer();
  const safe   = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(safe.top, 67) : safe.top;

  function handleLogout() {
    const signOut = () => {
      setLogoutError(null);
      void logout().catch(() => setLogoutError('Could not complete sign-out or cancel reminders. Connect and retry. For SMS, reply STOP to the GoldRush sender; device settings only stop device notifications.'));
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out? You will be returned to the login screen.')) signOut();
      return;
    }
    Alert.alert('Sign Out', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  function handleReset() {
    cancelAutomaticRematch();
    const message = 'Reset comfort and sound settings? Progress, purchases and bank lives will not change.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void resetSettings();
    } else Alert.alert('Reset settings?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset settings', onPress: () => { void resetSettings(); } },
    ]);
  }

  return (
    <Reanimated.View entering={reducedMotion ? undefined : FadeIn.duration(350)} style={{ flex: 1 }}>
      <LinearGradient colors={[palette.background, palette.surface, palette.background]} style={StyleSheet.absoluteFill} />
      <FloatingOrbs opacity={0.4} />
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Play" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.back}>
          <Feather name="arrow-left" size={22} color={palette.foreground} />
        </Pressable>
        <ScreenTitle title="Settings" kicker="Your arcade" style={{ flex: 1, marginHorizontal: 8 }} />
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        bottomOffset={60}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: safe.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Shell variant="prose" style={{ gap: 20 }}>
        {/* ── Account ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>ACCOUNT</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
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
            {logoutError ? <Text accessibilityRole="alert" style={[s.rowSub, { padding: 14 }]}>{logoutError}</Text> : null}
            <Pressable onPress={handleLogout} style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: palette.surface }]}>
                <Feather name="log-out" size={18} color={palette.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: palette.foreground }]}>Sign Out</Text>
                <Text style={s.rowSub}>Return to login screen</Text>
              </View>
              <Feather name="chevron-right" size={16} color={palette.supporting} />
            </Pressable>
          </View>
        </View>

        {/* ── Audio ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>EVENT REMINDERS</Text>
          <View style={s.card}>
            <Pressable testID="open-event-notifications" accessibilityRole="button"
              accessibilityLabel="Event notification settings" style={s.row}
              onPress={() => router.push('/(tabs)/events')}>
              <View style={s.rowIcon}><Feather name="bell" size={18} color={palette.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Phone event reminders</Text>
                <Text style={s.rowSub}>Installed app: allow alerts, choose events and set how early to be reminded. Browser: in-app reminders only. Texts are managed separately below.</Text>
              </View>
              <Feather name="chevron-right" size={18} color={palette.supporting} />
            </Pressable>
          </View>
          <SmsReminderPanel source="settings" />
        </View>

        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>AUDIO</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
          </View>
          <View style={s.card}>
            <SettingRow icon="volume-x" title="Mute all audio" subtitle="Overrides game, music and celebration sounds"
              right={<Switch accessibilityLabel="Mute all audio" value={!settings.soundEnabled}
                onValueChange={v => updateSetting('soundEnabled', !v)} />} />
            <SettingRow icon="award" title="Celebration sounds" subtitle="Match results and rank-up fanfares"
              right={<Switch accessibilityLabel="Celebration sounds" value={settings.celebrationSoundEnabled}
                onValueChange={v => updateSetting('celebrationSoundEnabled', v)} />} />
            <SettingRow
              icon="music"
              title="Background Music"
              subtitle="Looping arcade soundtrack"
              right={
                <Switch
                  accessibilityLabel="Background music"
                  value={settings.musicEnabled}
                  onValueChange={v => updateSetting('musicEnabled', v)}
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={settings.musicEnabled ? palette.foreground : palette.supporting}
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
                  accessibilityLabel="Game sound effects"
                  value={settings.gameSoundEnabled}
                  onValueChange={v => updateSetting('gameSoundEnabled', v)}
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={settings.gameSoundEnabled ? palette.foreground : palette.supporting}
                />
              }
            />
          </View>
        </View>

        {/* ── Visual ── */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.sectionTitle}>ACCESSIBILITY</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
          </View>
          <View style={s.card}>
            {/* Color-shifting board and goal emoji toggles hidden by the visual rules; stored values are kept. */}
            <SettingRow
              icon="zap"
              title="Screen Shake"
              subtitle="Arena shakes on every goal"
              right={
                <Switch
                  accessibilityLabel="Screen shake"
                  value={settings.screenShake}
                  onValueChange={v => updateSetting('screenShake', v)}
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={settings.screenShake ? palette.foreground : palette.supporting}
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
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
          </View>
          <View style={s.card}>
            <Text style={[s.rowTitle, { paddingHorizontal: 14, paddingTop: 14 }]}>Paddle Sensitivity</Text>
            <Text style={[s.rowSub, { paddingHorizontal: 14, marginBottom: 10 }]}>How fast your paddle reacts to swipes</Text>
            <View style={s.sensitivityRow}>
              {SENSITIVITY_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityLabel={`${opt.label} paddle sensitivity. ${opt.desc}`}
                  accessibilityState={{ checked: settings.sensitivity === opt.value }}
                  aria-checked={settings.sensitivity === opt.value}
                  onPress={() => updateSetting('sensitivity', opt.value)}
                  style={({ pressed }) => [s.sensBtn, settings.sensitivity === opt.value && s.sensBtnActive, pressed && { borderBottomWidth: 2, transform: [{ translateY: 3 }] }]}
                >
                  <Text style={[s.sensBtnLabel, settings.sensitivity === opt.value && { color: palette.onAccent }]}>
                    {opt.label}
                  </Text>
                  <Text style={[s.sensBtnDesc, settings.sensitivity === opt.value && { color: palette.onAccent }]}>
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
                  <GameArena key={practiceKey} arenaSize={practiceSize} playerName="You" playerColor={PLAYER_COLORS[0]} playerGlowColor={PLAYER_COLORS[0]}
                    botNames={['North bot', 'West bot', 'East bot']} botRanks={['Bronze 1', 'Bronze 1', 'Bronze 1']}
                    sensitivity={settings.sensitivity} practice botDifficulty="easy" botSkill={0} soundEnabled={settings.soundEnabled}
                    onGameOver={() => setPracticeKey(key => key + 1)} />
                </View>
              </>}
              <SettingRow icon="eye" title="Reduced motion" subtitle="Reduce decorative motion. OS Reduce Motion also applies."
                right={<Switch accessibilityLabel="Reduced effects" value={settings.reducedEffects} onValueChange={value => updateSetting('reducedEffects', value)} />} />
            </View>
          </View>
        </View>

        {/* ── Controls (continued): match preferences ── */}
        <View style={s.section}>
          <View style={s.card}>
            <SettingRow icon="repeat" title="Automatic next match" subtitle="15 seconds to read results. Cancel anytime. Solo play only; no bank lives selected."
              right={<Switch accessibilityLabel="Automatic next match" value={settings.autoRematch}
                onValueChange={v => { cancelAutomaticRematch(); void updateSetting('autoRematch', v); }} />} />
            <SettingRow
              icon="smartphone"
              title="Haptic Feedback"
              subtitle="Vibrations on hits, goals and match events"
              right={
                <Switch
                  accessibilityLabel="Haptic feedback"
                  value={settings.hapticsEnabled ?? true}
                  onValueChange={v => updateSetting('hapticsEnabled', v)}
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={(settings.hapticsEnabled ?? true) ? palette.foreground : palette.supporting}
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
                  accessibilityLabel="Show rules in lobby"
                  value={settings.showLobbyRules ?? true}
                  onValueChange={v => updateSetting('showLobbyRules', v)}
                  trackColor={{ false: palette.border, true: palette.primary }}
                  thumbColor={(settings.showLobbyRules ?? true) ? palette.foreground : palette.supporting}
                />
              }
            />
          </View>
          <Button label="Reset settings to defaults" variant="secondary" onPress={handleReset} />
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
            <View style={{ flex: 1, height: 1, backgroundColor: palette.border }} />
          </View>
          <View style={s.card}>
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="shield" size={18} color={palette.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Privacy Policy</Text>
                <Text style={s.rowSub}>How we handle your data</Text>
              </View>
                <Feather name="chevron-right" size={16} color={palette.supporting} />
            </Pressable>
            <View style={s.divider} />
            <Pressable onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })} style={s.row}>
              <View style={s.rowIcon}>
                <Feather name="file-text" size={18} color={palette.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Terms of Service</Text>
                <Text style={s.rowSub}>Rules and license agreement</Text>
              </View>
                <Feather name="chevron-right" size={16} color={palette.supporting} />
            </Pressable>
            <View style={s.divider} />
            <Pressable testID="open-support-help" onPress={() => setHelpOpen(value => !value)} style={s.row} accessibilityRole="button" accessibilityLabel="Help and support" accessibilityState={{ expanded: helpOpen }} aria-expanded={helpOpen}>
              <View style={s.rowIcon}>
                <Feather name="help-circle" size={18} color={palette.supporting} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Help & support</Text>
                <Text style={s.rowSub}>Purchase recovery, saved players and contact information</Text>
              </View>
              <Feather name={helpOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.supporting} />
            </Pressable>
            {helpOpen ? <SupportHelp onOpenShop={() => router.push('/(tabs)/shop')} /> : null}
            <View style={s.divider} />
            <Pressable
              onPress={async () => {
                await AsyncStorage.removeItem('@onboarding_flow_done');
                router.push('/onboarding-flow' as never);
              }}
              style={s.row}
            >
              <View style={[s.rowIcon, { backgroundColor: palette.surface }]}>
                <Feather name="book-open" size={18} color={palette.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>Replay Tutorial</Text>
                <Text style={s.rowSub}>Replay the playable introduction and practice controls</Text>
              </View>
              <Feather name="chevron-right" size={16} color={palette.supporting} />
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
              <View style={[s.rowIcon, { backgroundColor: palette.gold }]}>
                <Feather name="star" size={18} color={palette.onAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: palette.foreground }]}>Rate GoldRush Arena</Text>
                <Text style={s.rowSub}>Enjoying the game? Leave a review!</Text>
              </View>
              <Feather name="chevron-right" size={16} color={palette.supporting} />
            </Pressable>
          </View>
        </View>
        </Shell>
      </KeyboardAwareScrollViewCompat>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  back:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, backgroundColor: palette.background },
  title:     { fontFamily: 'SourceSans3_700Bold', fontSize: 16, letterSpacing: 2, color: palette.foreground },
  section:   { gap: 8 },
  sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 15, letterSpacing: 1.6, color: palette.supporting, textTransform: 'uppercase' },
  card:      { borderRadius: 0, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, backgroundColor: palette.surface, overflow: 'hidden' },
  divider:   { height: 2, backgroundColor: palette.background },
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, minHeight: 60, gap: 14 },
  rowIcon:   { width: 36, height: 36, borderRadius: 0, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' },
  rowTitle:  { fontFamily: 'SourceSans3_600SemiBold', fontSize: 16, color: palette.foreground },
  rowSub:    { fontFamily: 'SourceSans3_400Regular', fontSize: 14, lineHeight: 20, color: palette.muted, marginTop: 2 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: palette.surface, borderTopWidth: 6, borderTopColor: palette.navy },
  accountAvatar: { width: 52, height: 52, borderRadius: 0, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  accountEmoji: { fontSize: 22 },
  accountName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, textTransform: 'uppercase', color: palette.foreground },
  accountSub:  { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting, marginTop: 2 },
  accountStats: { alignItems: 'center', gap: 2, minWidth: 38 },
  accountStatVal: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: palette.foreground },
  accountStatLbl: { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.supporting, letterSpacing: 0.5 },
  sensitivityRow: { flexDirection: 'row', padding: 12, gap: 8 },
  sensBtn:   { flex: 1, minHeight: 64, borderRadius: 0, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.border, backgroundColor: palette.background, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 3 },
  sensBtnActive: { borderColor: palette.edge, backgroundColor: palette.primary },
  sensBtnLabel: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.foreground },
  sensBtnDesc:  { fontFamily: 'SourceSans3_400Regular', fontSize: 12, color: palette.foreground, textAlign: 'center' },
  aboutRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  aboutLabel:{ fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: palette.muted },
  aboutValue:{ fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: palette.foreground },
});
