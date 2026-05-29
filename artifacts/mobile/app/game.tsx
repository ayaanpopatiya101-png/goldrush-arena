import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameArena, type GameMode, type GameResult } from '@/components/GameArena';
import { BackgroundMusicButton, useBackgroundMusic } from '@/components/BackgroundMusic';
import { usePlayer } from '@/context/PlayerContext';
import { getGameConfig } from '@/store/gameSession';

const BOT_NAMES = ['Blaze_99', 'IceQueen', 'Venom_X'];
const BOT_RANKS = ['Platinum', 'Diamond', 'Master'];

const MODE_LABELS: Record<GameMode, string> = {
  square: '4-PLAYER',
  triangle: '3-PLAYER',
  duel: '1v1',
};
const MODE_COLORS: Record<GameMode, string> = {
  square: '#FFD700',
  triangle: '#00FF88',
  duel: '#FF4757',
};

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addMatchResult } = usePlayer();
  const config = getGameConfig();
  const music = useBackgroundMusic();

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const hudTop = topPad + 48;
  const hudBottom = bottomPad + 56;
  const arenaSize = Math.max(260, Math.min(width - 8, height - hudTop - hudBottom, 400));

  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('square');
  const [playerLives, setPlayerLives] = useState(5);
  const grantExtraLifeRef = useRef<(() => void) | null>(null);
  const modePulse = useRef(new Animated.Value(1)).current;

  // Start music on first touch (Web AudioContext requires user gesture)
  const musicStarted = useRef(false);
  function ensureMusicStarted() {
    if (!musicStarted.current) {
      musicStarted.current = true;
      music.start();
    }
  }

  useEffect(() => {
    return () => music.stop();
  }, []);

  // Pulse animation on mode change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(modePulse, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(modePulse, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [gameMode]);

  function handleGameOver(result: GameResult) {
    setGameOver(true);
    music.stop();
    addMatchResult({
      won: result.won,
      xpEarned: result.xpEarned,
      coinsEarned: result.coinsEarned,
      deflections: result.deflections,
      goalsAgainst: result.goalsAgainst,
      position: result.position,
    });
    router.replace({
      pathname: '/postgame',
      params: {
        won: result.won ? '1' : '0',
        position: String(result.position),
        deflections: String(result.deflections),
        goalsAgainst: String(result.goalsAgainst),
        xpEarned: String(result.xpEarned),
        coinsEarned: String(result.coinsEarned),
      },
    });
  }

  function handleQuit() {
    Alert.alert('Quit Game', 'Forfeit this match?', [
      { text: 'Keep Playing', style: 'cancel' },
      { text: 'Forfeit', style: 'destructive', onPress: () => { music.stop(); router.replace('/'); } },
    ]);
  }

  function handleBuyExtraLife() {
    Alert.alert(
      '❤ Extra Life — $0.99',
      `You have ${playerLives} ${playerLives === 1 ? 'life' : 'lives'} remaining.\n\nAdd 1 extra life to survive longer!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy $0.99',
          onPress: () => {
            // TODO: integrate RevenueCat IAP for production
            // For now, grant the life directly (dev/demo mode)
            grantExtraLifeRef.current?.();
            Alert.alert('✓ Purchased!', 'Extra life added!');
          },
        },
      ]
    );
  }

  const modeColor = MODE_COLORS[gameMode];

  return (
    <View style={[styles.root, { paddingTop: topPad }]} onTouchStart={ensureMusicStarted}>
      <LinearGradient
        colors={gameMode === 'duel' ? ['#1A0000', '#2A0010'] : gameMode === 'triangle' ? ['#001A05', '#002A10'] : ['#04040E', '#08081A']}
        style={StyleSheet.absoluteFill}
      />

      {/* HUD Top */}
      <View style={styles.hud}>
        <Pressable onPress={handleQuit} style={styles.iconBtn}>
          <Feather name="x" size={20} color="#FFFFFF66" />
        </Pressable>

        <View style={styles.hudCenter}>
          {/* Mode indicator */}
          <Animated.View style={[styles.modeChip, { borderColor: modeColor + '88', backgroundColor: modeColor + '22', transform: [{ scale: modePulse }] }]}>
            <Text style={[styles.modeText, { color: modeColor }]}>{MODE_LABELS[gameMode]}</Text>
          </Animated.View>
        </View>

        <View style={styles.hudRight}>
          <BackgroundMusicButton muted={music.muted} onToggle={music.setMuted} />
        </View>
      </View>

      {/* Bot labels (top + sides) */}
      <View style={[styles.labelsRow, { width: arenaSize }]}>
        <Text style={[styles.sideLabel, { color: '#00BFFF88' }]} numberOfLines={1}>{BOT_NAMES[1]}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.sideLabel, { color: '#00FF8888' }]} numberOfLines={1}>{BOT_NAMES[2]}</Text>
      </View>

      {/* Arena wrapper */}
      <View style={[styles.arenaWrap, { width: arenaSize }]}>
        <View style={styles.topBotLabel}>
          <View style={[styles.labelDot, { backgroundColor: '#FF4757' }]} />
          <Text style={[styles.labelTxt, { color: '#FF4757' }]}>{BOT_NAMES[0]}</Text>
        </View>

        {!gameOver && (
          <GameArena
            arenaSize={arenaSize}
            playerName={config.playerName}
            playerColor={config.playerColor}
            playerGlowColor={config.playerGlowColor}
            botNames={BOT_NAMES}
            botRanks={BOT_RANKS}
            onGameOver={handleGameOver}
            onGameModeChange={setGameMode}
            onPlayerLivesChange={setPlayerLives}
            grantExtraLifeRef={grantExtraLifeRef}
          />
        )}

        <View style={styles.topBotLabel}>
          <View style={[styles.labelDot, { backgroundColor: config.playerColor }]} />
          <Text style={[styles.labelTxt, { color: config.playerColor }]}>{config.playerName} · YOU</Text>
        </View>
      </View>

      {/* HUD Bottom */}
      <View style={[styles.hudBottom, { paddingBottom: bottomPad + 6 }]}>
        {/* Lives remaining */}
        <View style={styles.livesDisplay}>
          {Array.from({ length: Math.max(0, playerLives) }).map((_, i) => (
            <View key={i} style={[styles.lifeHeart, { backgroundColor: config.playerColor }]} />
          ))}
          {playerLives <= 0 && <Text style={styles.elimText}>ELIMINATED</Text>}
        </View>

        {/* Extra life purchase */}
        {playerLives > 0 && playerLives <= 4 && (
          <Pressable onPress={handleBuyExtraLife} style={styles.extraLifeBtn}>
            <Feather name="heart" size={12} color="#FF69B4" />
            <Text style={styles.extraLifeText}>+Life $0.99</Text>
          </Pressable>
        )}

        {/* Power-up legend */}
        <View style={styles.puRow}>
          {[
            { color: '#FFD700', label: 'SHD' },
            { color: '#00FF88', label: 'SPD' },
            { color: '#FF4757', label: 'SHK' },
            { color: '#FF69B4', label: '+1' },
            { color: '#00E5FF', label: 'MLB' },
          ].map(pu => (
            <View key={pu.label} style={styles.puLegend}>
              <View style={[styles.puDot, { backgroundColor: pu.color }]} />
              <Text style={[styles.puLabel, { color: pu.color }]}>{pu.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  hud: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    paddingHorizontal: 12, height: 48,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hudCenter: { flex: 1, alignItems: 'center' },
  modeChip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  modeText: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.5 },
  hudRight: { width: 36, alignItems: 'flex-end' },
  labelsRow: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 2, alignItems: 'center' },
  sideLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.5 },
  arenaWrap: { alignItems: 'center', gap: 3 },
  topBotLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  labelTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5 },
  hudBottom: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingTop: 8, paddingHorizontal: 16, gap: 10, width: '100%',
  },
  livesDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lifeHeart: { width: 10, height: 10, borderRadius: 5 },
  elimText: { color: '#FF4757', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  extraLifeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FF69B422', borderRadius: 10, borderWidth: 1, borderColor: '#FF69B455',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  extraLifeText: { color: '#FF69B4', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  puRow: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  puLegend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  puDot: { width: 6, height: 6, borderRadius: 3 },
  puLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.3 },
});
