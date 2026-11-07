import assert from 'node:assert/strict';
import test from 'node:test';
import { SUPPORT_CONTACT, supportContactUrl } from '../constants/support.ts';

test('support is unavailable without a genuine owner-provided contact', () => {
  for (const contact of [null, '', '   ']) assert.equal(supportContactUrl(contact), null);
  if (SUPPORT_CONTACT !== null) assert.ok(supportContactUrl(SUPPORT_CONTACT));
});

test('a public support email opens a pre-addressed message', () => {
  assert.equal(
    supportContactUrl(' help@example.com '),
    'mailto:help@example.com?subject=GoldRush%20Arena%20support',
  );
});

test('support links accept HTTPS help pages, not unsafe or credential-bearing URLs', () => {
  assert.equal(supportContactUrl('https://example.com/help'), 'https://example.com/help');
  for (const contact of [
    'javascript:alert(1)', 'http://example.com/help', 'not an email',
    'https://username:password@example.com/help', 'help@example.com\nBcc:other@example.com',
  ]) assert.equal(supportContactUrl(contact), null, contact);
});
