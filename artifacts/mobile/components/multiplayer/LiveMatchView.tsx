// Presentational live-match surface: waiting room, countdown, live court, reconnect/error, finished.
// Renders server snapshots only. No physics, no networking, no routing.
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { getApiBase } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LivePlayer, LiveRoom } from '@workspace/api-client-react';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import {useEquippedCosmetics} from '@/hooks/useEquippedCosmetics';
import {PaddleArt} from '@/components/cosmetics/PaddleArt';
import {THEME_FINISHES,STRIKE_FINISHES} from '@workspace/goldrush-catalog/cosmetics';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import { getSettings } from '@/hooks/useSettings';
import { paddleInput } from '@/utils/arenaGeometry';
import { useBrowserCourt } from '@/hooks/useBrowserCourt';

export type LiveMatchViewProps = {
  room: LiveRoom | null;
  playerId: string;
  connection: string;
  error: string | null;
  saved: boolean;
  ratingChange?: string;
  onMove: (position: number) => void;
  onLeave: () => void;
  onRetry: () => void;
  onCasual?: () => void;
  onResults: () => void;
  onAgain: () => void;
  captureTarget?: React.RefObject<View | null>;
  captureStatus?: string;
  momentCaptured?: boolean;
  onCapture?: () => void;
};

const COURT = 1000;
const WALL_MIN = 40;
const WALL_MAX = 960;
const PADDLE_LEN = 180;
const PADDLE_T = 24;
const PUCK_R = 12;
const KEY_STEP = 40;
const CASUAL_OFFER_MS = 20000;
const SEAT_NAMES = ['South', 'North', 'West', 'East'];
const clampPaddle = (v: number) => Math.max(WALL_MIN + PADDLE_LEN / 2, Math.min(WALL_MAX - PADDLE_LEN / 2, v));

function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

function paddleRect(p: LivePlayer, s: number) {
  const c = p.paddle * s, half = (PADDLE_LEN / 2) * s, t = PADDLE_T * s;
  switch (p.seat) {
    case 0: return { left: c - half, top: (WALL_MAX) * s - t / 2, width: half * 2, height: t };
    case 1: return { left: c - half, top: (WALL_MIN) * s - t / 2, width: half * 2, height: t };
    case 2: return { left: WALL_MIN * s - t / 2, top: c - half, width: t, height: half * 2 };
    default: return { left: WALL_MAX * s - t / 2, top: c - half, width: t, height: half * 2 };
  }
}

export function LiveMatchView({ room, playerId, connection, error, saved, ratingChange, onMove, onLeave, onRetry, onCasual, onResults, onAgain, captureTarget, captureStatus, momentCaptured, onCapture }: LiveMatchViewProps) {
  const insets = useSafeAreaInsets();
  const appearance=useEquippedCosmetics();
  const theme=THEME_FINISHES.find(t=>t.id===appearance.arenaTheme)??THEME_FINISHES[0];
  const strike=STRIKE_FINISHES.find(t=>t.id===appearance.strikeEffect)??STRIKE_FINISHES[0];
  const reduced=useReducedMotion();
  const [impact,setImpact]=useState(false);
  const previousScore=useRef<number|null>(null);
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const topPad = (isWeb ? 67 : insets.top) + 8;
  const bottomPad = (isWeb ? 34 : insets.bottom) + 12;
  const [confirmLeave, setConfirmLeave] = useState(false);

  const phase = room?.phase;
  const me = room?.players.find(p => p.id === playerId) ?? null;
  useEffect(()=>{
    const score=(me?.hits??0)+(me?.goals??0);
    const changed=previousScore.current!==null && score>previousScore.current;
    previousScore.current=score;
    if(!changed||reduced)return;
    setImpact(true);const timer=setTimeout(()=>setImpact(false),450);
    return ()=>{clearTimeout(timer);setImpact(false);};
  },[me?.hits,me?.goals,reduced]);
  const humans = room?.players.filter(p => !p.isBot).length ?? 0;
  const live = phase === 'countdown' || phase === 'playing';

  // Countdown: derive server offset once per snapshot, then tick locally. Single source, never doubled.
  const snapRef = useRef({ serverTime: 0, local: Date.now() });
  useEffect(() => { if (room) snapRef.current = { serverTime: room.serverTime, local: Date.now() }; }, [room?.serverTime]);
  const now = useNow(phase === 'countdown' || phase === 'waiting', phase === 'waiting' ? 1000 : 200);
  const estServer = snapRef.current.serverTime + (now - snapRef.current.local);
  const countdown = room && phase === 'countdown' ? Math.max(0, Math.ceil((room.startAt - estServer) / 1000)) : null;
  const waitedMs = room && phase === 'waiting' ? Math.max(0, estServer - room.createdAt) : 0;

  // Close any open confirmation when phase changes.
  useEffect(() => { setConfirmLeave(false); }, [phase]);

  // Court sizing
  const chrome = 230;
  const size = Math.floor(Math.max(240, Math.min(width - 24, height - topPad - bottomPad - chrome, 560)));
  const scale = size / COURT;

  // Drag control along own edge
  const seat = me?.seat ?? 0;
  const horizontal = seat === 0 || seat === 1;
  const posRef = useRef(me?.paddle ?? 500);
  useEffect(() => { if (me) posRef.current = me.paddle; }, [me?.paddle]);
  const onMoveRef = useRef(onMove); onMoveRef.current = onMove;
  const ctrlRef = useRef({ horizontal, scale, enabled: false });
  ctrlRef.current = { horizontal, scale, enabled: phase === 'playing' && !!me && me.lives > 0 && !confirmLeave && connection === 'connected' };
  const startRef = useRef(500);
  const send = (v: number) => { const c = Math.round(clampPaddle(v)); posRef.current = c; onMoveRef.current(c); };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => ctrlRef.current.enabled,
    onMoveShouldSetPanResponder: () => ctrlRef.current.enabled,
    onPanResponderGrant: e => {
      const { horizontal: h, scale: s } = ctrlRef.current;
      const v = (h ? e.nativeEvent.locationX : e.nativeEvent.locationY) / s;
      startRef.current = v; send(paddleInput(v, COURT, PADDLE_LEN, getSettings().sensitivity));
    },
    onPanResponderMove: (_e, g) => {
      if (!ctrlRef.current.enabled) return;
      const { horizontal: h, scale: s } = ctrlRef.current;
      send(paddleInput(startRef.current + (h ? g.dx : g.dy) / s, COURT, PADDLE_LEN, getSettings().sensitivity));
    },
    onPanResponderTerminationRequest: () => false,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const browserCourt = useBrowserCourt(ctrlRef.current.enabled, (x, y) => {
    if (ctrlRef.current.enabled) send(paddleInput((ctrlRef.current.horizontal ? x : y) * COURT, COURT, PADDLE_LEN, getSettings().sensitivity));
  });
  const nudge = (dir: -1 | 1) => { if (ctrlRef.current.enabled) send(posRef.current + dir * KEY_STEP * getSettings().sensitivity); };

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (!ctrlRef.current.enabled) return;
      const h = ctrlRef.current.horizontal;
      const neg = h ? e.key === 'ArrowLeft' : e.key === 'ArrowUp';
      const pos = h ? e.key === 'ArrowRight' : e.key === 'ArrowDown';
      if (neg || pos) { e.preventDefault(); send(posRef.current + (neg ? -KEY_STEP : KEY_STEP) * getSettings().sensitivity); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb]);

  const leaveLabel = phase === 'waiting' || !room ? 'Cancel queue' : 'Forfeit match';
  const leaveBody = phase === 'waiting' || !room
    ? 'You leave the queue. No match is recorded.'
    : room?.mode === 'ranked'
      ? 'Online matches cannot pause. Forfeiting eliminates your paddle. Your final placing is recorded when the match finishes.'
      : 'Online matches cannot pause. Your paddle is eliminated and the match continues without you.';
  const canLeave = !room || phase === 'waiting' || phase === 'countdown' || phase === 'playing';

  const header = (
    <View style={s.topBar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.kicker}>{room ? `${room.mode} · ${room.variant.replace('_', ' ')}` : 'Online'}</Text>
        <Text style={s.title} accessibilityRole="header" numberOfLines={1}>
          {!room ? 'Connecting' : phase === 'waiting' ? 'Finding players' : phase === 'countdown' ? 'Match found' : phase === 'playing' ? 'Live' : phase === 'saving' ? 'Saving result' : phase === 'void' ? 'Match void' : 'Final'}
        </Text>
      </View>
      <View style={s.metaBox} accessibilityLabel={`Connection ${connection}`}>
        <View style={[s.connDot, { backgroundColor: connection === 'open' || connection === 'connected' ? palette.gold : palette.orange }]} />
        <Text style={s.metaText}>{connection}</Text>
      </View>
    </View>
  );

  const facts = room ? (
    <View style={s.facts}>
      <Fact label="Region" value={room.region || 'Unknown'} />
      <Fact label="Humans" value={`${humans} of 4`} />
      <Fact label="AI" value={String(room.players.filter(p => p.isBot).length)} last />
    </View>
  ) : null;

  const errorBand = error ? (
    <View style={s.errorBand} accessibilityRole="alert">
      <Feather name="wifi-off" size={18} color={palette.foreground} />
      <Text style={s.errorText}>{error}</Text>
      <Button testID="live-retry" label="Retry" size="sm" variant="secondary" icon="refresh-cw" onPress={onRetry} />
    </View>
  ) : null;

  const confirm = confirmLeave ? (
    <View style={s.confirm} accessibilityRole="alert">
      <Text style={s.confirmTitle}>{leaveLabel}?</Text>
      <Text style={s.body}>{leaveBody}</Text>
      <View style={s.row}>
        <Button testID="live-cancel-confirm" label={leaveLabel} variant="primary" onPress={() => { setConfirmLeave(false); onLeave(); }} style={{ flex: 1 }} />
        <Button label="Stay" variant="secondary" onPress={() => setConfirmLeave(false)} style={{ flex: 1 }} />
      </View>
    </View>
  ) : null;

  const leaveBtn = canLeave && !confirmLeave ? (
    <Button testID="live-cancel" label={leaveLabel} variant="danger" icon="x" size="sm" onPress={() => setConfirmLeave(true)} />
  ) : null;

  // ── Finished / saving / void ──
  if (room && (phase === 'saving' || phase === 'finished' || phase === 'void')) {
    const standings = [...room.players].sort((a, b) => (a.place || 99) - (b.place || 99));
    return (
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {header}
        {facts}
        {errorBand}
        {phase === 'void' ? (
          <View style={s.panel}><Text style={s.body}>{room.reason || 'This match ended before a valid result. Nothing was recorded.'}</Text></View>
        ) : null}
        <View style={s.panel}>
          {standings.map(p => <PlayerRow key={p.id} p={p} me={p.id === playerId} showPlace />)}
          {ratingChange ? <Text style={s.body}>Verified skill: {ratingChange}. Placement and season history are in Ranks.</Text> : null}
        </View>
        {phase !== 'void' && !saved ? (
          <Text style={s.note}>{phase === 'saving' ? 'The server is confirming this result. Results open once it is saved.' : 'Waiting for save confirmation before showing rewards.'}</Text>
        ) : null}
        <View style={s.row}>
          {phase !== 'void' ? (
            <Button testID="live-results" label="Results" icon="award" disabled={!saved} onPress={onResults} style={{ flex: 1 }} />
          ) : null}
          <Button testID="live-again" label="Play again" disabled={phase !== 'void' && !saved} variant={phase === 'void' ? 'primary' : 'secondary'} icon="rotate-ccw" onPress={onAgain} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    );
  }

  // ── Waiting / connecting ──
  if (!room || phase === 'waiting') {
    const secs = Math.floor(waitedMs / 1000);
    return (
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        {header}
        {facts}
        {errorBand}
        <View style={s.panel}>
          <View style={s.waitHead}>
            <Text style={s.bigNum}>{room ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '--:--'}</Text>
            <Text style={s.metaLabel}>In queue</Text>
          </View>
          {[0, 1, 2, 3].map(i => {
            const p = room?.players.find(pl => pl.seat === i);
            return p ? <PlayerRow key={i} p={p} me={p.id === playerId} /> : (
              <View key={i} style={s.pRow}>
                <View style={[s.swatch, { backgroundColor: 'transparent', borderStyle: 'dashed' }]} />
                <Text style={[s.pName, { color: palette.supporting }]}>Open seat · {SEAT_NAMES[i]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.note}>Online matches cannot pause. {room?.mode === 'ranked' ? 'Ranked waits for four real players.' : 'After 5 seconds, eligible empty seats are filled by players marked AI. Reserved party seats wait for their members.'} Equal lives and paddles; bank lives and relic bonuses are not used.</Text>
        {room?.mode === 'ranked' && waitedMs >= CASUAL_OFFER_MS ? (
          <View style={s.panel}>
            <Text style={s.body}>Ranked queue is slow in {room.region}. Casual usually fills faster and does not change rating.</Text>
            {onCasual ? <Button testID="live-casual" label="Switch to Casual" variant="secondary" icon="shuffle" onPress={onCasual} style={{ marginTop: 10 }} /> : <Text style={s.note}>Party members must cancel and have their leader select Casual together on Home.</Text>}
          </View>
        ) : null}
        {confirm}
        {leaveBtn}
      </ScrollView>
    );
  }

  // ── Countdown / playing ──
  const ownStyle = me ? paddleRect({ ...me, paddle: me.paddle }, scale) : null;
  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, alignItems: 'center', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: size, gap: 8 }}>
        {header}
        {errorBand}
        {confirm}
        {leaveBtn}
        {phase === 'playing' && onCapture && <View style={s.row}>
          <Text accessibilityLiveRegion="polite" style={[s.note, { flex: 1 }]}>{captureStatus}</Text>
          <Button label={momentCaptured ? 'Moment captured' : 'Capture this moment'} icon="video" size="sm"
            disabled={captureStatus !== 'Recording ready'} onPress={onCapture} />
        </View>}
        <View style={s.board}>
          {[0, 1, 2, 3].map(i => {
            const p = room.players.find(pl => pl.seat === i);
            const mine = p?.id === playerId;
            return (
              <View key={i} style={[s.cell, mine && { backgroundColor: palette.gold }, i === 3 && { borderRightWidth: 0 }]} accessibilityLabel={`${SEAT_NAMES[i]} ${p ? p.name : 'empty'}${p?.isBot ? ' AI' : ''}, ${p?.lives ?? 0} lives`}>
                <Text style={s.cellSeat} numberOfLines={1}>{mine ? 'YOU' : p?.isBot ? 'AI' : SEAT_NAMES[i]}{p && !p.connected && !p.isBot ? ' · LOST' : ''}</Text>
                <Text style={s.cellLives}>{p ? (p.lives > 0 ? (room.variant === 'rally_race' ? `${p.hits - 2*p.goals}pt` : p.lives) : 'OUT') : '-'}</Text>
              </View>
            );
          })}
        </View>
        <View ref={node => { browserCourt.current = node; if (captureTarget) captureTarget.current = node; }} collapsable={false} testID="live-court" {...(isWeb ? {} : pan.panHandlers)} accessibilityLabel={`Court. You defend the ${SEAT_NAMES[seat]} edge. Drag ${horizontal ? 'left and right' : 'up and down'} to move.`}
          style={[s.court, { width: size, height: size,backgroundColor:theme.floor }]}>
          {theme.motif==='rings'?[0.3,0.5,0.7].map(n=><View key={n} pointerEvents="none" style={{position:'absolute',width:size*n,height:size*n,top:size*(1-n)/2,left:size*(1-n)/2,borderRadius:999,borderWidth:1,borderColor:theme.line,opacity:0.15}}/>):null}
          {theme.motif==='lines'?[1,2,3,4,5,6,7].map(n=><View key={n} pointerEvents="none" style={{position:'absolute',left:0,right:0,top:size*n/8,height:1,backgroundColor:theme.line,opacity:0.15}}/>):null}
          {impact?<View pointerEvents="none" style={{position:'absolute',inset:4,borderWidth:strike.motif==='rings'?4:2,borderColor:strike.color}}/>:null}
          {/* walls */}
          <View pointerEvents="none" style={[s.wall, { left: WALL_MIN * scale, top: WALL_MIN * scale, width: (WALL_MAX - WALL_MIN) * scale, height: (WALL_MAX - WALL_MIN) * scale }]} />
          {/* own edge highlight */}
          {me ? (
            <View pointerEvents="none" style={[s.ownEdge, horizontal
              ? { left: WALL_MIN * scale, width: (WALL_MAX - WALL_MIN) * scale, height: 4, top: (seat === 0 ? WALL_MAX : WALL_MIN) * scale + (seat === 0 ? PADDLE_T * scale / 2 + 2 : -PADDLE_T * scale / 2 - 6) }
              : { top: WALL_MIN * scale, height: (WALL_MAX - WALL_MIN) * scale, width: 4, left: (seat === 2 ? WALL_MIN : WALL_MAX) * scale + (seat === 2 ? -PADDLE_T * scale / 2 - 6 : PADDLE_T * scale / 2 + 2) }]} />
          ) : null}
          {room.players.filter(p => p.lives > 0).map(p => {
            const r = paddleRect(p, scale);
            return <View key={p.id} pointerEvents="none" style={[s.paddle, r, { backgroundColor: p.color, opacity: p.connected || p.isBot ? 1 : 0.5,overflow:'hidden' }]}>{p.id===playerId?<PaddleArt design={appearance.artwork} width={r.width} height={r.height}/>:null}</View>;
          })}
          {ownStyle ? (
            <Text pointerEvents="none" style={[s.youTag, seat === 0 ? { top: ownStyle.top - 22, left: ownStyle.left + ownStyle.width / 2 - 18 } : seat === 1 ? { top: ownStyle.top + ownStyle.height + 4, left: ownStyle.left + ownStyle.width / 2 - 18 } : seat === 2 ? { left: ownStyle.left + ownStyle.width + 4, top: ownStyle.top + ownStyle.height / 2 - 9 } : { left: ownStyle.left - 40, top: ownStyle.top + ownStyle.height / 2 - 9 }]}>YOU</Text>
          ) : null}
          {room.balls.map(b => (
            <View key={b.id} pointerEvents="none" style={[s.puck, { left: (b.x - PUCK_R) * scale, top: (b.y - PUCK_R) * scale, width: PUCK_R * 2 * scale, height: PUCK_R * 2 * scale }]} />
          ))}
          {phase === 'countdown' && countdown !== null ? (
            <View pointerEvents="none" style={s.overlay} accessibilityLiveRegion="assertive">
              <Text style={s.count}>{countdown > 0 ? countdown : 'GO'}</Text>
              <Text style={s.countSub}>You are {SEAT_NAMES[seat]}</Text>
            </View>
          ) : null}
          {me && me.lives <= 0 ? (
            <View pointerEvents="none" style={s.outBand}><Text style={s.outText}>You are out. Watching until the server finishes the match.</Text></View>
          ) : null}
        </View>
        <View style={s.youRow}>
          <View style={[s.swatch, { backgroundColor: me?.color ?? palette.slate }]} />
          <Text style={s.youText} numberOfLines={1}>YOU · {me?.name ?? 'Spectator'} · {SEAT_NAMES[seat]} edge</Text>
          <Pressable testID="live-move-neg" accessibilityRole="button" accessibilityLabel={horizontal ? 'Move paddle left' : 'Move paddle up'} onPress={() => nudge(-1)} style={s.arrow}>
            <Feather name={horizontal ? 'arrow-left' : 'arrow-up'} size={20} color={palette.foreground} />
          </Pressable>
          <Pressable testID="live-move-pos" accessibilityRole="button" accessibilityLabel={horizontal ? 'Move paddle right' : 'Move paddle down'} onPress={() => nudge(1)} style={s.arrow}>
            <Feather name={horizontal ? 'arrow-right' : 'arrow-down'} size={20} color={palette.foreground} />
          </Pressable>
        </View>
        {room.variant === 'rally_race' ? <View style={s.panel}><Text style={s.body}>Rally Race · {Math.max(0, 60 - Math.floor(room.tick / 60))}s left</Text><Text style={s.note}>Unlimited goal misses. Score = hits minus twice your misses. A tie gives no rewards. Disconnects and forfeits still eliminate.</Text>{room.players.map(p => <Text key={p.id} style={s.body}>{p.name}: {p.hits - 2*p.goals} points</Text>)}</View> : null}
        <Text style={s.note}>Online play cannot pause. {isWeb ? 'Drag inside the court or use arrow keys.' : 'Drag inside the court to move.'} {room.region} · {humans} human{humans === 1 ? '' : 's'}</Text>
      </View>
    </ScrollView>
  );
}

function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.fact, last && { borderRightWidth: 0 }]} accessibilityLabel={`${label} ${value}`}>
      <Text style={s.factVal} numberOfLines={1}>{value}</Text>
      <Text style={s.metaLabel}>{label}</Text>
    </View>
  );
}

function PlayerRow({ p, me, showPlace }: { p: LivePlayer; me: boolean; showPlace?: boolean }) {
  return (
    <View style={[s.pRow, me && { backgroundColor: palette.gold }]}>
      {showPlace ? <Text style={s.place}>{p.place > 0 ? p.place : '-'}</Text> : null}
      <View style={[s.swatch, { backgroundColor: p.color }]} />
      {p.avatarUrl && /^\/api\/avatars\/[a-f0-9-]{36}$/.test(p.avatarUrl) ? <Image source={{uri: `${getApiBase()}${p.avatarUrl}`}} style={{width:32,height:32}} accessibilityLabel={`${p.name}'s shared avatar`} /> : null}
      <Text style={s.pName} numberOfLines={1}>{p.name}{me ? ' (you)' : ''}</Text>
      {p.isBot ? <View style={s.aiBadge}><Text style={s.aiText}>AI</Text></View> : null}
      {!p.isBot && !p.connected ? <Text style={s.metaLabel}>Reconnecting</Text> : null}
      <Text style={s.pMeta}>{showPlace ? `${p.hits} hits` : SEAT_NAMES[p.seat] ?? ''}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, gap: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.supporting, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.foreground, textTransform: 'uppercase' },
  metaBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 8, paddingVertical: 4 },
  connDot: { width: 8, height: 8 },
  metaText: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, color: palette.foreground, textTransform: 'uppercase' },
  metaLabel: { fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, letterSpacing: 1, color: palette.supporting, textTransform: 'uppercase' },
  facts: { flexDirection: 'row', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface },
  fact: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: palette.border },
  factVal: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, textTransform: 'uppercase' },
  errorBand: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.primary, borderWidth: 2, borderColor: palette.edge, padding: 10 },
  errorText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: textScale.control, color: palette.foreground },
  panel: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.border, padding: 12, gap: 6 },
  waitHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  bigNum: { fontFamily: fonts.display, fontSize: 44, color: palette.foreground, fontVariant: ['tabular-nums'] },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: palette.border },
  place: { fontFamily: fonts.display, fontSize: 22, width: 22, color: palette.foreground },
  swatch: { width: 16, height: 16, borderWidth: 1, borderColor: palette.edge },
  pName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: textScale.body, color: palette.foreground },
  pMeta: { fontFamily: fonts.body, fontSize: textScale.control, color: palette.supporting },
  aiBadge: { borderWidth: 1, borderColor: palette.edge, backgroundColor: palette.background, paddingHorizontal: 5 },
  aiText: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, color: palette.foreground, letterSpacing: 1 },
  body: { fontFamily: fonts.body, fontSize: textScale.body, color: palette.foreground },
  note: { fontFamily: fonts.body, fontSize: textScale.control, color: palette.supporting },
  row: { flexDirection: 'row', gap: 10 },
  confirm: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.primary, padding: 12, gap: 8 },
  confirmTitle: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, textTransform: 'uppercase' },
  board: { flexDirection: 'row', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface },
  cell: { flex: 1, paddingVertical: 4, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: palette.border },
  cellSeat: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: palette.foreground },
  cellLives: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, fontVariant: ['tabular-nums'] },
  court: { backgroundColor: palette.inset, borderWidth: 2, borderColor: palette.edge, overflow: 'hidden' },
  wall: { position: 'absolute', borderWidth: 1, borderColor: palette.border, opacity: 0.35 },
  ownEdge: { position: 'absolute', backgroundColor: palette.gold },
  paddle: { position: 'absolute', borderWidth: 1, borderColor: palette.edge },
  youTag: { position: 'absolute', width: 36, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, color: palette.gold, letterSpacing: 1 },
  puck: { position: 'absolute', backgroundColor: palette.foreground, borderWidth: 1, borderColor: palette.edge },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.display, fontSize: 120, color: palette.gold, fontVariant: ['tabular-nums'] },
  countSub: { fontFamily: fonts.bodyBold, fontSize: textScale.body, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 1.4 },
  outBand: { position: 'absolute', left: 0, right: 0, top: '45%', backgroundColor: palette.deepest, padding: 10 },
  outText: { fontFamily: fonts.bodySemiBold, fontSize: textScale.control, color: palette.foreground, textAlign: 'center' },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  youText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: textScale.control, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.8 },
  arrow: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface },
});

export default LiveMatchView;
