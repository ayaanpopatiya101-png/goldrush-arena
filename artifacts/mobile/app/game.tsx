import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameArena, type GameResult } from '@/components/GameArena';
import { usePlayer } from '@/context/PlayerContext';
import { getGameConfig } from '@/store/gameSession';

const BOT_NAMES = ['Blaze_99', 'IceQueen', 'Venom_X'];
const BOT_RANKS = ['Platinum', 'Diamond', 'Master'];

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addMatchResult } = usePlayer();
  const config = getGameConfig();

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  // Arena size: square, fits the available height minus HUD areas
  const hudHeight = topPad + 48 + 8 + bottomPad + 48;
  const maxArena = Math.min(width - 16, height - hudHeight);
  const arenaSize = Math.max(260, Math.min(maxArena, 390));

  const [gameOver, setGameOver] = useState(false);

  function handleGameOver(result: GameResult) {
    setGameOver(true);
    addMatchResult({
      won: result.won,
      xpEarned: result.xpEarned,
      coinsEarned: result.coinsEarned,
      deflections: result.deflections,
      goalsAgainst: result.goalsAgainst,
      position: result.position,
    });
    router.replace({ pathname: '/postgame', params: {
      won: result.won ? '1' : '0',
      position: String(result.position),
      deflections: String(result.deflections),
      goalsAgainst: String(result.goalsAgainst),
      xpEarned: String(result.xpEarned),
      coinsEarned: String(result.coinsEarned),
    }});
  }

  function handleQuit() {
    Alert.alert('Quit Game', 'Are you sure you want to forfeit?', [
      { text: 'Keep Playing', style: 'cancel' },
      { text: 'Forfeit', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <LinearGradient colors={['#04040E', '#08081A', '#04040E']} style={StyleSheet.absoluteFill} />

      {/* HUD Top */}
      <View style={styles.hud}>
        <Pressable onPress={handleQuit} style={styles.quitBtn}>
          <Feather name="x" size={20} color="#FFFFFF66" />
        </Pressable>
        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle}>GOLDRUSH ARENA</Text>
        </View>
        <View style={styles.hudRight}>
          <Feather name="wifi" size={14} color="#00FF88" />
          <Text style={styles.hudPing}>4P</Text>
        </View>
      </View>

      {/* Player labels */}
      <View style={[styles.labelsRow, { width: arenaSize }]}>
        <PlayerLabel name={BOT_NAMES[1]} color="#00BFFF" side="left" />
        <PlayerLabel name={config.playerName} color={config.playerColor} side="center" highlight />
        <PlayerLabel name={BOT_NAMES[2]} color="#00FF88" side="right" />
      </View>

      {/* Arena */}
      <View style={[styles.arenaWrap, { width: arenaSize }]}>
        {/* Top label (P1) */}
        <View style={styles.topLabel}>
          <View style={[styles.labelDot, { backgroundColor: '#FF4757' }]} />
          <Text style={[styles.labelText, { color: '#FF4757' }]}>{BOT_NAMES[0]}</Text>
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
          />
        )}

        {/* Bottom label (P0) */}
        <View style={styles.bottomLabel}>
          <View style={[styles.labelDot, { backgroundColor: config.playerColor }]} />
          <Text style={[styles.labelText, { color: config.playerColor }]}>{config.playerName} · YOU</Text>
        </View>
      </View>

      {/* HUD Bottom: Power-up legend */}
      <View style={[styles.hudBottom, { paddingBottom: bottomPad + 4 }]}>
        {[
          { color: '#FFD700', label: 'Shield' },
          { color: '#00FF88', label: 'Speed' },
          { color: '#FF4757', label: 'Shrink' },
          { color: '#FF69B4', label: '+Life' },
          { color: '#00E5FF', label: 'Multi' },
        ].map(pu => (
          <View key={pu.label} style={styles.puLegend}>
            <View style={[styles.puDot, { backgroundColor: pu.color }]} />
            <Text style={[styles.puLabel, { color: pu.color }]}>{pu.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerLabel({ name, color, side, highlight }: { name: string; color: string; side: string; highlight?: boolean }) {
  return (
    <View style={[gameStyles.labelWrap, side === 'center' && { flex: 1.4 }, side !== 'center' && { flex: 1 }]}>
      <View style={[gameStyles.labelDot, { backgroundColor: color }]} />
      <Text style={[gameStyles.labelText, { color: highlight ? color : '#FFFFFF88', fontFamily: highlight ? 'Inter_700Bold' : 'Inter_500Medium' }]} numberOfLines={1}>
        {name}{highlight ? ' ◀' : ''}
      </Text>
    </View>
  );
}

const gameStyles = StyleSheet.create({
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  labelText: { fontSize: 10, letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 8, height: 48 },
  quitBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hudCenter: { flex: 1, alignItems: 'center' },
  hudTitle: { color: '#FFD700', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 2 },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 36, justifyContent: 'flex-end' },
  hudPing: { color: '#00FF88', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  labelsRow: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4, alignItems: 'center' },
  arenaWrap: { alignItems: 'center', gap: 4 },
  topLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 3, alignSelf: 'center' },
  bottomLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 3, alignSelf: 'center' },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  labelText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5 },
  hudBottom: { flexDirection: 'row', gap: 12, paddingTop: 8, paddingHorizontal: 20 },
  puLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  puDot: { width: 6, height: 6, borderRadius: 3 },
  puLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.5 },
});
