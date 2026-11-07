// Entry: create a device-local player or pick a saved one.
// Wide screens: real engine demo left, entry panel right. Phones: one vertical sequence.
// Rendered by the root layout before the router stack exists, so legal docs open inline.
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LegalDocument, type LegalDoc } from '@/app/legal';
import { GameArena } from '@/components/GameArena';
import { BrandMark } from '@/components/ui/BrandMark';
import { Glyph } from '@/components/ui/Glyph';
import { Button, Shell } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { AVATAR_COLORS, AVATAR_EMOJIS, SavedAccountMeta, deleteAccount, getSavedAccounts, loginAccount } from '@/context/PlayerContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Saved avatar strings are preserved; the picker offers a distinct subset.
// The dragon renders with the same paw glyph as the lion, so it is not offered.
const EMBLEMS: { value: string; name: string }[] = [
  { value: AVATAR_EMOJIS[0]!, name: 'Controller' },
  { value: AVATAR_EMOJIS[1]!, name: 'Bolt' },
  { value: AVATAR_EMOJIS[2]!, name: 'Flame' },
  { value: AVATAR_EMOJIS[3]!, name: 'Skull' },
  { value: AVATAR_EMOJIS[4]!, name: 'Lion' },
  { value: AVATAR_EMOJIS[5]!, name: 'Crown' },
  { value: AVATAR_EMOJIS[7]!, name: 'Diamond' },
];
const COLORS: { value: string; name: string }[] = [
  { value: AVATAR_COLORS[0]!, name: 'Gold' },
  { value: AVATAR_COLORS[1]!, name: 'Red' },
  { value: AVATAR_COLORS[2]!, name: 'Sky blue' },
  { value: AVATAR_COLORS[3]!, name: 'Green' },
  { value: AVATAR_COLORS[5]!, name: 'Orange' },
];

const DEMO_BOTS = ['Bot North', 'Bot West', 'Bot East'];
const DEMO_RANKS = ['Gold', 'Gold', 'Gold'];

function validateName(name: string): string | null {
  if (name.length < 2) return 'Use at least 2 characters.';
  if (name.length > 16) return 'Use 16 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Use letters, numbers and underscores only.';
  return null;
}

function ArenaDemo({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const active = !reduced || started;
  return (
    <View style={{ width: size }}>
      <View style={[d.frame, { width: size, height: size }]}>
        {active ? (
          <GameArena
            key={run}
            arenaSize={size - 2}
            playerName="You"
            playerColor={palette.ochre}
            playerGlowColor={palette.ochre}
            botNames={DEMO_BOTS}
            botRanks={DEMO_RANKS}
            onGameOver={() => setRun(r => r + 1)}
            practice
            soundEnabled={false}
            colorBoard={false}
            botDifficulty="easy"
            paused={paused}
          />
        ) : (
          <View style={d.reduced}>
            <Text style={d.caption}>Demo paused while Reduce Motion is on.</Text>
            <Button label="Run demo" size="sm" variant="secondary" onPress={() => setStarted(true)} />
          </View>
        )}
      </View>
      <View style={d.row}>
        <Text style={[d.caption, { flex: 1 }]}>Live demo on the match engine. Three local bots, you at the bottom edge.</Text>
        {active ? (
          <Button label={paused ? 'Resume' : 'Pause'} icon={paused ? 'play' : 'pause'} size="sm" variant="ghost" onPress={() => setPaused(p => !p)} />
        ) : null}
      </View>
    </View>
  );
}

interface Props { onSuccess: (username: string, emoji: string, color: string, isNew?: boolean) => void }

export default function OnboardingScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;

  const [tab, setTab] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [touched, setTouched] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0]!);
  const [selectedEmoji, setSelectedEmoji] = useState<string>(AVATAR_EMOJIS[0]!);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountMeta[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  useEffect(() => {
    getSavedAccounts().then(a => { setSavedAccounts(a); setAccountsLoaded(true); }).catch(() => setAccountsLoaded(true));
  }, []);

  const trimmed = username.trim();
  const nameError = validateName(trimmed);

  async function handleSignUp() {
    setTouched(true);
    if (nameError) { setError(nameError); return; }
    setError(''); setLoading(true);
    try {
      await loginAccount(trimmed, selectedEmoji, selectedColor);
      onSuccess(trimmed, selectedEmoji, selectedColor, true);
    } catch { setError('The profile could not be saved on this device. Try again.'); }
    finally { setLoading(false); }
  }

  async function handleLogin(acct?: SavedAccountMeta) {
    const name = acct ? acct.username : loginInput.trim();
    if (!name) { setError('Enter the player name saved on this device.'); return; }
    const emoji = acct?.avatarEmoji ?? AVATAR_EMOJIS[0]!;
    const color = acct?.avatarColor ?? AVATAR_COLORS[0]!;
    setLoading(true);
    try {
      await loginAccount(name, emoji, color);
      onSuccess(name, emoji, color);
    } catch { setError('That profile could not be opened. Try again.'); }
    finally { setLoading(false); }
  }

  async function doDelete(name: string) {
    await deleteAccount(name);
    setSavedAccounts(prev => prev.filter(a => a.username !== name));
    setConfirmDelete(null);
  }

  // Legal opens inline; all entry state above stays mounted and is preserved.
  if (legal) {
    return <LegalDocument doc={legal} onDocChange={setLegal} onBack={() => setLegal(null)} backLabel="Back to entry" />;
  }

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 24) : insets.top;
  const demoSize = wide
    ? Math.max(280, Math.min(width - 36 - 420 - 40, height - topPad - 160, 560))
    : Math.min(width - 36, 300);

  const panel = (
    <View style={[s.panel, wide && { width: 420 }]}>
      <View style={s.tabRow} accessibilityRole="tablist">
        {(['signup', 'login'] as const).map(t => {
          const on = tab === t;
          return (
            <Pressable
              key={t}
              testID={`entry-tab-${t}`}
              onPress={() => { setTab(t); setError(''); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[s.tab, on && s.tabOn]}
            >
              <Text style={[s.tabText, on && s.tabTextOn]}>{t === 'signup' ? 'New player' : 'Saved players'}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'signup' ? (
        <View style={{ gap: 16 }}>
          <View style={s.field}>
            <Text style={s.label} nativeID="name-label">Player name</Text>
            <TextInput
              testID="entry-name"
              style={[s.input, touched && nameError ? s.inputError : null]}
              placeholder="2 to 16 letters, numbers or _"
              placeholderTextColor={palette.muted}
              value={username}
              onChangeText={v => { setUsername(v); setError(''); }}
              onBlur={() => setTouched(true)}
              maxLength={16}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              accessibilityLabel="Player name"
            />
            <View style={s.helpRow}>
              <Text style={[s.help, touched && nameError ? { color: palette.clay } : null]}>
                {touched && nameError ? nameError : trimmed.length > 0 && !nameError ? 'Name looks good.' : 'Shown to bots and party members.'}
              </Text>
              <Text style={s.help}>{username.length}/16</Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Emblem</Text>
            <View style={s.choiceRow} accessibilityRole="radiogroup">
              {EMBLEMS.map(e => {
                const on = selectedEmoji === e.value;
                return (
                  <Pressable
                    key={e.value}
                    onPress={() => setSelectedEmoji(e.value)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${e.name} emblem`}
                    accessibilityState={{ selected: on }}
                    style={[s.emblem, on && { borderColor: palette.ochre, borderWidth: 2, backgroundColor: palette.graphite2 }]}
                  >
                    <Glyph value={e.value} size={22} color={on ? palette.ochre : palette.paperDim} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Player colour</Text>
            <View style={s.choiceRow} accessibilityRole="radiogroup">
              {COLORS.map(c => {
                const on = selectedColor === c.value;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setSelectedColor(c.value)}
                    accessibilityRole="radio"
                    accessibilityLabel={c.name}
                    accessibilityState={{ selected: on }}
                    style={[s.swatchWrap, on && { borderColor: palette.paper }]}
                  >
                    <View style={[s.swatch, { backgroundColor: c.value }]}>
                      {on ? <Feather name="check" size={16} color={palette.ochreInk} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.preview} accessibilityLabel={`Preview: ${trimmed || 'your name'}`}>
            <View style={[s.previewAvatar, { borderColor: selectedColor }]}>
              <Glyph value={selectedEmoji} size={24} color={palette.paper} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.previewName} numberOfLines={1}>{trimmed || 'Your name'}</Text>
              <Text style={s.help}>Level 1 · new player</Text>
            </View>
            <View style={[s.previewPaddle, { backgroundColor: selectedColor }]} />
          </View>

          {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}

          <Button testID="entry-create" label="Create player" size="lg" loading={loading} onPress={handleSignUp} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {!accountsLoaded ? (
            <View style={[s.savedRow, { height: 64, backgroundColor: palette.graphite2 }]} />
          ) : savedAccounts.length === 0 ? (
            <View style={s.empty}>
              <Feather name="user-x" size={20} color={palette.muted} />
              <Text style={s.help}>No players are saved on this device yet. Create one from the New player tab.</Text>
            </View>
          ) : (
            savedAccounts.map(acct => (
              <View key={acct.username} style={s.savedRow}>
                {confirmDelete === acct.username ? (
                  <View style={s.confirm}>
                    <Text style={s.confirmText}>Delete {acct.username} and all of its progress from this device? This cannot be undone.</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button label="Keep" variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => setConfirmDelete(null)} />
                      <Button label="Delete" variant="danger" size="sm" style={{ flex: 1 }} onPress={() => void doDelete(acct.username)} />
                    </View>
                  </View>
                ) : (
                  <>
                    <Pressable
                      style={({ pressed }) => [s.savedMain, pressed && { backgroundColor: palette.graphite2 }]}
                      onPress={() => handleLogin(acct)}
                      accessibilityRole="button"
                      accessibilityLabel={`Continue as ${acct.username}, ${acct.rank}`}
                    >
                      <View style={[s.savedAvatar, { borderColor: acct.avatarColor }]}>
                        <Glyph value={acct.avatarEmoji} size={20} color={palette.paper} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.savedName} numberOfLines={1}>{acct.username}</Text>
                        <Text style={s.help}>{acct.rank}</Text>
                      </View>
                      <Text style={s.continueText}>Continue</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setConfirmDelete(acct.username)}
                      style={s.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${acct.username} from this device`}
                    >
                      <Feather name="trash-2" size={18} color={palette.clay} />
                    </Pressable>
                  </>
                )}
              </View>
            ))
          )}
          <View style={s.field}>
            <Text style={s.label}>Open by name</Text>
            <TextInput
              style={s.input}
              placeholder="Player name on this device"
              placeholderTextColor={palette.muted}
              value={loginInput}
              onChangeText={v => { setLoginInput(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
              accessibilityLabel="Player name on this device"
            />
          </View>
          {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button label="Continue" size="lg" loading={loading} onPress={() => handleLogin()} />
        </View>
      )}

      <Text style={s.localNote}>
        Players are saved on this device only. There is no cloud account, and progress cannot be recovered if the app data is removed.
      </Text>
      <View style={s.legalRow}>
        <Pressable onPress={() => setLegal('terms')} accessibilityRole="link" style={s.legalLink}>
          <Text style={s.legalText}>Terms of Service</Text>
        </Pressable>
        <Pressable onPress={() => setLegal('privacy')} accessibilityRole="link" style={s.legalLink}>
          <Text style={s.legalText}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 24, flexGrow: 1, justifyContent: wide ? 'center' : 'flex-start' }}
        keyboardShouldPersistTaps="handled"
      >
        <Shell>
          <View style={s.brandRow}>
            <BrandMark size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.brand} accessibilityRole="header">GoldRush Arena</Text>
              <Text style={s.tagline}>Four paddles, one court. Keep the puck out of your goal.</Text>
            </View>
          </View>
          <View style={[wide ? s.wideRow : { gap: 20 }, { marginTop: 20 }]}>
            {wide ? <ArenaDemo size={demoSize} /> : null}
            {panel}
            {!wide ? <View style={{ alignItems: 'center' }}><ArenaDemo size={demoSize} /></View> : null}
          </View>
        </Shell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const d = StyleSheet.create({
  frame: { borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.ink, overflow: 'hidden', borderRadius: 2 },
  reduced: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: palette.muted },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { fontFamily: fonts.display, fontSize: 32, color: palette.paper, letterSpacing: 0.5 },
  tagline: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.paperDim, alignSelf: 'stretch', flexShrink: 1 },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 40 },
  panel: { backgroundColor: palette.graphite, borderWidth: 2, borderColor: '#CCAD6A', borderRadius: 0, padding: 20, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: palette.line },
  tabOn: { borderBottomColor: palette.ochre },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: palette.paperDim },
  tabTextOn: { color: palette.paper },
  field: { gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.paper },
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: 3, backgroundColor: palette.ink, color: palette.paper, fontFamily: fonts.body, fontSize: 17, paddingHorizontal: 14 },
  inputError: { borderColor: palette.clay, borderWidth: 2 },
  helpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  help: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, flexShrink: 1 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emblem: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 3 },
  swatchWrap: { width: 46, height: 46, padding: 3, borderWidth: 2, borderColor: 'transparent', borderRadius: 3 },
  swatch: { flex: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 3, backgroundColor: palette.ink },
  previewAvatar: { width: 46, height: 46, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontFamily: fonts.display, fontSize: 22, color: palette.paper },
  previewPaddle: { width: 36, height: 6, borderRadius: 1 },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.clay },
  empty: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderWidth: 1, borderColor: palette.line, borderRadius: 3 },
  savedRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: palette.line, borderRadius: 3, overflow: 'hidden' },
  savedMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 56 },
  savedAvatar: { width: 40, height: 40, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  savedName: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.paper },
  continueText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.ochre },
  deleteBtn: { width: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: palette.line },
  confirm: { flex: 1, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.body, fontSize: 14, color: palette.paper, lineHeight: 20 },
  localNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted },
  legalRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  legalText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.paper, textDecorationLine: 'underline' },
});
