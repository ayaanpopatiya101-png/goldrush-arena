import React, { useState } from 'react';
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameArena, type GameResult } from '@/components/GameArena';
import { Button, Panel, Shell, ScreenTitle, paperText, ui } from '@/components/ui/Primitives';
import { tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useSettings } from '@/hooks/useSettings';

/** A sandbox: never writes matches, quests, balances or lives-bank inventory. */
export default function PracticeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting, error } = useSettings();
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [paused, setPaused] = useState(false);
  const size = Math.min(width - 40, 420);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: ui.ink }} contentContainerStyle={{
      paddingTop: Platform.OS === 'web' ? Math.max(67, insets.top) : insets.top,
      paddingBottom: Math.max(34, insets.bottom), paddingHorizontal: 20,
    }}>
      <Shell style={{ gap: 16 }}>
        <ScreenTitle title="Practice" kicker="Free court · no rewards" />
        <Text style={{ fontFamily: fonts.body, fontSize: 16, color: ui.paperDim }}>You defend the bottom edge against three local bots. Drag to move. On desktop, click and drag. No XP, coins, quests or competitive changes. Bank lives are never used.</Text>
        {result ? <Panel tone="paper" style={{ gap: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, color: paperText.ink }}>Practice complete · {result.deflections} blocks</Text>
          <Button label="Practice again" onPress={() => { setResult(null); setPaused(false); setRun(value => value + 1); }} />
        </Panel> : <>
          <View style={{ width: size, height: size, alignSelf: 'center' }}>
            <GameArena key={run} arenaSize={size} playerName="You" playerColor={ui.orange} playerGlowColor={ui.orange}
              courtStyle="tactile"
              botNames={['North bot', 'West bot', 'East bot']} botRanks={['Bronze 1', 'Bronze 1', 'Bronze 1']}
              practice botDifficulty="easy" botSkill={0} sensitivity={settings.sensitivity} soundEnabled={settings.soundEnabled}
              paused={paused} onGameOver={setResult} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 3, borderColor: tactile.brass }} />
          </View>
          <Button label={paused ? 'Resume practice' : 'Pause practice'} variant="secondary" onPress={() => setPaused(value => !value)} />
        </>}
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 16, color: ui.paper }}>Paddle sensitivity</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[0.6, 'Slow'], [1, 'Normal'], [1.5, 'Fast']].map(([value, label]) =>
            <Button key={value} label={String(label)} variant={settings.sensitivity === value ? 'primary' : 'secondary'}
              style={{ flex: 1 }} onPress={() => updateSetting('sensitivity', Number(value))} />)}
        </View>
        {error && <Text accessibilityRole="alert" style={{ color: ui.paper }}>{error}</Text>}
        <Button label="Return to Play" variant="ghost" onPress={() => router.replace('/')} />
      </Shell>
    </ScrollView>
  );
}
