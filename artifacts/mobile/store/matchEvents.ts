/**
 * In-memory event log for the current match.
 *
 * Every time an exciting moment fires (hot streak, near-death, multi-block,
 * manual record) we snapshot the ring buffer and push an entry here.
 * Kept to a maximum of MAX_EVENTS; if the cap is hit the lowest-scoring
 * entry is evicted so only the most exciting moments survive.
 *
 * The store is cleared at the start of every new match via startMatchTracking().
 * It is intentionally in-memory only — these are transient per-match events.
 * The best clips are written to persistent storage (clipLibrary) at game-over.
 */

import { type HighlightType } from './highlightClip';

export type MatchEventType = HighlightType;

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  frames: string[];    // base64 JPEG snapshot from ring buffer at event time
  clipScore: number;
  label: string;       // "🔥 HOT STREAK"
  emoji: string;
  timestamp: number;
}

const MAX_EVENTS = 20;

let _events: MatchEvent[] = [];
let _matchId  = '';

// ── Public API ────────────────────────────────────────────────────────────────

/** Call once when the match starts. Resets the log and returns a fresh matchId. */
export function startMatchTracking(): string {
  _matchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  _events  = [];
  return _matchId;
}

export function getCurrentMatchId(): string { return _matchId; }

/**
 * Record one exciting moment.
 * If MAX_EVENTS is already reached we evict the weakest entry (lowest clipScore)
 * only if the incoming event is stronger.
 */
export function recordMatchEvent(
  type:      MatchEventType,
  frames:    string[],
  clipScore: number,
): void {
  if (frames.length < 4) return;

  const event: MatchEvent = {
    id:        Date.now().toString(36),
    type,
    frames,
    clipScore,
    label:     EVENT_LABELS[type]  ?? '🎬 CLIP',
    emoji:     EVENT_EMOJIS[type]  ?? '🎬',
    timestamp: Date.now(),
  };

  if (_events.length >= MAX_EVENTS) {
    const minIdx = _events.reduce(
      (m, e, i) => e.clipScore < _events[m].clipScore ? i : m, 0,
    );
    if (_events[minIdx].clipScore < clipScore) _events[minIdx] = event;
  } else {
    _events.push(event);
  }
}

/** Returns the top N events sorted by clipScore descending. */
export function getBestMatchEvents(n = 5): MatchEvent[] {
  return [..._events].sort((a, b) => b.clipScore - a.clipScore).slice(0, n);
}

export function getAllMatchEvents(): MatchEvent[] { return [..._events]; }

export function clearMatchEvents(): void {
  _events  = [];
  _matchId = '';
}

// ── Labels ────────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<MatchEventType, string> = {
  multi_block: 'MULTI-BLOCK',
  near_death:  'NEAR DEATH',
  hot_streak:  'HOT STREAK',
  manual:      'MANUAL CLIP',
};

const EVENT_EMOJIS: Record<MatchEventType, string> = {
  multi_block: '🏀',
  near_death:  '💀',
  hot_streak:  '🔥',
  manual:      '🎬',
};
