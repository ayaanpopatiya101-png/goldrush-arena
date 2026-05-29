import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AVATAR_COLORS, AVATAR_EMOJIS, SavedAccountMeta, getSavedAccounts, loginAccount } from '@/context/PlayerContext';

interface Props { onSuccess: (username: string, emoji: string, color: string) => void }

// ─── Floating orb ──
function Orb({ color, size, x, y, duration }: { color: string; size: number; x: number; y: number; duration: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: duration * 0.85, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.06, 0.12, 0.06] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }],
    }} />
  );
}

export default function OnboardingScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab]               = useState<'signup' | 'login'>('signup');
  const [username, setUsername]     = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(AVATAR_EMOJIS[0]);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountMeta[]>([]);
  const [loginInput, setLoginInput] = useState('');

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(80)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,    { toValue: 1, duration: 900,  useNativeDriver: true }),
      Animated.timing(slideUp,   { toValue: 0, duration: 750,  useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
    getSavedAccounts().then(setSavedAccounts);
  }, []);

  async function handleSignUp() {
    const name = username.trim();
    if (name.length < 2) { setError('At least 2 characters please!'); return; }
    if (name.length > 16) { setError('Max 16 characters.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { setError('Letters, numbers, and _ only.'); return; }
    setError(''); setLoading(true);
    try {
      await loginAccount(name, selectedEmoji, selectedColor);
      onSuccess(name, selectedEmoji, selectedColor);
    } catch { setError('Something went wrong. Try again.'); }
    finally   { setLoading(false); }
  }

  async function handleLogin(acct?: SavedAccountMeta) {
    const name = acct ? acct.username : loginInput.trim();
    if (!name) { setError('Enter a username.'); return; }
    const emoji = acct?.avatarEmoji ?? AVATAR_EMOJIS[0];
    const color = acct?.avatarColor ?? AVATAR_COLORS[0];
    setLoading(true);
    try {
      await loginAccount(name, emoji, color);
      onSuccess(name, emoji, color);
    } catch { setError('Something went wrong.'); }
    finally   { setLoading(false); }
  }

  const glowColor = glowPulse.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.45)'] });
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Background */}
      <LinearGradient colors={['#040010', '#0A0030', '#030018']} style={StyleSheet.absoluteFill} />
      <Orb color="#FFD700" size={280} x={-80}  y={40}  duration={5000} />
      <Orb color="#FF4757" size={220} x={180}  y={180} duration={4200} />
      <Orb color="#00BFFF" size={260} x={-40}  y={380} duration={5800} />
      <Orb color="#00FF88" size={180} x={200}  y={550} duration={4600} />
      <Orb color="#BF5FFF" size={200} x={80}   y={680} duration={5400} />

      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo section ── */}
        <Animated.View style={[s.logoSection, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
          <Text style={s.crown}>👑</Text>
          <Animated.Text style={[s.logoTitle, { textShadowColor: glowColor as never }]}>
            GOLDRUSH
          </Animated.Text>
          <Text style={s.logoArena}>ARENA</Text>
          <Text style={s.tagline}>4-Player Air Hockey · Last One Standing</Text>

          {/* Stat pills */}
          <View style={s.pills}>
            {[
              { icon: '👥', label: '4 PLAYERS' },
              { icon: '❤️', label: '5 LIVES' },
              { icon: '⚡', label: 'POWER-UPS' },
              { icon: '🏆', label: '8 RANKS' },
            ].map(p => (
              <View key={p.label} style={s.pill}>
                <Text style={s.pillIcon}>{p.icon}</Text>
                <Text style={s.pillLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View style={[s.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          {/* Tab switcher */}
          <View style={s.tabRow}>
            {(['signup', 'login'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => { setTab(t); setError(''); }}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
              >
                <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
                  {t === 'signup' ? 'SIGN UP' : 'LOG IN'}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'signup' ? (
            <>
              {/* Username */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>YOUR NAME</Text>
                <View style={s.inputWrap}>
                  <Feather name="user" size={16} color="#FFFFFF44" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={s.input}
                    placeholder="Choose a username..."
                    placeholderTextColor="#FFFFFF33"
                    value={username}
                    onChangeText={v => { setUsername(v); setError(''); }}
                    maxLength={16}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  <Text style={s.charCount}>{username.length}/16</Text>
                </View>
              </View>

              {/* Avatar emoji */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>PICK YOUR ICON</Text>
                <View style={s.emojiRow}>
                  {AVATAR_EMOJIS.map(e => (
                    <Pressable
                      key={e}
                      onPress={() => setSelectedEmoji(e)}
                      style={[s.emojiBtn, selectedEmoji === e && { borderColor: selectedColor, backgroundColor: selectedColor + '22', transform: [{ scale: 1.15 }] }]}
                    >
                      <Text style={s.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Avatar color */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>PICK YOUR COLOR</Text>
                <View style={s.colorRow}>
                  {AVATAR_COLORS.map(c => (
                    <Pressable key={c} onPress={() => setSelectedColor(c)} style={[s.colorDot, { backgroundColor: c, borderColor: selectedColor === c ? '#FFFFFF' : 'transparent', transform: [{ scale: selectedColor === c ? 1.25 : 1 }] }]}>
                      {selectedColor === c && <View style={s.colorCheck}><Feather name="check" size={10} color="#000" /></View>}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Avatar preview */}
              <View style={s.avatarPreview}>
                <View style={[s.avatarCircle, { borderColor: selectedColor, backgroundColor: selectedColor + '33' }]}>
                  <Text style={s.avatarPreviewEmoji}>{selectedEmoji}</Text>
                </View>
                <View>
                  <Text style={[s.previewName, { color: selectedColor }]}>{username || 'Your Name'}</Text>
                  <Text style={s.previewRank}>Iron · Level 1</Text>
                </View>
              </View>

              {error !== '' && <Text style={s.errorText}>{error}</Text>}

              <Pressable onPress={handleSignUp} disabled={loading} style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={['#FFE233', '#FFAA00']} style={s.ctaGrad}>
                  {loading
                    ? <Text style={s.ctaText}>ENTERING...</Text>
                    : <><Feather name="play" size={20} color="#080814" /><Text style={s.ctaText}>ENTER THE ARENA</Text></>
                  }
                </LinearGradient>
              </Pressable>

              <Text style={s.terms}>By continuing, you agree to our Terms of Service</Text>
            </>
          ) : (
            <>
              {/* Saved accounts */}
              {savedAccounts.length > 0 && (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>YOUR ACCOUNTS</Text>
                  {savedAccounts.map(acct => (
                    <Pressable key={acct.username} onPress={() => handleLogin(acct)} style={s.savedAccount}>
                      <View style={[s.savedAvatar, { borderColor: acct.avatarColor, backgroundColor: acct.avatarColor + '22' }]}>
                        <Text style={s.savedAvatarEmoji}>{acct.avatarEmoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.savedName}>{acct.username}</Text>
                        <Text style={s.savedRank}>{acct.rank}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color="#FFFFFF44" />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Manual login */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>{savedAccounts.length > 0 ? 'OR ENTER USERNAME' : 'ENTER USERNAME'}</Text>
                <View style={s.inputWrap}>
                  <Feather name="user" size={16} color="#FFFFFF44" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={s.input}
                    placeholder="Your username..."
                    placeholderTextColor="#FFFFFF33"
                    value={loginInput}
                    onChangeText={v => { setLoginInput(v); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => handleLogin()}
                  />
                </View>
              </View>

              {error !== '' && <Text style={s.errorText}>{error}</Text>}

              <Pressable onPress={() => handleLogin()} disabled={loading} style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={['#FFE233', '#FFAA00']} style={s.ctaGrad}>
                  <Feather name="log-in" size={20} color="#080814" />
                  <Text style={s.ctaText}>{loading ? 'LOGGING IN...' : 'CONTINUE'}</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </Animated.View>

        {/* Social proof */}
        <Animated.View style={[s.social, { opacity: fadeIn }]}>
          <Text style={s.socialText}>🌍 Join players worldwide</Text>
          <View style={s.socialDots}>
            {['#FFD700','#FF4757','#00BFFF','#00FF88'].map(c => (
              <View key={c} style={[s.socialDot, { backgroundColor: c }]} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  logoSection: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  crown: { fontSize: 44, marginBottom: 4 },
  logoTitle: {
    color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 44, letterSpacing: 5,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  logoArena: {
    color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 10,
    marginTop: -8, textShadowColor: '#FFFFFF44', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  tagline: { color: '#FFFFFF66', fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 1, textAlign: 'center', marginTop: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF12', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FFFFFF18' },
  pillIcon: { fontSize: 12 },
  pillLabel: { color: '#FFFFFFBB', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.8 },

  card: { marginHorizontal: 16, backgroundColor: '#0E0E24F0', borderRadius: 24, borderWidth: 1.5, borderColor: '#FFFFFF18', padding: 20, gap: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF0A', borderRadius: 12, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#FFD700' },
  tabBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5, color: '#FFFFFF55' },
  tabBtnTextActive: { color: '#080814' },

  field: { gap: 8 },
  fieldLabel: { color: '#FFFFFF55', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF0A', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF18', height: 50 },
  input: { flex: 1, paddingHorizontal: 12, color: '#F0F0FF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  charCount: { color: '#FFFFFF33', fontFamily: 'Inter_400Regular', fontSize: 11, paddingRight: 12 },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFFFFF18', backgroundColor: '#FFFFFF08', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 22 },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  colorCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF88', alignItems: 'center', justifyContent: 'center' },

  avatarPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF08', borderRadius: 14, padding: 12 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarPreviewEmoji: { fontSize: 28 },
  previewName: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  previewRank: { color: '#FFFFFF55', fontFamily: 'Inter_500Medium', fontSize: 12 },

  errorText: { color: '#FF4757', fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 8 },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  ctaText: { color: '#080814', fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 1.5 },
  terms: { color: '#FFFFFF33', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  savedAccount: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF08', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FFFFFF12' },
  savedAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  savedAvatarEmoji: { fontSize: 22 },
  savedName: { color: '#F0F0FF', fontFamily: 'Inter_700Bold', fontSize: 15 },
  savedRank: { color: '#FFFFFF66', fontFamily: 'Inter_500Medium', fontSize: 11 },

  social: { alignItems: 'center', gap: 8, paddingTop: 20 },
  socialText: { color: '#FFFFFF44', fontFamily: 'Inter_500Medium', fontSize: 12 },
  socialDots: { flexDirection: 'row', gap: 6 },
  socialDot: { width: 8, height: 8, borderRadius: 4 },
});
