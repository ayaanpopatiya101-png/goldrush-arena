import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
function walk(d, out = []) {
  for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p, out) : p.endsWith('.tsx') && out.push(p); }
  return out;
}
const files = [...walk(join(root, 'app')), ...walk(join(root, 'components'))];
// Cosmetic previews / legacy-color remappers allowed to keep old hexes.
const ALLOW = ['RelicCharacter.tsx', 'ui/Flat.tsx', 'inventory.tsx'];

test('display font is the reference bold sans, not condensed', () => {
  const t = readFileSync(join(root, 'constants/typography.ts'), 'utf8');
  assert.match(t, /display: 'SourceSans3_700Bold'/);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /'BarlowCondensed_/, f);
});

test('no superseded moss/cream/brass surface hexes in UI', () => {
  const banned = /#(213D39|14231F|294C44|20372F|EDE3CC|D7A83B|4E9A2A)\b/i;
  for (const f of files) {
    if (ALLOW.some(a => f.endsWith(a))) continue;
    assert.doesNotMatch(readFileSync(f, 'utf8'), banned, f);
  }
});

test('section labels have no decorative rule line', () => {
  assert.doesNotMatch(readFileSync(join(root, 'components/ui/Primitives.tsx'), 'utf8'), /sectionRule/);
});
