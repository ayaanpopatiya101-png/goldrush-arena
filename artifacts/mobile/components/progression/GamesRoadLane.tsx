import React, { useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GAMES_ROAD, usePlayer } from '@/context/PlayerContext';
import { Button, Panel, SectionLabel } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export function GamesRoadLane() {
  const { profile, claimGamesRoad } = usePlayer();
  const games = profile.gamesRoadCompleted ?? 0;
  const claimed = profile.gamesRoadClaimed ?? [];
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const locked = useRef(false);

  async function claim(id: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(id);
    setNotice('');
    try {
      const granted = await claimGamesRoad(id);
      setNotice(granted ? 'Coins saved to this device’s profile.' : 'Already claimed or not yet unlocked. No coins added.');
    } catch {
      setNotice('Could not save this claim. No coins added. Retry when device storage is available.');
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  return (
    <Panel style={s.lane}>
      <SectionLabel title="Games played rewards" />
      <Text testID="games-road-count" style={s.total}>{games.toLocaleString()} completed games</Text>
      <Text style={s.body}>
        Finish eligible matches to earn these rewards, win or lose. This lane starts from zero with this update; your existing XP, rewards and match record are kept.
      </Text>
      <Text style={s.body}>
        Practice, demos, replays, unfinished games and custom rules do not count. Coins here are device-local, not an authoritative online balance.
      </Text>
      {GAMES_ROAD.map(m => {
        const owned = claimed.includes(m.id);
        const ready = games >= m.games && !owned;
        return (
          <View key={m.id} testID={`games-road-${m.id}`} style={[s.row, ready && { borderColor: palette.primary }]}>
            <Feather name={owned ? 'check-circle' : ready ? 'gift' : 'lock'} size={22} color={ready ? palette.primary : owned ? palette.gold : palette.supporting} />
            <View style={s.copy}>
              <Text style={s.title}>{m.games} {m.games === 1 ? 'game' : 'games'} · {m.coins} coins</Text>
              <Text style={s.body}>{owned ? 'Claimed' : ready ? 'Ready to claim' : `${Math.min(games, m.games)} / ${m.games} completed`}</Text>
            </View>
            <Button testID={`claim-${m.id}`} label={owned ? 'Claimed' : ready ? 'Claim' : 'Locked'}
              size="sm" disabled={!ready || (!!busy && busy !== m.id)} loading={busy === m.id}
              accessibilityHint={`${m.coins} local coins for ${m.games} completed games`}
              variant={ready ? 'primary' : 'secondary'} onPress={() => void claim(m.id)} />
          </View>
        );
      })}
      {notice ? <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text> : null}
    </Panel>
  );
}

const s = StyleSheet.create({
  lane: { padding: 16, gap: 12 },
  total: { fontFamily: fonts.display, fontSize: 28, color: palette.gold },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.supporting },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 12, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.border, borderRadius: 10 },
  copy: { flex: 1, minWidth: 130, gap: 2 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.foreground },
});
