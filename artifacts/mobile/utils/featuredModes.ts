/**
 * Featured Modes — rotating limited-time game modifiers.
 * The schedule is a pure client-side array; changing it requires no app update.
 *
 * Window convention: day boundaries are local-device midnight (day changes).
 * startDay / endDay use getDay() indices (0 = Sun, 1 = Mon … 6 = Sat).
 */
import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeaturedModeOverrides {
  coinMultiplier?:      number;   // multiply coins earned on every match result
  xpMultiplier?:        number;   // multiply XP earned on every match result
  ballSpeedFactor?:     number;   // multiply initial ball launch speed
}

export interface FeaturedMode {
  id:          string;
  name:        string;
  emoji:       string;
  descriptor:  string;                    // one-liner under the name
  color:       string;
  gradient:    [string, string];
  startDay:    number;                    // 0–6, inclusive
  endDay:      number;                    // 0–6, inclusive
  overrides:   FeaturedModeOverrides;
  ruleSummary: string[];
}

// ── Schedule ─────────────────────────────────────────────────────────────────
// Four non-overlapping windows covering every day of the week.

export const FEATURED_MODES: FeaturedMode[] = [
  {
    id:         'blitz_start',
    name:       'Blitz Start',
    emoji:      '⚡',
    descriptor: 'Balls fly 35% faster — sharpen those reflexes',
    color:      '#C8820A',
    gradient:   ['#2A1800', '#18100A'],
    startDay:   1, endDay: 2, // Mon–Tue
    overrides:  { ballSpeedFactor: 1.35 },
    ruleSummary: [
      '35% faster ball launch speed',
      'Works across all match types',
      'Great for practising deflection timing',
    ],
  },
  {
    id:         'xp_rush',
    name:       'XP Rush',
    emoji:      '🚀',
    descriptor: 'Double XP — climb ranks twice as fast',
    color:      '#00FF88',
    gradient:   ['#00180D', '#000E08'],
    startDay:   3, endDay: 4, // Wed–Thu
    overrides:  { xpMultiplier: 2.0 },
    ruleSummary: [
      '2× XP on every match result',
      'Win AND loss XP both doubled',
      'Best window to grind your rank',
    ],
  },
  {
    id:         'double_coins',
    name:       'Double Coins',
    emoji:      '🪙',
    descriptor: 'Earn 2× coins on every match this weekend',
    color:      '#FFD700',
    gradient:   ['#1A1400', '#100D00'],
    startDay:   5, endDay: 6, // Fri–Sat
    overrides:  { coinMultiplier: 2.0 },
    ruleSummary: [
      '2× coins on all match results',
      'Stacks with event bonus coins',
      'Perfect weekend to clear the Shop',
    ],
  },
  {
    id:         'turbo_sunday',
    name:       'Turbo Sunday',
    emoji:      '🏆',
    descriptor: '1.5× coins + 50% faster balls — the ultimate test',
    color:      '#BF5FFF',
    gradient:   ['#180028', '#0E0018'],
    startDay:   0, endDay: 0, // Sun
    overrides:  { coinMultiplier: 1.5, ballSpeedFactor: 1.5 },
    ruleSummary: [
      '50% faster ball speed',
      '1.5× coins on every match',
      'High risk — high reward',
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getActiveFeaturedMode(): FeaturedMode | null {
  const day = new Date().getDay();
  for (const mode of FEATURED_MODES) {
    if (mode.startDay <= mode.endDay) {
      if (day >= mode.startDay && day <= mode.endDay) return mode;
    } else {
      // Wraps across the week boundary (e.g. Fri–Mon)
      if (day >= mode.startDay || day <= mode.endDay) return mode;
    }
  }
  return null;
}

/** Milliseconds until the active featured mode's window ends (midnight after endDay). */
export function msUntilFeaturedModeEnd(mode: FeaturedMode): number {
  const now = new Date();
  const day = now.getDay();
  const daysLeft = (mode.endDay - day + 7) % 7; // 0 = today is endDay
  const end = new Date(now);
  end.setDate(now.getDate() + daysLeft);
  end.setHours(24, 0, 0, 0); // midnight = start of next day
  return Math.max(0, end.getTime() - now.getTime());
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface TimeLeft { d: number; h: number; m: number; s: number; }

function calcTimeLeft(mode: FeaturedMode | null): TimeLeft {
  if (!mode) return { d: 0, h: 0, m: 0, s: 0 };
  const totalS = Math.max(0, Math.floor(msUntilFeaturedModeEnd(mode) / 1000));
  return {
    d: Math.floor(totalS / 86400),
    h: Math.floor((totalS % 86400) / 3600),
    m: Math.floor((totalS % 3600) / 60),
    s: totalS % 60,
  };
}

export function useFeaturedModeCountdown(): { mode: FeaturedMode | null; timeLeft: TimeLeft } {
  const modeRef   = useRef(getActiveFeaturedMode());
  const [mode,     setMode]     = useState<FeaturedMode | null>(modeRef.current);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(modeRef.current));

  useEffect(() => {
    const id = setInterval(() => {
      const current = getActiveFeaturedMode();
      if (current?.id !== modeRef.current?.id) {
        modeRef.current = current;
        setMode(current);
      }
      setTimeLeft(calcTimeLeft(current));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { mode, timeLeft };
}
