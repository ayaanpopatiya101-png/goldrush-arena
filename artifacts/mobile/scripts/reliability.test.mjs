import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withTimeout } from '../utils/withTimeout.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('startup IO resolves and preserves failures', async () => {
  assert.equal(await withTimeout(Promise.resolve('saved'), 100), 'saved');
  await assert.rejects(withTimeout(Promise.reject(new Error('storage unavailable')), 100), /storage unavailable/);
});

test('startup IO cannot spin forever', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /timed out/);
});

// Source-contract checks complement, not replace, the browser countdown test.
test('lobby owns cancellation and all delayed transitions', async () => {
  const lobby = await source('app/lobby.tsx');
  assert.match(lobby, /useFocusEffect\(useCallback/);
  assert.match(lobby, /delayed\.forEach\(clearTimeout\)/);
  assert.match(lobby, /cancelled \|\| readyScheduled/);
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
