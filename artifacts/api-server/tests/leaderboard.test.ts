import test from "node:test";
import assert from "node:assert/strict";
import { buildLeaderboard, ladderEligibility, ladderName, LADDER_ACTIVITY_MS, type LadderPlayer } from "../src/lib/leaderboard.js";
import { initialSeason } from "../src/lib/competition.js";

const now = Date.parse("2026-11-12T12:00:00Z");
function player(id: string, rating = 1100, games = 5, wins = 1): LadderPlayer {
  return { id, competitive: { "2026-11": { ...initialSeason(), rating, games, wins, peak: rating } },
    profile: null, lastRankedAt: new Date(now).toISOString() };
}
test("only placed and recently active players enter current standings", () => {
  const a = player("a"), b = player("b", 1500, 4), c = player("c", 1600);
  c.lastRankedAt = new Date(now - LADDER_ACTIVITY_MS - 1).toISOString();
  const result = buildLeaderboard([a, b, c], b, {}, now);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]!.rating, 1100);
  assert.equal(result.yourPosition, null);
  assert.equal(result.eligibility, "placements");
  assert.equal(ladderEligibility(c, "2026-11", now), "inactive");
  assert.equal(ladderEligibility(player("new", 1000, 0), "2026-11", now), "no_games");
  a.lastRankedAt = new Date(now - LADDER_ACTIVITY_MS).toISOString();
  assert.equal(ladderEligibility(a, "2026-11", now), "eligible");
});
test("ordering and exact ties are deterministic, independent of input order", () => {
  const a = player("a", 1300, 6, 2), b = player("b", 1300, 6, 2), c = player("c", 1300, 5, 1);
  const out = buildLeaderboard([c, b, a], b, {}, now);
  assert.deepEqual(out.entries.map(e => e.position), [1, 1, 3]);
  assert.equal(out.entries[1]!.isYou, true);
  assert.equal(out.yourPosition, 1);
  assert.deepEqual(out.entries, buildLeaderboard([a, b, c], b, {}, now).entries);
});
test("default privacy never publishes device identity, photo paths or IDs", () => {
  const a = player("private-full-identity");
  a.profile = { nickname: "HiddenName" };
  assert.match(ladderName(a), /^Player-[A-F0-9]{8}$/);
  assert.equal(ladderName({ ...a, profile: { anonymous: false, nickname: "Public Nick" } }), "Public Nick");
  const result = buildLeaderboard([a], a, {}, now);
  assert.equal(JSON.stringify(result.entries).includes("private-full-identity"), false);
  assert.equal(JSON.stringify(result.entries).includes("HiddenName"), false);
});
test("search, division and pagination preserve global positions and personal position", () => {
  const players = Array.from({ length: 60 }, (_, i) => ({ ...player(`p${i}`, 1600 - i),
    profile: { anonymous: false, nickname: `Rally ${i}` } }));
  const out = buildLeaderboard(players, players[40]!, { page: 2 }, now);
  assert.equal(out.entries.length, 25);
  assert.equal(out.entries[0]!.position, 26);
  assert.equal(out.yourPosition, 41);
  const filtered = buildLeaderboard(players, players[40]!, { search: "rally 0", division: "Master" }, now);
  assert.equal(filtered.entries.length, 1);
  assert.equal(filtered.entries[0]!.position, 1);
  assert.equal(filtered.yourPosition, 41);
});
test("historical seasons retain standings without activity decay or rating resets", () => {
  const a = player("a");
  a.competitive["2026-10"] = { ...initialSeason(), rating: 1420, games: 12, wins: 3 };
  a.lastRankedAt = null;
  const out = buildLeaderboard([a], a, { season: "2026-10" }, now);
  assert.equal(out.entries[0]!.rating, 1420);
  assert.equal(out.eligibility, "eligible");
  assert.deepEqual(out.seasons, ["2026-11", "2026-10"]);
  assert.equal(out.endsAt, "2026-11-01T00:00:00.000Z");
  assert.equal(a.competitive["2026-10"].rating, 1420);
});
test("Top 500 is bounded even when all ratings tie, no fake players or empty pages", () => {
  const players = Array.from({ length: 550 }, (_, i) => player(`p${i}`));
  const result = buildLeaderboard(players, players[549]!, { page: 20 }, now);
  assert.equal(result.total, 500);
  assert.equal(result.eligiblePlayers, 550);
  assert.equal(result.pages, 20);
  assert.equal(result.entries.length, 25);
  assert.equal(buildLeaderboard([], player("viewer"), {}, now).total, 0);
});
