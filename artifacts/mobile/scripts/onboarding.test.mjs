import assert from 'node:assert/strict';
import test from 'node:test';
import { findSavedPlayer, playerCreationError, validatePlayerName } from '../utils/onboarding.ts';

test('onboarding accepts only valid device-local names at the existing boundaries', () => {
  for (const value of ['ab', 'Riley_42', 'a'.repeat(16), '  Riley  ']) {
    assert.equal(validatePlayerName(value), null);
  }
  for (const value of ['', ' ', 'a', 'a'.repeat(17), 'two names', 'riley@example.com', '../riley']) {
    assert.equal(typeof validatePlayerName(value), 'string');
  }
});

test('new-player setup cannot silently reopen an existing save', () => {
  const players = [{ username: 'Riley', avatarColor: 'original' }];
  for (const value of ['Riley', 'riley', '  RILEY  ']) {
    assert.match(playerCreationError(value, players), /already exists/);
  }
  assert.equal(playerCreationError('NewPlayer', players), null);
  assert.equal(players[0].avatarColor, 'original');
});

test('saved-player lookup returns original metadata and never invents an account', () => {
  const riley = { username: 'Riley', avatarColor: 'original', avatarEmoji: 'stored-id' };
  assert.equal(findSavedPlayer('  RILEY ', [riley]), riley);
  assert.equal(findSavedPlayer('Missing', [riley]), undefined);
  assert.equal(findSavedPlayer('', []), undefined);
});
