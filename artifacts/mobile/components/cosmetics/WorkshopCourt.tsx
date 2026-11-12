// Shared four-sided court renderer for workshop preview, practice and private rooms.
// Draws a snapshot only: no physics here. Snapshots are structurally compatible with LiveRoom and ArenaRoom.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import type { CourtAppearance, HitAppearance } from '@workspace/api-client-react';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBrowserCourt } from '@/hooks/useBrowserCourt';

export type CourtPlayer = { id: string; seat: number; paddle: number; lives: number; color: string; isBot: boolean; hits: number; name?: string; connected?: boolean };
export type CourtBall = { id: number; x: number; y: number };
export type CourtSnapshot = { players: CourtPlayer[]; balls: CourtBall[] };

export const COURT = 1000;
const WALL_MIN = 40, WALL_MAX = 960, BASE_PADDLE = 180, PADDLE_T = 24, PUCK_R = 12, KEY_STEP = 40;
const MAX_FLASHES = 6, FLASH_GAP_MS = 500; // at most 2 localized impacts per second, total
const SEATS = ['South', 'North', 'West', 'East'];

/** Same bounds as the shared engine's clamp(v, scale). */
export function paddleBounds(scale = 1) {
  const half = (BASE_PADDLE * scale) / 2;
  return { min: WALL_MIN + half, max: WALL_MAX - half };
}
const bound = (v: number, scale: number) => { const b = paddleBounds(scale); return Math.max(b.min, Math.min(b.max, v)); };

/** Floor texture and markings only. Reusable anywhere a custom court is drawn. */
export function CourtDecor({ court, size }: { court: CourtAppearance; size: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {court.texture === 'grain' ? [0.12, 0.27, 0.41, 0.58, 0.73, 0.88].map(n => (
        <View key={n} style={{ position: 'absolute', left: 0, right: 0, top: size * n, height: 1, backgroundColor: court.lines, opacity: 0.08 }} />
      )) : null}
      {court.texture === 'beveled' ? <View style={[StyleSheet.absoluteFill, { borderWidth: Math.max(3, size * 0.012), borderColor: court.lines, opacity: 0.18 }]} /> : null}
      {court.markings === 'rings' ? [0.28, 0.5, 0.72].map(n => (
        <View key={n} style={{ position: 'absolute', width: size * n, height: size * n, top: size * (1 - n) / 2, left: size * (1 - n) / 2, borderRadius: 999, borderWidth: 2, borderColor: court.lines, opacity: 0.35 }} />
      )) : null}
      {court.markings === 'lanes' ? [1, 2, 3].map(n => (
        <React.Fragment key={n}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: size * n / 4, width: 2, backgroundColor: court.lines, opacity: 0.3 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: size * n / 4, height: 2, backgroundColor: court.lines, opacity: 0.3 }} />
        </React.Fragment>
      )) : null}
      {court.markings === 'classic' ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: size / 2 - 1, height: 2, backgroundColor: court.lines, opacity: 0.35 }} />
          <View style={{ position: 'absolute', width: size * 0.2, height: size * 0.2, top: size * 0.4, left: size * 0.4, borderRadius: 999, borderWidth: 2, borderColor: court.lines, opacity: 0.35 }} />
        </>
      ) : null}
      <View style={[st.wall, { borderColor: court.lines, left: WALL_MIN * size / COURT, top: WALL_MIN * size / COURT, width: (WALL_MAX - WALL_MIN) * size / COURT, height: (WALL_MAX - WALL_MIN) * size / COURT }]} />
    </View>
  );
}

type Flash = { key: number; x: number; y: number };

export type WorkshopCourtProps = {
  snapshot: CourtSnapshot | null;
  court: CourtAppearance;
  hit: HitAppearance;
  paddleScale?: number;
  size: number;
  /** Player id controlled by this client; enables drag, pointer and arrow-key input when onTarget is given. */
  controlId?: string;
  onTarget?: (position: number) => void;
  label?: string;
  testID?: string;
};

export function WorkshopCourt({ snapshot, court, hit, paddleScale = 1, size, controlId, onTarget, label, testID }: WorkshopCourtProps) {
  const reduced = useReducedMotion();
  const sc = size / COURT;
  const len = BASE_PADDLE * paddleScale;
  const me = snapshot?.players.find(p => p.id === controlId);
  const horizontal = !me || me.seat <= 1;

  // Engine snapshots are mutated in place, so key the hit detector on a value signature.
  const hitSig = snapshot ? snapshot.players.map(p => `${p.id}:${p.hits}`).join('|') : '';
  const snapRef = useRef(snapshot); snapRef.current = snapshot;
  const prevHits = useRef<Record<string, number>>({});
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const counter = useRef(0);
  const lastFlash = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  useEffect(() => { if (reduced) { timers.current.forEach(clearTimeout); timers.current.clear(); setFlashes([]); } }, [reduced]);
  useEffect(() => {
    const snap = snapRef.current;
    if (!snap) { prevHits.current = {}; return; }
    let spot: { x: number; y: number } | null = null;
    for (const p of snap.players) {
      const before = prevHits.current[p.id];
      if (before !== undefined && p.hits > before && !spot) {
        const edge = p.seat === 0 ? { x: p.paddle, y: WALL_MAX } : p.seat === 1 ? { x: p.paddle, y: WALL_MIN } : p.seat === 2 ? { x: WALL_MIN, y: p.paddle } : { x: WALL_MAX, y: p.paddle };
        let best = edge, d = Infinity;
        for (const b of snap.balls) { const dd = (b.x - edge.x) ** 2 + (b.y - edge.y) ** 2; if (dd < d) { d = dd; best = { x: b.x, y: b.y }; } }
        spot = best;
      }
      prevHits.current[p.id] = p.hits;
    }
    const now = Date.now();
    if (!spot || reduced || now - lastFlash.current < FLASH_GAP_MS) return;
    lastFlash.current = now;
    const key = ++counter.current;
    setFlashes(f => [...f, { key, ...spot! }].slice(-MAX_FLASHES));
    const t = setTimeout(() => { timers.current.delete(t); setFlashes(f => f.filter(x => x.key !== key)); }, hit.duration);
    timers.current.add(t);
  }, [hitSig, reduced, hit.duration]);

  const ctrl = useRef({ sc, horizontal, onTarget, enabled: false, scale: paddleScale, pos: 500 });
  ctrl.current = { ...ctrl.current, sc, horizontal, onTarget, scale: paddleScale, enabled: !!onTarget && !!me && me.lives > 0 };
  if (me && !ctrl.current.enabled) ctrl.current.pos = me.paddle;
  const send = (v: number) => { const c = ctrl.current; if (!c.enabled) return; c.pos = bound(v, c.scale); c.onTarget?.(c.pos); };
  const sendRef = useRef(send); sendRef.current = send;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => ctrl.current.enabled,
    onMoveShouldSetPanResponder: () => ctrl.current.enabled,
    onPanResponderGrant: e => { const c = ctrl.current; sendRef.current((c.horizontal ? e.nativeEvent.locationX : e.nativeEvent.locationY) / c.sc); },
    onPanResponderMove: e => { const c = ctrl.current; sendRef.current((c.horizontal ? e.nativeEvent.locationX : e.nativeEvent.locationY) / c.sc); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const controllable = !!onTarget && !!me && me.lives > 0;
  const browser = useBrowserCourt(controllable, (x, y) => sendRef.current((ctrl.current.horizontal ? x : y) * COURT));
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !controllable) return;
    const onKey = (e: KeyboardEvent) => {
      const tag=(e.target as HTMLElement | null)?.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||(e.target as HTMLElement | null)?.isContentEditable)return;
      const h = ctrl.current.horizontal;
      const neg = h ? e.key === 'ArrowLeft' : e.key === 'ArrowUp';
      const pos = h ? e.key === 'ArrowRight' : e.key === 'ArrowDown';
      if (neg || pos) { e.preventDefault(); sendRef.current(ctrl.current.pos + (neg ? -KEY_STEP : KEY_STEP)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controllable]);

  const rect = (p: CourtPlayer) => {
    const c = p.paddle * sc, half = (len / 2) * sc, t = PADDLE_T * sc;
    switch (p.seat) {
      case 0: return { left: c - half, top: WALL_MAX * sc - t / 2, width: half * 2, height: t };
      case 1: return { left: c - half, top: WALL_MIN * sc - t / 2, width: half * 2, height: t };
      case 2: return { left: WALL_MIN * sc - t / 2, top: c - half, width: t, height: half * 2 };
      default: return { left: WALL_MAX * sc - t / 2, top: c - half, width: t, height: half * 2 };
    }
  };

  const hs = hit.size * sc * 2.2;
  return (
    <View testID={testID} ref={browser} {...(Platform.OS === 'web' ? {} : pan.panHandlers)} collapsable={false}
      accessibilityLabel={label ?? (me ? `Court. You defend the ${SEATS[me.seat]} edge. Drag${Platform.OS === 'web' ? ' or use arrow keys' : ''} to move.` : 'Court preview')}
      style={[st.court, { width: size, height: size, backgroundColor: court.floor }]}>
      <CourtDecor court={court} size={size} />
      {snapshot?.players.filter(p => p.lives > 0).map(p => (
        <View key={p.id} pointerEvents="none" style={[st.paddle, rect(p), { backgroundColor: p.color, opacity: p.connected === false && !p.isBot ? 0.5 : 1 }, p.id === controlId && st.mine]} />
      ))}
      {snapshot?.balls.map(b => (
        <View key={b.id} pointerEvents="none" style={[st.puck, { left: (b.x - PUCK_R) * sc, top: (b.y - PUCK_R) * sc, width: PUCK_R * 2 * sc, height: PUCK_R * 2 * sc }]} />
      ))}
      {!reduced ? flashes.map(f => <HitMark key={f.key} x={f.x * sc} y={f.y * sc} size={hs} hit={hit} />) : null}
      {!snapshot ? <View style={st.empty} pointerEvents="none"><Text style={st.emptyText}>Court idle</Text></View> : null}
    </View>
  );
}

export function HitMark({ x, y, size, hit }: { x: number; y: number; size: number; hit: HitAppearance }) {
  const base = { position: 'absolute' as const, left: x - size / 2, top: y - size / 2, width: size, height: size };
  if (hit.shape === 'ring') return <View pointerEvents="none" style={[base, { borderRadius: 999, borderWidth: 3, borderColor: hit.color }]} />;
  if (hit.shape === 'diamond') return <View pointerEvents="none" style={[base, { borderWidth: 3, borderColor: hit.color, transform: [{ rotate: '45deg' }, { scale: 0.75 }] }]} />;
  return (
    <View pointerEvents="none" style={base}>
      {[0, 45, 90, 135].map(r => (
        <View key={r} style={{ position: 'absolute', left: size / 2 - 1.5, top: 0, width: 3, height: size, backgroundColor: hit.color, transform: [{ rotate: `${r}deg` }] }} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  court: { borderRadius: 10, borderWidth: 3, borderColor: palette.edge, overflow: 'hidden', alignSelf: 'center' },
  wall: { position: 'absolute', borderRadius: 8, borderWidth: 1, opacity: 0.45 },
  paddle: { position: 'absolute', borderRadius: 8, borderWidth: 1, borderColor: palette.edge },
  mine: { borderWidth: 2, borderColor: palette.gold },
  puck: { position: 'absolute', backgroundColor: palette.foreground, borderRadius: 999, borderWidth: 1, borderColor: palette.edge },
  empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.display, fontSize: 18, color: palette.supporting, textTransform: 'uppercase', letterSpacing: 1 },
});

export default WorkshopCourt;
