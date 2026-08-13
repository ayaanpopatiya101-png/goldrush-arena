import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { Audio } from 'expo-av';

// ─── WAV generator (native only) ──────────────────────────────────────────────
// Produces a mono 16-bit 22050 Hz sine-wave WAV as raw Uint8Array bytes.

function makeWavBytes(freq: number, duration: number, sampleRate = 22050): Uint8Array {
  const numSamples = Math.floor(sampleRate * duration);
  const dataBytes  = numSamples * 2;
  const buf        = new Uint8Array(44 + dataBytes);
  const view       = new DataView(buf.buffer);

  const w32 = (o: number, v: number) => view.setUint32(o, v, true);
  const w16 = (o: number, v: number) => view.setUint16(o, v, true);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };

  str(0, 'RIFF'); w32(4, 36 + dataBytes); str(8, 'WAVE');
  str(12, 'fmt '); w32(16, 16);  w16(20, 1);  w16(22, 1);
  w32(24, sampleRate); w32(28, sampleRate * 2); w16(32, 2); w16(34, 16);
  str(36, 'data'); w32(40, dataBytes);

  for (let i = 0; i < numSamples; i++) {
    const t   = i / sampleRate;
    const env = Math.min(1, t * 40) * Math.max(0, 1 - (t / duration) * 1.1);
    view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * freq * t) * env * 0.28 * 32767), true);
  }
  return buf;
}

// Cache of file URIs keyed by "freq_durationMs"
const uriCache = new Map<string, string>();

function getNativeToneUri(freq: number, dur: number): string {
  const key = `sfx_${freq}_${Math.round(dur * 1000)}`;
  const cached = uriCache.get(key);
  if (cached) return cached;

  const file = new File(Paths.cache, `${key}.wav`);
  if (!file.exists) file.write(makeWavBytes(freq, dur));
  uriCache.set(key, file.uri);
  return file.uri;
}

async function nativeTone(freq: number, dur: number): Promise<void> {
  try {
    const uri           = getNativeToneUri(freq, dur);
    const { sound }     = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(s => {
      if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch { /* ignore */ }
}

async function nativeSeq(notes: Array<{ f: number; d: number }>, gap: number): Promise<void> {
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    setTimeout(() => nativeTone(n.f, n.d).catch(() => {}), i * gap * 1000);
  }
}

/** Pre-generate all SFX WAV files so the first in-game hit is instant. */
export function prewarmNativeAudio(): void {
  if (Platform.OS === 'web') return;
  try {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    const tones: Array<[number, number]> = [
      [380, 0.04], [220, 0.035],
      [440, 0.1], [330, 0.1], [220, 0.18],
      [523, 0.1], [784, 0.14],
      [280, 0.16], [200, 0.16], [140, 0.2],
      [261, 0.12], [329, 0.12], [392, 0.12], [523, 0.22],
      [659, 0.14], [784, 0.14], [1047, 0.28],
      [660, 0.07], [880, 0.1],
      // lobby sounds
      [660, 0.06], [1047, 0.1],
      // rank-up fanfare
      [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.18], [1319, 0.32],
    ];
    for (const [f, d] of tones) getNativeToneUri(f, d);
  } catch { /* best-effort */ }
}

// ─── Web Audio API helpers (web only) ─────────────────────────────────────────

function tone(
  freq: number, dur: number,
  type: OscillatorType = 'square',
  vol = 0.1,
  startAt = 0,
) {
  if (Platform.OS !== 'web') return;
  if (typeof AudioContext === 'undefined' &&
      !(window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) return;
  try {
    const AudioCtx = AudioContext ??
      (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + startAt;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.1);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    setTimeout(() => { try { ctx.close(); } catch {} }, (startAt + dur + 0.2) * 1000);
  } catch { /* unsupported */ }
}

function seq(notes: Array<{ f: number; d: number; v?: number; t?: OscillatorType }>, gap = 0.08) {
  notes.forEach((n, i) => tone(n.f, n.d, n.t ?? 'square', n.v ?? 0.09, i * gap));
}

// ─── Public interface ──────────────────────────────────────────────────────────

export interface SoundFX {
  paddleHit:         () => void;
  wallBounce:        () => void;
  goalScored:        () => void;
  lifeGained:        () => void;
  playerEliminated:  () => void;
  matchStart:        () => void;
  matchEnd:          () => void;
  powerUp:           () => void;
  countdown:         () => void;
  playerJoin:        () => void;
  rankUp:            () => void;
}

export function useSoundFX(enabled: boolean): SoundFX {
  if (Platform.OS !== 'web') {
    const fire = (fn: () => Promise<void>) => () => { if (enabled) fn().catch(() => {}); };
    return {
      paddleHit:        fire(() => nativeTone(380, 0.04)),
      wallBounce:       fire(() => nativeTone(220, 0.035)),
      goalScored:       fire(() => nativeSeq([{ f: 440, d: 0.1 }, { f: 330, d: 0.1 }, { f: 220, d: 0.18 }], 0.1)),
      lifeGained:       fire(() => nativeSeq([{ f: 523, d: 0.1 }, { f: 784, d: 0.14 }], 0.08)),
      playerEliminated: fire(() => nativeSeq([{ f: 280, d: 0.16 }, { f: 200, d: 0.16 }, { f: 140, d: 0.2 }], 0.14)),
      matchStart:       fire(() => nativeSeq([{ f: 261, d: 0.12 }, { f: 329, d: 0.12 }, { f: 392, d: 0.12 }, { f: 523, d: 0.22 }], 0.11)),
      matchEnd:         fire(() => nativeSeq([{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.28 }], 0.13)),
      powerUp:          fire(() => nativeSeq([{ f: 660, d: 0.07 }, { f: 880, d: 0.1 }], 0.07)),
      countdown:        fire(() => nativeTone(523, 0.1)),
      // Short ascending ping — 660 Hz pop followed by a 1047 Hz chime
      playerJoin:       fire(() => nativeSeq([{ f: 660, d: 0.06 }, { f: 1047, d: 0.1 }], 0.07)),
      // Triumphant 5-note fanfare for rank promotion
      rankUp:           fire(() => nativeSeq([
        { f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 },
        { f: 1047, d: 0.18 }, { f: 1319, d: 0.32 },
      ], 0.1)),
    };
  }

  const g = (fn: () => void) => () => { if (enabled) fn(); };
  return {
    paddleHit:        g(() => tone(380, 0.04, 'square', 0.07)),
    wallBounce:       g(() => tone(220, 0.035, 'square', 0.055)),
    goalScored:       g(() => seq([{ f: 440, d: 0.1 }, { f: 330, d: 0.1 }, { f: 220, d: 0.18, t: 'sawtooth' }], 0.1)),
    lifeGained:       g(() => seq([{ f: 523, d: 0.1 }, { f: 784, d: 0.14 }], 0.08)),
    playerEliminated: g(() => seq([{ f: 280, d: 0.16, t: 'sawtooth' }, { f: 200, d: 0.16, t: 'sawtooth' }, { f: 140, d: 0.2, t: 'sawtooth' }], 0.14)),
    matchStart:       g(() => seq([{ f: 261, d: 0.12 }, { f: 329, d: 0.12 }, { f: 392, d: 0.12 }, { f: 523, d: 0.22 }], 0.11)),
    matchEnd:         g(() => seq([{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.28 }], 0.13)),
    powerUp:          g(() => seq([{ f: 660, d: 0.07 }, { f: 880, d: 0.1 }], 0.07)),
    countdown:        g(() => tone(523, 0.1, 'square', 0.1)),
    // Short ascending ping — sine wave feels cleaner for a lobby UI event
    playerJoin:       g(() => seq([{ f: 660, d: 0.06, t: 'sine', v: 0.12 }, { f: 1047, d: 0.1, t: 'sine', v: 0.1 }], 0.07)),
    // Triumphant 5-note fanfare — triangle waves feel warm/musical
    rankUp:           g(() => seq([
      { f: 523, d: 0.1, t: 'triangle', v: 0.11 },
      { f: 659, d: 0.1, t: 'triangle', v: 0.11 },
      { f: 784, d: 0.1, t: 'triangle', v: 0.12 },
      { f: 1047, d: 0.18, t: 'triangle', v: 0.13 },
      { f: 1319, d: 0.32, t: 'triangle', v: 0.14 },
    ], 0.1)),
  };
}
