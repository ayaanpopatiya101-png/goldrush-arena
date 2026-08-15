import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState, Modal, Platform, Pressable,
  StyleSheet, Text, Animated, View, useWindowDimensions,
} from 'react-native';
import Reanimated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameArena, type GameResult } from '@/components/GameArena';
import { BackgroundMusicButton, useBackgroundMusic } from '@/components/BackgroundMusic';
import { GlowText } from '@/components/effects';
import { usePlayer, SKINS } from '@/context/PlayerContext';
import { setGameConfig } from '@/store/gameSession';
import { useSettings } from '@/hooks/useSettings';

export const ARCADE_BEST_KEY = '@arcade_best_score';

export default function ArcadeScreen() {
  const { width, height } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const { profile } = usePlayer();
  const { settings } = useSettings();
  const music     = useBackgroundMusic();

  const topPad    = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const hudHeight = 56 + 32 + 8 + 54 + bottomPad + 16;
  const arenaSize = Math.max(260, Math.min(width - 8, height - topPad - hudHeight, 410));

  const [gameOver,   setGameOver]   = useState(false);
  const [paused,     setPaused]     = useState(false);
  const [hitsUI,     setHitsUI]     = useState(0);
  const [bestScore,  setBestScore]  = useState(0);

  const musicStarted = useRef(false);
  const hitsPulse    = useRef(new Animated.Value(1)).current;

  const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0];

  // Load personal best + set game config on mount
  useEffect(() => {
    AsyncStorage.getItem(ARCADE_BEST_KEY).then(v => {
      if (v) setBestScore(parseInt(v, 10) || 0);
    });
    setGameConfig({
      playerName:      profile.name,
      playerSkinId:    skin.id,
      playerColor:     skin.color,
      playerGlowColor: skin.glowColor,
      matchType:       'arcade',
      variant:         'classic',
    });
    return () => { music.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { music.setMuted(!settings.musicEnabled); }, [settings.musicEnabled]);

  // Auto-pause when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' && !gameOver) setPaused(true);
    });
    return () => sub.remove();
  }, [gameOver]);

  function handleScoreChange(score: number) {
    setHitsUI(score);
    // Pulse the score number on each hit
    Animated.sequence([
      Animated.timing(hitsPulse, { toValue: 1.35, duration: 80,  useNativeDriver: true }),
      Animated.timing(hitsPulse, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();
  }

  async function handleGameOver(result: GameResult) {
    setGameOver(true);
    music.stop();
    const score  = result.deflections;
    const newBest = Math.max(score, bestScore);
    await AsyncStorage.setItem(ARCADE_BEST_KEY, String(newBest));
    router.replace({
      pathname: '/postgame',
      params: {
        won:          '0',
        position:     '1',
        deflections:  String(score),
        goalsAgainst: '1',
        xpEarned:     '0',
        coinsEarned:  '0',
        matchType:    'arcade',
        levelBefore:  '0',
        streakMult:   '1',
        diffMult:     '1',
        winStreak:    '0',
        variant:      'classic',
        arcadeBest:   String(newBest),
      },
    });
  }

  function ensureMusic() {
    if (!musicStarted.current && settings.musicEnabled) {
      musicStarted.current = true;
      music.start();
    }
  }

  const isNewBest = hitsUI > 0 && hitsUI >= bestScore;

  return (
    <Reanimated.View
      entering={FadeIn.duration(220)}
      style={[styles.root, { paddingTop: topPad }]}
      onTouchStart={ensureMusic}
    >
      <LinearGradient colors={['#070A1E', '#040B0C', '#07130A']} style={StyleSheet.absoluteFill} />
      {/* Subtle green ambient glow for survival theme */}
      <LinearGradient
        colors={['#00FF8814', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
        pointerEvents="none"
      />

      {/* ── HUD Top ─────────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <Pressable onPress={() => setPaused(true)} style={styles.iconBtn}>
          <Feather name="pause" size={20} color="#FFFFFF88" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <GlowText intensity="soft" color="#00FF88" style={styles.modeLabel}>
            ⚡ SURVIVAL
          </GlowText>
        </View>
        <View style={styles.hudRight}>
          <BackgroundMusicButton muted={music.muted} onToggle={music.setMuted} />
        </View>
      </View>

      {/* ── Score row ───────────────────────────────────────────────────────── */}
      <View style={[styles.scoreRow, { width: arenaSize }]}>
        {/* HITS counter */}
        <View style={styles.hitsWrap}>
          <Text style={styles.hitsLabel}>HITS</Text>
          <Animated.Text style={[styles.hitsValue, { transform: [{ scale: hitsPulse }], color: isNewBest ? '#00FF88' : '#FFD700' }]}>
            {hitsUI}
          </Animated.Text>
          {isNewBest && hitsUI > 0 && (
            <View style={styles.newBestBadge}>
              <Text style={styles.newBestText}>NEW BEST</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }} />
        {/* Personal best */}
        <View style={styles.bestWrap}>
          <Text style={styles.bestLabel}>BEST</Text>
          <Text style={styles.bestValue}>{Math.max(bestScore, hitsUI)}</Text>
        </View>
      </View>

      {/* ── Arena ───────────────────────────────────────────────────────────── */}
      <View style={[styles.arenaWrap, { width: arenaSize }]}>
        <View style={styles.arenaLabel}>
          <Text style={styles.soloBadge}>SOLO ARCADE</Text>
        </View>

        {!gameOver && (
          <GameArena
            arenaSize={arenaSize}
            playerName={profile.name}
            playerColor={skin.color}
            playerGlowColor={skin.glowColor}
            botNames={[]}
            botRanks={[]}
            onGameOver={handleGameOver}
            colorBoard={settings.colorBoard}
            soundEnabled={settings.soundEnabled}
            sensitivity={settings.sensitivity}
            onActiveBallsChange={() => {}}
            paused={paused}
            arcadeMode={true}
            initialLives={1}
            noPowerups={true}
            startSpeedMult={0.48}
            ballSpawnFrames={999999}
            onScoreChange={handleScoreChange}
          />
        )}

        <View style={styles.playerLabel}>
          <View style={[styles.labelDot, { backgroundColor: skin.color }]} />
          <Text style={[styles.labelTxt, { color: skin.color }]}>{profile.name} · YOU</Text>
        </View>
      </View>

      {/* ── HUD Bottom ─────────────────────────────────────────────────────── */}
      <View style={[styles.hudBottom, { paddingBottom: bottomPad + 6 }]}>
        <Text style={styles.tipText}>
          Deflect the ball · Speed ramps every hit · One miss = game over
        </Text>
      </View>

      {/* ── Pause Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={styles.pauseOverlay}>
          <Reanimated.View entering={SlideInUp.springify().damping(16).stiffness(120)} style={styles.pauseCard}>
            <LinearGradient colors={['#0D1E10','#0A1A0C','#0D1E10']} style={StyleSheet.absoluteFill} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#00FF8866' }} />
            <Text style={styles.pauseTitle}>⏸ PAUSED</Text>
            <View style={styles.pauseStats}>
              <View style={styles.pauseStat}>
                <Text style={styles.pauseStatVal}>{hitsUI}</Text>
                <Text style={styles.pauseStatLbl}>HITS</Text>
              </View>
              <View style={styles.pauseDivider} />
              <View style={styles.pauseStat}>
                <Text style={[styles.pauseStatVal, { color: '#00FF88' }]}>{Math.max(bestScore, hitsUI)}</Text>
                <Text style={styles.pauseStatLbl}>BEST</Text>
              </View>
            </View>
            <Pressable onPress={() => setPaused(false)} style={styles.resumeBtn}>
              <LinearGradient colors={['#00FF88', '#00CC66']} style={styles.resumeGrad}>
                <Feather name="play" size={18} color="#080814" />
                <Text style={styles.resumeText}>RESUME</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => { setPaused(false); music.stop(); router.replace('/'); }}
              style={styles.quitBtn}
            >
              <Feather name="home" size={14} color="#FF475788" />
              <Text style={styles.quitText}>Quit to Menu</Text>
            </Pressable>
          </Reanimated.View>
        </View>
      </Modal>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, alignItems: 'center' },
  hud:            { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12, height: 48 },
  iconBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modeLabel:      { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 2 },
  hudRight:       { width: 36, alignItems: 'flex-end' },

  scoreRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 56, marginBottom: 4 },
  hitsWrap:       { alignItems: 'flex-start', gap: 2 },
  hitsLabel:      { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF55', letterSpacing: 2 },
  hitsValue:      { fontFamily: 'Inter_700Bold', fontSize: 36, color: '#FFD700', lineHeight: 40 },
  newBestBadge:   { backgroundColor: '#00FF8822', borderRadius: 6, borderWidth: 1, borderColor: '#00FF8855', paddingHorizontal: 6, paddingVertical: 2 },
  newBestText:    { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#00FF88', letterSpacing: 1 },
  bestWrap:       { alignItems: 'flex-end', gap: 2 },
  bestLabel:      { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#FFFFFF44', letterSpacing: 2 },
  bestValue:      { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#00FF8888' },

  arenaWrap:      { alignItems: 'center', gap: 4 },
  arenaLabel:     { flexDirection: 'row', alignItems: 'center' },
  soloBadge:      { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, color: '#00FF8866' },
  playerLabel:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelDot:       { width: 8, height: 8, borderRadius: 4 },
  labelTxt:       { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5 },

  hudBottom:      { paddingTop: 8, paddingHorizontal: 20, width: '100%', alignItems: 'center' },
  tipText:        { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#FFFFFF33', textAlign: 'center' },

  pauseOverlay:   { flex: 1, backgroundColor: '#000000BB', alignItems: 'center', justifyContent: 'center' },
  pauseCard:      { width: 280, borderRadius: 24, overflow: 'hidden', padding: 28, alignItems: 'center', gap: 18, borderWidth: 1, borderColor: '#00FF8822' },
  pauseTitle:     { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#FFFFFF', letterSpacing: 3 },
  pauseStats:     { flexDirection: 'row', alignItems: 'center', gap: 0, backgroundColor: '#FFFFFF08', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, width: '100%', justifyContent: 'space-around' },
  pauseStat:      { alignItems: 'center', flex: 1 },
  pauseStatVal:   { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFD700' },
  pauseStatLbl:   { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#FFFFFF55', letterSpacing: 1 },
  pauseDivider:   { width: 1, height: 36, backgroundColor: '#FFFFFF22' },
  resumeBtn:      { width: '100%', borderRadius: 14, overflow: 'hidden' },
  resumeGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  resumeText:     { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#080814', letterSpacing: 1 },
  quitBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  quitText:       { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#FF475777' },
});
