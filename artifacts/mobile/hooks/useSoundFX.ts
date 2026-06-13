import { Platform } from 'react-native';

// Thin Web Audio API sound-effect helper.
// On native the functions are no-ops (expo-av would be needed for native audio).

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
}

export function useSoundFX(enabled: boolean): SoundFX {
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
  };
}
