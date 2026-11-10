export type SeasonState = { rating: number; games: number; wins: number; peak: number; lastDelta: number };
export const seasonKey = (time = Date.now()) => new Date(time).toISOString().slice(0, 7);
export const initialSeason = (): SeasonState => ({ rating: 1000, games: 0, wins: 0, peak: 1000, lastDelta: 0 });
export function division(rating: number) {
  const tiers = ["Copper", "Silver", "Gold", "Platinum", "Master"];
  const index = Math.max(0, Math.min(14, Math.floor((rating - 400) / 100)));
  return `${tiers[Math.floor(index / 3)]} ${index % 3 + 1}`;
}
/** Original pairwise Elo-style score, not Halo's proprietary TrueSkill model. */
export function advanceSeason(state: SeasonState, position: number, opponents: number[], team = false): SeasonState {
  const expected = opponents.reduce((sum, r) => sum + 1 / (1 + 10 ** ((r - state.rating) / 400)), 0) / opponents.length;
  const actual = team ? (position === 1 ? 1 : 0) : (4 - position) / 3;
  const rating = Math.max(100, Math.min(3000, state.rating + Math.round((state.games < 5 ? 64 : 24) * (actual - expected))));
  return { rating, games: state.games + 1, wins: state.wins + (position === 1 ? 1 : 0), peak: Math.max(state.peak, rating), lastDelta: rating - state.rating };
}
export function seasonView(season: string, value = initialSeason()) {
  const [y, m] = season.split("-").map(Number);
  return { ...value, season, placed: value.games >= 5, division: value.games >= 5 ? division(value.rating) : "Unplaced",
    endsAt: new Date(Date.UTC(y!, m!, 1)).toISOString() };
}
