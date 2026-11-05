/** Legacy single-word tiers must never promote a new player to Champion. */
export function rankIndexForName(
  name: string,
  ranks: readonly string[],
): number {
  const exact = ranks.indexOf(name);
  if (exact >= 0) return exact;
  const aliases: Record<string, string> = {
    Bronze: "Bronze 1",
    Silver: "Silver 1",
    Gold: "Gold 1",
    Platinum: "Diamond 1",
    Diamond: "Diamond 1",
    Master: "Master 1",
    Champion: "Champion 1",
    Grandmaster: "Champion 5",
  };
  return Math.max(0, ranks.indexOf(aliases[name] ?? "Bronze 1"));
}
