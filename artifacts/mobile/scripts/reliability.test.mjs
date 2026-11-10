import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { withTimeout } from '../utils/withTimeout.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('startup IO resolves and preserves failures', async () => {
  assert.equal(await withTimeout(Promise.resolve('saved'), 100), 'saved');
  await assert.rejects(withTimeout(Promise.reject(new Error('storage unavailable')), 100), /storage unavailable/);
});

test('startup IO cannot spin forever', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /timed out/);
});

test('Plus pricing uses actual catalog envelope and discloses unavailable providers without checkout', async () => {
  const ts = createRequire(import.meta.url)('typescript');
  const code = ts.transpileModule(await source('hooks/usePlusOffer.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  async function offer(platform, response, store = {}) {
    let state, effect, requests = 0;
    const modules = {
      react: {
        useState: initial => [state ?? initial, value => { state = value; }],
        useEffect: callback => { effect ??= callback; },
      },
      'react-native': { Platform: { OS: platform } },
      '@/lib/revenuecat': { useRevenueCat: () => ({ available: false, getPackage: () => null, ...store }) },
      '@/utils/api': { apiUrl: path => path },
      '@/utils/withTimeout': { withTimeout: promise => promise },
    };
    const exports = {};
    vm.runInNewContext(code, {
      exports, require: id => modules[id], Intl,
      fetch: async path => {
        requests++;
        assert.equal(path, '/store/products');
        if (response instanceof Error) throw response;
        return { ok: true, json: async () => response };
      },
    });
    exports.usePlusOffer();
    effect();
    await new Promise(resolve => setImmediate(resolve));
    return { ...exports.usePlusOffer(), requests };
  }
  const live = await offer('web', { data: [{
    name: 'GoldRush Battle Pass Premium',
    prices: [{ id: 'price_test', currency: 'usd', unit_amount: 673 }],
  }] });
  assert.equal(live.price, '$6.73');
  assert.match(live.message, /Stripe/);
  const missing = await offer('web', new Error('unavailable'));
  assert.equal(missing.price, undefined);
  assert.match(missing.message, /purchase unavailable/);
  for (const platform of ['ios', 'android']) {
    const native = await offer(platform);
    assert.equal(native.requests, 0);
    assert.match(native.message, /RevenueCat is not configured/);
    const configured = await offer(platform, null, {
      available: true, getPackage: id => {
        assert.equal(id, 'battle_pass_premium_s1');
        return { product: { priceString: '€7,19' } };
      },
    });
    assert.equal(configured.price, '€7,19');
    assert.equal(configured.requests, 0);
  }
});

// Source-contract checks complement, not replace, the browser countdown test.
test('lobby owns cancellation and all delayed transitions', async () => {
  const lobby = await source('app/lobby.tsx');
  assert.match(lobby, /useFocusEffect\(useCallback/);
  assert.match(lobby, /delayed\.forEach\(clearTimeout\)/);
  assert.match(lobby, /cancelled \|\| fallbackStarted \|\| readyScheduled/);
  assert.match(lobby, /!cancelled && !navigated/);
  assert.match(lobby, /countdownComplete: true/);
  assert.match(lobby, /if \(!readyScheduled\) pollTimer/);
});

test('game uses one start and result guard, forwards completed countdown', async () => {
  const game = await source('app/game.tsx');
  assert.match(game, /if \(startedRef\.current\) return/);
  assert.match(game, /if \(completedRef\.current\) return/);
  assert.match(game, /skipCountdown=\{countdownComplete\}/);
  const arena = await source('components/GameArena.tsx');
  assert.match(arena, /if \(started \|\| pausedRef\.current\) return/);
  assert.match(arena, /if \(skipCountdown\) begin\(\)/);
});

test('a match cannot grant unpurchased lives through a fake checkout', async () => {
  const game = await source('app/game.tsx');
  assert.doesNotMatch(game, /handleBuyExtraLife|Buy \+3 Lives|grantExtraLifeRef/);
});

test('all local opponent cards retain an explicit bot badge', async () => {
  const lobby = await source('app/lobby.tsx');
  const opponentCards = lobby.slice(lobby.indexOf('{opponents.map((opp)'));
  assert.match(opponentCards, /isBot=\{true\}/);
});

test('exclusive pass cosmetics cannot be bought for zero coins', async () => {
  const player = await source('context/PlayerContext.tsx');
  assert.match(player, /'exclusive' in skin && skin\.exclusive/);
  assert.match(player, /ownedSkins: \[\.\.\.profile\.ownedSkins, skinId\], currentSkin: skinId/);
  for (const [id, price] of [['plasma',150],['frost',150],['toxic',200],['void',250],['inferno',300],['chrome',350],['cosmic',500]]) {
    assert.match(player, new RegExp(`id: '${id}'[^\\n]+price: ${price}`));
  }
});

test('unavailable sharing exits before claiming rewards', async () => {
  const highlights = await source('app/match-highlights.tsx');
  assert.match(highlights, /Sharing unavailable/);
  assert.ok(highlights.indexOf('Sharing unavailable') < highlights.indexOf('let rewardClaimedForShare'));
  for (const path of ['app/clip-viewer.tsx', 'components/HighlightShareModal.tsx']) {
    const content = await source(path);
    assert.match(content, /isAvailableAsync/);
    assert.match(content, /Sharing unavailable/);
    assert.match(content, /expo-file-system\/legacy/);
  }
});

test('native Shop loads and renders its unavailable store without a server address', async () => {
  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const colors = {};
  vm.runInNewContext(ts.transpileModule(await source('constants/colors.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: colors });
  const shop = await source('app/(tabs)/shop.tsx');
  const code = ts.transpileModule(shop, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  for (const platform of ['ios', 'android']) {
    let addressCalls = 0;
    const profile = {
      name: 'Test player', rank: 'Bronze 1', currentSkin: 'classic',
      ownedSkins: ['classic'], ownedThemes: ['default'], currentArenaTheme: 'default',
      coins: 250, extraLivesInventory: 0, ownedRelics: [],
    };
    const native = {
      Platform: { OS: platform }, StyleSheet: { create: styles => styles, absoluteFill: {} },
      useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
      Text: 'Text', View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal',
    };
    const react = {
      createElement: (type, props, ...children) => ({ type: typeof type === 'string' ? type : 'Component', props, children }),
      useState: initial => [initial === 'skins' ? 'store' : typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: current => ({ current }),
      useEffect: effect => { effect(); },
    };
    const fluent = new Proxy(() => fluent, { get: () => fluent });
    const generic = new Proxy({}, { get: () => fluent });
    const modules = {
      react,
      'react-native': native,
      'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, ZoomIn: fluent, FadeInRight: fluent },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
      '@/hooks/useFocusAnimation': { useFocusAnimation: () => ({ opacity: 1 }) },
      '@/hooks/useColors': { useColors: () => new Proxy({}, { get: () => '#16171A' }) },
      '@/constants/colors': colors,
      '@/constants/season': { CURRENT_SEASON: { number: 1, label: 'Season 1' } },
      '@/context/PlayerContext': { SKINS: [{ id: 'classic', color: '#C99A2E', glowColor: '#C99A2E' }], getRankIndex: () => 0, usePlayer: () => ({ profile }) },
      '@/lib/revenuecat': { useRevenueCat: () => ({ available: false, isLoading: false, getPackage: () => null }) },
      '@/utils/api': { apiUrl: () => { addressCalls++; throw new Error('The game server address is not configured.'); } },
    };
    const exports = {};
    vm.runInNewContext(code, {
      exports, require: id => modules[id] ?? generic,
      process: { env: {} }, __DEV__: false,
    });
    const tree = exports.default();
    assert.equal(addressCalls, 0, `${platform} must not resolve a web server address`);
    assert.match(JSON.stringify(tree), /Native purchases are not configured for this build/);
    assert.match(JSON.stringify(tree), /Gameplay remains available/);
  }
});
