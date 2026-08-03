/**
 * OnboardingFlowScreen
 * Full-screen tutorial shown once on first launch after login.
 * StorageKey: '@onboarding_flow_done'
 *
 * Steps 0-4  → Tutorial (Welcome + 4 ability panels)
 * Step  5    → Skill-tier quiz (3 questions)
 * Step  6    → Result + CTA
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated, Dimensions, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/context/PlayerContext';

export const ONBOARDING_FLOW_KEY = '@onboarding_flow_done';

const { width: SW } = Dimensions.get('window');

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'WELCOME TO\nGOLDRUSH ARENA',
    tagline: '4-Player · Air Hockey · Last One Standing',
    body: 'Deflect flying balls to score on your opponents.\nLose all your lives and your paddle vanishes.\nBe the LAST ONE STANDING to claim victory.',
    icon: '👑',
    color: '#C8820A',
    demoKey: 0,
  },
  {
    title: 'CHARGE',
    tagline: 'Basic Ability · Always available',
    body: 'Press and hold to supercharge your paddle.\nThe next ball you deflect rockets away at\n2× speed — a lethal precision strike.',
    icon: '⚡',
    color: '#FFD700',
    demoKey: 1,
  },
  {
    title: 'RAMPART',
    tagline: 'Super Ability · Unlocks at Level 5',
    body: 'Seal your goal with an impenetrable barrier\nfor 3 full seconds. Use it to survive a\nmulti-ball onslaught or buy yourself time.',
    icon: '🛡️',
    color: '#C8820A',
    demoKey: 2,
  },
  {
    title: 'DEAD ZONE',
    tagline: 'Super Ability · Unlocks at Level 10',
    body: 'Project a slow field across your half\nof the arena. Every incoming ball crawls\nto near-stop, giving you perfect control.',
    icon: '🌀',
    color: '#00BFFF',
    demoKey: 3,
  },
  {
    title: 'SHATTER',
    tagline: 'Super Ability · Unlocks at Level 15',
    body: 'Any ball that scores while Shatter is\nactive disappears from play permanently.\nSacrifice one ball for a decisive edge.',
    icon: '💥',
    color: '#BF5FFF',
    demoKey: 4,
  },
] as const;

type StepDef = typeof STEPS[number];

// ── Quiz definition ───────────────────────────────────────────────────────────
const QUIZ = [
  {
    q: 'How much experience do you have\nwith arena-style games?',
    answers: [
      { label: '🆕  First time — brand new!',          pts: 0 },
      { label: '🎮  Casual player — played a few',     pts: 1 },
      { label: '⚡  I play these all the time',        pts: 2 },
    ],
  },
  {
    q: 'Multiple balls flying at you at once.\nWhat do you do?',
    answers: [
      { label: '😅  Panic and hope for the best',     pts: 0 },
      { label: '🎯  Pick one ball and stay focused',  pts: 1 },
      { label: '🧠  Zone control — read the threats', pts: 2 },
    ],
  },
  {
    q: 'When do you use your Super Ability?',
    answers: [
      { label: '🤷  I often forget it exists',         pts: 0 },
      { label: '⏱️  When I feel danger coming',        pts: 1 },
      { label: '💡  Timed precisely for max impact',   pts: 2 },
    ],
  },
] as const;

type Tier = 'Rookie' | 'Veteran' | 'Pro';

const TIER_META: Record<Tier, { icon: string; color: string; desc: string }> = {
  Rookie:  { icon: '🥉', color: '#CD7F32', desc: "You're just getting started.\nGoldRush is the perfect place to learn and grow." },
  Veteran: { icon: '🥈', color: '#A8A9B4', desc: "You know the fundamentals.\nNow it's time to refine your strategy and climb the ranks." },
  Pro:     { icon: '🏆', color: '#C8820A', desc: "Elite instincts detected.\nGo claim those Champion ranks — the arena is yours." },
};

function calcTier(pts: number): Tier {
  if (pts <= 1) return 'Rookie';
  if (pts <= 4) return 'Veteran';
  return 'Pro';
}

// ── Mini arena demo ───────────────────────────────────────────────────────────
const ARENA_D = Math.min(SW * 0.52, 200);
const ARENA_R = ARENA_D / 2;

function ArenaDemo({ demoKey, color }: { demoKey: number; color: string }) {
  const ballX   = useRef(new Animated.Value(0)).current;
  const shieldO = useRef(new Animated.Value(0)).current;
  const slowO   = useRef(new Animated.Value(0)).current;
  const burstO  = useRef(new Animated.Value(0)).current;
  const burstS  = useRef(new Animated.Value(1)).current;
  const [tried, setTried] = useState(false);

  function playDemo() {
    setTried(true);

    // Ball zip across
    Animated.sequence([
      Animated.timing(ballX, { toValue: -(ARENA_R * 0.55), duration: 130, useNativeDriver: true }),
      Animated.timing(ballX, { toValue:  (ARENA_R * 0.65), duration: 210, useNativeDriver: true }),
      Animated.timing(ballX, { toValue: 0,                 duration: 160, useNativeDriver: true }),
    ]).start();

    // Rampart — shield flash
    if (demoKey === 2) {
      Animated.sequence([
        Animated.timing(shieldO, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(shieldO, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }

    // Dead Zone — slow vignette
    if (demoKey === 3) {
      Animated.sequence([
        Animated.timing(slowO, { toValue: 0.75, duration: 200, useNativeDriver: true }),
        Animated.delay(650),
        Animated.timing(slowO, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }

    // Burst ring — every step
    burstS.setValue(0.9);
    burstO.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(burstO, { toValue: 1,   duration: 70,  useNativeDriver: true }),
        Animated.timing(burstO, { toValue: 0,   duration: 340, useNativeDriver: true }),
      ]),
      Animated.timing(burstS,  { toValue: 3.0, duration: 410, useNativeDriver: true }),
    ]).start();
  }

  const PADDLE_POS = [
    { top: 0,              left: ARENA_R - 6, bg: '#FF4757' },
    { top: ARENA_R - 6,   left: 0,            bg: '#00BFFF' },
    { top: ARENA_R - 6,   left: ARENA_D - 12, bg: '#00FF88' },
    { top: ARENA_D - 12,  left: ARENA_R - 6,  bg: color     },
  ];

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Pressable onPress={playDemo} style={styles.arenaWrap}>
        <View style={[styles.arena, { width: ARENA_D, height: ARENA_D, borderRadius: ARENA_R, borderColor: color + '55' }]}>
          {/* Rings */}
          <View style={{ position: 'absolute', width: ARENA_D * 0.6, height: ARENA_D * 0.6, borderRadius: ARENA_D * 0.3, borderWidth: 1, borderColor: color + '1E' }} />
          <View style={{ position: 'absolute', width: ARENA_D * 0.32, height: ARENA_D * 0.32, borderRadius: ARENA_D * 0.16, borderWidth: 1, borderColor: color + '2E' }} />

          {/* Paddles */}
          {PADDLE_POS.map((p, i) => (
            <View key={i} style={{ position: 'absolute', top: p.top, left: p.left, width: 12, height: 12, borderRadius: 6, backgroundColor: p.bg, shadowColor: p.bg, shadowOpacity: 0.9, shadowRadius: 5 }} />
          ))}

          {/* Ball */}
          <Animated.View style={[styles.ball, { transform: [{ translateX: ballX }] }]} />

          {/* Rampart shield bar */}
          <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, backgroundColor: color + '88', borderBottomLeftRadius: ARENA_R, borderBottomRightRadius: ARENA_R, opacity: shieldO }} />

          {/* Dead Zone slow vignette */}
          <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: color + '55', borderRadius: ARENA_R, opacity: slowO }} />

          {/* Burst ring */}
          <Animated.View style={{ position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: color, opacity: burstO, transform: [{ scale: burstS }] }} />
        </View>
      </Pressable>

      <Pressable onPress={playDemo} style={[styles.tryBtn, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Feather name={tried ? 'refresh-cw' : 'play'} size={13} color={color} />
        <Text style={[styles.tryBtnText, { color }]}>{tried ? 'REPLAY DEMO' : 'TRY IT'}</Text>
      </Pressable>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function OnboardingFlowScreen() {
  const insets = useSafeAreaInsets();
  const { setSkillTier } = usePlayer();

  const [step,       setStep]       = useState(0);   // 0-4 tutorial, 5 quiz, 6 result
  const [stepKey,    setStepKey]    = useState(0);   // key to remount animated panels
  const [quizIdx,    setQuizIdx]    = useState(0);
  const [quizScore,  setQuizScore]  = useState(0);
  const [tier,       setTier]       = useState<Tier | null>(null);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const TOTAL  = STEPS.length; // 5

  const progressPct = step < TOTAL ? ((step + 1) / TOTAL) * 100 : 100;
  const stepDef: StepDef | null = step < TOTAL ? STEPS[step] : null;
  const color = stepDef?.color ?? '#C8820A';

  async function markDone() {
    await AsyncStorage.setItem(ONBOARDING_FLOW_KEY, '1');
  }

  async function skip() {
    await markDone();
    router.replace('/(tabs)' as never);
  }

  async function complete(finalTier: Tier) {
    await Promise.all([setSkillTier(finalTier), markDone()]);
    router.replace('/(tabs)' as never);
  }

  function advance() {
    setStepKey(k => k + 1);
    if (step < TOTAL - 1) { setStep(s => s + 1); }
    else                  { setStep(5); }          // enter quiz
  }

  function goBack() {
    setStepKey(k => k + 1);
    if (step === 5) {
      setStep(TOTAL - 1); setQuizIdx(0); setQuizScore(0);
    } else if (step > 0) {
      setStep(s => s - 1);
    }
  }

  function answerQuiz(pts: number) {
    const newScore = quizScore + pts;
    if (quizIdx < QUIZ.length - 1) {
      setQuizIdx(i => i + 1);
      setQuizScore(newScore);
    } else {
      const finalTier = calcTier(newScore);
      setTier(finalTier);
      setQuizScore(newScore);
      setStep(6);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#050810' }}>
      <LinearGradient colors={['#07091E', '#040810', '#060912']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[color + '28', color + '0A', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
        pointerEvents="none"
      />

      {/* ── Header bar ── */}
      <View style={{ paddingTop: topPad + 6, paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {step < 6 && (
          <View style={{ flex: 1, height: 3, backgroundColor: '#FFFFFF12', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${progressPct}%` as any, height: '100%', backgroundColor: color, borderRadius: 3, opacity: 0.85 }} />
          </View>
        )}
        {step < 6 && (
          <Pressable onPress={skip} hitSlop={10}>
            <Text style={styles.skipLabel}>SKIP</Text>
          </Pressable>
        )}
      </View>

      {step < TOTAL && (
        <Text style={styles.stepCounter}>{step + 1} OF {TOTAL}</Text>
      )}

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 110 }}
      >

        {/* ── Tutorial panel ── */}
        {step < TOTAL && stepDef && (
          <Reanimated.View key={`t-${stepKey}`} entering={FadeIn.duration(260)} style={{ alignItems: 'center', gap: 22, paddingTop: 16 }}>

            {/* Icon bubble */}
            <View style={[styles.iconBubble, { backgroundColor: color + '22', borderColor: color + '55' }]}>
              <Text style={{ fontSize: 44 }}>{stepDef.icon}</Text>
            </View>

            {/* Title + tagline */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={[styles.stepTitle, { fontSize: step === 0 ? 26 : 30 }]}>{stepDef.title}</Text>
              <View style={[styles.taglinePill, { backgroundColor: color + '22' }]}>
                <Text style={[styles.taglineText, { color }]}>{stepDef.tagline}</Text>
              </View>
            </View>

            {/* Body */}
            <Text style={styles.stepBody}>{stepDef.body}</Text>

            {/* Ability demo (steps 1-4) */}
            {step > 0 && <ArenaDemo demoKey={stepDef.demoKey} color={color} />}

            {/* Welcome graphic (step 0) */}
            {step === 0 && (
              <View style={{ alignItems: 'center', gap: 14, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {(['🔥', '🏆', '⚡', '💎'] as const).map((e, i) => (
                    <View key={i} style={[styles.welcomeOrb, {
                      backgroundColor: ['#FF475714', '#C8820A14', '#FFD70014', '#00BFFF14'][i],
                      borderColor:     ['#FF475730', '#C8820A30', '#FFD70030', '#00BFFF30'][i],
                    }]}>
                      <Text style={{ fontSize: 26 }}>{e}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.welcomeHint}>SWIPE THROUGH TO LEARN THE ABILITIES</Text>
              </View>
            )}
          </Reanimated.View>
        )}

        {/* ── Quiz ── */}
        {step === 5 && (
          <Reanimated.View key="quiz" entering={FadeIn.duration(260)} style={{ gap: 26, paddingTop: 16 }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🧠</Text>
              <Text style={styles.quizHeading}>SKILL QUIZ</Text>
              <Text style={styles.quizSubhead}>Question {quizIdx + 1} of {QUIZ.length}</Text>
            </View>

            {/* Progress pills */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {QUIZ.map((_, i) => (
                <View key={i} style={[styles.quizPill, { backgroundColor: i <= quizIdx ? '#C8820A' : '#FFFFFF18' }]} />
              ))}
            </View>

            <Reanimated.View key={`q-${quizIdx}`} entering={FadeIn.duration(200)} style={{ gap: 18 }}>
              <Text style={styles.questionText}>{QUIZ[quizIdx].q}</Text>
              <View style={{ gap: 10 }}>
                {QUIZ[quizIdx].answers.map((a, i) => (
                  <Pressable
                    key={i}
                    onPress={() => answerQuiz(a.pts)}
                    style={({ pressed }) => [styles.answerBtn, pressed && styles.answerBtnPressed]}
                  >
                    <Text style={styles.answerLabel}>{a.label}</Text>
                    <Feather name="chevron-right" size={16} color="#FFFFFF33" />
                  </Pressable>
                ))}
              </View>
            </Reanimated.View>
          </Reanimated.View>
        )}

        {/* ── Result ── */}
        {step === 6 && tier && (
          <Reanimated.View key="result" entering={FadeIn.duration(380)} style={{ alignItems: 'center', gap: 28, paddingTop: 20 }}>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 80 }}>{TIER_META[tier].icon}</Text>
              <Text style={[styles.tierLabel, { color: TIER_META[tier].color }]}>YOUR SKILL TIER</Text>
              <Text style={styles.tierName}>{tier.toUpperCase()}</Text>
            </View>

            <View style={[styles.tierCard, { backgroundColor: TIER_META[tier].color + '12', borderColor: TIER_META[tier].color + '44' }]}>
              <Text style={styles.tierDesc}>{TIER_META[tier].desc}</Text>
            </View>

            <Pressable onPress={() => complete(tier)} style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>ENTER THE ARENA  🏟️</Text>
            </Pressable>
          </Reanimated.View>
        )}
      </ScrollView>

      {/* ── Tutorial bottom nav ── */}
      {step < TOTAL && (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
          {step > 0 && (
            <Pressable onPress={goBack} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#FFFFFF55" />
            </Pressable>
          )}
          <Pressable onPress={advance} style={[styles.nextBtn, { backgroundColor: color }]}>
            <Text style={styles.nextBtnText}>
              {step === TOTAL - 1 ? 'TAKE THE QUIZ' : 'NEXT'}
            </Text>
            <Feather name={step === TOTAL - 1 ? 'zap' : 'arrow-right'} size={16} color="#000000AA" />
          </Pressable>
        </View>
      )}

      {/* ── Quiz back link ── */}
      {step === 5 && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: Math.max(insets.bottom + 12, 28), alignItems: 'center' }}>
          <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="arrow-left" size={13} color="#FFFFFF33" />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#FFFFFF33' }}>Back to tutorial</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  skipLabel:    { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#FFFFFF40', letterSpacing: 0.5 },
  stepCounter:  { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF30', letterSpacing: 1.2, marginBottom: 2 },

  iconBubble: { width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepTitle:  { fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'center', lineHeight: 36 },
  taglinePill:{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  taglineText:{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1 },
  stepBody:   { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FFFFFF88', textAlign: 'center', lineHeight: 25, paddingHorizontal: 6 },

  welcomeOrb:  { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeHint: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF30', letterSpacing: 1.2 },

  arenaWrap: { alignItems: 'center', justifyContent: 'center' },
  arena:     { backgroundColor: '#FFFFFF06', borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ball:      { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOpacity: 0.9, shadowRadius: 8 },
  tryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1 },
  tryBtnText:{ fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 },

  quizHeading: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFFFFF', letterSpacing: 1 },
  quizSubhead: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF44', letterSpacing: 0.5 },
  quizPill:    { width: 36, height: 4, borderRadius: 2 },
  questionText:{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF', textAlign: 'center', lineHeight: 27 },
  answerBtn:   { backgroundColor: '#FFFFFF08', borderRadius: 14, borderWidth: 1.5, borderColor: '#FFFFFF14', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  answerBtnPressed: { backgroundColor: '#C8820A1A', borderColor: '#C8820A55' },
  answerLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF', flex: 1, lineHeight: 22 },

  tierLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 3 },
  tierName:  { fontFamily: 'Inter_700Bold', fontSize: 42, color: '#FFFFFF', letterSpacing: 2 },
  tierCard:  { borderRadius: 16, borderWidth: 1, padding: 20, width: '100%' },
  tierDesc:  { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FFFFFFBB', textAlign: 'center', lineHeight: 25 },
  ctaBtn:    { backgroundColor: '#C8820A', borderRadius: 14, paddingVertical: 17, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  ctaBtnText:{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#000', letterSpacing: 0.5 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 14, flexDirection: 'row', gap: 12, backgroundColor: '#050810E8' },
  backBtn:   { backgroundColor: '#FFFFFF0A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF18', paddingVertical: 14, paddingHorizontal: 18 },
  nextBtn:   { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  nextBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#000000CC', letterSpacing: 0.5 },
});
