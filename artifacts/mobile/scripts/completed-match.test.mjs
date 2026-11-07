import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setCompletedMatch, getCompletedMatch, updateCompletedMatch, clearCompletedMatch } from '../store/completedMatch.ts';

const receipt = {
  id: 'fixture', username: 'fixture-player', xpBefore: 0, xpAfter: 34, xpEarned: 34,
  coinsEarned: 12, levelBefore: 1, levelAfter: 1, bonusApplied: false,
  qualifierApplied: false, ceremonySeen: false,
  won: false, position: 4, deflections: 8, goalsAgainst: 5, matchType: 'casual',
};

test('completed-match totals are immutable snapshots, not earned XP added twice', () => {
  clearCompletedMatch();
  setCompletedMatch(receipt);
  receipt.xpAfter = 999;
  assert.equal(getCompletedMatch().xpAfter, 34);
  const copy = getCompletedMatch();
  copy.xpAfter = 500;
  assert.equal(getCompletedMatch().xpAfter, 34);
  clearCompletedMatch();
  assert.equal(getCompletedMatch(), null);
});

test('receipt tracks presentation state without changing rewards', () => {
  setCompletedMatch({ ...receipt, xpAfter: 34 });
  updateCompletedMatch({ ceremonySeen: true, bonusApplied: true });
  assert.equal(getCompletedMatch().ceremonySeen, true);
  assert.equal(getCompletedMatch().xpAfter, 34);
  clearCompletedMatch();
});

test('results use saved XP totals and Gauntlet rejects missing completed rounds', async () => {
  const results = await readFile(new URL('../app/postgame.tsx', import.meta.url), 'utf8');
  assert.match(results, /newXP = completed\?\.xpAfter \?\? profile\.xp/);
  assert.doesNotMatch(results, /newXP = profile\.xp \+ xpEarned/);
  assert.match(results, /newRank\.minXP > previousRank\.minXP/);
  const gauntlet = await readFile(new URL('../app/gauntlet.tsx', import.meta.url), 'utf8');
  assert.match(gauntlet, /state\.lastRoundWon === null/);
});

test('first run and Settings replay use one tutorial and one saved completion flag', async () => {
  const root = await readFile(new URL('../app/_layout.tsx', import.meta.url), 'utf8');
  const replay = await readFile(new URL('../app/onboarding-flow.tsx', import.meta.url), 'utf8');
  const tabs = await readFile(new URL('../app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
  assert.match(root, /!profile\.tutorialComplete/);
  assert.match(replay, /<TutorialOverlay/);
  assert.doesNotMatch(tabs, /AsyncStorage\.getItem\('@onboarding_flow_done'\)/);
  assert.doesNotMatch(root, /<CinematicSplash/);
});
