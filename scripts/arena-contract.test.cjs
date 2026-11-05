const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "../artifacts/mobile");
function load(file) {
  const filename = path.join(root, file);
  const mod = new Module(filename, module);
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return mod.exports;
}
const { canMovePaddle, clampPaddle, clampPaddleRange } = load(
  "utils/courtInput.ts",
);
const { cleanCopy } = load("utils/displayCopy.ts");
const { rankIndexForName } = load("utils/rankIndex.ts");
const { canClaimSeasonTier, seasonSkinForMilestone } = load(
  "utils/seasonRewards.ts",
);
test("season rewards require their milestone and cannot be claimed twice", () => {
  const thresholds = [0, 5, 10, 25, 50, 75, 100];
  assert.equal(canClaimSeasonTier(0, 0, thresholds, []), true);
  assert.equal(canClaimSeasonTier(1, 4, thresholds, []), false);
  assert.equal(canClaimSeasonTier(1, 5, thresholds, []), true);
  assert.equal(canClaimSeasonTier(1, 5, thresholds, [1]), false);
  assert.equal(canClaimSeasonTier(1.5, 500, thresholds, []), false);
  assert.equal(canClaimSeasonTier(-1, 500, thresholds, []), false);
  assert.equal(canClaimSeasonTier(9, 500, thresholds, []), false);
});
test("advertised skin milestones deliver their actual skins", () => {
  assert.equal(seasonSkinForMilestone(50), "frost");
  assert.equal(seasonSkinForMilestone(100), "cosmic");
  assert.equal(seasonSkinForMilestone(25), null);
});
test("legacy Bronze is a beginner and unknown ranks cannot unlock endgame", () => {
  const ranks = [
    "Bronze 1",
    "Silver 1",
    "Gold 1",
    "Diamond 1",
    "Master 1",
    "Champion 1",
    "Champion 5",
  ];
  assert.equal(rankIndexForName("Bronze", ranks), 0);
  assert.equal(rankIndexForName("unknown", ranks), 0);
  assert.equal(rankIndexForName("Gold", ranks), 2);
  assert.equal(rankIndexForName("Champion 5", ranks), 6);
  assert.equal(rankIndexForName("Grandmaster", ranks), 6);
});
test("pause, countdown and elimination reject paddle movement", () => {
  assert.equal(canMovePaddle(false, false, "playing"), true);
  assert.equal(canMovePaddle(true, false, "playing"), false);
  assert.equal(canMovePaddle(false, true, "playing"), false);
  assert.equal(canMovePaddle(false, false, "countdown"), false);
  assert.equal(canMovePaddle(false, false, "gameover"), false);
});
test("paddle stays within the court and its assigned half", () => {
  assert.equal(clampPaddle(-999, 88, 360), 46);
  assert.equal(clampPaddle(999, 88, 360), 314);
  assert.equal(clampPaddle(180, 88, 360), 180);
  assert.equal(clampPaddleRange(999, 88, 24, 180), 134);
  assert.equal(clampPaddleRange(-999, 88, 180, 336), 226);
});
test("small courts and invalid touch coordinates remain finite", () => {
  assert.equal(clampPaddle(100, 88, 60), 30);
  assert.equal(clampPaddle(NaN, 88, 360), 180);
  assert.equal(clampPaddle(Infinity, 88, 360), 180);
});
test("legacy emoji and em dashes never leak into labels", () => {
  assert.equal(cleanCopy("🔥 Player — rank!"), " Player, rank");
  assert.equal(cleanCopy("🛡️"), "");
  assert.equal(cleanCopy("5,000 coins"), "5,000 coins");
  assert.equal(cleanCopy("North / East"), "North / East");
});
test("court positions retain distinct, non-neon colors", () => {
  const { PLAYER_COLORS } = load("constants/colors.ts");
  assert.equal(new Set(PLAYER_COLORS).size, 4);
  assert.ok(PLAYER_COLORS.every((c) => /^#[\da-f]{6}$/i.test(c)));
});
test("warm-up never invokes progression or currency mutation", () => {
  const source = fs.readFileSync(path.join(root, "app/warmup.tsx"), "utf8");
  for (const forbidden of [
    "addGameResult(",
    "spendCoins(",
    "consumeExtraLives(",
    "claimEventBonus(",
    "setGameConfig(",
  ])
    assert.ok(!source.includes(forbidden));
  assert.match(source, /<GameArena/);
  assert.match(source, /AppState.addEventListener/);
});
test("screens do not reintroduce banned fonts, glass or rendered hue gradients", () => {
  function files(dir) {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : /\.tsx?$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
      );
  }
  for (const file of files(path.join(root, "app"))) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /from ['"](?:expo-linear-gradient|expo-blur|@expo-google-fonts\/inter)['"]/,
      file,
    );
    assert.doesNotMatch(source, /(?:Inter_|Geist_|SpaceGrotesk_)/, file);
    assert.doesNotMatch(source, /Animated\.loop\(/, file);
  }
});
