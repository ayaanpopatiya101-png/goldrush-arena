// Solo Survival Run: one paddle, one miss ends the run. Hits and personal best only.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackgroundMusicButton, useBackgroundMusic } from '@/components/BackgroundMusic';
import { GameArena, type GameResult } from '@/components/GameArena';
import { Button, IconButton } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { useEquippedCosmetics } from '@/hooks/useEquippedCosmetics';
import { useSettings } from '@/hooks/useSettings';
import { setCompletedMatch } from '@/store/completedMatch';
import { setGameConfig } from '@/store/gameSession';

export const ARCADE_BEST_KEY = '@arcade_best_score';

export default function ArcadeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profile, currentUsername } = usePlayer();
  const appearance=useEquippedCosmetics();
  const { settings } = useSettings();
  const music = useBackgroundMusic();

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 16) : insets.top;
  const bottomPad = Platform.OS === 'web' ? Math.max(insets.bottom, 16) : insets.bottom;
  const chrome = 52 + 64 + 56 + topPad + bottomPad;
  const arenaSize = Math.max(260, Math.min(width - 24, height - chrome, 640));

  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hits, setHits] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const musicStarted = useRef(false);

  const skin = SKINS.find(s => s.id === profile.currentSkin) ?? SKINS[0]!;

  useEffect(() => {
    AsyncStorage.getItem(ARCADE_BEST_KEY).then(v => { if (v) setBestScore(parseInt(v, 10) || 0); });
    setGameConfig({
      playerName: profile.name, playerSkinId: skin.id,
      playerColor: skin.color, playerGlowColor: skin.glowColor,
      matchType: 'arcade', variant: 'classic',
    });
    return () => { music.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next !== 'active' && !gameOver) setPaused(true); });
    return () => sub.remove();
  }, [gameOver]);

  async function handleGameOver(result: GameResult) {
    setGameOver(true);
    music.stop();
    const score = result.deflections;
    const newBest = Math.max(score, bestScore);
    await AsyncStorage.setItem(ARCADE_BEST_KEY, String(newBest));
    setCompletedMatch({
      id: String(Date.now()),
      username: currentUsername,
      xpBefore: profile.xp, xpAfter: profile.xp, xpEarned: 0, coinsEarned: 0,
      levelBefore: profile.competitiveLevel, levelAfter: profile.competitiveLevel,
      won: false, position: 1, deflections: score, goalsAgainst: 1,
      matchType: 'arcade', bonusApplied: true, qualifierApplied: false, ceremonySeen: false,
    });
    router.replace({
      pathname: '/postgame',
      params: {
        won: '0', position: '1', deflections: String(score), goalsAgainst: '1',
        xpEarned: '0', coinsEarned: '0', matchType: 'arcade', levelBefore: '0',
        streakMult: '1', diffMult: '1', winStreak: '0', variant: 'classic',
        arcadeBest: String(newBest),
      },
    });
  }

  function ensureMusic() {
    if (!musicStarted.current && settings.musicEnabled) { musicStarted.current = true; music.start(); }
  }

  const best = Math.max(bestScore, hits);
  const isNewBest = hits > 0 && hits >= bestScore;

  return (
    <View style={[s.root, { paddingTop: topPad, paddingBottom: bottomPad }]} onTouchStart={ensureMusic}>
      <View style={[s.column, { width: arenaSize }]}>
        <View style={s.hud}>
          <IconButton icon="pause" label="Pause run" onPress={() => setPaused(true)} />
          <Text style={s.mode} accessibilityRole="header">Survival Run</Text>
          <BackgroundMusicButton muted={music.muted} onToggle={music.setMuted} />
        </View>

        <View style={s.board} accessibilityLabel={`Hits ${hits}, best ${best}`}>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Hits</Text>
            <Text style={s.cellValue}>{hits}</Text>
          </View>
          <View style={[s.cell, s.cellMid]}>
            <Text style={s.cellLabel}>Best</Text>
            <Text style={s.cellValue}>{best}</Text>
          </View>
          <View style={s.cell}>
            <Text style={s.cellLabel}>Rule</Text>
            <Text style={s.rule}>{isNewBest ? 'New best' : 'One miss ends it'}</Text>
          </View>
        </View>

        <View style={[s.frame, { width: arenaSize, height: arenaSize }]}>
          {!gameOver && (
            <GameArena
              {...appearance}
              arenaSize={arenaSize - 2}
              courtStyle="tactile"
              playerName={profile.name}
              playerColor={skin.color}
              playerGlowColor={skin.glowColor}
              botNames={[]}
              botRanks={[]}
              onGameOver={handleGameOver}
              colorBoard={false}
              soundEnabled={settings.soundEnabled}
              sensitivity={settings.sensitivity}
              onActiveBallsChange={() => {}}
              paused={paused}
              arcadeMode
              initialLives={1}
              noPowerups
              startSpeedMult={0.48}
              ballSpawnFrames={999999}
              onScoreChange={setHits}
            />
          )}
        </View>

        <View style={s.footer}>
          <View style={[s.youMark, { borderColor: skin.color }]}><Text style={s.youText}>You</Text></View>
          <Text style={s.tip}>
            {Platform.OS === 'web' ? 'Move with the mouse, a finger, or arrow keys. ' : 'Drag along the bottom edge. '}
            Speed rises with every hit. No rank or rewards.
          </Text>
        </View>
      </View>

      <Modal visible={paused} transparent animationType="none" onRequestClose={() => setPaused(false)}>
        <View style={s.scrim}>
          <View style={s.dialog} accessibilityViewIsModal>
            <Text style={s.dialogTitle} accessibilityRole="header">Run paused</Text>
            <Text style={s.dialogBody}>{hits} hits so far. Leaving ends this run and it will not be scored.</Text>
            <Button label="Resume" size="lg" onPress={() => setPaused(false)} />
            <Button label="Leave run" variant="danger" onPress={() => { setPaused(false); music.stop(); router.replace('/'); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background, alignItems: 'center' },
  column: { flex: 1, gap: 8 },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  mode: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, letterSpacing: 0.5 },
  board: { flexDirection: 'row', borderWidth: 2, borderColor: palette.edge, borderRadius: 10, backgroundColor: palette.raised },
  cell: { flex: 1, paddingVertical: 8, paddingHorizontal: 12 },
  cellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.border },
  cellLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.foreground },
  cellValue: { fontFamily: fonts.display, fontSize: 26, color: palette.foreground, fontVariant: ['tabular-nums'] },
  rule: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.foreground, marginTop: 6 },
  frame: { borderWidth: 1, borderColor: palette.edge, borderRadius: 10, overflow: 'hidden', backgroundColor: palette.background },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  youMark: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  youText: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.foreground },
  tip: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.supporting, lineHeight: 19 },
  scrim: { flex: 1, backgroundColor: palette.background + 'E6', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.edge, borderRadius: 10, padding: 20, gap: 12 },
  dialogTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.foreground },
  dialogBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: palette.supporting },
});
