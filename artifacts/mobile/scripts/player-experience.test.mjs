import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { collisionSteps, paddleInput } from '../utils/arenaGeometry.ts';
import { canMovePaddle, clampPaddle, clampPaddleRange, reflectedIntercept } from '../utils/courtInput.ts';
import { idleAnimation } from '../components/ui/idleAnimation.ts';
import { rankIndexForName } from '../utils/rankIndex.ts';
import { canClaimSeasonTier, seasonSkinForMilestone } from '../utils/seasonRewards.ts';
import { createRematchController } from '../store/rematch.ts';

const ts = createRequire(import.meta.url)('typescript');
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = text => ts.transpileModule(text, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;
const noop = () => {};
const animation = () => ({ start: noop, stop: noop });
class Value {
  constructor(value) { this._value = value; }
  setValue(value) { this._value = value; }
  interpolate() { return this; }
}
class ValueXY extends Value {}
const settings = { soundEnabled: false, screenShake: false, hapticsEnabled: false };
const generic = new Proxy({}, { get: () => noop });

// Execute the production component with deterministic scheduling and no renderer.
// This tests the actual collision loop, not a second physics implementation.
async function court(options = {}) {
  let captured, time = 0;
  const effects = [], callbacks = [], events = [], results = [];
  const text = await source('components/GameArena.tsx');
  const marker = '  return (\n    <ScreenShake';
  assert.ok(text.includes(marker), 'engine instrumentation marker exists');
  const code = compile(text.replace(marker,
    '  __capture({ gs: gsRef.current, tick: gameLoop, input: panResponder, forceWin }); return null;\n' + marker));
  const react = {
    useRef: current => ({ current }),
    useState: initial => [typeof initial === 'function' ? initial() : initial, noop],
    useEffect: effect => effects.push(effect),
    useCallback: fn => fn, useMemo: fn => fn(),
  };
  const exports = {};
  const modules = {
    react,
    'react-native': {
      Platform: { OS: 'web' }, StyleSheet: { create: value => value },
      Animated: { Value, ValueXY, parallel: animation, sequence: animation, loop: animation,
        timing: animation, spring: animation, delay: animation },
      PanResponder: { create: handlers => handlers },
      AppState: { currentState: 'active', addEventListener: () => ({ remove: noop }) },
    },
    '@/context/PlayerContext': { RELICS: [], getRankIndex: () => 0, MAX_RANK_INDEX: 19 },
    '@/hooks/useSettings': { getSettings: () => settings },
    '@/hooks/useReducedMotion': { useReducedMotion: () => true },
    '@/hooks/useSoundFX': { useSoundFX: () => new Proxy({}, { get: () => noop }) },
    '@/utils/arenaGeometry': { collisionSteps, paddleInput },
    '@/utils/courtInput': { canMovePaddle, clampPaddle, clampPaddleRange, reflectedIntercept },
    '@/hooks/useBrowserCourt': { useBrowserCourt: () => ({ current: null }) },
    '@/components/ui/idleAnimation': { idleAnimation },
    '@/constants/colors': { PLAYER_COLORS: ['a', 'b', 'c', 'd'],
      palette: new Proxy({}, { get: () => '#101410' }),
      tactile: new Proxy({}, { get: () => '#101410' }) },
  };
  vm.runInNewContext(code, {
    exports, require: id => modules[id] ?? generic, __capture: data => { captured = data; },
    performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
    setTimeout: fn => { callbacks.push(fn); return callbacks.length; }, clearTimeout: noop,
    setInterval: () => 1, clearInterval: noop,
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    document: { addEventListener: noop, removeEventListener: noop },
  });
  exports.GameArena({
    arenaSize: 320, playerName: 'You', playerColor: 'a', playerGlowColor: 'a',
    botNames: [], botRanks: [], skipCountdown: true, noPowerups: true,
    soundEnabled: false, onGameOver: result => results.push(result),
    onTutorialEvent: event => events.push(event), ...options,
  });
  effects.forEach(effect => effect());
  return { ...captured, events, results, finish: () => callbacks.forEach(fn => fn()),
    frame: (delta = 16.667) => { time += delta; captured.tick(time); } };
}

test('all sensitivities reach both ends and map monotonically at phone and desktop sizes', () => {
  for (const size of [240, 320, 375, 390, 560, 1024]) for (const sensitivity of [0.6, 1, 1.5]) {
    assert.equal(paddleInput(0, size, 88, sensitivity), 46);
    assert.equal(paddleInput(size, size, 88, sensitivity), size - 46);
    let previous = 0;
    for (let x = 0; x <= size; x++) {
      const next = paddleInput(x, size, 88, sensitivity);
      assert.ok(next >= previous && next >= 46 && next <= size - 46);
      previous = next;
    }
  }
});

test('production collisions block high-speed balls at 60, 30 and 15 fps without repeat hits', async () => {
  for (const size of [240, 390, 560]) for (const delta of [16.667, 33.334, 66.667]) {
    const c = await court({ arenaSize: size });
    c.gs.balls = [{ id: 1, x: size / 2, y: size - 48, vx: 0, vy: 70,
      radius: 6, active: true, type: 'tiny' }];
    const lives = c.gs.players[0].lives;
    c.frame(delta);
    assert.ok(c.gs.balls[0].vy < 0, `rebound at ${size}/${delta}`);
    assert.equal(c.gs.players[0].lives, lives);
    assert.equal(c.gs.players[0].score, 1);
    c.frame(delta);
    assert.equal(c.gs.players[0].score, 1);
  }
});

test('corner miss costs only one life, clamps inside the court and leaves ball moving inward', async () => {
  const c = await court();
  c.gs.balls = [{ id: 1, x: 38, y: 282, vx: -12, vy: 12, radius: 10, active: true, type: 'normal' }];
  const before = c.gs.players.map(p => p.lives);
  c.frame();
  const losses = c.gs.players.reduce((sum, p, i) => sum + before[i] - p.lives, 0);
  assert.equal(losses, 1);
  assert.ok(c.gs.balls[0].vx > 0 && c.gs.balls[0].vy < 0);
});

test('eight simultaneous fast balls are handled independently without tunneling', async () => {
  const c = await court();
  c.gs.balls = Array.from({ length: 8 }, (_, id) => ({
    id, x: 152 + id * 2, y: 270, vx: 0, vy: 45, radius: 6, active: true, type: 'tiny',
  }));
  c.frame(33.334);
  assert.ok(c.gs.balls.every(ball => ball.vy < 0));
  assert.equal(c.gs.players[0].score, 8);
  assert.equal(c.gs.players[0].lives, 5);
});

test('real-input tutorial stages emit only their own event and practice awards zero', async () => {
  const move = await court({ tutorialStage: 'move', practice: true });
  assert.equal(move.gs.balls.length, 0);
  move.input.onPanResponderGrant({ nativeEvent: { locationX: 80 } });
  move.input.onPanResponderMove({ nativeEvent: { locationX: 100 } });
  assert.deepEqual(move.events, ['move']);
  const block = await court({ tutorialStage: 'block', practice: true });
  for (let i = 0; i < 100; i++) block.frame();
  assert.deepEqual(block.events, ['block']);
  const miss = await court({ tutorialStage: 'miss', practice: true });
  for (let i = 0; i < 100; i++) miss.frame();
  assert.deepEqual(miss.events, ['miss']);
  const practice = await court({ practice: true });
  practice.forceWin(practice.gs, 0);
  practice.finish();
  assert.equal(practice.results[0].xpEarned, 0);
  assert.equal(practice.results[0].coinsEarned, 0);
});

// Run the actual PlayerProvider award callback with a memory-backed storage adapter.
async function playerHarness(storage = new Map(), fail = () => false, session) {
  let stateIndex = 0, refIndex = 0;
  const states = [], refs = [];
  const effects = [];
  const profileKey = '@goldrush_v3_regression';
  let receipt;
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props) => ({ type, props }),
    useState: initial => {
      const i = stateIndex++;
      if (!(i in states)) states[i] = i === 0 && storage.has(profileKey)
        ? JSON.parse(storage.get(profileKey)) : typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useRef: initial => {
      const i = refIndex++;
      return refs[i] ??= { current: initial };
    },
    useEffect: effect => effects.push(effect), useCallback: fn => fn,
  };
  const modules = {
    react,
    '@/utils/withTimeout': { withTimeout: promise => promise },
    '@/utils/rankIndex': { rankIndexForName },
    '@/utils/seasonRewards': { canClaimSeasonTier, seasonSkinForMilestone },
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { if (fail(key)) throw new Error('storage full'); storage.set(key, value); },
    },
    '@/store/gameSession': session ?? { getGameConfig: () => ({ matchId: 'match-1', featuredXpMult: 2 }) },
    '@/store/completedMatch': { setCompletedMatch: value => { receipt = value; } },
  };
  const exports = {};
  const text = (await source('context/PlayerContext.tsx')).replace(
    /if \(!isLoaded\) return <StartupState[^;]+;/, '');
  vm.runInNewContext(compile(text), {
    exports, require: id => modules[id] ?? generic, console, Date, Math,
  });
  function render() {
    stateIndex = 0; refIndex = 0;
    return exports.PlayerProvider({ username: 'regression', onLogout: noop }).props.value;
  }
  return {
    render, storage, profileKey, tiers: exports.SEASON_TIERS, road: exports.TROPHY_ROAD,
    pass: exports.BATTLE_PASS_TIERS, gamesRoad: exports.GAMES_ROAD, quests: exports.QUESTS, receipt: () => receipt,
    initialize: async () => {
      effects.shift()();
      // The real initialization uses only async storage and resolved promises.
      // Let those microtasks settle before the next simulated React render.
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test('season claims reject locked milestones and deliver the advertised skin once', async () => {
  const h = await playerHarness();
  const player = h.render();
  const tier = h.tiers.findIndex(t => t.games === 50);
  await player.claimSeasonTier(tier);
  assert.equal(player.profile.ownedSkins.includes('frost'), false);
  assert.equal(h.storage.has(h.profileKey), false);
  player.profile.totalGames = 50;
  await Promise.all([player.claimSeasonTier(tier), player.claimSeasonTier(tier)]);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.ownedSkins.filter(id => id === 'frost').length, 1);
  assert.equal(saved.seasonPassClaimed.filter(index => index === tier).length, 1);
});

test('rapid season claims preserve both rewards without duplicating currency', async () => {
  const h = await playerHarness();
  const player = h.render();
  player.profile.totalGames = 100;
  const tiers = h.tiers.map((tier, index) => ({ ...tier, index })).filter(tier => tier.coinReward > 0).slice(0, 2);
  const before = player.profile.coins;
  await Promise.all([
    player.claimSeasonTier(tiers[0].index),
    player.claimSeasonTier(tiers[1].index),
    player.claimSeasonTier(tiers[0].index),
  ]);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.coins, before + tiers[0].coinReward + tiers[1].coinReward);
  assert.equal(saved.seasonPassClaimed.length, 2);
});

test('mixed progression claims serialize against latest save and duplicates grant nothing', async () => {
  const h = await playerHarness();
  const p = h.render();
  p.profile.xp = 500000;
  p.profile.battlePassPoints = 5000;
  p.profile.battlePassPremiumOwned = true;
  const road = h.road.find(m => m.reward.type === 'coins');
  const tier = h.pass.find(t => t.free.type === 'coins' && t.premium.type === 'coins');
  const quest = h.quests.find(q => q.period === 'daily' && !q.premiumOnly);
  p.profile.dailyQuestProgress = { [quest.trackKey]: quest.target };
  const before = p.profile.coins;
  const points = p.profile.battlePassPoints;
  await Promise.all([
    p.claimTrophyRoad(road.id), p.claimBattlePassTier(tier.slot, false),
    p.claimBattlePassTier(tier.slot, true), p.claimQuestReward(quest.id),
    p.claimTrophyRoad(road.id), p.claimBattlePassTier(tier.slot, false),
    p.claimQuestReward(quest.id),
  ]);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.coins, before + road.reward.amount + tier.free.amount + tier.premium.amount);
  assert.equal(saved.battlePassPoints, points + quest.reward);
  assert.equal(saved.trophyRoadClaimed.filter(id => id === road.id).length, 1);
  assert.equal(saved.battlePassClaimed.filter(id => id === `bp_${tier.slot}`).length, 1);
  assert.equal(saved.battlePassPremiumClaimed.filter(id => id === `bp_${tier.slot}`).length, 1);
  assert.equal(saved.dailyQuestClaimed.filter(id => id === quest.id).length, 1);
});

test('locked progression and unowned Plus claims do not write or grant access', async () => {
  const h = await playerHarness();
  const p = h.render();
  p.profile.xp = 0;
  p.profile.battlePassPoints = 0;
  await p.claimTrophyRoad(h.road.find(m => m.xp > 0).id);
  await p.claimBattlePassTier(1, false);
  p.profile.battlePassPoints = 5000;
  await p.claimBattlePassTier(1, true);
  assert.equal(h.storage.has(h.profileKey), false);
  assert.equal(p.profile.battlePassPremiumOwned, false);
});

test('failed progression writes leave rewards retryable and do not poison the queue', async () => {
  let failWrite = true;
  const h = await playerHarness(new Map(), () => failWrite);
  const p = h.render();
  p.profile.battlePassPoints = 5000;
  const tier = h.pass.find(t => t.free.type === 'coins');
  const coins = p.profile.coins;
  await assert.rejects(p.claimBattlePassTier(tier.slot, false), /storage full/);
  assert.equal(p.profile.battlePassClaimed.includes(`bp_${tier.slot}`), false);
  failWrite = false;
  await p.claimBattlePassTier(tier.slot, false);
  await p.claimBattlePassTier(tier.slot, false);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.coins, coins + tier.free.amount);
  assert.equal(saved.battlePassClaimed.filter(id => id === `bp_${tier.slot}`).length, 1);
});

test('Plus cosmetics, bank lives and multi-drop rewards persist once through reload', async () => {
  const h = await playerHarness();
  const p = h.render();
  p.profile.battlePassPoints = 5000;
  p.profile.battlePassPremiumOwned = true;
  const tiers = ['skin', 'bank_life', 'ultradrop'].map(type => h.pass.find(t => t.premium.type === type));
  const lives = p.profile.extraLivesInventory ?? 0;
  const blocks = p.profile.luckyBlocks.length;
  await Promise.all(tiers.flatMap(t => [
    p.claimBattlePassTier(t.slot, true), p.claimBattlePassTier(t.slot, true),
  ]));
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.ownedSkins.filter(id => id === tiers[0].premium.id).length, 1);
  assert.equal(saved.extraLivesInventory, lives + (tiers[1].premium.amount ?? 1));
  assert.equal(saved.luckyBlocks.length, blocks + tiers[2].premium.amount);
  const reloaded = await playerHarness(h.storage);
  const next = reloaded.render();
  await Promise.all(tiers.map(t => next.claimBattlePassTier(t.slot, true)));
  assert.equal(h.storage.get(h.profileKey), JSON.stringify(saved));
});

test('season claim storage failure can be retried without losing the reward', async () => {
  let failWrite = true;
  const h = await playerHarness(new Map(), key => failWrite && key.includes('_v3_'));
  const player = h.render();
  player.profile.totalGames = 100;
  const tier = h.tiers.findIndex(t => t.coinReward > 0);
  const before = player.profile.coins;
  await assert.rejects(player.claimSeasonTier(tier), /storage full/);
  failWrite = false;
  await player.claimSeasonTier(tier);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.coins, before + h.tiers[tier].coinReward);
  assert.equal(saved.seasonPassClaimed.filter(index => index === tier).length, 1);
});

test('legacy claimed skins are repaired on load without awarding currency again', async () => {
  const seed = await playerHarness();
  const tier = seed.tiers.findIndex(t => t.games === 50);
  const old = { ...seed.render().profile, totalGames: 50, ownedSkins: ['default'], seasonPassClaimed: [tier] };
  const storage = new Map([[seed.profileKey, JSON.stringify(old)]]);
  const h = await playerHarness(storage);
  h.render();
  await h.initialize();
  const player = h.render();
  assert.ok(player.profile.ownedSkins.includes('frost'));
  assert.equal(player.profile.coins, old.coins);
  assert.equal(player.profile.rank, 'Bronze 1');
});

test('first profile uses the selected look and keeps it through tutorial save and reload', async () => {
  const storage = new Map([
    ['@goldrush_accounts', JSON.stringify([{
      username: 'regression', avatarEmoji: 'chosen-crown', avatarColor: '#B4533A',
      rank: 'Bronze', lastPlayed: 0,
    }])],
  ]);
  const h = await playerHarness(storage);
  h.render();
  await h.initialize();
  let player = h.render();
  assert.equal(player.profile.avatarEmoji, 'chosen-crown');
  assert.equal(player.profile.avatarFrameColor, '#B4533A');
  await player.completeTutorial();
  const saved = JSON.parse(storage.get(h.profileKey));
  assert.equal(saved.avatarEmoji, 'chosen-crown');
  assert.equal(saved.avatarFrameColor, '#B4533A');
  assert.equal(saved.tutorialComplete, true);

  // A stale directory must never overwrite an already established profile.
  storage.set('@goldrush_accounts', JSON.stringify([{
    username: 'regression', avatarEmoji: 'stale-controller', avatarColor: '#FFD700',
  }]));
  const returning = await playerHarness(storage);
  returning.render();
  await returning.initialize();
  player = returning.render();
  assert.equal(player.profile.avatarEmoji, 'chosen-crown');
  assert.equal(player.profile.avatarFrameColor, '#B4533A');
  assert.equal(player.profile.tutorialComplete, true);
});

const award = { won: true, xpEarned: 100, coinsEarned: 20, position: 1,
  deflections: 9, goalsAgainst: 2, matchType: 'casual', eventBonus: { xp: 30, coins: 10, credits: 1 } };

test('web API requests retain their origin and 44px icon hit areas do not overlap neighbors', async () => {
  const exports = {};
  vm.runInNewContext(compile(await source('utils/api.ts')), {
    exports, require: () => ({ Platform: { OS: 'web' } }),
    window: { location: { origin: 'https://example.expo.test' } },
  });
  assert.equal(exports.apiUrl('/healthz'), 'https://example.expo.test/api/healthz');
  const primitives = await source('components/ui/Primitives.tsx');
  assert.match(primitives, /hitSlop=\{0\}/);
  assert.match(primitives, /iconBtn: \{ width: 44, height: 44/);
});

test('persisted receipt, History and balances agree, including featured and event bonuses', async () => {
  const h = await playerHarness();
  await h.render().addMatchResult(award);
  const p = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(p.xp, 230);
  assert.equal(p.coins, 230); // existing 200 + base 20 + event 10
  assert.equal(p.matchHistory[0].xpEarned, 230);
  assert.equal(p.matchHistory[0].coinsEarned, 30);
  assert.equal(p.matchHistory[0].receipt.xpAfter, p.xp);
  assert.equal(p.competitiveLevel, 1);
  assert.equal(p.battlePassPoints ?? 0, 0);
});

test('simultaneous callbacks, stale closures and reload/retry award a match once', async () => {
  const h = await playerHarness();
  const stale = h.render().addMatchResult;
  await Promise.all([stale(award), stale(award)]);
  await stale(award);
  const reloaded = await playerHarness(h.storage);
  await reloaded.render().addMatchResult(award);
  const p = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(p.totalGames, 1);
  assert.equal(p.xp, 230);
  assert.equal(p.matchHistory.length, 1);
  assert.equal(p.gamesRoadCompleted, 1);
  assert.equal(reloaded.receipt().id, 'match-1');
});

test('games road claims serialize with matches, survive reload and reject repeated taps', async () => {
  const h = await playerHarness();
  const p = h.render();
  assert.equal(await p.claimGamesRoad('games_01'), false);
  const before = p.profile.coins;
  await Promise.all([
    p.addMatchResult(award),
    p.claimGamesRoad('games_01'),
    p.claimGamesRoad('games_01'),
    p.addMatchResult(award),
  ]);
  const saved = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(saved.gamesRoadCompleted, 1);
  assert.equal(saved.coins, before + 30 + 100);
  assert.deepEqual(saved.gamesRoadClaimed, ['games_01']);
  const reloaded = await playerHarness(h.storage);
  assert.equal(await reloaded.render().claimGamesRoad('games_01'), false);
  assert.equal(await reloaded.render().claimGamesRoad('unknown'), false);
  assert.equal(h.storage.get(h.profileKey), JSON.stringify(saved));
});

test('legacy totals never fabricate games-road eligibility or change XP/pass claims', async () => {
  const seed = await playerHarness();
  const old = { ...seed.render().profile, totalGames: 500, xp: 1200,
    trophyRoadClaimed: ['tr_01'], battlePassClaimed: ['bp_1'], battlePassPremiumOwned: true };
  delete old.gamesRoadCompleted;
  delete old.gamesRoadClaimed;
  const h = await playerHarness(new Map([[seed.profileKey, JSON.stringify(old)]]));
  h.render();
  await h.initialize();
  const p = h.render();
  assert.equal(p.profile.gamesRoadCompleted, 0);
  assert.equal(await p.claimGamesRoad('games_01'), false);
  assert.equal(p.profile.totalGames, 500);
  assert.deepEqual(Array.from(p.profile.trophyRoadClaimed), ['tr_01']);
  assert.equal(p.profile.battlePassPremiumOwned, true);
  assert.deepEqual(Array.from(p.profile.battlePassClaimed), ['bp_1']);
});

test('failed games-road claims stay retryable and excluded modes cannot earn progression', async () => {
  let fail = false;
  const h = await playerHarness(new Map(), key => fail && key.includes('_v3_'));
  const p = h.render();
  await p.addMatchResult(award);
  fail = true;
  await assert.rejects(p.claimGamesRoad('games_01'), /storage full/);
  fail = false;
  assert.equal(await p.claimGamesRoad('games_01'), true);
  assert.equal(await p.claimGamesRoad('games_01'), false);
  for (const config of [{ practice: true }, { variant: 'custom' }]) {
    const blocked = await playerHarness(new Map(), () => false, { getGameConfig: () => ({ ...config, matchId: 'excluded' }) });
    await assert.rejects(blocked.render().addMatchResult(award), /do not earn normal progression/);
    assert.equal(blocked.storage.has(blocked.profileKey), false);
  }
});

test('failed profile storage preserves balances and permits one safe retry', async () => {
  let failing = true;
  const h = await playerHarness(new Map(), key => failing && key.includes('v3'));
  const save = h.render().addMatchResult;
  await assert.rejects(save(award), /storage full/);
  assert.equal(h.storage.has(h.profileKey), false);
  assert.equal(h.receipt(), undefined);
  failing = false;
  await save(award);
  assert.equal(JSON.parse(h.storage.get(h.profileKey)).totalGames, 1);
});

for (const automatic of [false, true]) test(`${automatic ? 'Automatic rematch' : 'Play Again'} commits a second distinct receipt while each match retry still awards once`, async () => {
  const session = {};
  vm.runInNewContext(compile(await source('store/gameSession.ts')), { exports: session, Date, Math });
  session.setGameConfig({
    playerName: 'regression', matchType: 'ranked', variant: 'classic',
    featuredXpMult: 2, matchNonce: 'single-use', challengeSeed: 'old-run',
    countdownComplete: true, bankLivesUsed: 2, opponentNames: ['old-opponent'],
  });
  const firstId = session.getGameConfig().matchId;
  const h = await playerHarness(new Map(), () => false, session);
  h.render().profile.extraLivesInventory = 5;
  const save = h.render().addMatchResult;
  const ranked = { ...award, matchType: 'ranked' };
  await save(ranked);
  const firstReceipt = h.receipt();
  await save(ranked); // retry the first award, without pressing Play Again
  assert.equal(JSON.parse(h.storage.get(h.profileKey)).totalGames, 1);

  // Execute the actual Results press handler, including its double-press guard.
  const postgame = await source('app/postgame.tsx');
  assert.match(postgame, /onPress=\{handlePlayAgain\}/);
  const handler = postgame.match(/  function handlePlayAgain\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(handler);
  const routes = [], press = {};
  vm.runInNewContext(compile(`${handler}\nexports.press = handlePlayAgain;`), {
    exports: press, startingRematchRef: { current: false }, isArcade: false,
    startRematch: session.startRematch, router: { replace: path => routes.push(path) },
  });
  if (automatic) {
    const countdown = createRematchController();
    for (let i = 0; i < 15; i++) if (countdown.tick(true) === 0) press.press();
  } else press.press();
  const secondId = session.getGameConfig().matchId;
  press.press(); // rapid double press must not rotate a second time
  assert.notEqual(secondId, firstId);
  assert.equal(session.getGameConfig().matchId, secondId);
  assert.deepEqual(routes, ['/lobby']);
  assert.equal(session.getGameConfig().matchNonce, undefined);
  assert.equal(session.getGameConfig().bankLivesUsed, 0);
  assert.equal(session.getGameConfig().countdownComplete, false);
  session.updateGameConfig({ opponentNames: ['new-bot'], countdownComplete: true });
  assert.equal(session.getGameConfig().matchId, secondId); // lobby/retries retain identity

  await save(ranked); // same provider closure, genuinely new match
  await save(ranked); // repeat second award callback
  const reloaded = await playerHarness(h.storage, () => false, session);
  await reloaded.render().addMatchResult(ranked); // reload/retry of the second receipt
  const p = JSON.parse(h.storage.get(h.profileKey));
  assert.equal(p.totalGames, 2);
  assert.equal(p.gamesRoadCompleted, 2);
  assert.equal(p.matchHistory.length, 2);
  assert.equal(p.xp, 460);
  assert.equal(p.coins, 260);
  assert.equal(p.competitiveLevel, reloaded.receipt().levelAfter);
  assert.equal(reloaded.receipt().levelBefore, firstReceipt.levelAfter);
  // Historical local levels are frozen; live competitive skill is server-owned.
  assert.equal(p.competitiveLevel, firstReceipt.levelAfter);
  assert.equal(p.matchHistory[0].receipt.id, secondId);
  assert.equal(p.matchHistory[1].receipt.id, firstId);
  assert.equal(firstReceipt.xpAfter, 230);
  assert.equal(reloaded.receipt().id, secondId);
  assert.equal(reloaded.receipt().xpAfter, 460);
  assert.equal(p.extraLivesInventory, 5);
});
