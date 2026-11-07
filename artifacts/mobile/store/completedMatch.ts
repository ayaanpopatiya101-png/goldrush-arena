/** In-memory receipt for the most recently persisted match, never reconstructed from a URL. */
export interface CompletedMatch {
  id: string;
  username: string;
  xpBefore: number;
  xpAfter: number;
  xpEarned: number;
  coinsEarned: number;
  levelBefore: number;
  levelAfter: number;
  won: boolean;
  position: number;
  deflections: number;
  goalsAgainst: number;
  matchType: string;
  bonusApplied: boolean;
  qualifierApplied: boolean;
  ceremonySeen: boolean;
}

let receipt: CompletedMatch | null = null;

export function setCompletedMatch(value: CompletedMatch): void {
  receipt = { ...value };
}

export function getCompletedMatch(): CompletedMatch | null {
  return receipt ? { ...receipt } : null;
}

export function updateCompletedMatch(value: Partial<Pick<CompletedMatch, 'bonusApplied' | 'qualifierApplied' | 'ceremonySeen'>>): void {
  if (receipt) receipt = { ...receipt, ...value };
}

export function clearCompletedMatch(): void {
  receipt = null;
}
