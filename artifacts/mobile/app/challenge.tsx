/**
 * Challenge entry screen — deep-link target.
 *
 * Opened when someone taps a friend's challenge link:
 *   goldrush://challenge?seed=YYYYMMDD&score=47&player=Alex
 *
 * Shows a "Beat Alex's 47 hits!" card and a single Play button
 * that launches the game with the challenge context stored in config.
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingOrbs, ORBS_GOLD, GlowText, PulseRing } from '@/components/effects';
import { setGameConfig } from '@/store/gameSession';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { fetchTodayChallenge } from '@/utils/dailyChallenge';

export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = usePlayer();
  const params = useLocalSearchParams<{ seed: string; score: string; player: string }>();

  const seed         = params.seed   ?? '';
  const targetScore  = parseInt(params.score  ?? '0', 10);
  const challengerName = decodeURIComponent(params.player ?? 'Your friend');

  // Guard: if we have no valid params, go home
  useEffect(() => {
    if (!seed || !targetScore) router.replace('/');
  }, [seed, targetScore]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  async function handlePlay() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]!;

    // Fetch today's challenge config with the player's ID so the server issues a
    // single-use match nonce. This also gives us the deterministic speed params
    // (startSpeedMult, rampRate) that make everyone's run comparable.
    const challenge = await fetchTodayChallenge(profile.name);

    setGameConfig({
      playerName:              profile.name,
      playerSkinId:            skin.id,
      playerColor:             skin.color,
      playerGlowColor:         skin.glowColor,
      playerRelicId:           profile.currentRelic,
      matchType:               'casual',
      variant:                 'survival',
      challengeSeed:           challenge?.seed        ?? seed,
      matchNonce:              challenge?.matchNonce  ?? '',
      challengeStartSpeedMult: challenge?.startSpeedMult,
      challengeRampRate:       challenge?.rampRate,
      challengeTargetScore:    targetScore,
    });
    router.push('/lobby');
  }

  return (
    <Reanimated.View entering={FadeIn.duration(400)} style={[styles.root]}>
      <LinearGradient colors={['#07090F', '#0D1428', '#07090F']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.6} />
      <LinearGradient
        colors={['#C8820A1A', '#C8820A08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Crown + challenger name */}
        <View style={styles.challengerRow}>
          <Text style={styles.crown}>👑</Text>
          <View>
            <Text style={styles.challengerLabel}>CHALLENGE FROM</Text>
            <Text style={styles.challengerName}>{challengerName}</Text>
          </View>
        </View>

        {/* Target score */}
        <PulseRing color="#FFD700" size={200} rings={3} duration={2000} opacity={0.12}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
            <Text style={styles.beatLabel}>BEAT</Text>
            <GlowText intensity="strong" color="#FFD700" style={styles.scoreHero}>
              {targetScore}
            </GlowText>
            <Text style={styles.hitsLabel}>HITS</Text>
          </Animated.View>
        </PulseRing>

        {/* Info */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['#C8820A18', '#C8820A08']}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ width: 3, height: '100%', backgroundColor: '#C8820A', borderRadius: 2, position: 'absolute', left: 0 }} />
          <View style={{ paddingLeft: 14, gap: 4 }}>
            <Text style={styles.infoTitle}>DAILY CHALLENGE · {seed}</Text>
            <Text style={styles.infoBody}>
              Same ball-speed pattern for everyone today.
              Deflect the ball as many times as you can — one miss ends the run.
            </Text>
          </View>
        </View>

        {/* Play button */}
        <Pressable
          onPress={handlePlay}
          style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient colors={['#F0A428', '#D08A14', '#A86008']} style={styles.playBtnGrad}>
            <Text style={styles.playBtnText}>⚡  ACCEPT CHALLENGE</Text>
          </LinearGradient>
        </Pressable>

        {/* Skip */}
        <Pressable onPress={() => router.replace('/')} style={{ paddingVertical: 12 }}>
          <Text style={styles.skipText}>Not now</Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 28 },

  challengerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  crown:         { fontSize: 38 },
  challengerLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFFFFF55', letterSpacing: 2, marginBottom: 2 },
  challengerName:  { fontFamily: 'Rajdhani_700Bold', fontSize: 26, color: '#FFFFFF' },

  beatLabel:   { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 4, color: '#FFFFFF55', marginBottom: 2 },
  scoreHero: {
    fontFamily: 'Rajdhani_700Bold', fontSize: 100, lineHeight: 100,
    color: '#FFD700',
    textShadowColor: '#C8820A', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30,
  },
  hitsLabel: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 5, color: '#FFFFFF88', marginTop: -4 },

  infoCard: {
    width: '100%', borderRadius: 14, borderWidth: 1, borderColor: '#C8820A33',
    paddingVertical: 14, paddingHorizontal: 14, overflow: 'hidden',
  },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, color: '#C8820A', marginBottom: 4 },
  infoBody:  { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#FFFFFF88', lineHeight: 19 },

  playBtn:     { width: '100%', borderRadius: 18, overflow: 'hidden', elevation: 10, shadowColor: '#C8820A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.7, shadowRadius: 24 },
  playBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  playBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#07090F', letterSpacing: 1 },

  skipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF33' },
});
