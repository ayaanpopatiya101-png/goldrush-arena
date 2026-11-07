import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { setImmediate } from 'node:timers/promises';

// Execute the production focus-lifetime body with controlled IO and a virtual
// clock. This checks timers/requests, not React rendering or physical devices.
const source = await readFile(new URL('../app/lobby.tsx', import.meta.url), 'utf8');
const start = source.indexOf('useFocusEffect(useCallback(() => {');
const end = source.indexOf('// eslint-disable-next-line react-hooks/exhaustive-deps', start);
const body = source.slice(start + 'useFocusEffect(useCallback(() => {'.length, end);
const { createRequire } = await import('node:module');
const ts = createRequire(import.meta.url)('typescript');
const code = ts.transpileModule(`export default function run() { ${body} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function harness({ hangingJoin = false, pollStatus = 404 } = {}) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const state = { offline: false, opponents: [], countdown: [], navigations: [], requests: 0 };
  const schedule = (fn, delay, interval = false) => {
    const id = ++nextId;
    timers.set(id, { fn, at: now + delay, interval: interval ? delay : 0 });
    return id;
  };
  const ref = current => ({ current });
  const exports = {};
  vm.runInNewContext(code, {
    exports, AbortController,
    setTimeout: (fn, ms) => schedule(fn, ms),
    setInterval: (fn, ms) => schedule(fn, ms, true),
    clearTimeout: id => timers.delete(id),
    clearInterval: id => timers.delete(id),
    updateGameConfig: () => {},
    setStatus: () => {},
    setCountdown: n => state.countdown.push(n),
    setShowGoFlash: () => {},
    setApiAvailable: value => { state.offline = !value; },
    setOpponents: value => { state.opponents = typeof value === 'function' ? value(state.opponents) : value; },
    apiUrl: path => path,
    playerIdRef: ref('you'), roomIdRef: ref(null), selectedMapRef: ref('default'),
    profile: { name: 'You', rank: 'Bronze 1' }, playerRankIdx: 0,
    playerSkin: { color: '#F0B429' }, partyCode: null, partyMembers: [], opponents: [],
    Platform: { OS: 'web' },
    sfxRef: ref({ countdown() {}, playerJoin() {} }),
    router: { replace: path => state.navigations.push(path) },
    fetch: async path => {
      state.requests += 1;
      if (path === '/matchmaking/join') {
        if (hangingJoin) return new Promise(() => {});
        return { ok: true, json: async () => ({
          roomId: 'test-room', players: [{ id: 'you', name: 'You' }], isReady: false,
        }) };
      }
      if (path.endsWith('/leave')) return { ok: true };
      return { ok: false, status: pollStatus };
    },
  });
  const cleanup = exports.default();
  async function advance(ms) {
    await setImmediate();
    const target = now + ms;
    while (true) {
      const due = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, timer] = due;
      now = timer.at;
      if (timer.interval) timer.at += timer.interval;
      else timers.delete(id);
      timer.fn();
      await setImmediate();
    }
    now = target;
    await setImmediate();
  }
  return { state, advance, cleanup };
}

test('a lost room recovers into exactly one bot match', async () => {
  const h = harness();
  await h.advance(2000);
  assert.equal(h.state.offline, true);
  await h.advance(8000);
  assert.equal(h.state.opponents.length, 3);
  assert.deepEqual(h.state.countdown, [3, 2, 1, 0]);
  assert.deepEqual(h.state.navigations, ['/game']);
  h.cleanup();
});

test('a hanging join cannot leave the lobby waiting indefinitely', async () => {
  const h = harness({ hangingJoin: true });
  await h.advance(14999);
  assert.equal(h.state.offline, false);
  await h.advance(1);
  assert.equal(h.state.offline, true);
  await h.advance(8000);
  assert.deepEqual(h.state.navigations, ['/game']);
  h.cleanup();
});

test('three failed polls recover without endless requests', async () => {
  const h = harness({ pollStatus: 503 });
  await h.advance(6000);
  assert.equal(h.state.offline, true);
  const requests = h.state.requests;
  await h.advance(8000);
  assert.equal(h.state.requests, requests);
  assert.deepEqual(h.state.navigations, ['/game']);
  h.cleanup();
});

test('leaving during recovery cancels every delayed start', async () => {
  const h = harness();
  await h.advance(2000);
  h.cleanup();
  await h.advance(20000);
  assert.deepEqual(h.state.navigations, []);
  assert.equal(h.state.opponents.length, 0);
});
