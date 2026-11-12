// Private four-player custom room: create, join by code, recover current, explicit rule agreement,
// live play over the existing authenticated socket. Four real players, no bots, no rewards.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  agreeCustomRoom, createCustomRoom, getLiveRoom, joinCustomRoom, leaveLiveQueue,
  type LiveRoom, type WorkshopPreset,
} from '@workspace/api-client-react';
import { palette, PLAYER_COLORS } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { Notice, PlateButton, SectionLabel } from '@/components/cosmetics/StudioControls';
import { WorkshopCourt, type CourtSnapshot } from '@/components/cosmetics/WorkshopCourt';
import { cosmeticErrorMessage } from '@/hooks/useCosmetics';
import { apiUrl } from '@/utils/api';
import { arenaRequestOptions, getArenaSession } from '@/utils/arenaSession';

const SEATS = ['South', 'North', 'West', 'East'];
const isCustom = (r: LiveRoom | null | undefined): boolean => !!r && !!r.customCode && !!r.customPreset;

export function RulesSummary({ preset }: { preset: WorkshopPreset }) {
  const r = preset.rules;
  return (
    <View style={s.rules} accessibilityLabel="Locked room rules">
      {[['Paddle', `${r.paddleScale}x`], ['Speed', `${r.ballSpeed}x`], ['Bounce', r.bounce], ['Lives', String(r.lives)], ['Balls', `${r.balls} to ${r.maxBalls}`]].map(([k, v]) => (
        <View key={k} style={s.fact}><Text style={s.factVal}>{v}</Text><Text style={s.factLbl}>{k}</Text></View>
      ))}
    </View>
  );
}

export function CustomRoomPanel({ preset, username, playerName, size, onLoadPreset }: { preset: WorkshopPreset; username: string; playerName: string; size: number; onLoadPreset: (p: WorkshopPreset) => void }) {
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [standard, setStandard] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [connection, setConnection] = useState('idle');
  const socket = useRef<WebSocket | null>(null);
  const seq = useRef(0);
  const lastInput = useRef(0);
  const color = PLAYER_COLORS[0];
  const name = (playerName || 'Player').slice(0, 24);

  const recover = useCallback(async () => {
    setChecking(true); setErr(null);
    try {
      const session = await getArenaSession(username);
      setPlayerId(session.playerId);
      const r = await getLiveRoom(await arenaRequestOptions(username));
      if (isCustom(r)) { setRoom(r); setStandard(false); } else { setRoom(null); setStandard(!['finished', 'void'].includes(r.phase)); }
    } catch (e) {
      if ((e as { status?: number }).status === 404) { setRoom(null); setStandard(false); }
      else setErr(cosmeticErrorMessage(e));
    } finally { setChecking(false); }
  }, [username]);
  useEffect(() => { void recover(); }, [recover]);

  // Socket only for live custom rooms; recovered void/finished rooms never resume.
  const roomId = room?.id;
  const live = !!room && !['void', 'finished'].includes(room.phase);
  useEffect(() => {
    if (!roomId || !live) return;
    let disposed = false, retries = 0, last = Date.now();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      if (disposed) return;
      try {
        const session = await getArenaSession(username);
        const ws = new WebSocket(apiUrl('').replace(/^http/, 'ws'));
        socket.current = ws; setConnection('connecting');
        ws.onopen = () => { last = Date.now(); seq.current = 0; ws.send(JSON.stringify({ type: 'auth', token: session.token })); };
        ws.onmessage = ev => {
          if (disposed) return; last = Date.now();
          try {
            const m = JSON.parse(ev.data);
            if (m.type === 'ready') { setConnection('connected'); retries = 0; }
            if (m.type === 'snapshot' && m.room?.id === roomId) setRoom(m.room as LiveRoom);
            if (m.type === 'error') setErr(String(m.error));
          } catch { setErr('An invalid server update was received.'); }
        };
        ws.onclose = () => {
          if (disposed) return;
          setConnection('reconnecting');
          if (retries++ < 8) retry = setTimeout(connect, Math.min(4000, 500 * 2 ** retries));
          else setErr('Connection lost. Use Check room to recover.');
        };
        ws.onerror = () => ws.close();
      } catch (e) { setErr(cosmeticErrorMessage(e)); }
    };
    void connect();
    const ping = setInterval(() => {
      const ws = socket.current;
      if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'ping' })); if (Date.now() - last > 12000) ws.close(); }
    }, 3000);
    return () => { disposed = true; clearTimeout(retry); clearInterval(ping); socket.current?.close(); socket.current = null; setConnection('idle'); };
  }, [roomId, live, username]);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setErr(null);
    try { await fn(); } catch (e) { setErr(cosmeticErrorMessage(e)); } finally { setBusy(null); }
  };
  const create = () => act('create', async () => {
    const r = await createCustomRoom({ preset: { ...preset, name: preset.name.trim() || 'Custom room' }, name, color }, await arenaRequestOptions(username));
    setRoom(r);
  });
  const join = () => act('join', async () => {
    const r = await joinCustomRoom({ code: code.trim().toUpperCase(), name, color }, await arenaRequestOptions(username));
    setRoom(r);
  });
  const agree = () => act('agree', async () => {
    if (!room?.configHash) throw new Error('This room has no rule fingerprint yet. Check the room again.');
    setRoom(await agreeCustomRoom({ roomId: room.id, configHash: room.configHash }, await arenaRequestOptions(username)));
  });
  const leave = () => act('leave', async () => {
    await leaveLiveQueue(await arenaRequestOptions(username));
    socket.current?.close(); setRoom(null);
  });
  const move = (v: number) => {
    if (Date.now() - lastInput.current < 30) return;
    lastInput.current = Date.now();
    const position = Math.round(Math.max(0, Math.min(1000, v)));
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'input', position, seq: ++seq.current }));
  };

  const errBand = err ? <Notice tone="error" text={err} action="Dismiss" onAction={() => setErr(null)} /> : null;
  const noRewards = <Text style={s.hint}>Private rooms award no coins, XP, rating or quest progress. Rules are fixed when the room is created.</Text>;

  if (checking) return <View style={{ gap: 8 }}><View style={s.skeleton} /><Text style={s.hint}>Checking for a room you are already in.</Text></View>;

  if (!room) {
    return (
      <View style={{ gap: 12 }} testID="cr-entry">
        <SectionLabel aside="4 real players">Private room</SectionLabel>
        {standard ? <Notice tone="info" text="You are in a standard online match right now. Finish or leave it from Play before opening a private room." /> : null}
        {errBand}
        <Text style={s.hint}>Create a room from this draft's rules, or join a friend's 8-character code. Everyone, host included, must agree to the exact rules before play.</Text>
        <RulesSummary preset={preset} />
        <PlateButton tone="orange" label="Create room with these rules" onPress={() => void create()} busy={busy === 'create'} disabled={!!busy || standard} testID="cr-create" />
        <View style={s.joinRow}>
          <TextInput testID="cr-code" value={code} onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))} autoCapitalize="characters"
            placeholder="CODE" placeholderTextColor={palette.muted} style={s.code} accessibilityLabel="Room code" />
          <PlateButton label="Join" onPress={() => void join()} busy={busy === 'join'} disabled={!!busy || code.length !== 8 || standard} testID="cr-join" />
        </View>
        <PlateButton label="Check room" onPress={() => void recover()} disabled={!!busy} testID="cr-recover" />
        {noRewards}
      </View>
    );
  }

  const p = room.customPreset!;
  const me = room.players.find(x => x.id === playerId);
  const agreed = new Set(room.agreedIds ?? []);
  const standings = [...room.players].sort((a, b) => (a.place || 99) - (b.place || 99));

  if (room.phase === 'void' || room.phase === 'finished') {
    return (
      <View style={{ gap: 12 }} testID="cr-ended">
        <SectionLabel aside={`Code ${room.customCode}`}>{room.phase === 'void' ? 'Room ended' : 'Room finished'}</SectionLabel>
        {room.phase === 'void' ? <Notice tone="info" text={room.reason || 'This private room was interrupted (for example by a server restart). It cannot resume. Nothing was awarded.'} /> : null}
        {room.phase === 'finished' ? standings.map(x => (
          <View key={x.id} style={[s.seat, x.id === playerId && s.seatMine]}>
            <Text style={s.place}>{x.place || '-'}</Text><View style={[s.sw, { backgroundColor: x.color }]} />
            <Text style={s.seatName} numberOfLines={1}>{x.name}{x.id === playerId ? ' (you)' : ''}</Text><Text style={s.hint}>{x.hits} hits</Text>
          </View>
        )) : null}
        <RulesSummary preset={p} />
        <Text style={s.hint}>No rewards were issued for this room.</Text>
        {errBand}
        <View style={s.row}>
          <PlateButton tone="navy" label="Load its preset as draft" onPress={() => onLoadPreset(p)} testID="cr-load-preset" style={{ flex: 1 }} />
          <PlateButton tone="orange" label="Close and start anew" onPress={() => void leave()} busy={busy === 'leave'} disabled={!!busy} testID="cr-close" style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  if (room.phase === 'waiting') {
    return (
      <View style={{ gap: 12 }} testID="cr-lobby">
        <View style={s.codeBox}><Text style={s.factLbl}>Room code</Text><Text style={s.codeBig} selectable testID="cr-room-code">{room.customCode}</Text></View>
        <Text style={s.hint}>{p.name}. Rules are locked. {connection}</Text>
        <RulesSummary preset={p} />
        {[0, 1, 2, 3].map(i => {
          const x = room.players.find(pl => pl.seat === i);
          return (
            <View key={i} style={[s.seat, x?.id === playerId && s.seatMine]}>
              <View style={[s.sw, { backgroundColor: x?.color ?? 'transparent' }]} />
              <Text style={s.seatName} numberOfLines={1}>{x ? `${x.name}${x.id === playerId ? ' (you)' : ''}` : `Open seat, ${SEATS[i]}`}</Text>
              <Text style={[s.badge, x && agreed.has(x.id) && s.badgeOn]}>{x ? (agreed.has(x.id) ? 'Agreed' : 'Reviewing') : 'Waiting'}</Text>
            </View>
          );
        })}
        <Text style={s.hint}>The match starts only when four real players are seated and all four agree. No AI fills seats.</Text>
        {errBand}
        <View style={s.row}>
          <PlateButton tone="orange" label={me && agreed.has(me.id) ? 'You agreed' : 'Agree to these rules'} onPress={() => void agree()} busy={busy === 'agree'}
            disabled={!!busy || !me || agreed.has(me.id) || !room.configHash} testID="cr-agree" style={{ flex: 1 }} />
          <PlateButton label="Leave room" onPress={() => void leave()} busy={busy === 'leave'} disabled={!!busy} testID="cr-leave" style={{ flex: 1 }} />
        </View>
        {noRewards}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }} testID="cr-live">
      <View style={s.board}>
        {[0, 1, 2, 3].map(i => {
          const x = room.players.find(pl => pl.seat === i);
          return <View key={i} style={[s.cell, x?.id === playerId && { backgroundColor: palette.gold }]}>
            <Text style={[s.factLbl, x?.id === playerId && { color: palette.onAccent }]} numberOfLines={1}>{x?.id === playerId ? 'YOU' : SEATS[i]}{x && !x.connected ? ' LOST' : ''}</Text>
            <Text style={[s.factVal, x?.id === playerId && { color: palette.onAccent }]}>{x ? (x.lives > 0 ? x.lives : 'OUT') : '-'}</Text>
          </View>;
        })}
      </View>
      <WorkshopCourt testID="cr-court" snapshot={room as unknown as CourtSnapshot} court={p.court} hit={p.hit} paddleScale={p.rules.paddleScale} size={size}
        controlId={playerId} onTarget={room.phase === 'playing' && connection === 'connected' ? move : undefined} />
      <Text style={s.hint}>{room.phase === 'countdown' ? 'Starting. ' : ''}Private rules, no pause, no rewards. {connection}</Text>
      {errBand}
      {connection !== 'connected' ? <PlateButton label="Check room" onPress={() => void recover()} disabled={!!busy} testID="cr-recover-live" /> : null}
      <PlateButton label="Leave match" onPress={() => void leave()} busy={busy === 'leave'} disabled={!!busy} testID="cr-forfeit" />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting },
  skeleton: { height: 120, borderRadius: 8, backgroundColor: palette.raised, opacity: 0.6 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.inset },
  fact: { minWidth: '20%', flexGrow: 1, padding: 8 },
  factVal: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground, textTransform: 'uppercase' },
  factLbl: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: palette.supporting, textTransform: 'uppercase' },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  code: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.inset, paddingHorizontal: 12, fontFamily: fonts.display, fontSize: 24, letterSpacing: 4, color: palette.foreground },
  codeBox: { alignItems: 'center', padding: 12, borderWidth: 3, borderBottomWidth: 6, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.surface },
  codeBig: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 6, color: palette.gold },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 8, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  seatMine: { borderColor: palette.gold, borderWidth: 2 },
  sw: { width: 16, height: 16, borderRadius: 999, borderWidth: 1, borderColor: palette.edge },
  seatName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: palette.foreground },
  place: { fontFamily: fonts.display, fontSize: 22, width: 22, color: palette.foreground },
  badge: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.supporting, textTransform: 'uppercase', borderWidth: 1, borderColor: palette.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeOn: { color: palette.onAccent, backgroundColor: palette.primary, borderColor: palette.edge },
  board: { flexDirection: 'row', borderWidth: 2, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface, overflow: 'hidden' },
  cell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: palette.border },
});

export default CustomRoomPanel;
