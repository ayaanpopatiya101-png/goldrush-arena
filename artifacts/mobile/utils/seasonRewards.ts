export function canClaimSeasonTier(
  index: number,
  played: number,
  thresholds: readonly number[],
  claimed: readonly number[],
): boolean {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < thresholds.length &&
    Number.isFinite(played) &&
    played >= thresholds[index]! &&
    !claimed.includes(index)
  );
}
export function seasonSkinForMilestone(matches: number): string | null {
  return matches === 50 ? "frost" : matches === 100 ? "cosmic" : null;
}
