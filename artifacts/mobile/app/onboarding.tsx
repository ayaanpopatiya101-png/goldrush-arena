import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Path, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import { AVATAR_COLORS, AVATAR_EMOJIS, SavedAccountMeta, getSavedAccounts, loginAccount } from '@/context/PlayerContext';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#FFD700', '#FF4757', '#00BFFF', '#00FF88'] as const;
const PLAYER_EMOJIS = ['⚔️', '🛡️', '🔮', '🏹'] as const;
const PARTICLE_CHARS = ['✨', '💫', '⭐', '🪙', '⚡', '🔥'];
const ARENA_SIZE = Math.min(SW * 0.7, 260);
const ARENA_R    = ARENA_SIZE / 2;

// ─── Floating particle ────────────────────────────────────────────────────────
function Particle({ x, delay, duration, char, startY }: {
  x: number; delay: number; duration: number; char: string; startY: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }, delay);
    return () => clearTimeout(id);
  }, []);
  return (
    <Animated.Text pointerEvents="none" style={{
      position: 'absolute', left: x, top: startY, fontSize: 13,
      opacity:    anim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 0.7, 0] }),
      transform:  [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -SH * 0.45] }) }],
    }}>
      {char}
    </Animated.Text>
  );
}

// ─── Warrior paddle (one of 4 players) ───────────────────────────────────────
function Warrior({ color, emoji, enterAnim, isTop, isLeft, size = 56 }: {
  color: string; emoji: string; enterAnim: Animated.Value;
  isTop?: boolean; isLeft?: boolean; size?: number;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    const delay = setTimeout(() => loop.start(), 1400);
    return () => { clearTimeout(delay); loop.stop(); };
  }, []);

  return (
    <Animated.View style={{
      alignItems: 'center', justifyContent: 'center',
      opacity: enterAnim,
      transform: [
        { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
        { scale: pulse },
      ],
    }}>
      {/* Glow ring */}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '20', borderWidth: 2, borderColor: color + '80', alignItems: 'center', justifyContent: 'center',
        shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 16 }}>
        <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
      </View>
      {/* Paddle bar */}
      <View style={{
        width: size * 0.85, height: 8, borderRadius: 4, backgroundColor: color,
        marginTop: 4, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10,
      }} />
    </Animated.View>
  );
}

// ─── Central arena scene ─────────────────────────────────────────────────────
const SCENE_SIZE = Math.min(SW - 20, 320);
const WARRIOR_W  = 56;   // warrior badge size
const SCENE_PAD  = WARRIOR_W + 8;  // padding around arena for warriors

function ArenaScene({ w1, w2, w3, w4, ballGlowAnim, ballEnter }: {
  w1: Animated.Value; w2: Animated.Value; w3: Animated.Value; w4: Animated.Value;
  ballGlowAnim: Animated.Value; ballEnter: Animated.Value;
}) {
  const S  = SCENE_SIZE;
  const AR = (S - SCENE_PAD * 2) / 2;  // arena radius
  const AC = S / 2;                      // arena center

  return (
    <View style={{ width: S, height: S, position: 'relative' }}>
      {/* SVG arena floor — centered within padding */}
      <Svg width={S} height={S} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgRadialGradient id="floor2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#5500DD" stopOpacity="0.5" />
            <Stop offset="60%"  stopColor="#1A0060" stopOpacity="0.65" />
            <Stop offset="100%" stopColor="#080018" stopOpacity="0.85" />
          </SvgRadialGradient>
          {/* Color zone tints for each player */}
          <SvgRadialGradient id="zoneGold" cx="50%" cy="100%" r="60%">
            <Stop offset="0%"   stopColor="#FFD700" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="zoneRed" cx="50%" cy="0%" r="60%">
            <Stop offset="0%"   stopColor="#FF4757" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FF4757" stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="zoneBlue" cx="0%" cy="50%" r="60%">
            <Stop offset="0%"   stopColor="#00BFFF" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="zoneGreen" cx="100%" cy="50%" r="60%">
            <Stop offset="0%"   stopColor="#00FF88" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>
        {/* Arena circle fill */}
        <Circle cx={AC} cy={AC} r={AR} fill="url(#floor2)" />
        {/* Player zone color tints */}
        <Circle cx={AC} cy={AC} r={AR} fill="url(#zoneGold)" />
        <Circle cx={AC} cy={AC} r={AR} fill="url(#zoneRed)" />
        <Circle cx={AC} cy={AC} r={AR} fill="url(#zoneBlue)" />
        <Circle cx={AC} cy={AC} r={AR} fill="url(#zoneGreen)" />
        {/* Outer ring */}
        <Circle cx={AC} cy={AC} r={AR} fill="none" stroke="#FFFFFF28" strokeWidth={2} />
        {/* Middle ring */}
        <Circle cx={AC} cy={AC} r={AR * 0.58} fill="none" stroke="#FFFFFF12" strokeWidth={1} />
        {/* Inner ring */}
        <Circle cx={AC} cy={AC} r={AR * 0.18} fill="none" stroke="#FFD70040" strokeWidth={1.5} />
        {/* Cross */}
        <Line x1={AC} y1={SCENE_PAD} x2={AC} y2={S - SCENE_PAD} stroke="#FFFFFF0A" strokeWidth={1} />
        <Line x1={SCENE_PAD} y1={AC} x2={S - SCENE_PAD} y2={AC} stroke="#FFFFFF0A" strokeWidth={1} />
        {/* Corner accent lines from center */}
        <Line x1={AC} y1={AC} x2={SCENE_PAD + AR * 0.3} y2={SCENE_PAD + AR * 0.3} stroke="#FFD70018" strokeWidth={1} />
        <Line x1={AC} y1={AC} x2={S - SCENE_PAD - AR * 0.3} y2={SCENE_PAD + AR * 0.3} stroke="#FF475718" strokeWidth={1} />
        <Line x1={AC} y1={AC} x2={SCENE_PAD + AR * 0.3} y2={S - SCENE_PAD - AR * 0.3} stroke="#00BFFF18" strokeWidth={1} />
        <Line x1={AC} y1={AC} x2={S - SCENE_PAD - AR * 0.3} y2={S - SCENE_PAD - AR * 0.3} stroke="#00FF8818" strokeWidth={1} />
        {/* Connection lines from arena edge to warrior position */}
        <Line x1={AC} y1={SCENE_PAD} x2={AC} y2={SCENE_PAD - 6} stroke="#FF475740" strokeWidth={1.5} strokeDasharray="3,3" />
        <Line x1={AC} y1={S - SCENE_PAD} x2={AC} y2={S - SCENE_PAD + 6} stroke="#FFD70040" strokeWidth={1.5} strokeDasharray="3,3" />
        <Line x1={SCENE_PAD} y1={AC} x2={SCENE_PAD - 6} y2={AC} stroke="#00BFFF40" strokeWidth={1.5} strokeDasharray="3,3" />
        <Line x1={S - SCENE_PAD} y1={AC} x2={S - SCENE_PAD + 6} y2={AC} stroke="#00FF8840" strokeWidth={1.5} strokeDasharray="3,3" />
      </Svg>

      {/* ── BOTTOM warrior (gold / player) ── */}
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center',
        opacity: w1,
        transform: [{ translateY: w1.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }, { scale: w1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}>
        <Warrior color={PLAYER_COLORS[0]} emoji={PLAYER_EMOJIS[0]} enterAnim={w1} size={WARRIOR_W} />
      </Animated.View>

      {/* ── TOP warrior (red) ── */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
        opacity: w2,
        transform: [{ translateY: w2.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }, { scale: w2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}>
        <Warrior color={PLAYER_COLORS[1]} emoji={PLAYER_EMOJIS[1]} enterAnim={w2} size={WARRIOR_W} />
      </Animated.View>

      {/* ── LEFT warrior (blue) ── */}
      <Animated.View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center',
        opacity: w3,
        transform: [{ translateX: w3.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }, { scale: w3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}>
        <Warrior color={PLAYER_COLORS[2]} emoji={PLAYER_EMOJIS[2]} enterAnim={w3} size={WARRIOR_W - 8} />
      </Animated.View>

      {/* ── RIGHT warrior (green) ── */}
      <Animated.View style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center',
        opacity: w4,
        transform: [{ translateX: w4.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }, { scale: w4.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}>
        <Warrior color={PLAYER_COLORS[3]} emoji={PLAYER_EMOJIS[3]} enterAnim={w4} size={WARRIOR_W - 8} />
      </Animated.View>

      {/* ── Central ball ── */}
      <Animated.View style={{
        position: 'absolute', width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#FFD700',
        top: AC - 14, left: AC - 14,
        opacity: ballEnter,
        transform: [{ scale: ballEnter.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1.15] }) }],
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 18,
      }} />
      {/* Outer glow ring on ball */}
      <Animated.View style={{
        position: 'absolute', width: 60, height: 60, borderRadius: 30,
        borderWidth: 2, borderColor: '#FFD70055',
        top: AC - 30, left: AC - 30,
        opacity: ballEnter,
        transform: [{ scale: ballGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
      }} />
    </View>
  );
}

// ─── Shimmer button ───────────────────────────────────────────────────────────
function ShimmerButton({ onPress, loading, label, icon }: { onPress: () => void; loading: boolean; label: string; icon?: string }) {
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(2200),
      Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.ease }),
      Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.88 }]}>
      <LinearGradient colors={['#FFE94D', '#FFAA00', '#FF8800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
        {icon ? <Feather name={icon as never} size={22} color="#1A0800" /> : null}
        <Text style={s.ctaText}>{loading ? 'ENTERING...' : label}</Text>
      </LinearGradient>
      {/* Shimmer sweep */}
      <Animated.View pointerEvents="none" style={[s.shimmer, {
        transform: [{ translateX: shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-100, SW + 100] }) }, { skewX: '-20deg' }],
      }]} />
    </Pressable>
  );
}

// ─── Main onboarding ──────────────────────────────────────────────────────────
interface Props { onSuccess: (username: string, emoji: string, color: string) => void }

export default function OnboardingScreen({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();

  const [tab, setTab]                       = useState<'signup' | 'login'>('signup');
  const [username, setUsername]             = useState('');
  const [selectedColor, setSelectedColor]   = useState(AVATAR_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji]   = useState(AVATAR_EMOJIS[0]);
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [savedAccounts, setSavedAccounts]   = useState<SavedAccountMeta[]>([]);
  const [loginInput, setLoginInput]         = useState('');

  // ── Animation refs ────────────────────────────────────────────────────────
  const logoY       = useRef(new Animated.Value(-60)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const arenaOpacity= useRef(new Animated.Value(0)).current;
  const formY       = useRef(new Animated.Value(140)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;
  const w3 = useRef(new Animated.Value(0)).current;
  const w4 = useRef(new Animated.Value(0)).current;
  const ballEnter   = useRef(new Animated.Value(0)).current;
  const ballGlow    = useRef(new Animated.Value(0)).current;
  const logoPulse   = useRef(new Animated.Value(1)).current;
  const bgGlow      = useRef(new Animated.Value(0)).current;

  // Particles
  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: 12 + Math.random() * (SW - 40),
    startY: SH * 0.3 + Math.random() * SH * 0.25,
    delay: Math.random() * 3500,
    duration: 2800 + Math.random() * 2500,
    char: PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)],
  })), []);

  useEffect(() => {
    getSavedAccounts().then(setSavedAccounts);

    // ── Parallel entrance with staggered delays ──
    Animated.parallel([
      // Logo drops in immediately
      Animated.parallel([
        Animated.spring(logoY,       { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(logoScale,   { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      // Arena fades in after 300ms
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(arenaOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      // Warriors burst in staggered from 500ms
      Animated.sequence([
        Animated.delay(500),
        Animated.stagger(100, [
          Animated.spring(w1, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(w2, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(w3, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.spring(w4, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        ]),
      ]),
      // Ball bursts in at 800ms
      Animated.sequence([
        Animated.delay(800),
        Animated.spring(ballEnter, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Idle logo pulse after entrance
      Animated.loop(Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.025, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(logoPulse, { toValue: 1,     duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])).start();
    });

    // Form slides up after 400ms
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(formY,       { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 400);

    // Ball glow loop
    Animated.loop(Animated.sequence([
      Animated.timing(ballGlow, { toValue: 1, duration: 1000, useNativeDriver: false }),
      Animated.timing(ballGlow, { toValue: 0, duration: 1000, useNativeDriver: false }),
    ])).start();

    // Background glow
    Animated.loop(Animated.sequence([
      Animated.timing(bgGlow, { toValue: 1, duration: 3000, useNativeDriver: false }),
      Animated.timing(bgGlow, { toValue: 0, duration: 3000, useNativeDriver: false }),
    ])).start();
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  async function handleSignUp() {
    const name = username.trim();
    if (name.length < 2)  { setError('At least 2 characters!'); return; }
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
    const name  = acct ? acct.username : loginInput.trim();
    if (!name)  { setError('Enter a username.'); return; }
    const emoji = acct?.avatarEmoji  ?? AVATAR_EMOJIS[0];
    const color = acct?.avatarColor  ?? AVATAR_COLORS[0];
    setLoading(true);
    try {
      await loginAccount(name, emoji, color);
      onSuccess(name, emoji, color);
    } catch { setError('Something went wrong.'); }
    finally   { setLoading(false); }
  }

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const HERO_H = SH * 0.52;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Full-screen deep gradient background ── */}
      <LinearGradient
        colors={['#1A0800', '#3D0F00', '#200040', '#050010']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Atmospheric warm spotlight from top */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
        opacity: bgGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] }),
      }]}>
        <LinearGradient
          colors={['#FF880066', '#FF440033', '#00000000']}
          style={{ height: SH * 0.55, width: '100%' }}
        />
      </Animated.View>

      {/* Floating particles (behind everything) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </View>

      {/* ── Hero section ── */}
      <View style={{ height: HERO_H, alignItems: 'center', justifyContent: 'flex-start', paddingTop: topPad + 6 }}>

        {/* Logo */}
        <Animated.View style={{ alignItems: 'center', transform: [{ translateY: logoY }, { scale: logoScale }, { scale: logoPulse }], opacity: logoOpacity }}>
          {/* Crown with glow */}
          <Text style={s.crown}>👑</Text>
          {/* GOLDRUSH text with 3D shadow layers */}
          <View style={s.titleWrap}>
            {/* Shadow layer 1 */}
            <Text style={[s.titleShadow1]}>GOLDRUSH</Text>
            {/* Shadow layer 2 */}
            <Text style={[s.titleShadow2]}>GOLDRUSH</Text>
            {/* Main title */}
            <Text style={s.titleMain}>GOLDRUSH</Text>
          </View>
          <Text style={s.titleArena}>A R E N A</Text>
          <Text style={s.tagline}>4-Player · Air Hockey · Last One Standing</Text>
        </Animated.View>

        {/* Arena scene */}
        <Animated.View style={{ marginTop: 10, opacity: arenaOpacity }}>
          <ArenaScene w1={w1} w2={w2} w3={w3} w4={w4} ballGlowAnim={ballGlow} ballEnter={ballEnter} />
        </Animated.View>
      </View>

      {/* ── Form sheet (slides up) ── */}
      <Animated.View style={[s.formSheet, { transform: [{ translateY: formY }], opacity: formOpacity }]}>
        {/* Drag handle */}
        <View style={s.handle} />

        {/* Tab switcher */}
        <View style={s.tabRow}>
          {(['signup', 'login'] as const).map(t => (
            <Pressable key={t} onPress={() => { setTab(t); setError(''); }} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'signup' ? '⚔️  CREATE HERO' : '🎮  LOG IN'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'signup' ? (
            <>
              {/* Username */}
              <View style={s.field}>
                <Text style={s.label}>⚔️  YOUR HERO NAME</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder="Choose your battle name..."
                    placeholderTextColor="#FFFFFF33"
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
                <Text style={s.label}>🎨  HERO ICON</Text>
                <View style={s.emojiRow}>
                  {AVATAR_EMOJIS.map(e => (
                    <Pressable key={e} onPress={() => setSelectedEmoji(e)}
                      style={[s.emojiBtn, selectedEmoji === e && { borderColor: selectedColor, backgroundColor: selectedColor + '25', transform: [{ scale: 1.18 }] }]}>
                      <Text style={s.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Color */}
              <View style={s.field}>
                <Text style={s.label}>🎨  HERO COLOR</Text>
                <View style={s.colorRow}>
                  {AVATAR_COLORS.map(c => (
                    <Pressable key={c} onPress={() => setSelectedColor(c)}
                      style={[s.colorDot, { backgroundColor: c, borderColor: selectedColor === c ? '#FFFFFF' : 'transparent', transform: [{ scale: selectedColor === c ? 1.28 : 1 }] }]}>
                      {selectedColor === c && <Feather name="check" size={11} color="#000" />}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={[s.preview, { borderColor: selectedColor + '44' }]}>
                <LinearGradient colors={[selectedColor + '18', selectedColor + '06']} style={StyleSheet.absoluteFill} />
                <View style={[s.previewAvatar, { borderColor: selectedColor, backgroundColor: selectedColor + '33' }]}>
                  <Text style={s.previewEmoji}>{selectedEmoji}</Text>
                </View>
                <View>
                  <Text style={[s.previewName, { color: selectedColor }]}>{username || 'Hero Name'}</Text>
                  <Text style={s.previewRank}>Iron · Level 1</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={[s.previewBadge, { backgroundColor: selectedColor + '22', borderColor: selectedColor + '44' }]}>
                  <Text style={[s.previewBadgeText, { color: selectedColor }]}>READY</Text>
                </View>
              </View>

              {error !== '' && <Text style={s.error}>{error}</Text>}

              <ShimmerButton onPress={handleSignUp} loading={loading} label="ENTER THE ARENA" icon="play" />

              <Text style={s.terms}>By joining, you agree to our Terms of Service</Text>
            </>
          ) : (
            <>
              {savedAccounts.length > 0 && (
                <View style={s.field}>
                  <Text style={s.label}>🏆  YOUR HEROES</Text>
                  {savedAccounts.map(acct => (
                    <Pressable key={acct.username} onPress={() => handleLogin(acct)}
                      style={[s.savedRow, { borderColor: acct.avatarColor + '44' }]}>
                      <LinearGradient colors={[acct.avatarColor + '14', acct.avatarColor + '06']} style={StyleSheet.absoluteFill} />
                      <View style={[s.savedAvatar, { borderColor: acct.avatarColor, backgroundColor: acct.avatarColor + '33' }]}>
                        <Text style={s.savedEmoji}>{acct.avatarEmoji}</Text>
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
                  ))}
                </View>
              )}

              <View style={s.field}>
                <Text style={s.label}>{savedAccounts.length > 0 ? '🔑  OR ENTER NAME' : '🔑  ENTER YOUR NAME'}</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder="Your hero name..."
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

              {error !== '' && <Text style={s.error}>{error}</Text>}

              <ShimmerButton onPress={() => handleLogin()} loading={loading} label="CONTINUE TO BATTLE" icon="log-in" />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Logo
  crown:        { fontSize: 44, textAlign: 'center', marginBottom: 0, textShadowColor: '#FF8800', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  titleWrap:    { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 54, width: SW - 32, alignSelf: 'center' },
  titleMain:    { position: 'absolute', fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: 3, color: '#FFD700', textShadowColor: '#FF8800', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
  titleShadow1: { position: 'absolute', fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: 3, color: '#FF4400', opacity: 0.45, transform: [{ translateX: 3 }, { translateY: 4 }] },
  titleShadow2: { position: 'absolute', fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: 3, color: '#AA2200', opacity: 0.28, transform: [{ translateX: 6 }, { translateY: 7 }] },
  titleArena:   { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 10, color: '#FFFFFFCC', marginTop: 2, textShadowColor: '#8800FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  tagline:      { color: '#FFFFFF55', fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 0.8, marginTop: 5 },

  // Form sheet
  formSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0A0018F5', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: '#FFFFFF18',
    height: SH * 0.52,
    paddingTop: 8,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF25', alignSelf: 'center', marginBottom: 14 },

  // Tabs
  tabRow:       { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#FFFFFF0A', borderRadius: 14, padding: 4, marginBottom: 14 },
  tabBtn:       { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  tabBtnActive: { backgroundColor: '#2A0055' },
  tabText:      { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1, color: '#FFFFFF44' },
  tabTextActive:{ color: '#FFD700' },

  // Fields
  field:     { gap: 8 },
  label:     { color: '#FFFFFF66', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF0A', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF18', height: 52 },
  input:     { flex: 1, paddingHorizontal: 16, color: '#F0F0FF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  charCount: { paddingRight: 14, color: '#FFFFFF33', fontFamily: 'Inter_400Regular', fontSize: 11 },
  emojiRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn:  { width: 46, height: 46, borderRadius: 13, borderWidth: 1.5, borderColor: '#FFFFFF18', backgroundColor: '#FFFFFF08', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
  colorRow:  { flexDirection: 'row', gap: 10 },
  colorDot:  { width: 33, height: 33, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },

  // Preview card
  preview:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, overflow: 'hidden' },
  previewAvatar:{ width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 26 },
  previewName:  { fontFamily: 'Inter_700Bold', fontSize: 17 },
  previewRank:  { color: '#FFFFFF55', fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  previewBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  previewBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5 },

  // CTA
  ctaBtn:   { borderRadius: 16, overflow: 'hidden', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  ctaGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  ctaText:  { color: '#1A0800', fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 1.5 },
  shimmer:  { position: 'absolute', top: 0, bottom: 0, width: 80, backgroundColor: '#FFFFFF40' },

  error:    { color: '#FF4757', fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  terms:    { color: '#FFFFFF28', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center' },

  // Saved accounts
  savedRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, overflow: 'hidden' },
  savedAvatar:{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  savedEmoji: { fontSize: 24 },
  savedName:  { color: '#F0F0FF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  savedRank:  { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginTop: 2 },
  playBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  playBtnText:{ fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.5 },
});
