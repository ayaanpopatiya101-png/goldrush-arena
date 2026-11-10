const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const m=new Module('catalog');
m._compile(ts.transpileModule(fs.readFileSync('lib/goldrush-catalog/src/cosmetics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'catalog.cjs');
const c=m.exports;
test('original finishes preserve IDs and use bounded renderable designs',()=>{
  assert.deepEqual(c.PADDLE_FINISHES.map(p=>p.id),['default','plasma','frost','toxic','void','inferno','chrome','cosmic','season_aurora','season_phantom']);
  assert.equal(new Set(c.PADDLE_FINISHES.map(p=>p.motif)).size,8);
  for(const p of c.PADDLE_FINISHES){
    assert.ok(c.MOTIFS.includes(p.motif));assert.ok(c.TEXTURES.includes(p.texture));
    for(const color of [p.base,p.ink,p.accent])assert.match(color,/^#[a-f0-9]{6}$/i);
    assert.ok(p.density>=2&&p.density<=8);
  }
});
test('bundle savings derive from actual separate prices and exclude owned items',()=>{
  assert.deepEqual(c.cobaltQuote([]),{remaining:['theme:cobalt_court','strike:cobalt_strike'],separate:500,price:200,savings:300});
  assert.equal(c.cobaltQuote(['theme:cobalt_court']).price,80);
  assert.equal(c.cobaltQuote(['strike:cobalt_strike']).price,120);
  assert.equal(c.cobaltQuote(['theme:cobalt_court','strike:cobalt_strike']).price,0);
  assert.equal(c.cosmeticItem('skin:plasma:unexpected'),undefined);
});
