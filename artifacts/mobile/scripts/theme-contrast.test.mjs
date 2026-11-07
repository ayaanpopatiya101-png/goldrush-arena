import { test } from 'node:test'; import assert from 'node:assert'; import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../constants/colors.ts', import.meta.url), 'utf8');
const hex = k => src.match(new RegExp(k + ":\\s*'(#[0-9A-Fa-f]{6})'"))[1];
const L = h => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
test('text contrast AA', () => {
  for (const bg of ['ink','graphite','graphite2']) { assert.ok(cr(hex('paper'),hex(bg))>=7); assert.ok(cr(hex('muted'),hex(bg))>=4.5, bg); }
  assert.ok(cr(hex('ochreInk'),hex('ochre'))>=7);
  assert.ok(!/#(FFFFFF|000000)/i.test(src));
});
