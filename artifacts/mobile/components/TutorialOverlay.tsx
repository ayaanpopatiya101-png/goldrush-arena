import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated, Dimensions, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Tutorial step definitions ─────────────────────────────────────────────
interface Step {
  emoji: string;
  title: string;
  subtitle: string;
  body: string;
  illustration: React.ReactNode;
  accentColor: string;
}

function ArenaIllustration() {
  return (
    <View style={il.arena}>
      <View style={[il.paddle, il.paddleTop, { backgroundColor: '#FF4757' }]} />
      <View style={[il.paddle, il.paddleLeft, { backgroundColor: '#00BFFF' }]} />
      <View style={[il.paddle, il.paddleRight, { backgroundColor: '#00FF88' }]} />
      <View style={[il.paddle, il.paddleBottom, { backgroundColor: '#FFD700' }]} />
      <View style={il.ball} />
      <View style={[il.ring, il.ring1]} />
      <View style={[il.ring, il.ring2]} />
    </View>
  );
}

function ControlsIllustration() {
  const swipeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swipeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(swipeAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={il.arena}>
      <View style={[il.halfBottom, { backgroundColor: '#FFD70010', borderTopWidth: 1, borderTopColor: '#FFD70033' }]} />
      <View style={[il.paddle, il.paddleBottom, { backgroundColor: '#FFD700', width: 60 }]} />
      <Animated.View style={[il.finger, {
        transform: [{ translateX: swipeAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 28] }) }],
      }]}>
        <Text style={{ fontSize: 24 }}>👆</Text>
      </Animated.View>
      <View style={[il.halfTop, { opacity: 0.2 }]}>
        <View style={[il.paddle, il.paddleTop, { backgroundColor: '#FF4757' }]} />
      </View>
      <Text style={il.zoneLabel}>YOUR ZONE</Text>
    </View>
  );
}

function LivesIllustration() {
  return (
    <View style={il.arena}>
      {/* 4 paddles → 3 → 1v1 sequence */}
      <View style={il.stageRow}>
        {['4P', '3P', '1v1'].map((label, i) => (
          <View key={i} style={[il.stageBox, { opacity: 1 - i * 0.1 }]}>
            <Text style={il.stageText}>{label}</Text>
            <View style={il.stageDotsRow}>
              {Array.from({ length: i === 0 ? 4 : i === 1 ? 3 : 2 }).map((_, j) => (
                <View key={j} style={[il.stageDot, { backgroundColor: ['#C8820A','#4A8A38','#C03820'][i] }]} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={il.livesRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={[il.heart, { backgroundColor: i < 3 ? '#FF4757' : '#FFFFFF22' }]} />
        ))}
      </View>
      <Text style={il.livesLabel}>LIVES REMAINING</Text>
    </View>
  );
}

function PowerupsIllustration() {
  const pups = [
    { icon: '🛡️', label: 'Shield', color: '#00BFFF' },
    { icon: '⚡', label: 'Speed',  color: '#FFD700' },
    { icon: '⊕',  label: 'Ball+',  color: '#FF6B35' },
    { icon: '🔻', label: 'Shrink', color: '#BF5FFF' },
  ];
  return (
    <View style={il.pupGrid}>
      {pups.map(p => (
        <View key={p.label} style={[il.pupBox, { borderColor: p.color + '55', backgroundColor: p.color + '14' }]}>
          <Text style={{ fontSize: 22 }}>{p.icon}</Text>
          <Text style={[il.pupLabel, { color: p.color }]}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

function RanksIllustration() {
  const ranks = [
    { name: 'Iron',    color: '#8B8B8B' },
    { name: 'Bronze',  color: '#CD7F32' },
    { name: 'Silver',  color: '#C0C0C0' },
    { name: 'Gold',    color: '#FFD700' },
    { name: 'Diamond', color: '#B9F2FF' },
    { name: 'Legend',  color: '#FFD700' },
  ];
  return (
    <View style={il.rankRow}>
      {ranks.map((r, i) => (
        <View key={r.name} style={il.rankItem}>
          <View style={[il.rankDot, { backgroundColor: r.color, width: 8 + i * 3, height: 8 + i * 3, borderRadius: (8 + i * 3) / 2 }]} />
          <Text style={[il.rankName, { color: r.color, fontSize: 8 + i }]}>{r.name}</Text>
        </View>
      ))}
    </View>
  );
}

function RelicsIllustration() {
  const chars = [
    { emoji: '🛡️', name: 'Ironhide', color: '#C8820A', effect: 'Shield' },
    { emoji: '🔥', name: 'Phoenix',  color: '#FF4757', effect: 'Revive' },
    { emoji: '⚡', name: 'Quicksilver', color: '#00BFFF', effect: 'Speed' },
    { emoji: '👑', name: 'Midas',    color: '#FFD700', effect: 'Lives+' },
  ];
  return (
    <View style={il.relicRow}>
      {chars.map(c => (
        <View key={c.name} style={[il.relicCard, { borderColor: c.color + '66' }]}>
          <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
          <Text style={[il.relicCardName, { color: c.color }]}>{c.name}</Text>
          <View style={[il.relicEffectBadge, { backgroundColor: c.color + '22' }]}>
            <Text style={[il.relicEffectText, { color: c.color }]}>{c.effect}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function StreakIllustration() {
  const mults = [
    { streak: '1 win',  mult: '1.0×', color: '#8B8B8B' },
    { streak: '2 wins', mult: '1.25×', color: '#C8820A' },
    { streak: '3 wins', mult: '1.5×', color: '#FF6B35' },
    { streak: '4 wins', mult: '1.75×', color: '#FF4757' },
    { streak: '5+ wins', mult: '2.0×', color: '#FFD700' },
  ];
  return (
    <View style={il.streakCol}>
      {mults.map(m => (
        <View key={m.streak} style={il.streakRow}>
          <Text style={[il.streakLabel, { color: '#FFFFFF66' }]}>{m.streak}</Text>
          <View style={[il.streakBar, { backgroundColor: m.color + '22', borderColor: m.color + '44', flex: parseFloat(m.mult) * 0.4 }]} />
          <Text style={[il.streakMult, { color: m.color }]}>{m.mult}</Text>
        </View>
      ))}
    </View>
  );
}

function ReadyIllustration() {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Animated.Text style={{ fontSize: 72, transform: [{ translateY: bounceAnim }] }}>🏆</Animated.Text>
      <View style={il.readyBotRow}>
        <Text style={{ fontSize: 32 }}>🤖</Text>
        <Text style={[il.readyVs, { color: '#C8820A' }]}>VS</Text>
        <Text style={{ fontSize: 32 }}>⚔️</Text>
      </View>
      <Text style={il.readyPractice}>PRACTICE MATCH</Text>
    </View>
  );
}

const STEPS: Step[] = [
  {
    emoji: '🏟️',
    title: 'Welcome to GoldRush Arena!',
    subtitle: 'The ultimate air-hockey battle',
    body: "You're about to enter 4-player last-one-standing air hockey — fast, chaotic, and incredibly satisfying. Let's get you up to speed in under 2 minutes.",
    illustration: <ArenaIllustration />,
    accentColor: '#C8820A',
  },
  {
    emoji: '🎯',
    title: 'The Goal',
    subtitle: 'Deflect. Survive. Win.',
    body: 'Balls fly around the arena. Deflect them back with your paddle. Let one slip past and you lose a life. Lose all your lives and you\'re eliminated. Last player standing wins!',
    illustration: <ArenaIllustration />,
    accentColor: '#FF6B35',
  },
  {
    emoji: '👆',
    title: 'How to Play',
    subtitle: 'Swipe anywhere on your side',
    body: "You don't need to tap exactly on the paddle. Just drag your finger ANYWHERE on your half of the screen — the golden paddle follows your touch instantly.",
    illustration: <ControlsIllustration />,
    accentColor: '#FFD700',
  },
  {
    emoji: '❤️',
    title: 'Lives & Arena Stages',
    subtitle: 'The arena shrinks as players fall',
    body: "Every player starts with 5 lives. As players are eliminated the arena tightens: 4-player square → 3-player triangle → 1v1 duel. The pressure keeps building!",
    illustration: <LivesIllustration />,
    accentColor: '#FF4757',
  },
  {
    emoji: '⚡',
    title: 'Power-Ups',
    subtitle: 'Grab them — they change everything',
    body: "Power-ups spawn mid-match inside the arena. A Shield blocks one hit. Speed Boost cranks your paddle. Extra Ball adds chaos. Shrink makes enemy paddles tiny. Time it right!",
    illustration: <PowerupsIllustration />,
    accentColor: '#BF5FFF',
  },
  {
    emoji: '🏆',
    title: 'Ranks & XP',
    subtitle: 'Iron → Legend — climb the ladder',
    body: "Every match earns XP. Stack XP to climb: Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Legend. Higher ranks unlock exclusive arenas and powerful relic characters.",
    illustration: <RanksIllustration />,
    accentColor: '#C0C0C0',
  },
  {
    emoji: '🧬',
    title: 'Relic Characters',
    subtitle: 'Choose your fighter — level them up',
    body: "Relics are characters you equip for a passive edge. Ironhide starts with a shield. Phoenix revives when eliminated. Spend coins to level them up from L1 to L10 for stronger effects!",
    illustration: <RelicsIllustration />,
    accentColor: '#00FF88',
  },
  {
    emoji: '🔥',
    title: 'Streak & Mode Bonuses',
    subtitle: 'Win more, earn more',
    body: "Consecutive wins multiply your XP and coin rewards — up to 2× on a 5-win streak! Harder modes pay out more too: Chaos mode gives 1.5× rewards, 6-Player gives 1.75×.",
    illustration: <StreakIllustration />,
    accentColor: '#FF6B35',
  },
  {
    emoji: '🎮',
    title: "You're Ready!",
    subtitle: "Let's do a practice match",
    body: "That covers everything! A friendly practice bot is waiting for you. Beat it, learn the controls, and earn your first coins. Your journey to Legend starts now. 🔥",
    illustration: <ReadyIllustration />,
    accentColor: '#FFD700',
  },
];

// ─── Main overlay ───────────────────────────────────────────────────────────
interface Props { onComplete: () => void }

export function TutorialOverlay({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, completeTutorial } = usePlayer();

  const [stepIdx, setStepIdx] = useState(0);
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  function animateTo(next: number) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStepIdx(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleNext() {
    if (isLast) {
      handleStartPractice();
    } else {
      animateTo(stepIdx + 1);
    }
  }

  async function handleSkip() {
    await completeTutorial();
    onComplete();
  }

  async function handleStartPractice() {
    await completeTutorial();
    setGameConfig({
      playerName:      profile.name,
      playerSkinId:    profile.currentSkin,
      playerColor:     profile.avatarFrameColor,
      playerGlowColor: profile.avatarFrameColor + '55',
      matchType:       'casual',
      variant:         'classic',
      playerRelicId:   profile.currentRelic,
      mapId:           'dustbowl',
    });
    onComplete();
    router.push('/game');
  }

  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={[s.overlay, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <LinearGradient
        colors={['#0A0700EE', '#100C06FA']}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      {!isLast && (
        <Pressable onPress={handleSkip} style={s.skipBtn}>
          <Text style={s.skipText}>SKIP</Text>
        </Pressable>
      )}

      {/* Step counter */}
      <Text style={s.stepCounter}>{stepIdx + 1} / {STEPS.length}</Text>

      {/* Animated step card */}
      <Animated.View style={[s.card, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        borderColor: step.accentColor + '44',
      }]}>
        {/* Illustration */}
        <View style={[s.illustrationBox, { backgroundColor: step.accentColor + '0C' }]}>
          {step.illustration}
        </View>

        {/* Text */}
        <View style={s.textBlock}>
          <View style={s.titleRow}>
            <Text style={s.emoji}>{step.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: step.accentColor }]}>{step.title}</Text>
              <Text style={s.subtitle}>{step.subtitle}</Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.body}>{step.body}</Text>
          </ScrollView>
        </View>
      </Animated.View>

      {/* Dot pagination */}
      <View style={s.dotsRow}>
        {STEPS.map((_, i) => (
          <Pressable key={i} onPress={() => i < stepIdx && animateTo(i)}>
            <View style={[s.dot, {
              backgroundColor: i === stepIdx ? step.accentColor : i < stepIdx ? step.accentColor + '55' : '#FFFFFF22',
              width: i === stepIdx ? 20 : 7,
            }]} />
          </Pressable>
        ))}
      </View>

      {/* Action buttons */}
      <View style={s.btnRow}>
        {stepIdx > 0 && (
          <Pressable onPress={() => animateTo(stepIdx - 1)} style={s.backBtn}>
            <Feather name="chevron-left" size={20} color="#FFFFFF66" />
          </Pressable>
        )}
        <Pressable onPress={handleNext} style={[s.nextBtn, { flex: 1 }]}>
          <LinearGradient
            colors={isLast
              ? [step.accentColor, step.accentColor + 'CC']
              : ['#C8820A', '#E09620']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.nextGrad}
          >
            {isLast ? (
              <>
                <Feather name="play" size={16} color="#0A0700" />
                <Text style={[s.nextText, { color: '#0A0700' }]}>START PRACTICE MATCH</Text>
              </>
            ) : (
              <>
                <Text style={s.nextText}>NEXT</Text>
                <Feather name="chevron-right" size={16} color="#0A0700" />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Illustration styles ───────────────────────────────────────────────────
const il = StyleSheet.create({
  arena: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  paddle: {
    position: 'absolute', borderRadius: 6,
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
  },
  paddleTop:    { top: 10,    left: '50%', marginLeft: -30, width: 60, height: 9 },
  paddleBottom: { bottom: 10, left: '50%', marginLeft: -30, width: 60, height: 9 },
  paddleLeft:   { left: 10,   top: '50%',  marginTop: -4,   width: 9,  height: 40 },
  paddleRight:  { right: 10,  top: '50%',  marginTop: -4,   width: 9,  height: 40 },
  ball: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 6, elevation: 4,
  },
  ring: {
    position: 'absolute', borderRadius: 999,
    borderWidth: 1, borderColor: '#FFFFFF10',
  },
  ring1: { width: 80, height: 80 },
  ring2: { width: 140, height: 140 },
  halfBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', borderRadius: 4 },
  halfTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  finger: { position: 'absolute', bottom: 30 },
  zoneLabel: {
    position: 'absolute', bottom: 4,
    fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, color: '#FFD70066',
  },
  stageRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginBottom: 16 },
  stageBox: { alignItems: 'center', gap: 4 },
  stageText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF88', letterSpacing: 1 },
  stageDotsRow: { flexDirection: 'row', gap: 4 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  livesRow: { flexDirection: 'row', gap: 6 },
  heart: { width: 14, height: 14, borderRadius: 7 },
  livesLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#FFFFFF44', marginTop: 8, letterSpacing: 1 },
  pupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', padding: 8 },
  pupBox: { width: 70, height: 70, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pupLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  rankRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%', paddingHorizontal: 8 },
  rankItem: { alignItems: 'center', gap: 6 },
  rankDot: {},
  rankName: { fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  streakCol: { gap: 7, width: '100%', paddingHorizontal: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, width: 50 },
  streakBar: { height: 16, borderRadius: 6, borderWidth: 1, minWidth: 10 },
  streakMult: { fontFamily: 'Inter_700Bold', fontSize: 12, width: 38, textAlign: 'right' },
  relicRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  relicCard: { alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 14, padding: 8, backgroundColor: '#FFFFFF06' },
  relicCardName: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.3 },
  relicEffectBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  relicEffectText: { fontFamily: 'Inter_700Bold', fontSize: 8 },
  readyBotRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  readyVs: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: 2 },
  readyPractice: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, color: '#FFFFFF44', marginTop: 8 },
});

// ─── Overlay styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    position: 'absolute', inset: 0,
    zIndex: 9999,
    flex: 1, paddingHorizontal: 20,
    gap: 14,
  },
  skipBtn: {
    position: 'absolute', top: 60, right: 20, zIndex: 1,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF22',
    backgroundColor: '#FFFFFF0A',
  },
  skipText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF55', letterSpacing: 1 },
  stepCounter: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF33',
    letterSpacing: 1, textAlign: 'center', marginTop: 8,
  },
  card: {
    flex: 1, borderRadius: 24, borderWidth: 1.5,
    overflow: 'hidden', backgroundColor: '#13100899',
  },
  illustrationBox: {
    height: SH * 0.26, minHeight: 160,
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF0C',
  },
  textBlock: { flex: 1, padding: 20, gap: 12 },
  titleRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 32, lineHeight: 38 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.2 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#FFFFFF55', marginTop: 2 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#E0DCB8', lineHeight: 22 },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  dot: { height: 7, borderRadius: 3.5 },
  btnRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  backBtn: {
    width: 48, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FFFFFF22',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF08',
  },
  nextBtn: { borderRadius: 16, overflow: 'hidden', elevation: 4 },
  nextGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  nextText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#0A0700', letterSpacing: 1 },
});
