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
      {GAMES_ROAD.map((m, i) => {
        const owned = claimed.includes(m.id);
        const ready = games >= m.games && !owned;
        const reached = games >= m.games;
        const nextReached = i < GAMES_ROAD.length - 1 && games >= GAMES_ROAD[i + 1].games;
        return (
          <View key={m.id} style={s.step}>
            <View style={s.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {i > 0 ? <View style={[s.seg, s.segTop, reached && s.segOn]} /> : null}
              {i < GAMES_ROAD.length - 1 ? <View style={[s.seg, s.segBottom, nextReached && s.segOn]} /> : null}
              <View style={[s.node, owned && s.nodeClaimed, ready && s.nodeReady]}>
                <Feather name={owned ? 'check' : ready ? 'gift' : 'lock'} size={16} color={owned || ready ? palette.onAccent : palette.supporting} />
              </View>
            </View>
          <View testID={`games-road-${m.id}`} style={[s.row, ready && { borderColor: palette.primary, borderBottomColor: palette.primaryEdge }, owned && { opacity: 0.85 }]}>
            <View style={s.copy}>
              <Text style={s.title}>{m.games} {m.games === 1 ? 'game' : 'games'} · {m.coins} coins</Text>
              <Text style={[s.body, ready && { color: palette.primary }, owned && { color: palette.gold }]}>{owned ? 'Claimed' : ready ? 'Ready to claim' : `${Math.min(games, m.games)} / ${m.games} completed`}</Text>
            </View>
            <Button testID={`claim-${m.id}`} label={owned ? 'Claimed' : ready ? 'Claim' : 'Locked'}
              size="sm" disabled={!ready || (!!busy && busy !== m.id)} loading={busy === m.id}
              accessibilityHint={`${m.coins} local coins for ${m.games} completed games`}
              variant={ready ? 'primary' : 'secondary'} onPress={() => void claim(m.id)} />
          </View>
          </View>
        );
      })}
      {notice ? <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text> : null}
    </Panel>
  );
}

const s = StyleSheet.create({
  lane: { padding: 16, gap: 12 },
  total: { fontFamily: fonts.display, fontSize: 26, color: palette.gold, letterSpacing: 0.5 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.supporting },
  step: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  rail: { width: 36, alignItems: 'center', justifyContent: 'center' },
  seg: { position: 'absolute', width: 6, borderRadius: 3, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.border },
  segTop: { top: -14, bottom: '50%' },
  segBottom: { top: '50%', bottom: -14 },
  segOn: { backgroundColor: palette.primary, borderColor: palette.primaryEdge },
  node: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.raised, borderWidth: 1.5, borderBottomWidth: 3, borderColor: palette.border, borderBottomColor: palette.edge },
  nodeReady: { backgroundColor: palette.primary, borderColor: palette.primary, borderBottomColor: palette.primaryEdge },
  nodeClaimed: { backgroundColor: palette.gold, borderColor: palette.gold, borderBottomColor: palette.goldEdge },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 12, backgroundColor: palette.inset, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, borderRadius: 14 },
  copy: { flex: 1, minWidth: 130, gap: 2 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.foreground },
});
