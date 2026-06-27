import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Web Audio API based looping arcade music
// Works in Expo Go web preview; native build would use expo-av + an audio file

const NOTES: Record<string, number> = {
  C3: 130.81, G3: 196.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50, E6: 1318.51,
};

// Upbeat 8-bar loop, C major pentatonic
const MELODY: Array<{ n: string; d: number }> = [
  // Bar 1 – ascending hook
  { n: 'C5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 },
  // Bar 2
  { n: 'C6', d: 0.5 }, { n: 'A5', d: 0.25 }, { n: 'G5', d: 0.25 },
  // Bar 3
  { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.5 },
  // Bar 4 – rest feel
  { n: 'G5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'D5', d: 0.5 },
  // Bar 5 – variation
  { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 }, { n: 'C6', d: 0.5 },
  // Bar 6
  { n: 'A5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 },
  // Bar 7 – build
  { n: 'E5', d: 0.25 }, { n: 'G5', d: 0.25 }, { n: 'A5', d: 0.25 }, { n: 'C6', d: 0.25 },
  // Bar 8 – resolve
  { n: 'E6', d: 0.5 }, { n: 'C6', d: 0.25 }, { n: 'A5', d: 0.25 },
];

// Bass line (2 bars repeated 4 times)
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

const BPM = 136;
const BEAT = 60 / BPM;

function scheduleNote(
  ctx: AudioContext,
  master: GainNode,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(vol, start);
  g.gain.setTargetAtTime(0.0001, start + dur * 0.75, dur * 0.08);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function scheduleLoop(ctx: AudioContext, master: GainNode, from: number): number {
  let t = from;
  const loopDur = MELODY.reduce((s, n) => s + n.d * BEAT, 0);

  // Melody (square wave — classic arcade sound)
  for (const note of MELODY) {
    const freq = NOTES[note.n];
    if (freq) scheduleNote(ctx, master, freq, t, note.d * BEAT * 0.85, 'square', 0.12);
    t += note.d * BEAT;
  }

  // Bass (sawtooth)
  let bt = from;
  for (const note of BASS) {
    const freq = NOTES[note.n];
    if (freq) scheduleNote(ctx, master, freq, bt, note.d * BEAT * 0.5, 'sawtooth', 0.07);
    bt += note.d * BEAT;
  }

  // Hi-hat (noise approximation using white sawtooth at high freq)
  for (let i = 0; i < 32; i++) {
    const ht = from + i * (BEAT / 4);
    scheduleNote(ctx, master, 8000 + Math.random() * 2000, ht, 0.03, 'sawtooth', 0.025);
  }

  return from + loopDur;
}

interface Props {
  muted?: boolean;
  onToggle?: (muted: boolean) => void;
}

export function BackgroundMusicButton({ muted, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle?.(!muted)}
      style={[styles.btn, { backgroundColor: muted ? '#FFFFFF11' : '#C8820A22', borderColor: muted ? '#FFFFFF33' : '#C8820A55' }]}
    >
      <Feather name={muted ? 'volume-x' : 'volume-2'} size={16} color={muted ? '#FFFFFF66' : '#C8820A'} />
    </Pressable>
  );
}

export function useBackgroundMusic() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nextLoopRef = useRef(0);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (typeof AudioContext === 'undefined' && typeof (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext === 'undefined') return;

    try {
      const AudioCtx = AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!ctxRef.current) {
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        const master = ctx.createGain();
        master.gain.setValueAtTime(1, ctx.currentTime);
        master.connect(ctx.destination);
        masterRef.current = master;
      }

      const ctx = ctxRef.current;
      const master = masterRef.current!;

      if (ctx.state === 'suspended') ctx.resume();

      // Schedule first loop
      nextLoopRef.current = scheduleLoop(ctx, master, ctx.currentTime + 0.05);

      // Keep scheduling loops ahead of time
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      schedulerRef.current = setInterval(() => {
        if (!ctxRef.current || !masterRef.current) return;
        const now = ctxRef.current.currentTime;
        if (now >= nextLoopRef.current - 2) {
          nextLoopRef.current = scheduleLoop(ctxRef.current, masterRef.current, nextLoopRef.current);
        }
      }, 1000);

      startedRef.current = true;
    } catch {
      // Audio not supported
    }
  }, []);

  const stop = useCallback(() => {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    if (ctxRef.current && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.3);
    }
    startedRef.current = false;
  }, []);

  useEffect(() => {
    if (muted) {
      if (masterRef.current && ctxRef.current) {
        masterRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.3);
      }
    } else if (startedRef.current) {
      if (masterRef.current && ctxRef.current) {
        masterRef.current.gain.setTargetAtTime(1, ctxRef.current.currentTime, 0.3);
      }
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      ctxRef.current?.close();
    };
  }, []);

  return { muted, setMuted, start, stop };
}

const styles = StyleSheet.create({
  btn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
});
