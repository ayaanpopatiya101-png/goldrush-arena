/**
 * Challenge entry screen, deep-link target.
 *
 * Opened when someone taps a friend's challenge link:
 *   goldrush://challenge?seed=YYYYMMDD&score=47&player=Alex
 *
 * Shows a "Beat Alex's 47 hits!" card and a single Play button
 * that launches the game with the challenge context stored in config.
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from '@/components/ui/Flat';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingOrbs, ORBS_GOLD, GlowText, PulseRing } from '@/components/effects';
import { setGameConfig } from '@/store/gameSession';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { fetchTodayChallenge } from '@/utils/dailyChallenge';
import { getDeviceId } from '@/utils/deviceId';
import { Glyph } from '@/components/ui/Glyph';
import { staticLoop } from '@/components/ui/motion';

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
    const loop = staticLoop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  async function handlePlay() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]!;

    // Fetch today's challenge config with the device's stable UUID so the server
    // issues a single-use match nonce. This also gives us the deterministic speed
    // params and seedHash (used as client PRNG seed in GameArena).
    const deviceId  = await getDeviceId();
    const challenge = await fetchTodayChallenge(deviceId);

    // Require valid server config, without a nonce the run would be random and
    // ineligible for the leaderboard; show a recoverable error instead.
    if (!challenge?.matchNonce || !challenge?.seedHash) {
      Alert.alert(
        'Challenge Unavailable',
        "Could not reach the server to load today's challenge config. Please check your connection and try again.",
        [{ text: 'OK' }],
      );
      return;
    }

    setGameConfig({
      playerName:              profile.name,
      playerSkinId:            skin.id,
      playerColor:             skin.color,
      playerGlowColor:         skin.glowColor,
      playerRelicId:           'none',
      matchType:               'casual',
      variant:                 'survival',
      challengeSeed:           challenge?.seed        ?? seed,
      matchNonce:              challenge?.matchNonce  ?? '',
      challengeSeedHash:       challenge?.seedHash    ?? '',
      challengeStartSpeedMult: challenge?.startSpeedMult,
      challengeRampRate:       challenge?.rampRate,
      challengeTargetScore:    targetScore,
      // Lobby is bypassed so it cannot override the locked challenge config
      bankLivesUsed:           0,
    });
    router.push('/game');
  }

  return (
    <Reanimated.View entering={FadeIn.duration(400)} style={[styles.root]}>
      <LinearGradient colors={['#16171A', '#1F2125', '#16171A']} style={StyleSheet.absoluteFill} />
      <FloatingOrbs orbs={ORBS_GOLD} opacity={0.6} />
      <LinearGradient
        colors={['#C99A2E1A', '#C99A2E08', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Crown + challenger name */}
        <View style={styles.challengerRow}>
          <Glyph style={styles.crown} value="👑" />
          <View>
            <Text style={styles.challengerLabel}>CHALLENGE FROM</Text>
            <Text style={styles.challengerName}>{challengerName}</Text>
          </View>
        </View>

        {/* Target score */}
        <PulseRing color="#C99A2E" size={200} rings={3} duration={2000} opacity={0.12}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
            <Text style={styles.beatLabel}>BEAT</Text>
            <GlowText intensity="strong" color="#C99A2E" style={styles.scoreHero}>
              {targetScore}
            </GlowText>
            <Text style={styles.hitsLabel}>HITS</Text>
          </Animated.View>
        </PulseRing>

        {/* Info */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['#C99A2E18', '#C99A2E08']}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ width: 3, height: '100%', backgroundColor: '#C99A2E', borderRadius: 2, position: 'absolute', left: 0 }} />
          <View style={{ paddingLeft: 14, gap: 4 }}>
            <Text style={styles.infoTitle}>DAILY CHALLENGE · {seed}</Text>
            <Text style={styles.infoBody}>
              Same ball-speed pattern for everyone today.
              Deflect the ball as many times as you can, one miss ends the run.
            </Text>
          </View>
        </View>

        {/* Play button */}
        <Pressable
          onPress={handlePlay}
          style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient colors={['#C99A2E', '#C99A2E', '#9E7620']} style={styles.playBtnGrad}>
            <Text style={styles.playBtnText}>ACCEPT CHALLENGE</Text>
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
  challengerLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, color: '#ECE7DC55', letterSpacing: 2, marginBottom: 2 },
  challengerName:  { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, color: '#ECE7DC' },

  beatLabel:   { fontFamily: 'SourceSans3_700Bold', fontSize: 11, letterSpacing: 4, color: '#ECE7DC55', marginBottom: 2 },
  scoreHero: {
    fontFamily: 'BarlowCondensed_700Bold', fontSize: 100, lineHeight: 100,
    color: '#C99A2E',
    textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0,
  },
  hitsLabel: { fontFamily: 'SourceSans3_700Bold', fontSize: 18, letterSpacing: 5, color: '#ECE7DC88', marginTop: -4 },

  infoCard: {
    width: '100%', borderRadius: 3, borderWidth: 1, borderColor: '#C99A2E33',
    paddingVertical: 14, paddingHorizontal: 14, overflow: 'hidden',
  },
  infoTitle: { fontFamily: 'SourceSans3_700Bold', fontSize: 10, letterSpacing: 2, color: '#C99A2E', marginBottom: 4 },
  infoBody:  { fontFamily: 'SourceSans3_400Regular', fontSize: 13, color: '#ECE7DC88', lineHeight: 19 },

  playBtn:     { width: '100%', borderRadius: 3, overflow: 'hidden', elevation: 0, shadowColor: '#C99A2E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0, shadowRadius: 0 },
  playBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  playBtnText: { fontFamily: 'SourceSans3_700Bold', fontSize: 17, color: '#16171A', letterSpacing: 1 },

  skipText: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 13, color: '#ECE7DC33' },
});
