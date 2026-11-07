import React, { useState } from 'react';
import { Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { GameArena } from '@/components/GameArena';
import { Button, ui } from '@/components/ui/Primitives';
import { SKINS, usePlayer } from '@/context/PlayerContext';
import { useBlockingOverlay } from '@/context/OverlayQueue';
import { fonts } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Uses the same paddle renderer as matches, without touching ownership or balances. */
export function SkinComparison({ skinId, onClose }: { skinId: string; onClose: () => void }) {
  const visible = useBlockingOverlay(true);
  const { profile } = usePlayer();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(false);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState(0);
  const candidate = SKINS.find(item => item.id === skinId) ?? SKINS[0];
  const equipped = SKINS.find(item => item.id === profile.currentSkin) ?? SKINS[0];
  const item = current ? equipped : candidate;
  const size = Math.min(width - 64, 340);
  return <Modal visible={visible} onRequestClose={onClose} animationType="none">
    <ScrollView style={{ backgroundColor: ui.ink, flex: 1 }} contentContainerStyle={{
      padding: 24, paddingTop: Math.max(67, insets.top), paddingBottom: Math.max(34, insets.bottom),
      gap: 16, alignItems: 'center',
    }}>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 28, color: ui.paper }}>Compare paddle appearance</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color: ui.paperDim }}>{current ? 'Currently equipped' : 'Selected'} · {item.name}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color: ui.paperDim }}>
        {profile.ownedSkins.includes(candidate.id) ? 'Owned' : 'exclusive' in candidate && candidate.exclusive ? 'Locked to its pass reward' : `${candidate.price} coins`}
        {' · Cosmetic only. Comparing never buys or equips.'}
      </Text>
      {visible && <View style={{ width: size, height: size }}>
        <GameArena key={`${item.id}-${run}`} arenaSize={size} playerName="You" playerColor={item.color} playerGlowColor={item.glowColor}
          botNames={['North bot', 'West bot', 'East bot']} botRanks={['Bronze 1', 'Bronze 1', 'Bronze 1']}
          practice paused={!running} soundEnabled={false} botDifficulty="easy" botSkill={0}
          onGameOver={() => setRun(value => value + 1)} />
      </View>}
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color: ui.paperDim }}>Your paddle is at the bottom. Drag to move it. No progression.</Text>
      <Button label={current ? 'Show selected item' : 'Show equipped item'} variant="secondary" onPress={() => setCurrent(value => !value)} />
      <Button label={running ? 'Pause court preview' : 'Run court preview'} variant="secondary" onPress={() => setRunning(value => !value)} />
      <Button label="Close comparison" onPress={onClose} />
    </ScrollView>
  </Modal>;
}
