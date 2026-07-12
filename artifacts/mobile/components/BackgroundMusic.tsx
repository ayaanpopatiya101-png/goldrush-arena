import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Audio } from 'expo-av';

// ─── Shared note / melody data ─────────────────────────────────────────────────

const NOTES: Record<string, number> = {
  C3: 130.81, G3: 196.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50, E6: 1318.51,
};

const MELODY: Array<{ n: string; d: number }> = [
  { n: 'C5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 },
  { n: 'C6', d: 0.5  }, { n: 'A5', d: 0.25 }, { n: 'G5', d: 0.25 },
  { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.5  },
  { n: 'G5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D5', d: 0.5  },
  { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 }, { n: 'C6', d: 0.5  },
  { n: 'A5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 },
  { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 }, { n: 'C6', d: 0.25 },
  { n: 'E6', d: 0.5  }, { n: 'C6', d: 0.25 }, { n: 'A5', d: 0.25 },
];

const BPM  = 136;
const BEAT = 60 / BPM;

// ─── Web Audio API implementation (web only) ──────────────────────────────────

const BASS: Array<{ n: string; d: number }> = [
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
  { n: 'C3', d: 0.5 }, { n: 'G3', d: 0.5 },
];

function scheduleWebNote(
  ctx: AudioContext, master: GainNode,
  freq: number, start: number, dur: number,
  type: OscillatorType, vol: number,
) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g);
  g.connect(master);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(vol, start);
  g.gain.setTargetAtTime(0.0001, start + dur * 0.75, dur * 0.08);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function scheduleWebLoop(ctx: AudioContext, master: GainNode, from: number): number {
  let t = from;
  const loopDur = MELODY.reduce((s, n) => s + n.d * BEAT, 0);
  for (const note of MELODY) {
    const freq = NOTES[note.n];
    if (freq) scheduleWebNote(ctx, master, freq, t, note.d * BEAT * 0.85, 'square', 0.12);
    t += note.d * BEAT;
  }
  let bt = from;
  for (const note of BASS) {
    const freq = NOTES[note.n];
    if (freq) scheduleWebNote(ctx, master, freq, bt, note.d * BEAT * 0.5, 'sawtooth', 0.07);
    bt += note.d * BEAT;
  }
  for (let i = 0; i < 32; i++) {
    const ht = from + i * (BEAT / 4);
    scheduleWebNote(ctx, master, 8000 + Math.random() * 2000, ht, 0.03, 'sawtooth', 0.025);
  }
  return from + loopDur;
}

function useWebBackgroundMusic() {
  const [muted,      setMuted]      = useState(false);
  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const nextLoopRef  = useRef(0);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef   = useRef(false);

  const start = useCallback(() => {
    if (typeof AudioContext === 'undefined' &&
        typeof (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext === 'undefined') return;
    try {
      const AudioCtx = AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) {
        const ctx    = new AudioCtx();
        const master = ctx.createGain();
        master.gain.setValueAtTime(1, ctx.currentTime);
        master.connect(ctx.destination);
        ctxRef.current    = ctx;
        masterRef.current = master;
      }
      const ctx    = ctxRef.current;
      const master = masterRef.current!;
      if (ctx.state === 'suspended') ctx.resume();
      nextLoopRef.current = scheduleWebLoop(ctx, master, ctx.currentTime + 0.05);
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      schedulerRef.current = setInterval(() => {
        if (!ctxRef.current || !masterRef.current) return;
        const now = ctxRef.current.currentTime;
        if (now >= nextLoopRef.current - 2) {
          nextLoopRef.current = scheduleWebLoop(ctxRef.current, masterRef.current, nextLoopRef.current);
        }
      }, 1000);
      startedRef.current = true;
    } catch { /* audio not supported */ }
  }, []);

  const stop = useCallback(() => {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    if (ctxRef.current && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.3);
    }
    startedRef.current = false;
  }, []);

  useEffect(() => {
    if (!masterRef.current || !ctxRef.current) return;
    masterRef.current.gain.setTargetAtTime(
      muted ? 0 : (startedRef.current ? 1 : 0),
      ctxRef.current.currentTime, 0.3,
    );
  }, [muted]);

  useEffect(() => () => {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    ctxRef.current?.close();
  }, []);

  return { muted, setMuted, start, stop };
}

// ─── Native (expo-av) implementation ──────────────────────────────────────────

function makeWavBytes(freq: number, duration: number, sampleRate = 22050): Uint8Array {
  const numSamples = Math.floor(sampleRate * duration);
  const dataBytes  = numSamples * 2;
  const buf        = new Uint8Array(44 + dataBytes);
  const view       = new DataView(buf.buffer);
  const w32 = (o: number, v: number) => view.setUint32(o, v, true);
  const w16 = (o: number, v: number) => view.setUint16(o, v, true);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); w32(4, 36 + dataBytes); str(8, 'WAVE');
  str(12, 'fmt '); w32(16, 16); w16(20, 1); w16(22, 1);
  w32(24, sampleRate); w32(28, sampleRate * 2); w16(32, 2); w16(34, 16);
  str(36, 'data'); w32(40, dataBytes);
  for (let i = 0; i < numSamples; i++) {
    const t   = i / sampleRate;
    const env = Math.min(1, t * 30) * Math.max(0, 1 - (t / duration) * 1.1);
    view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * freq * t) * env * 0.18 * 32767), true);
  }
  return buf;
}

const noteUriCache = new Map<string, string>();

function getNoteUri(freq: number, dur: number): string {
  const key = `bgm_${freq}_${Math.round(dur * 1000)}`;
  const cached = noteUriCache.get(key);
  if (cached) return cached;
  const file = new File(Paths.cache, `${key}.wav`);
  if (!file.exists) file.write(makeWavBytes(freq, dur));
  noteUriCache.set(key, file.uri);
  return file.uri;
}

function useNativeBackgroundMusic() {
  const [muted,   setMutedState] = useState(false);
  const mutedRef   = useRef(false);
  const startedRef = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef   = useRef(0);

  const setMuted = useCallback((v: boolean) => {
    mutedRef.current = v;
    setMutedState(v);
  }, []);

  const scheduleNote = useCallback(() => {
    if (!startedRef.current) return;
    const note    = MELODY[indexRef.current % MELODY.length]!;
    const durSecs = note.d * BEAT;
    const delayMs = durSecs * 1000;

    if (!mutedRef.current) {
      const freq = NOTES[note.n];
      if (freq) {
        try {
          const uri = getNoteUri(freq, durSecs);
          Audio.Sound.createAsync({ uri }).then(({ sound }) => {
            sound.playAsync().catch(() => {});
            sound.setOnPlaybackStatusUpdate(s => {
              if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {});
            });
          }).catch(() => {});
        } catch { /* ignore */ }
      }
    }

    indexRef.current++;
    timerRef.current = setTimeout(scheduleNote, delayMs);
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    indexRef.current   = 0;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    // Pre-cache all melody note WAVs synchronously, then begin playing.
    try {
      for (const name of [...new Set(MELODY.map(n => n.n))]) {
        const freq = NOTES[name];
        if (freq) {
          const dur = MELODY.find(m => m.n === name)!.d * BEAT;
          getNoteUri(freq, dur);
        }
      }
    } catch { /* best-effort */ }
    scheduleNote();
  }, [scheduleNote]);

  const stop = useCallback(() => {
    startedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => () => { stop(); }, [stop]);

  return { muted, setMuted, start, stop };
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export function useBackgroundMusic() {
  const web    = useWebBackgroundMusic();
  const native = useNativeBackgroundMusic();
  return Platform.OS === 'web' ? web : native;
}

// ─── Mute toggle button ───────────────────────────────────────────────────────

interface Props {
  muted?: boolean;
  onToggle?: (muted: boolean) => void;
}

export function BackgroundMusicButton({ muted, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle?.(!muted)}
      style={[styles.btn, {
        backgroundColor: muted ? '#FFFFFF11' : '#C8820A22',
        borderColor:     muted ? '#FFFFFF33' : '#C8820A55',
      }]}
    >
      <Feather name={muted ? 'volume-x' : 'volume-2'} size={16} color={muted ? '#FFFFFF66' : '#C8820A'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
