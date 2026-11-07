import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from '@/components/ui/Flat';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Easing, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AVATAR_COLORS, AVATAR_EMOJIS, SavedAccountMeta, deleteAccount, getSavedAccounts, loginAccount } from '@/context/PlayerContext';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

const { width: SW, height: SH } = Dimensions.get('window');

const PLAYER_COLORS = ['#F0B429', '#E04A2F', '#EDE3CC', '#9CC93E'] as const;
const PLAYER_EMOJIS = ['⚔️', '🛡️', '🔮', '🏹'] as const;
const PARTICLE_CHARS = ['✨', '💫', '⭐', '🪙', '⚡', '🔥'];

// ─── Stars background ─────────────────────────────────────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,   // golden-angle distribution
  y: (i * 97.3 + 11) % 100,
  size: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
  twinkle: i % 4 === 0,
  delay: (i * 233) % 3000,
}));

function StarField() {
  const anims = useRef(STARS.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    STARS.forEach((s, i) => {
      if (!s.twinkle) return;
      const loop = staticLoop(Animated.sequence([
        Animated.delay(s.delay),
        Animated.timing(anims[i], { toValue: 0.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(anims[i], { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ]));
      loop.start();
    });
  }, []);

  if (anims.length >= 0) return null; // star field removed by the visual rules
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((s, i) => (
        <Animated.View key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%` as any,
          top:  `${s.y}%` as any,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: '#F3EAD3',
          opacity: anims[i],
        }} />
      ))}
    </View>
  );
}

// ─── Shockwave ring ────────────────────────────────────────────────────────────
function Shockwave({ anim }: { anim: Animated.Value }) {
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute',
      width: 120, height: 120, borderRadius: 3,
      borderWidth: 3, borderColor: '#F0B429',
      opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3.5] }) }],
    }} />
  );
}

// ─── Floating particle ────────────────────────────────────────────────────────
function Particle({ x, delay, duration, char, startY }: {
  x: number; delay: number; duration: number; char: string; startY: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      staticLoop(
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }, delay);
    return () => clearTimeout(id);
  }, []);
  return (
    <Animated.Text pointerEvents="none" style={{
      position: 'absolute', left: x, top: startY, fontSize: 13,
      opacity:   anim.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 0.6, 0] }),
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -SH * 0.5] }) }],
    }}>
      {char}
    </Animated.Text>
  );
}

// ─── Warrior badge ────────────────────────────────────────────────────────────
function Warrior({ color, emoji, enterAnim, size = 56 }: {
  color: string; emoji: string; enterAnim: Animated.Value; size?: number;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = staticLoop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.09, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    const t = setTimeout(() => loop.start(), 1600);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);
  return (
    <Animated.View style={{
      alignItems: 'center', justifyContent: 'center',
      opacity: enterAnim,
      transform: [
        { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
        { scale: pulse },
      ],
    }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color + '22', borderWidth: 2, borderColor: color + '90',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0,
      }}>
        <Glyph style={{ fontSize: size * 0.44 }} value={emoji} />
      </View>
      <View style={{
        width: size * 0.85, height: 9, borderRadius: 3, backgroundColor: color,
        marginTop: 5, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0,
      }} />
    </Animated.View>
  );
}

// ─── Arena scene ─────────────────────────────────────────────────────────────
const SCENE_SIZE = Math.min(SW - 24, 300);
const WARRIOR_W  = 52;
const SCENE_PAD  = WARRIOR_W + 8;

function ArenaScene({ w1, w2, w3, w4, ballGlowAnim, ballEnter, ringRotate }: {
  w1: Animated.Value; w2: Animated.Value; w3: Animated.Value; w4: Animated.Value;
  ballGlowAnim: Animated.Value; ballEnter: Animated.Value; ringRotate: Animated.Value;
}) {
  const S  = SCENE_SIZE;
  const AR = (S - SCENE_PAD * 2) / 2;
  const AC = S / 2;

  return (
    <View style={{ width: S, height: S, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG base */}
      <Svg width={S} height={S} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={AC} cy={AC} r={AR} fill="#15372F" />
        <Circle cx={AC} cy={AC} r={AR}        fill="none" stroke="#F3EAD330" strokeWidth={2} />
        <Circle cx={AC} cy={AC} r={AR * 0.55} fill="none" stroke="#F3EAD314" strokeWidth={1} />
        <Circle cx={AC} cy={AC} r={AR * 0.17} fill="none" stroke="#F0B42955" strokeWidth={1.5} />
        <Line x1={AC} y1={SCENE_PAD} x2={AC} y2={S - SCENE_PAD} stroke="#F3EAD30C" strokeWidth={1} />
        <Line x1={SCENE_PAD} y1={AC} x2={S - SCENE_PAD} y2={AC} stroke="#F3EAD30C" strokeWidth={1} />
      </Svg>


      {/* BOTTOM warrior */}
      <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center',
        opacity: w1, transform: [{ translateY: w1.interpolate({ inputRange: [0, 1], outputRange: [55, 0] }) }, { scale: w1.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
        <Warrior color={PLAYER_COLORS[0]} emoji={PLAYER_EMOJIS[0]} enterAnim={w1} size={WARRIOR_W} />
      </Animated.View>

      {/* TOP warrior */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
        opacity: w2, transform: [{ translateY: w2.interpolate({ inputRange: [0, 1], outputRange: [-55, 0] }) }, { scale: w2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
        <Warrior color={PLAYER_COLORS[1]} emoji={PLAYER_EMOJIS[1]} enterAnim={w2} size={WARRIOR_W} />
      </Animated.View>

      {/* LEFT warrior */}
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center',
        opacity: w3, transform: [{ translateX: w3.interpolate({ inputRange: [0, 1], outputRange: [-55, 0] }) }, { scale: w3.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
        <Warrior color={PLAYER_COLORS[2]} emoji={PLAYER_EMOJIS[2]} enterAnim={w3} size={WARRIOR_W - 8} />
      </Animated.View>

      {/* RIGHT warrior */}
      <Animated.View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center',
        opacity: w4, transform: [{ translateX: w4.interpolate({ inputRange: [0, 1], outputRange: [55, 0] }) }, { scale: w4.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
        <Warrior color={PLAYER_COLORS[3]} emoji={PLAYER_EMOJIS[3]} enterAnim={w4} size={WARRIOR_W - 8} />
      </Animated.View>

      {/* Ball + shockwave */}
      <Animated.View style={{
        position: 'absolute', width: 30, height: 30, borderRadius: 3,
        backgroundColor: '#F0B429',
        top: AC - 15, left: AC - 15,
        opacity: ballEnter,
        transform: [{ scale: ballEnter.interpolate({ inputRange: [0, 0.4, 0.7, 1], outputRange: [0.1, 1.5, 0.9, 1.1] }) }],
        shadowColor: '#F0B429', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0,
      }} />
    </View>
  );
}

// ─── Shimmer CTA button ───────────────────────────────────────────────────────
function ShimmerButton({ onPress, loading, label, icon }: {
  onPress: () => void; loading: boolean; label: string; icon?: string;
}) {
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    staticLoop(Animated.sequence([
      Animated.delay(1800),
      Animated.timing(shimmer, { toValue: 1, duration: 650, useNativeDriver: true, easing: Easing.ease }),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={['#F0B429', '#F0B429', '#C98E12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
        {icon ? <Feather name={icon as never} size={22} color="#0E2621" /> : null}
        <Text style={s.ctaText}>{loading ? 'ENTERING...' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ─── "ENTER ARENA" splash CTA ─────────────────────────────────────────────────
function EnterButton({ onPress, anim }: { onPress: () => void; anim: Animated.Value }) {
  const glow  = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    staticLoop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
    ])).start();
    staticLoop(Animated.sequence([
      Animated.delay(1400),
      Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.ease }),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
    }}>
      <Pressable onPress={onPress} style={({ pressed }) => [s.enterBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
        <LinearGradient
          colors={['#F0B429', '#F0B429', '#F0B429']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.enterGrad}
        >
          <Feather name="play" size={24} color="#0E2621" />
          <Text style={s.enterText}>ENTER ARENA</Text>
          <Feather name="chevron-right" size={20} color="#0E2621AA" />
        </LinearGradient>
      </Pressable>

      {/* Tap hint */}
      <Animated.Text style={[s.tapHint, { opacity: anim }]}>
        TAP TO CHOOSE YOUR HERO
      </Animated.Text>
    </Animated.View>
  );
}

// ─── Main onboarding ──────────────────────────────────────────────────────────
interface Props { onSuccess: (username: string, emoji: string, color: string, isNew?: boolean) => void }

export default function OnboardingScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();

  const [phase, setPhase]                   = useState<'splash' | 'form'>('splash');
  const [tab, setTab]                       = useState<'signup' | 'login'>('signup');
  const [username, setUsername]             = useState('');
  const [selectedColor, setSelectedColor]   = useState(AVATAR_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji]   = useState(AVATAR_EMOJIS[0]);
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [savedAccounts, setSavedAccounts]   = useState<SavedAccountMeta[]>([]);
  const [loginInput, setLoginInput]         = useState('');

  // ── Animation refs ────────────────────────────────────────────────────────
  const logoY        = useRef(new Animated.Value(-80)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.6)).current;
  const arenaOpacity = useRef(new Animated.Value(0)).current;
  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;
  const w3 = useRef(new Animated.Value(0)).current;
  const w4 = useRef(new Animated.Value(0)).current;
  const ballEnter    = useRef(new Animated.Value(0)).current;
  const ballGlow     = useRef(new Animated.Value(0)).current;
  const logoPulse    = useRef(new Animated.Value(1)).current;
  const bgGlow       = useRef(new Animated.Value(0)).current;
  const ringRotate   = useRef(new Animated.Value(0)).current;
  const enterBtnAnim = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const formY         = useRef(new Animated.Value(SH * 0.6)).current;
  const formOpacity   = useRef(new Animated.Value(0)).current;

  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * (SW - 40),
    startY: SH * 0.25 + Math.random() * SH * 0.3,
    delay: Math.random() * 4000,
    duration: 3000 + Math.random() * 3000,
    char: PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)],
  })), []);

  useEffect(() => {
    getSavedAccounts().then(setSavedAccounts);

    // ── Stage 1: Logo in ──────────────────────────────────────────────
    Animated.parallel([
      Animated.spring(logoY,      { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.spring(logoScale,  { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
      Animated.timing(logoOpacity,{ toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // ── Stage 2: Arena fades in ───────────────────────────────────────
    setTimeout(() => {
      Animated.timing(arenaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 350);

    // ── Stage 3: Warriors burst in ────────────────────────────────────
    setTimeout(() => {
      Animated.stagger(110, [
        Animated.spring(w1, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.spring(w2, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.spring(w3, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.spring(w4, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      ]).start();
    }, 550);

    // ── Stage 4: Ball + shockwave ─────────────────────────────────────
    setTimeout(() => {
      Animated.spring(ballEnter, { toValue: 1, friction: 3, tension: 150, useNativeDriver: true }).start();
    }, 880);

    // ── Stage 5: ENTER ARENA button bounces up ────────────────────────
    setTimeout(() => {
      Animated.spring(enterBtnAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start(() => {
        // Idle logo pulse after intro completes
        staticLoop(Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.028, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(logoPulse, { toValue: 1,     duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])).start();
      });
    }, 1650);

    // ── Continuous loops ──────────────────────────────────────────────
    staticLoop(Animated.sequence([
      Animated.timing(ballGlow, { toValue: 1, duration: 1100, useNativeDriver: false }),
      Animated.timing(ballGlow, { toValue: 0, duration: 1100, useNativeDriver: false }),
    ])).start();

    staticLoop(Animated.sequence([
      Animated.timing(bgGlow, { toValue: 1, duration: 3200, useNativeDriver: false }),
      Animated.timing(bgGlow, { toValue: 0, duration: 3200, useNativeDriver: false }),
    ])).start();

    staticLoop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);

  // ── Transition splash → form ───────────────────────────────────────────────
  function handleEnterArena() {
    setPhase('form');
    Animated.parallel([
      Animated.timing(splashOpacity, { toValue: 0.18, duration: 500, useNativeDriver: true }),
      Animated.spring(formY,    { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }

  // ── Auth handlers ─────────────────────────────────────────────────────────
  async function handleSignUp() {
    const name = username.trim();
    if (name.length < 2)  { setError('At least 2 characters!'); return; }
    if (name.length > 16) { setError('Max 16 characters.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { setError('Letters, numbers, and _ only.'); return; }
    setError(''); setLoading(true);
    try {
      await loginAccount(name, selectedEmoji, selectedColor);
      onSuccess(name, selectedEmoji, selectedColor, true);
    } catch { setError('Something went wrong. Try again.'); }
    finally   { setLoading(false); }
  }

  function handleDeleteAccount(acct: SavedAccountMeta) {
    Alert.alert(
      'Delete Account',
      `Permanently delete "${acct.username}"? All progress will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteAccount(acct.username);
            setSavedAccounts(prev => prev.filter(a => a.username !== acct.username));
          },
        },
      ]
    );
  }

  async function handleLogin(acct?: SavedAccountMeta) {
    const name  = acct ? acct.username : loginInput.trim();
    if (!name)  { setError('Enter a username.'); return; }
    const emoji = acct?.avatarEmoji ?? AVATAR_EMOJIS[0];
    const color = acct?.avatarColor ?? AVATAR_COLORS[0];
    setLoading(true);
    try {
      await loginAccount(name, emoji, color);
      onSuccess(name, emoji, color);
    } catch { setError('Something went wrong.'); }
    finally   { setLoading(false); }
  }

  const topPad   = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const bottomPad = insets.bottom + 12;

  return (
    <Reanimated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Deep space background ── */}
      <LinearGradient
        colors={['#0E2621', '#15372F', '#15372F', '#0E2621']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />





      {/* ── SPLASH CONTENT (logo + arena) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
        {/* Logo */}
        <Animated.View style={[s.logoWrap, {
          paddingTop: topPad + 24,
          transform: [{ translateY: logoY }, { scale: logoScale }, { scale: logoPulse }],
          opacity: logoOpacity,
        }]}>
          {/* Crown */}

          {/* GOLDRUSH with layered shadow */}
          <View style={s.titleWrap}>
            <Text style={s.titleMain}>GOLDRUSH</Text>
          </View>

          {/* ARENA */}
          <Text style={s.titleArena}>ARENA</Text>

          {/* Divider line */}
          <View style={s.divider} />

          {/* Tagline */}
          <Text style={s.tagline}>Four seats. Real paddles. Last player standing.</Text>
        </Animated.View>

        {/* Arena scene */}
        <Animated.View style={[s.arenaWrap, { opacity: arenaOpacity }]}>
          <ArenaScene w1={w1} w2={w2} w3={w3} w4={w4} ballGlowAnim={ballGlow} ballEnter={ballEnter} ringRotate={ringRotate} />
        </Animated.View>

        {/* ENTER ARENA button */}
        {phase === 'splash' && (
          <View style={[s.enterWrap, { bottom: bottomPad + 32 }]}>
            <EnterButton onPress={handleEnterArena} anim={enterBtnAnim} />
          </View>
        )}
      </Animated.View>

      {/* ── FORM SHEET (slides up) ── */}
      <Animated.View style={[s.formSheet, { transform: [{ translateY: formY }], opacity: formOpacity }]}>
        {/* Glassmorphism top edge */}
        <LinearGradient
          colors={['#F3EAD315', '#F3EAD300']}
          style={s.formSheetTopGlow}
          pointerEvents="none"
        />
        {/* Drag handle */}
        <View style={s.handle} />

        {/* Tab switcher */}
        <View style={s.tabRow}>
          {(['signup', 'login'] as const).map(t => (
            <Pressable key={t} onPress={() => { setTab(t); setError(''); }} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'signup' ? 'CREATE HERO' : 'LOG IN'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'signup' ? (
            <>
              {/* Username */}
              <View style={s.field}>
                <Text style={s.label}>YOUR HERO NAME</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder="Choose your battle name..."
                    placeholderTextColor="#F3EAD333"
                    value={username}
                    onChangeText={v => { setUsername(v); setError(''); }}
                    maxLength={16}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={s.charCount}>{username.length}/16</Text>
                </View>
              </View>

              {/* Icon */}
              <View style={s.field}>
                <Text style={s.label}>HERO ICON</Text>
                <View style={s.emojiRow}>
                  {AVATAR_EMOJIS.map(e => (
                    <Pressable key={e} onPress={() => setSelectedEmoji(e)}
                      style={[s.emojiBtn, selectedEmoji === e && { borderColor: selectedColor, backgroundColor: selectedColor + '25', transform: [{ scale: 1.18 }] }]}>
                      <Glyph style={s.emojiText} value={e} />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Color */}
              <View style={s.field}>
                <Text style={s.label}>HERO COLOR</Text>
                <View style={s.colorRow}>
                  {AVATAR_COLORS.map(c => (
                    <Pressable key={c} onPress={() => setSelectedColor(c)}
                      style={[s.colorDot, { backgroundColor: c, borderColor: selectedColor === c ? '#F3EAD3' : 'transparent', transform: [{ scale: selectedColor === c ? 1.28 : 1 }] }]}>
                      {selectedColor === c && <Feather name="check" size={11} color='#0E2621' />}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview card */}
              <View style={[s.preview, { borderColor: selectedColor + '44' }]}>
                <LinearGradient colors={[selectedColor + '1C', selectedColor + '06']} style={StyleSheet.absoluteFill} />
                <View style={[s.previewAvatar, { borderColor: selectedColor, backgroundColor: selectedColor + '33' }]}>
                  <Glyph style={s.previewEmoji} value={selectedEmoji} />
                </View>
                <View>
                  <Text style={[s.previewName, { color: selectedColor }]}>{username || 'Hero Name'}</Text>
                  <Text style={s.previewRank}>Bronze · Level 1</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={[s.previewBadge, { backgroundColor: selectedColor + '22', borderColor: selectedColor + '44' }]}>
                  <Text style={[s.previewBadgeText, { color: selectedColor }]}>READY</Text>
                </View>
              </View>

              {error !== '' && <Text style={s.error}>{error}</Text>}

              <ShimmerButton onPress={handleSignUp} loading={loading} label="ENTER THE ARENA" icon="play" />
              <Text style={[s.terms, { color: '#F0B42955' }]}>
                By joining, you agree to our{' '}
                <Text style={{ color: '#F0B42999', textDecorationLine: 'underline' }}>
                  Terms of Service & Privacy Policy
                </Text>
              </Text>
            </>
          ) : (
            <>
              {savedAccounts.length > 0 && (
                <View style={s.field}>
                  <Text style={s.label}>YOUR HEROES</Text>
                  {savedAccounts.map(acct => (
                    <View key={acct.username} style={[s.savedRow, { borderColor: acct.avatarColor + '44' }]}>
                      <LinearGradient colors={[acct.avatarColor + '14', acct.avatarColor + '06']} style={StyleSheet.absoluteFill} />
                      <Pressable style={s.savedRowMain} onPress={() => handleLogin(acct)}>
                        <View style={[s.savedAvatar, { borderColor: acct.avatarColor, backgroundColor: acct.avatarColor + '33' }]}>
                          <Glyph style={s.savedEmoji} value={acct.avatarEmoji} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.savedName}>{acct.username}</Text>
                          <Text style={[s.savedRank, { color: acct.avatarColor }]}>{acct.rank}</Text>
                        </View>
                        <View style={[s.playBtn, { backgroundColor: acct.avatarColor + '22', borderColor: acct.avatarColor + '66' }]}>
                          <Feather name="play" size={14} color={acct.avatarColor} />
                          <Text style={[s.playBtnText, { color: acct.avatarColor }]}>PLAY</Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteAccount(acct)} style={s.deleteBtn} hitSlop={8}>
                        <Feather name="trash-2" size={16} color="#E04A2F" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.field}>
                <Text style={s.label}>{savedAccounts.length > 0 ? 'OR ENTER NAME' : 'ENTER YOUR NAME'}</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder="Your hero name..."
                    placeholderTextColor="#F3EAD333"
                    value={loginInput}
                    onChangeText={v => { setLoginInput(v); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => handleLogin()}
                  />
                </View>
              </View>

              {error !== '' && <Text style={s.error}>{error}</Text>}

              <ShimmerButton onPress={() => handleLogin()} loading={loading} label="CONTINUE TO BATTLE" icon="log-in" />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
    </Reanimated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Splash layout
  logoWrap:   { alignItems: 'center', paddingHorizontal: 24 },
  arenaWrap:  { alignItems: 'center', marginTop: 8 },
  enterWrap:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 32 },

  // Logo
  crown:        { fontSize: 50, textAlign: 'center', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  titleWrap:    { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 62, width: SW - 24, alignSelf: 'center', marginTop: 2 },
  titleMain:    { position: 'absolute', fontFamily: 'SourceSans3_700Bold', fontSize: 48, letterSpacing: 4, color: '#F0B429', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  titleShadow1: { position: 'absolute', fontFamily: 'SourceSans3_700Bold', fontSize: 48, letterSpacing: 4, color: '#E04A2F', opacity: 0.5, transform: [{ translateX: 3 }, { translateY: 4 }] },
  titleShadow2: { position: 'absolute', fontFamily: 'SourceSans3_700Bold', fontSize: 48, letterSpacing: 4, color: '#7E3A29', opacity: 0.3, transform: [{ translateX: 6 }, { translateY: 8 }] },
  titleArena:   { fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 12, color: '#F3EAD3CC', marginTop: 4, textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
  divider:      { width: 80, height: 1.5, backgroundColor: '#F3EAD318', borderRadius: 1, marginTop: 10, marginBottom: 6 },
  tagline:      { color: '#F3EAD355', fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 0.8 },

  // Enter Arena button
  enterBtn:     { borderRadius: 3, overflow: 'hidden', shadowColor: '#F0B429', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0, width: '100%' },
  enterGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 19, gap: 12 },
  enterText:    { color: '#0E2621', fontFamily: 'SourceSans3_700Bold', fontSize: 20, letterSpacing: 2 },
  enterShimmer: { position: 'absolute', top: 0, bottom: 0, width: 100, backgroundColor: '#F3EAD344' },
  tapHint:      { color: '#F3EAD340', fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, letterSpacing: 2, textAlign: 'center', marginTop: 14 },

  // Form sheet
  formSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0E2621F8',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    borderTopWidth: 1.5, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: '#F3EAD320',
    height: SH * 0.70,
    paddingTop: 8,
    overflow: 'hidden',
  },
  formSheetTopGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 60,
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#F3EAD330', alignSelf: 'center', marginBottom: 16 },

  // Tabs
  tabRow:        { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#F3EAD30C', borderRadius: 3, padding: 4, marginBottom: 16 },
  tabBtn:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 3 },
  tabBtnActive:  { backgroundColor: '#0E2621' },
  tabText:       { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 1.2, color: '#F3EAD344' },
  tabTextActive: { color: '#F0B429' },

  // Fields
  field:     { gap: 8 },
  label:     { color: '#F3EAD366', fontFamily: 'SourceSans3_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3EAD30C', borderRadius: 3, borderWidth: 1, borderColor: '#F3EAD320', height: 54 },
  input:     { flex: 1, paddingHorizontal: 16, color: '#F3EAD3', fontFamily: 'SourceSans3_600SemiBold', fontSize: 15 },
  charCount: { paddingRight: 14, color: '#F3EAD333', fontFamily: 'SourceSans3_400Regular', fontSize: 11 },
  emojiRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn:  { width: 46, height: 46, borderRadius: 3, borderWidth: 1.5, borderColor: '#F3EAD318', backgroundColor: '#F3EAD30A', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
  colorRow:  { flexDirection: 'row', gap: 10 },
  colorDot:  { width: 33, height: 33, borderRadius: 3, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },

  // Preview
  preview:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 3, borderWidth: 1, padding: 14, overflow: 'hidden' },
  previewAvatar:    { width: 52, height: 52, borderRadius: 3, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  previewEmoji:     { fontSize: 26 },
  previewName:      { fontFamily: 'SourceSans3_700Bold', fontSize: 17 },
  previewRank:      { color: '#F3EAD355', fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, marginTop: 2 },
  previewBadge:     { borderRadius: 3, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  previewBadgeText: { fontFamily: 'SourceSans3_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // CTA (form submit)
  ctaBtn:  { borderRadius: 3, overflow: 'hidden', shadowColor: '#F0B429', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  ctaText: { color: '#0E2621', fontFamily: 'SourceSans3_700Bold', fontSize: 17, letterSpacing: 1.5 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 80, backgroundColor: '#F3EAD340' },

  error: { color: '#E04A2F', fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, textAlign: 'center' },
  terms: { color: '#F3EAD328', fontFamily: 'SourceSans3_400Regular', fontSize: 10, textAlign: 'center' },

  // Saved accounts
  savedRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 3, borderWidth: 1, overflow: 'hidden' },
  savedRowMain:{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, padding: 12 },
  deleteBtn:   { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  savedAvatar: { width: 48, height: 48, borderRadius: 3, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  savedEmoji:  { fontSize: 24 },
  savedName:   { color: '#F3EAD3', fontFamily: 'SourceSans3_700Bold', fontSize: 16 },
  savedRank:   { fontFamily: 'SourceSans3_600SemiBold', fontSize: 11, marginTop: 2 },
  playBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 3, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  playBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 0.5 },
});
