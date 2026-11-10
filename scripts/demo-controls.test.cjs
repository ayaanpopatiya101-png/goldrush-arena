const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireFn = require, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: requireFn, ...globals });
  return exports;
}
const sim = load('artifacts/api-server/src/lib/arenaSimulation.ts');
const input = load('artifacts/mobile/utils/courtInput.ts');
const geometry = load('artifacts/mobile/utils/arenaGeometry.ts');

function arena(props = {}) {
  const effects = [], timers = new Map();
  let timerId = 0, raf, now = 0, result, browserEnabled;
  class Value {
    constructor(value) { this._value = value; }
    setValue(value) { this._value = value; }
    interpolate() { return this; }
  }
  class ValueXY {
    constructor(value) { this.x = new Value(value.x); this.y = new Value(value.y); }
    setValue(value) { this.x.setValue(value.x); this.y.setValue(value.y); }
  }
  const animation = () => ({ start() {}, stop() {} });
  const Animated = { Value, ValueXY, timing: animation, spring: animation, parallel: animation, sequence: animation };
  const react = { useState: v => [v, () => {}], useRef: current => ({ current }),
    useMemo: fn => fn(), useEffect: fn => effects.push(fn), useCallback: fn => fn };
  const colors = { PLAYER_COLORS: ['a','b','c','d'], palette: {}, tactile: {} };
  const imports = {
    react, 'react-native': { Animated, StyleSheet: { create: v => v }, Platform: { OS: 'ios' }, PanResponder: { create: handlers => handlers },
      AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '@/utils/courtInput': input, '@/utils/arenaGeometry': geometry,
    '@/hooks/useReducedMotion': { useReducedMotion: () => true },
    '@/hooks/useBrowserCourt': { useBrowserCourt: enabled => { browserEnabled = enabled; return { current: null }; } },
    '@/hooks/useSettings': { getSettings: () => ({}) },
    '@/hooks/useSoundFX': { useSoundFX: () => new Proxy({}, { get: () => () => {} }) },
    '@/context/PlayerContext': { getRankIndex: () => 0, MAX_RANK_INDEX: 20 },
    '@/constants/colors': colors,
    '@/components/ui/idleAnimation': { idleAnimation: animation },
    '@workspace/goldrush-catalog/cosmetics': { THEME_FINISHES: [], STRIKE_FINISHES: [] },
    '@/utils/haptics': { impactAsync() {}, notificationAsync() {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} },
  };
  let source = fs.readFileSync('artifacts/mobile/components/GameArena.tsx', 'utf8');
  // Observe the real loop, not a second implementation, without rendering React Native.
  source = source.replace('  // ─── Arena orbs (memoised', '  return { gs: gsRef.current, pausedRef, activeTimeRef, nextBallTimeRef, input: panResponder };\n  // ─── Arena orbs (memoised');
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {
    exports, require: id => imports[id] ?? {}, performance: { now: () => now },
    Math: Object.assign(Object.create(Math), { random: () => 0.12 }),
    requestAnimationFrame: fn => { raf = fn; return 1; }, cancelAnimationFrame() {},
    setInterval: () => 1, clearInterval() {},
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  const state = exports.GameArena({ arenaSize: 390, playerName: 'OrbitAce', playerColor: 'a', playerGlowColor: 'a',
    botNames: ['Cedar','Finch','Nova'], botRanks: [], initialLives: 10000, noPowerups: true,
    skipCountdown: true, practice: true, soundEnabled: false, onGameOver: r => { result = r; }, ...props });
  const cleanups = effects.map(fn => fn()).filter(fn => typeof fn === 'function');
  return { ...state, browserEnabled,
    advance(ms, hz = 60) { const count = Math.round(ms / (1000 / hz)); for (let i = 0; i < count; i++) { now += 1000 / hz; raf(now); } },
    jump(ms) { now += ms; raf(now); },
    finishTimers() { for (const fn of [...timers.values()]) fn(); return result; },
    cleanup() { cleanups.forEach(fn => fn()); },
  };
}

test('real local engine spawns at 7s, 17s, 27s of active play at 30/60/120Hz, never catches up after pause', () => {
  for (const hz of [30, 60, 120]) {
    const a = arena();
    assert.equal(a.gs.balls.length, 1);
    a.advance(6900, hz); assert.equal(a.gs.balls.length, 1);
    a.advance(150, hz); assert.equal(a.gs.balls.length, 2);
    a.pausedRef.current = true;
    a.advance(30000, hz); assert.equal(a.gs.balls.length, 2);
    a.pausedRef.current = false;
    a.jump(60000); assert.equal(a.gs.balls.length, 2, 'suspended animation frames do not create catch-up spawns');
    a.advance(9800, hz); assert.equal(a.gs.balls.length, 2);
    a.advance(250, hz); assert.equal(a.gs.balls.length, 3);
    a.advance(10050, hz); assert.equal(a.gs.balls.length, 4);
    a.cleanup();
  }
});

test('explicit special-mode spawn intervals retain their own cadence', () => {
  const a = arena({ ballSpawnFrames: 180 });
  a.advance(2900); assert.equal(a.gs.balls.length, 1);
  a.advance(150); assert.equal(a.gs.balls.length, 2);
  a.advance(3050); assert.equal(a.gs.balls.length, 3);
  a.cleanup();
  assert.equal(sim.RULES.duos.spawn, 7);
  assert.equal(sim.RULES.pinball.spawn, 3);
  assert.equal(sim.RULES.chaos.balls, 5);
  assert.equal(sim.RULES.blitz.balls, 2);
});

test('demo automates all four paddles with bounded motion, rejects input and completes with zero awards', () => {
  const a = arena({ demo: true });
  assert.equal(a.browserEnabled, false);
  assert.equal(a.input.onStartShouldSetPanResponder(), false);
  assert.equal(a.input.onMoveShouldSetPanResponder(), false);
  assert.equal(a.gs.players.slice(0, 4).every(p => p.isBot), true);
  const p = a.gs.players[0];
  a.gs.balls[0] = { id: 1, x: 280, y: 200, vx: 0, vy: 2, active: true, radius: 10, color: 'a', type: 'normal' };
  const before = p.paddleCenter;
  a.advance(17);
  assert.ok(p.paddleCenter > before);
  assert.ok(p.paddleCenter - before <= 12.1);
  a.advance(45100);
  const result = a.finishTimers();
  assert.equal(result.xpEarned, 0);
  assert.equal(result.coinsEarned, 0);
  a.cleanup();
  const playable = arena({ tutorialStage: 'move' });
  assert.equal(playable.gs.players[0].isBot, false);
  assert.equal(playable.gs.balls.length, 0, 'move lesson waits for the human');
  playable.cleanup();
});

test('projected demo interceptions account for repeated rebounds', () => {
  for (const [x, expected] of [[50,50],[150,50],[-50,50],[250,50],[0,0],[100,100]]) {
    assert.equal(input.reflectedIntercept(x, 0, 100), expected);
  }
});

function target() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    fire(type, event = {}) { listeners.get(type)?.(event); },
    listeners,
  };
}
test('court owns drag only while bound, releases on cancel/resize/background, and restores scrolling', () => {
  const { bindBrowserCourt } = load('artifacts/mobile/utils/browserCourt.ts');
  const node = { ...target(), style: { touchAction: 'pan-y', overscrollBehavior: '' },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 200 }),
    setPointerCapture(id) { this.captured = id; }, hasPointerCapture(id) { return this.captured === id; },
    releasePointerCapture() { this.captured = null; } };
  const host = target(), doc = { ...target(), visibilityState: 'visible' }, moves = [];
  const event = id => ({ pointerId: id, isPrimary: true, pointerType: 'touch', clientX: 110, clientY: 120, preventDefault() {} });
  // Before binding, a court inherits browser pan-y and cannot cancel the scroll.
  assert.equal(node.style.touchAction, 'pan-y');
  const cleanup = bindBrowserCourt(node, (x,y) => moves.push([x,y]), host, doc);
  assert.equal(node.style.touchAction, 'none');
  for (const cancel of ['pointercancel', 'resize', 'orientationchange', 'blur', 'visibilitychange']) {
    node.fire('pointerdown', event(7));
    assert.equal(node.captured, 7);
    const count = moves.length;
    if (cancel === 'pointercancel') node.fire(cancel, event(7));
    else if (cancel === 'visibilitychange') { doc.visibilityState = 'hidden'; doc.fire(cancel); }
    else host.fire(cancel);
    assert.equal(node.captured, null);
    node.fire('pointermove', event(7));
    assert.equal(moves.length, count);
    doc.visibilityState = 'visible';
  }
  node.fire('pointerdown', event(8));
  assert.deepEqual(moves.at(-1), [0.5,0.5]);
  cleanup();
  assert.equal(node.captured, null);
  assert.equal(node.style.touchAction, 'pan-y');
  assert.equal(node.listeners.size, 0);
  assert.equal(host.listeners.size, 0);
  assert.equal(doc.listeners.size, 0);
});

test('queue admits compatible humans immediately, bounds eligible fallback and never fills party reservations', () => {
  const service = load('artifacts/api-server/src/lib/arenaService.ts', id => {
    if (id === './arenaSimulation.js') return sim;
    if (id === 'node:crypto') return require(id);
    return {};
  }, { Date });
  const realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  const join = (id, mode = 'casual', extra = {}, reserved) => {
    const r = service.joinRoom({ id, rating: 1000 }, { mode, variant: 'classic', latency: 50, name: id, color: 'a', ...extra }, reserved);
    r.players.find(p => p.id === id).connected = true;
    return r;
  };
  try {
    const r = join('a'); assert.equal(join('b').id, r.id);
    const distant = join('distant', 'casual', { latency: 1000 });
    assert.notEqual(distant.id, r.id, 'incompatible latency never joins the room');
    service.leaveRoom('distant');
    now += 4999; service.tickRooms(now); assert.equal(r.players.length, 2);
    now++; service.tickRooms(now);
    assert.equal(r.phase, 'countdown');
    assert.equal(r.players.filter(p => p.isBot).length, 2);
    service.leaveRoom('a');
    assert.equal(r.phase, 'waiting'); assert.equal(r.players.length, 1);
    assert.equal(service.currentRoom('a'), undefined);
    service.leaveRoom('b');
    const party = join('leader', 'casual', { partyCode: 'ABCDEF' }, ['leader','member']);
    now += 6000; service.tickRooms(now);
    assert.equal(party.phase, 'waiting'); assert.equal(party.players.length, 1);
    join('member', 'casual', { partyCode: 'ABCDEF' }, ['leader','member']);
    service.tickRooms(now);
    assert.equal(party.phase, 'countdown'); assert.equal(party.players.filter(p => p.isBot).length, 2);
    const ranked = join('rank1', 'ranked');
    join('rank2', 'ranked'); join('rank3', 'ranked'); join('rank4', 'ranked');
    service.tickRooms(now);
    assert.equal(ranked.phase, 'countdown');
    assert.equal(ranked.players.filter(p => p.isBot).length, 0);
    service.leaveRoom('rank4');
    now += 6000; service.tickRooms(now);
    assert.equal(ranked.phase, 'waiting'); assert.equal(ranked.players.length, 3);
    ranked.players[0].connected = false; service.tickRooms(now);
    assert.equal(ranked.phase, 'waiting');
  } finally { Date.now = realNow; }
});

test('early cancel waits for the actual queue request before deleting the seat, and double cancel is inert', async () => {
  const source = fs.readFileSync('artifacts/mobile/components/multiplayer/OnlineMatch.tsx', 'utf8');
  const leave = source.match(/  async function leave\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(leave);
  let resolveJoin;
  const joining = new Promise(resolve => { resolveJoin = resolve; });
  const calls = [];
  const context = {
    exports: {}, leaving: { current: false }, queueRequest: { current: joining },
    latest: { current: null }, cancelled: { current: false }, currentUsername: 'test',
    socket: { current: { close: () => calls.push('close') } },
    pendingKey: 'pending', arenaRequestOptions: async () => ({}),
    leaveLiveQueue: async () => calls.push('delete'),
    AsyncStorage: { removeItem: async () => calls.push('remove') },
    router: { replace: () => calls.push('home') }, setError: e => assert.fail(e),
  };
  const js = ts.transpileModule(`${leave}\nexports.leave = leave;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, context);
  const cancelling = context.exports.leave();
  await context.exports.leave();
  assert.deepEqual(calls, [], 'no DELETE may overtake the POST');
  resolveJoin({});
  await cancelling;
  assert.deepEqual(calls, ['delete','remove','close','home']);
});
