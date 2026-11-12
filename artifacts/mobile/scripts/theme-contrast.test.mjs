import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Evaluate the real exports so aliases and semantic tokens are tested too.
const src = readFileSync(new URL('../constants/colors.ts', import.meta.url), 'utf8');
const ts = createRequire(import.meta.url)('typescript');
const exported = {};
vm.runInNewContext(ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exported });
const { palette, tactile, PLAYER_COLORS, colorBalance, default: colors } = exported;
const theme = colors.light;

const luminance = h => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

test('screenshot slate arcade roles are used without changing player colours', () => {
  assert.equal(theme.background, '#161F23');
  assert.equal(theme.card, '#233037');
  assert.equal(theme.foreground, '#F2F5F4');
  assert.equal(theme.mutedForeground, '#A9B8BF');
  assert.equal(theme.primary, '#78C93D');
  assert.equal(theme.primaryForeground, '#161F23');
  assert.equal(palette.gold, '#F6CA45');
  assert.equal(PLAYER_COLORS[0], '#F36B3F');
  assert.deepEqual(Array.from(PLAYER_COLORS), ['#F36B3F', '#EDBA3C', '#EEE9DE', '#E3DFD3']);
});

test('dark surfaces retain accessible heading, body and supporting text', () => {
  for (const bg of [theme.background, theme.card, theme.input]) {
    assert.ok(contrast(theme.foreground, bg) >= 7, `primary text on ${bg}`);
    assert.ok(contrast(theme.mutedForeground, bg) >= 4.5, `supporting text on ${bg}`);
  }
});

test('background, panel and action roles keep the intended visual hierarchy', () => {
  assert.equal(colorBalance.main.share, 60);
  assert.equal(colorBalance.secondary.share, 30);
  assert.equal(colorBalance.accent.share, 10);
  assert.equal(colorBalance.main.color, theme.background);
  assert.equal(colorBalance.secondary.color, theme.secondary);
  assert.equal(colorBalance.accent.color, theme.accent);
  assert.equal(theme.secondary, '#233037');
  assert.equal(theme.accent, '#78C93D');
  assert.equal(palette.gold, '#F6CA45');
  assert.ok(contrast(theme.secondaryForeground, theme.secondary) >= 7);
  assert.ok(contrast(theme.accentForeground, theme.accent) >= 4.5);
});

test('green actions, gold rewards and dark court have readable foregrounds', () => {
  for (const [fg, bg, label] of [
    [theme.primaryForeground, theme.primary, 'Play'],
    [theme.primaryForeground, palette.gold, 'gold reward'],
    [tactile.paperInk, tactile.paperPanel, 'panel'],
    [tactile.paperMuted, tactile.paperPanel, 'panel description'],
    [tactile.courtInk, tactile.court, 'court label'],
    [theme.secondaryForeground, theme.secondary, 'secondary section'],
  ]) assert.ok(contrast(fg, bg) >= 4.5, `${label}: ${contrast(fg, bg).toFixed(2)}`);
});

test('every original seat paddle remains visible against the court', () => {
  for (const color of PLAYER_COLORS) {
    assert.ok(contrast(color, tactile.court) >= 3, `paddle ${color} on court`);
  }
});

test('secondary screens cannot keep the old pale supporting-text override', () => {
  for (const page of ['leaderboard', 'shop', 'inventory', 'trophyroad', 'events', 'profile']) {
    const source = readFileSync(new URL(`../app/(tabs)/${page}.tsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /#D1DAC6/i, `${page} still overrides supporting text with the dark-theme colour`);
    if (page === 'leaderboard') {
      assert.doesNotMatch(source, /FadeInRight\.delay/, 'rank data must not remain translucent during staggered entry');
    }
  }
});
