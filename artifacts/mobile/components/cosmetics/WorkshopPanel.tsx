// Court, hit and rules workshop: presets rack, bounded manual editor, live engine preview,
// practice against bots, AI proposals with Apply/Undo, and the private room entry point.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  assistWorkshop, deleteWorkshopPreset, equipWorkshopPreset, getWorkshop, saveWorkshopPreset, useGetWorkshop,
  type WorkshopAssistInputHistoryItem, type WorkshopAssistResult, type WorkshopPreset, type WorkshopState,
} from '@workspace/api-client-react';
import { stepArena, createPracticeRoom, type ArenaRoom } from '@workspace/goldrush-catalog/arenaSimulation';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { ColorPicker } from '@/components/appearance/ColorPicker';
import { Notice, PlateButton, SectionLabel } from '@/components/cosmetics/StudioControls';
import { WorkshopCourt, paddleBounds, HitMark, type CourtSnapshot } from '@/components/cosmetics/WorkshopCourt';
import { CustomRoomPanel } from '@/components/cosmetics/CustomRoomPanel';
import { cosmeticErrorMessage, newDesignId } from '@/hooks/useCosmetics';
import { usePlayer } from '@/context/PlayerContext';
import { arenaProfileEpoch, arenaRequestOptions, arenaTimeout } from '@/utils/arenaSession';

const MAX_PRESETS = 20;
const SWATCHES = ['#111823', '#222C3A', '#3B485A', '#F1F4F8', '#AEB9C8', '#6CCB3C', '#F5C531', '#EF5D57', '#23344B', '#7F9065', '#C27E49', '#A9D3D5'] as const;
export const DEFAULT_COURT: WorkshopPreset['court'] = { floor: '#111823', lines: '#3B485A', markings: 'classic', texture: 'flat' };
export const DEFAULT_HIT: WorkshopPreset['hit'] = { color: '#F5C531', shape: 'ring', size: 16, duration: 280 };
export const DEFAULT_RULES: WorkshopPreset['rules'] = { paddleScale: 1, ballSpeed: 1, bounce: 'standard', lives: 5, balls: 1, maxBalls: 8 };

const newPresetId = () => `workshop_${newDesignId().slice('custom_'.length)}`;
function freshPreset(): WorkshopPreset | null {
  try { return { id: newPresetId(), name: 'House court', court: { ...DEFAULT_COURT }, hit: { ...DEFAULT_HIT }, rules: { ...DEFAULT_RULES } }; }
  catch { return null; }
}
const clampN = (n: number, a: number, b: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(a, Math.min(b, Math.round(n))) : a;
const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
/** Coerces any stored/proposed preset into the server's bounded shape. */
export function boundPreset(p: WorkshopPreset): WorkshopPreset {
  const balls = clampN(p.rules?.balls ?? 1, 1, 4);
  return {
    id: /^workshop_[a-f0-9-]{36}$/.test(p.id) ? p.id : newPresetId(),
    name: String(p.name ?? '').slice(0, 32),
    court: {
      floor: HEX.test(p.court?.floor) ? p.court.floor.toUpperCase() : DEFAULT_COURT.floor,
      lines: HEX.test(p.court?.lines) ? p.court.lines.toUpperCase() : DEFAULT_COURT.lines,
      markings: pick(p.court?.markings, ['classic', 'rings', 'lanes'] as const, 'classic'),
      texture: pick(p.court?.texture, ['flat', 'grain', 'beveled'] as const, 'flat'),
    },
    hit: {
      color: HEX.test(p.hit?.color) ? p.hit.color.toUpperCase() : DEFAULT_HIT.color,
      shape: pick(p.hit?.shape, ['ring', 'diamond', 'burst'] as const, 'ring'),
      size: clampN(p.hit?.size ?? 16, 8, 28),
      duration: clampN(p.hit?.duration ?? 280, 150, 500),
    },
    rules: {
      paddleScale: pick(p.rules?.paddleScale, [0.8, 1, 1.2] as const, 1),
      ballSpeed: pick(p.rules?.ballSpeed, [0.75, 1, 1.25] as const, 1),
      bounce: pick(p.rules?.bounce, ['gentle', 'standard', 'lively'] as const, 'standard'),
      lives: clampN(p.rules?.lives ?? 5, 1, 12),
      balls,
      maxBalls: Math.max(balls, clampN(p.rules?.maxBalls ?? 8, 1, 8)),
    },
  };
}
// PostgreSQL JSONB changes key order after reload; compare normalized field order.
const same = (a: WorkshopPreset, b: WorkshopPreset) => JSON.stringify(boundPreset(a)) === JSON.stringify(boundPreset(b));

/** Runs the shared arena engine locally at 60Hz. Seat 0 is human when `human` is set; other seats are bots. */
export function useSimRoom(preset: WorkshopPreset, opts: { human: boolean; running: boolean; resetKey: string }) {
  const roomRef = useRef<ArenaRoom | null>(null);
  const target = useRef<number | null>(null);
  const [, setFrame] = useState(0);
  const [seed, setSeed] = useState(0);
  const presetRef = useRef(preset); presetRef.current = preset;
  useEffect(() => {
    let room: ArenaRoom;
    try { room = createPracticeRoom(presetRef.current); } catch { roomRef.current = null; setFrame(f => f + 1); return; }
    if (!opts.human) room.players.forEach(p => { p.isBot = true; });
    roomRef.current = room; target.current = null;
    setFrame(f => f + 1);
    if (!opts.running) return;
    const t = setInterval(() => {
      const r = roomRef.current;
      if (!r) return;
      const me = r.players.find(p => p.seat === 0);
      if (opts.human && me) { me.seen = Date.now(); if (target.current !== null) me.target = target.current; }
      const out: unknown = stepArena(r, Date.now());
      if (out && typeof out === 'object' && 'players' in out) roomRef.current = out as ArenaRoom;
      const cur = roomRef.current;
      if (cur && !opts.human && (cur.phase === 'finished' || cur.players.filter(p => p.lives > 0).length <= 1)) {
        // Preview loops forever with a fresh room.
        try { const n = createPracticeRoom(presetRef.current); n.players.forEach(p => { p.isBot = true; }); roomRef.current = n; } catch { /* keep last frame */ }
      }
      setFrame(f => (f + 1) % 1_000_000);
    }, 1000 / 60);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.resetKey, opts.running, opts.human, seed]);
  const room = roomRef.current;
  const humanSeat = room?.players.find(p => p.seat === 0);
  const over = !!room && opts.human && (room.phase === 'finished' || !humanSeat || humanSeat.lives <= 0 || room.players.filter(p => p.lives > 0).length <= 1);
  return {
    snapshot: room as unknown as CourtSnapshot | null,
    humanId: humanSeat?.id,
    over,
    setTarget: (v: number) => { const b = paddleBounds(presetRef.current.rules.paddleScale); target.current = Math.max(b.min, Math.min(b.max, v)); },
    restart: () => setSeed(s => s + 1),
  };
}

function Chips<T extends string | number>({ value, options, onPick, testPrefix, label }: { value: T; options: { v: T; label: string }[]; onPick: (v: T) => void; testPrefix: string; label: string }) {
  return (
    <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const on = o.v === value;
        return (
          <Pressable key={String(o.v)} onPress={() => onPick(o.v)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            testID={`${testPrefix}-${o.v}`} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { transform: [{ translateY: 2 }] }]}>
            <Text style={[s.chipText, on && { color: palette.onAccent }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({ value, min, max, step = 1, onChange, unit, testID, label }: { value: number; min: number; max: number; step?: number; onChange: (n: number) => void; unit?: string; testID: string; label: string }) {
  return (
    <View style={s.stepper} accessibilityLabel={`${label} ${value}${unit ?? ''}, allowed ${min} to ${max}`}>
      <PlateButton label="Less" onPress={() => onChange(Math.max(min, value - step))} disabled={value <= min} testID={`${testID}-dec`} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={s.stepVal}>{value}{unit ?? ''}</Text>
        <Text style={s.hint}>{min} to {max}{unit ?? ''}</Text>
      </View>
      <PlateButton label="More" onPress={() => onChange(Math.min(max, value + step))} disabled={value >= max} testID={`${testID}-inc`} />
    </View>
  );
}

function Block({ title, aside, onReset, resetId, children }: { title: string; aside: string; onReset: () => void; resetId: string; children: React.ReactNode }) {
  return (
    <View style={s.block}>
      <View style={s.blockHead}>
        <View style={{ flex: 1 }}><SectionLabel aside={aside}>{title}</SectionLabel></View>
        <Pressable onPress={onReset} accessibilityRole="button" testID={resetId} style={s.reset}><Text style={s.resetText}>Restore defaults</Text></Pressable>
      </View>
      {children}
    </View>
  );
}

type Mode = 'preview' | 'practice' | 'private';
/** Keyed per profile so drafts, AI history and storage state never leak across players. */
export function WorkshopPanel({ initialMode = 'preview' }: { initialMode?: Mode }) {
  const { currentUsername } = usePlayer();
  return <WorkshopBench key={`${currentUsername}:${arenaProfileEpoch(currentUsername)}`} initialMode={initialMode} />;
}

function WorkshopBench({ initialMode }: { initialMode: Mode }) {
  const { currentUsername, profile } = usePlayer();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const epoch = arenaProfileEpoch(currentUsername);
  const qk = useMemo(() => ['workshop', currentUsername, epoch] as const, [currentUsername, epoch]);
  const invalidateKey = useMemo(() => ['workshop', currentUsername] as const, [currentUsername]);
  const query = useGetWorkshop({ query: { queryKey: qk, queryFn: async ({ signal }) => getWorkshop({ ...(await arenaRequestOptions(currentUsername)), signal }) } });
  const state = query.data;
  const presets = useMemo(() => state?.presets ?? [], [state]);
  const draftKey = `@goldrush_workshop_draft_${currentUsername}`;

  const [draft, setDraft] = useState<WorkshopPreset | null>(() => freshPreset());
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WorkshopPreset | null>(null);
  const [colorSlot, setColorSlot] = useState<'floor' | 'lines' | 'hit'>('floor');
  const [mode, setMode] = useState<Mode>(initialMode);

  // Local-only draft persistence for this profile. Nothing is written until the initial read settles.
  const [hydrated, setHydrated] = useState(false);
  const [storageErr, setStorageErr] = useState<string | null>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
  const hydratedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(draftKey).then(raw => {
      if (cancelled) return;
      if (raw) {
        try { setDraft(boundPreset(JSON.parse(raw) as WorkshopPreset)); setRestored(true); }
        catch { setStorageErr('The saved local draft was unreadable and was skipped.'); }
      }
    }).catch(() => { if (!cancelled) setStorageErr('This device could not read your local draft. Changes may not persist here; save to your account to keep them.'); })
      .finally(() => { if (!cancelled) { hydratedRef.current = true; setHydrated(true); } });
    return () => { cancelled = true; };
  }, [draftKey]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const write = useRef((d: WorkshopPreset | null) => {
    if (!d || !hydratedRef.current) return Promise.resolve();
    return AsyncStorage.setItem(draftKey, JSON.stringify(d)).then(() => setStorageErr(null))
      .catch(() => setStorageErr('Local draft could not be stored on this device. Save to your account to keep it.'));
  });
  useEffect(() => {
    if (!hydrated) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void write.current(draftRef.current); }, 400);
  }, [draft, hydrated]);
  // Flush on unmount (navigation or profile switch). draftKey is fixed for this keyed instance.
  useEffect(() => () => { clearTimeout(saveTimer.current); void write.current(draftRef.current); }, []);

  // AI
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<WorkshopAssistInputHistoryItem[]>([]);
  const [proposal, setProposal] = useState<WorkshopAssistResult | null>(null);
  const [undo, setUndo] = useState<WorkshopPreset | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const resetKey = `${mode}:${draft ? JSON.stringify(draft.rules) : 'none'}`;
  const [practiceNote, setPracticeNote] = useState<string | null>(null);
  const lastRules = useRef(resetKey);
  useEffect(() => {
    const prev = lastRules.current; lastRules.current = resetKey;
    setPracticeNote(mode === 'practice' && prev.startsWith('practice:') && prev !== resetKey ? 'Rules changed, so practice restarted from the beginning.' : null);
  }, [resetKey, mode]);
  const preview = useSimRoom(draft ?? (freshPreset() as WorkshopPreset), { human: false, running: mode === 'preview' && !!draft, resetKey });
  const practice = useSimRoom(draft ?? (freshPreset() as WorkshopPreset), { human: true, running: mode === 'practice' && !!draft, resetKey });
  const proposalPreview = useSimRoom(proposal?.proposal ?? draft ?? (freshPreset() as WorkshopPreset), {
    human: false, running: !!proposal, resetKey: proposal ? JSON.stringify(proposal.proposal) : 'no-proposal',
  });

  if (!draft) return <Notice tone="error" text="This device cannot create a secure preset id, so workshop presets cannot be made here." />;
  if (!hydrated) return <Notice tone="info" text="Reading your local draft before editing. Saved presets remain private on the arena server." />;

  const saved = presets.find(p => p.id === draft.id);
  const dirty = !saved || !same(saved, draft);
  const full = !saved && presets.length >= MAX_PRESETS;
  const nameErr = draft.name.trim().length < 1 || draft.name.length > 32 ? 'Name needs 1 to 32 characters.' : null;
  const patch = (fn: (d: WorkshopPreset) => WorkshopPreset) => { setStatus(null); setDraft(d => (d ? boundPreset(fn(d)) : d)); };
  const setState = (next: WorkshopState) => qc.setQueryData(qk, next);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setErr(null); setStatus(null);
    try { await fn(); } catch (e) { setErr(cosmeticErrorMessage(e)); } finally { setBusy(null); }
  };
  const doSave = () => run('save', async () => {
    const clean = boundPreset({ ...draft, name: draft.name.trim() });
    setState(await saveWorkshopPreset(clean, await arenaRequestOptions(currentUsername)));
    await qc.invalidateQueries({ queryKey: invalidateKey });
    setDraft(clean); setStatus(`Saved ${clean.name} privately to the arena server for this player identity.`);
  });
  const doEquip = (kind: 'court' | 'hit', id: string | null) => run(`equip-${kind}`, async () => {
    setState(await equipWorkshopPreset({ kind, id }, await arenaRequestOptions(currentUsername)));
    await qc.invalidateQueries({ queryKey: invalidateKey });
    setStatus(id ? `${kind === 'court' ? 'Court' : 'Hit effect'} equipped. Cosmetic only; rules never travel into public matches.` : `${kind === 'court' ? 'Court' : 'Hit effect'} returned to default.`);
  });
  const doDelete = (p: WorkshopPreset) => run(`del-${p.id}`, async () => {
    setState(await deleteWorkshopPreset(p.id, await arenaRequestOptions(currentUsername)));
    await qc.invalidateQueries({ queryKey: invalidateKey });
    setConfirmDelete(null);
    if (draft.id === p.id) { const f = freshPreset(); if (f) setDraft(f); }
    setStatus(`Deleted ${p.name}.`);
  });
  const duplicate = () => { const f = freshPreset(); if (!f) return; setDraft({ ...draft, id: f.id, name: `${draft.name.slice(0, 26)} copy` }); setStatus('Duplicated as a new, unsaved preset.'); };
  const discard = () => { AsyncStorage.removeItem(draftKey).catch(() => setStorageErr('Could not clear the local draft on this device.')); setRestored(false); const f = freshPreset(); if (f) setDraft(saved ? { ...saved } : f); };

  const ask = async () => {
    const text = prompt.trim().slice(0, 600);
    if (text.length < 3) { setAiErr('Write at least 3 characters.'); return; }
    setBusy('ai'); setAiErr(null);
    try {
      const opts = await arenaRequestOptions(currentUsername);
      const res = await assistWorkshop({ prompt: text, current: boundPreset(draft), history: history.slice(-6).map(h => ({ role: h.role, text: h.text.slice(0, 600) })) }, { ...opts, signal: arenaTimeout(90000) });
      setProposal({ ...res, proposal: boundPreset({ ...res.proposal, id: draft.id }) });
      setRemaining(res.remaining);
      setHistory(h => [...h, { role: 'user' as const, text }, { role: 'assistant' as const, text: `${res.explanation} ${res.question}`.trim().slice(0, 600) }].slice(-6));
      setPrompt('');
    } catch (e) { setAiErr(`${cosmeticErrorMessage(e, 'The workshop helper is unavailable.')} Your manual draft is unchanged.`); }
    finally { setBusy(null); }
  };
  const applyProposal = () => { if (!proposal) return; setUndo(draft); setDraft(boundPreset({ ...proposal.proposal, id: draft.id })); setProposal(null); setStatus('Proposal applied to your draft. Save to keep it, or Undo.'); };

  const courtSize = Math.floor(Math.max(220, Math.min(wide ? 420 : width - 40, 460)));
  const r = draft.rules;
  const hitSwatch = colorSlot === 'hit' ? draft.hit.color : draft.court[colorSlot];

  const rack = (
    <View style={{ gap: 8 }}>
      <SectionLabel aside={state ? `${presets.length} of ${MAX_PRESETS}` : undefined}>Saved presets</SectionLabel>
      {query.isLoading ? (
        <View style={{ gap: 6 }}>{[0, 1].map(i => <View key={i} style={s.skeleton} />)}</View>
      ) : query.error ? (
        <Notice tone="error" text={`Presets could not load. ${cosmeticErrorMessage(query.error)}`} action="Retry" onAction={() => void query.refetch()} />
      ) : presets.length === 0 ? (
        <View style={s.empty}><Text style={s.emptyTitle}>No presets yet</Text><Text style={s.hint}>Save a court and it hangs here. Court and hit effect equip separately.</Text></View>
      ) : presets.map(p => {
        const courtOn = state?.equippedCourtId === p.id, hitOn = state?.equippedHitId === p.id;
        return (
          <View key={p.id} style={[s.rackItem, p.id === draft.id && s.rackActive]}>
            <Pressable style={s.rackMain} onPress={() => { setErr(null); setStatus(null); setDraft({ ...p }); }} accessibilityRole="button" testID={`ws-rack-${p.id}`}>
              <View style={[s.mini, { backgroundColor: p.court.floor, borderColor: p.court.lines }]}><View style={[s.miniDot, { backgroundColor: p.hit.color }]} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rackName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.hint}>{[courtOn && 'Court equipped', hitOn && 'Hit equipped'].filter(Boolean).join('  ') || (p.id === draft.id ? 'Editing' : 'Tap to edit')}</Text>
              </View>
            </Pressable>
            <View style={s.rackBtns}>
              <PlateButton label={courtOn ? 'Unequip court' : 'Equip court'} tone={courtOn ? 'gold' : 'plain'} onPress={() => doEquip('court', courtOn ? null : p.id)} disabled={!!busy} testID={`ws-equip-court-${p.id}`} />
              <PlateButton label={hitOn ? 'Unequip hit' : 'Equip hit'} tone={hitOn ? 'gold' : 'plain'} onPress={() => doEquip('hit', hitOn ? null : p.id)} disabled={!!busy} testID={`ws-equip-hit-${p.id}`} />
              <PlateButton label="Delete" onPress={() => setConfirmDelete(p)} disabled={!!busy} testID={`ws-delete-${p.id}`} />
            </View>
          </View>
        );
      })}
      <View style={s.row}>
        <PlateButton tone="navy" label="New preset" onPress={() => { const f = freshPreset(); if (f) { setDraft(f); setStatus(null); } }} testID="ws-new" style={{ flex: 1 }} />
        <PlateButton label="Reload" onPress={() => void query.refetch()} disabled={query.isFetching} testID="ws-reload" style={{ flex: 1 }} />
      </View>
      {confirmDelete ? (
        <View style={s.confirm} accessibilityRole="alert">
          <Text style={s.confirmTitle}>Delete {confirmDelete.name}?</Text>
          <Text style={s.hint}>{state?.equippedCourtId === confirmDelete.id || state?.equippedHitId === confirmDelete.id ? 'It is equipped now. Removing it restores your previous paid or standard appearance.' : 'Removed from this player identity on the arena server.'}</Text>
          <View style={s.row}>
            <PlateButton tone="orange" label="Delete" busy={busy === `del-${confirmDelete.id}`} onPress={() => doDelete(confirmDelete)} testID="ws-confirm-delete" style={{ flex: 1 }} />
            <PlateButton label="Keep" onPress={() => setConfirmDelete(null)} disabled={!!busy} testID="ws-cancel-delete" style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </View>
  );

  const stage = (
    <View style={{ gap: 10 }}>
      <View style={s.tabs} accessibilityRole="tablist">
        {(['preview', 'practice', 'private'] as const).map(m => (
          <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} testID={`ws-mode-${m}`} style={[s.tab, mode === m && s.tabOn]}>
            <Text style={[s.tabText, mode === m && { color: palette.onAccent }]}>{m === 'preview' ? 'Preview' : m === 'practice' ? 'Practice' : 'Private room'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'preview' ? (
        <>
          <WorkshopCourt testID="ws-preview-court" snapshot={preview.snapshot} court={draft.court} hit={draft.hit} paddleScale={r.paddleScale} size={courtSize} label="Live engine preview with four AI paddles" />
          <Text style={s.hint}>Live engine, four AI paddles. Resets whenever a rule changes.</Text>
        </>
      ) : mode === 'practice' ? (
        <>
          <WorkshopCourt testID="ws-practice-court" snapshot={practice.snapshot} court={draft.court} hit={draft.hit} paddleScale={r.paddleScale} size={courtSize}
            controlId={practice.humanId} onTarget={practice.over ? undefined : practice.setTarget} />
          {practice.over ? <Notice tone="info" text="Practice over. Practice never awards coins, XP or rating." action="Run it again" onAction={practice.restart} /> : <Text style={s.hint}>You hold South. Drag, point or use arrow keys. Three AI seats. No rewards. Changing rules restarts practice.</Text>}
          {practiceNote ? <Notice tone="info" text={practiceNote} /> : null}
          <PlateButton label="Restart practice" onPress={practice.restart} testID="ws-practice-restart" />
        </>
      ) : (
        <CustomRoomPanel onLoadPreset={p => { const f = freshPreset(); if (f) { setDraft(boundPreset({ ...p, id: f.id })); setStatus('Loaded that room preset as a new local draft.'); } }} preset={draft} username={currentUsername} playerName={profile.name} size={courtSize} />
      )}
    </View>
  );

  const nameBox = (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLbl}>Preset name</Text>
      <TextInput testID="ws-name" value={draft.name} maxLength={32} onChangeText={t => patch(d => ({ ...d, name: t }))} accessibilityLabel="Preset name" style={[s.nameInput, nameErr && s.inputErr]} />
      <Text style={s.hint}>{nameErr ?? `${draft.name.length}/32  ${saved ? (dirty ? 'Unsaved changes' : 'Saved') : 'New, not saved'}`}</Text>
      <View style={s.localTag}><Text style={s.localText}>{hydrated ? `Draft kept on this device only until you save${restored ? '. Restored from your last session.' : '.'}` : 'Reading local draft from this device.'}</Text></View>
      {storageErr ? <Notice tone="error" text={storageErr} action="Dismiss" onAction={() => setStorageErr(null)} /> : null}
      <View style={s.row}>
        <PlateButton tone="orange" label="Save" onPress={doSave} busy={busy === 'save'} disabled={!!busy || !!nameErr || !dirty || full || !state} testID="ws-save" style={{ flex: 1 }} />
        <PlateButton label="Duplicate" onPress={duplicate} disabled={!!busy} testID="ws-duplicate" style={{ flex: 1 }} />
        <PlateButton label="Discard" onPress={discard} disabled={!!busy || !dirty} testID="ws-discard" style={{ flex: 1 }} />
      </View>
      {full ? <Notice tone="error" text={`You can keep ${MAX_PRESETS} presets. Delete one to save this.`} /> : null}
      {err ? <Notice tone="error" text={err} action="Dismiss" onAction={() => setErr(null)} /> : null}
      {status ? <Notice tone="info" text={status} /> : null}
    </View>
  );

  const editor = (
    <View style={{ gap: 18 }}>
      <Block title="Court" aside="Look only" onReset={() => patch(d => ({ ...d, court: { ...DEFAULT_COURT } }))} resetId="ws-reset-court">
        <Text style={s.hint}>Floor and line colours, one of three markings, one of three textures. Purely visual.</Text>
        <Chips label="Markings" testPrefix="ws-markings" value={draft.court.markings} onPick={v => patch(d => ({ ...d, court: { ...d.court, markings: v } }))}
          options={[{ v: 'classic', label: 'Classic' }, { v: 'rings', label: 'Rings' }, { v: 'lanes', label: 'Lanes' }]} />
        <Chips label="Texture" testPrefix="ws-texture" value={draft.court.texture} onPick={v => patch(d => ({ ...d, court: { ...d.court, texture: v } }))}
          options={[{ v: 'flat', label: 'Flat' }, { v: 'grain', label: 'Grain' }, { v: 'beveled', label: 'Beveled' }]} />
      </Block>
      <Block title="Hit effect" aside="Look only" onReset={() => patch(d => ({ ...d, hit: { ...DEFAULT_HIT } }))} resetId="ws-reset-hit">
        <View style={s.hitRow}>
          <View style={s.hitStage}><HitMark x={40} y={40} size={draft.hit.size * 2.2} hit={draft.hit} /></View>
          <View style={{ flex: 1, gap: 8 }}>
            <Chips label="Shape" testPrefix="ws-shape" value={draft.hit.shape} onPick={v => patch(d => ({ ...d, hit: { ...d.hit, shape: v } }))}
              options={[{ v: 'ring', label: 'Ring' }, { v: 'diamond', label: 'Diamond' }, { v: 'burst', label: 'Burst' }]} />
          </View>
        </View>
        <Stepper label="Size" testID="ws-hit-size" value={draft.hit.size} min={8} max={28} step={2} onChange={n => patch(d => ({ ...d, hit: { ...d.hit, size: n } }))} />
        <Stepper label="Duration" testID="ws-hit-duration" value={draft.hit.duration} min={150} max={500} step={50} unit="ms" onChange={n => patch(d => ({ ...d, hit: { ...d.hit, duration: n } }))} />
      </Block>
      <View style={s.block}>
        <SectionLabel aside={colorSlot}>Colours</SectionLabel>
        <Chips label="Colour slot" testPrefix="ws-slot" value={colorSlot} onPick={setColorSlot}
          options={[{ v: 'floor', label: 'Floor' }, { v: 'lines', label: 'Lines' }, { v: 'hit', label: 'Hit' }]} />
        <ColorPicker key={colorSlot} testID={`ws-picker-${colorSlot}`} value={hitSwatch} presets={SWATCHES}
          onChange={hex => patch(d => colorSlot === 'hit' ? { ...d, hit: { ...d.hit, color: hex } } : { ...d, court: { ...d.court, [colorSlot]: hex } })} />
      </View>
      <Block title="Rules" aside="Practice and private rooms only" onReset={() => patch(d => ({ ...d, rules: { ...DEFAULT_RULES } }))} resetId="ws-reset-rules">
        <Text style={s.hint}>Fixed choices only. No custom physics or scripts. Public and ranked matches always use standard rules, and custom rooms never award rewards.</Text>
        <Text style={s.fieldLbl}>Paddle length</Text>
        <Chips label="Paddle length" testPrefix="ws-paddle" value={r.paddleScale} onPick={v => patch(d => ({ ...d, rules: { ...d.rules, paddleScale: v } }))}
          options={[{ v: 0.8, label: 'Short 0.8x' }, { v: 1, label: 'Standard' }, { v: 1.2, label: 'Long 1.2x' }]} />
        <Text style={s.fieldLbl}>Ball speed</Text>
        <Chips label="Ball speed" testPrefix="ws-speed" value={r.ballSpeed} onPick={v => patch(d => ({ ...d, rules: { ...d.rules, ballSpeed: v } }))}
          options={[{ v: 0.75, label: 'Slow 0.75x' }, { v: 1, label: 'Standard' }, { v: 1.25, label: 'Fast 1.25x' }]} />
        <Text style={s.fieldLbl}>Bounce</Text>
        <Chips label="Bounce" testPrefix="ws-bounce" value={r.bounce} onPick={v => patch(d => ({ ...d, rules: { ...d.rules, bounce: v } }))}
          options={[{ v: 'gentle', label: 'Gentle' }, { v: 'standard', label: 'Standard' }, { v: 'lively', label: 'Lively' }]} />
        <Text style={s.fieldLbl}>Lives each</Text>
        <Stepper label="Lives" testID="ws-lives" value={r.lives} min={1} max={12} onChange={n => patch(d => ({ ...d, rules: { ...d.rules, lives: n } }))} />
        <Text style={s.fieldLbl}>Starting balls</Text>
        <Stepper label="Starting balls" testID="ws-balls" value={r.balls} min={1} max={4} onChange={n => patch(d => ({ ...d, rules: { ...d.rules, balls: n, maxBalls: Math.max(n, d.rules.maxBalls) } }))} />
        <Text style={s.fieldLbl}>Ball cap</Text>
        <Stepper label="Ball cap" testID="ws-maxballs" value={r.maxBalls} min={r.balls} max={8} onChange={n => patch(d => ({ ...d, rules: { ...d.rules, maxBalls: n } }))} />
        <Text style={s.hint}>The cap can never be lower than the starting balls.</Text>
      </Block>
    </View>
  );

  const ai = (
    <View style={s.block}>
      <SectionLabel aside={remaining !== null ? `${remaining} left today` : undefined}>Workshop helper</SectionLabel>
      <Text style={s.hint}>Sends your text and this preset's settings (not photos, not your phone number) to the arena server for an AI proposal. Your last 6 messages are included for context. Nothing changes until you press Apply.</Text>
      {history.length ? (
        <View style={{ gap: 4 }}>{history.map((h, i) => <Text key={i} style={[s.msg, h.role === 'user' && s.msgUser]} numberOfLines={4}>{h.role === 'user' ? 'You: ' : 'Helper: '}{h.text}</Text>)}</View>
      ) : null}
      <TextInput testID="ws-ai-prompt" value={prompt} onChangeText={t => setPrompt(t.slice(0, 600))} multiline maxLength={600}
        placeholder="A slow, forgiving court in harbour blues" placeholderTextColor={palette.muted} style={s.prompt} accessibilityLabel="Describe the preset you want" />
      <Text style={s.hint}>{prompt.length}/600</Text>
      <View style={s.row}>
        <PlateButton tone="gold" label="Ask helper" onPress={() => void ask()} busy={busy === 'ai'} disabled={!!busy || prompt.trim().length < 3} testID="ws-ai-ask" style={{ flex: 1 }} />
        {undo ? <PlateButton label="Undo apply" onPress={() => { setDraft(undo); setUndo(null); setStatus('Restored your draft from before the proposal.'); }} testID="ws-ai-undo" style={{ flex: 1 }} /> : null}
      </View>
      {aiErr ? <Notice tone="error" text={aiErr} action="Dismiss" onAction={() => setAiErr(null)} /> : null}
      {proposal ? (
        <View style={s.proposal} testID="ws-ai-proposal">
          <Text style={s.confirmTitle}>Proposal: {proposal.proposal.name}</Text>
          <WorkshopCourt snapshot={proposalPreview.snapshot} court={proposal.proposal.court} hit={proposal.proposal.hit} paddleScale={proposal.proposal.rules.paddleScale} size={160} label="Proposed court live engine preview" />
          <Text style={s.body}>{proposal.explanation}</Text>
          <Text style={s.hint}>Rules: paddle {proposal.proposal.rules.paddleScale}x, speed {proposal.proposal.rules.ballSpeed}x, {proposal.proposal.rules.bounce} bounce, {proposal.proposal.rules.lives} lives, {proposal.proposal.rules.balls} to {proposal.proposal.rules.maxBalls} balls.</Text>
          {proposal.question ? <Text style={s.body}>{proposal.question}</Text> : null}
          <View style={s.row}>
            <PlateButton tone="orange" label="Apply" onPress={applyProposal} testID="ws-ai-apply" style={{ flex: 1 }} />
            <PlateButton label="Dismiss" onPress={() => setProposal(null)} testID="ws-ai-dismiss" style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </View>
  );

  return wide ? (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 20 }}>{stage}{nameBox}{rack}</View>
      <View style={{ flex: 1, gap: 20 }}>{editor}{ai}</View>
    </View>
  ) : (
    <View style={{ gap: 20 }}>{stage}{nameBox}{editor}{ai}{rack}</View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting },
  body: { fontFamily: fonts.body, fontSize: 15, color: palette.foreground },
  fieldLbl: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: palette.foreground, textTransform: 'uppercase' },
  nameInput: { minHeight: 48, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.surface, paddingHorizontal: 12, fontFamily: fonts.display, fontSize: 22, color: palette.foreground, borderRadius: 8 },
  inputErr: { borderColor: palette.danger, borderWidth: 3 },
  localTag: { alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: palette.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  localText: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.supporting, letterSpacing: 0.5 },
  block: { gap: 10, padding: 12, borderWidth: 2, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reset: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: palette.border, borderRadius: 6 },
  resetText: { fontFamily: fonts.bodyBold, fontSize: 12, color: palette.supporting, textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.raised },
  chipOn: { backgroundColor: palette.primary },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.foreground },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepVal: { fontFamily: fonts.display, fontSize: 26, color: palette.foreground, fontVariant: ['tabular-nums'] },
  hitRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  hitStage: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.inset },
  tabs: { flexDirection: 'row', borderWidth: 2, borderColor: palette.edge, borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface },
  tabOn: { backgroundColor: palette.gold },
  tabText: { fontFamily: fonts.display, fontSize: 16, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.8 },
  skeleton: { height: 64, borderRadius: 8, backgroundColor: palette.raised, opacity: 0.6 },
  empty: { padding: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.border, borderRadius: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground, textTransform: 'uppercase' },
  rackItem: { gap: 8, padding: 8, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 8 },
  rackActive: { borderColor: palette.edge, borderLeftWidth: 8, borderLeftColor: palette.primary },
  rackMain: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rackBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rackName: { fontFamily: fonts.display, fontSize: 18, color: palette.foreground },
  mini: { width: 44, height: 44, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  miniDot: { width: 12, height: 12, borderRadius: 999 },
  confirm: { backgroundColor: palette.background, borderRadius: 8, borderWidth: 2, borderColor: palette.danger, padding: 12, gap: 8 },
  confirmTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground },
  prompt: { minHeight: 80, borderWidth: 2, borderColor: palette.edge, borderRadius: 8, backgroundColor: palette.inset, padding: 10, fontFamily: fonts.body, fontSize: 15, color: palette.foreground, textAlignVertical: 'top' },
  msg: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting, padding: 6, borderLeftWidth: 3, borderLeftColor: palette.border },
  msgUser: { color: palette.foreground, borderLeftColor: palette.primary },
  proposal: { gap: 8, padding: 10, borderWidth: 2, borderColor: palette.gold, borderRadius: 8, backgroundColor: palette.background },
});

export default WorkshopPanel;
