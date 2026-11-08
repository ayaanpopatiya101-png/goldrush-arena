const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const source = fs.readFileSync('artifacts/api-server/src/lib/arenaSimulation.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = new Module('arenaSimulation'); mod._compile(compiled, 'arenaSimulation.cjs');
const { stepArena, eliminate, finishIfNeeded } = mod.exports;
function room() {
  return { id:'test', phase:'playing', mode:'ranked', variant:'classic', tick:0, nextBall:1, balls:[],
    players: Array.from({length:4}, (_,seat)=>({id:String(seat), seat, isBot:false, connected:true,
      lives:5, place:0, paddle:500, target:500, hits:0, goals:0, seen:1000, nextThink:0})) };
}
test('human and bot paddles have the same bounded speed and reach both ends', () => {
  const r=room(); r.players[0].target=10000; r.players[1].target=10000;
  r.players[1].isBot=true; r.players[1].nextThink=1e9;
  stepArena(r,1000); assert.equal(r.players[0].paddle,512); assert.equal(r.players[1].paddle,512);
  for(let i=0;i<100;i++) stepArena(r,1000);
  assert.equal(r.players[0].paddle,870);
  r.players[0].target=-10000;
  for(let i=0;i<100;i++) stepArena(r,1000);
  assert.equal(r.players[0].paddle,130);
});
test('authority detects hit and missed goal without client reports', () => {
  const r=room(); r.balls=[{id:0,x:500,y:947,vx:0,vy:300}];
  stepArena(r,1000); assert.equal(r.players[0].hits,1); assert.ok(r.balls[0].vy<0);
  r.balls=[{id:1,x:150,y:947,vx:0,vy:300}];
  stepArena(r,1000); assert.equal(r.players[0].lives,4); assert.equal(r.players[0].goals,1);
});
test('reconnect window keeps a seat, timeout eliminates once', () => {
  const r=room(); r.players[0].seen=0;
  stepArena(r,19000); assert.equal(r.players[0].lives,5);
  stepArena(r,20001); assert.equal(r.players[0].lives,0); assert.equal(r.players[0].place,4);
  stepArena(r,20002); assert.equal(r.players[0].place,4);
});
test('results have unique final placings and require a surviving winner', () => {
  const r=room();
  eliminate(r,r.players[2]); eliminate(r,r.players[0]); eliminate(r,r.players[3]);
  finishIfNeeded(r); assert.equal(r.phase,'saving'); assert.equal(r.players[1].place,1);
  assert.deepEqual(r.players.map(p=>p.place).sort(),[1,2,3,4]);
  const empty=room(); empty.players.forEach(p=>eliminate(empty,p)); finishIfNeeded(empty);
  assert.equal(empty.phase,'void');
});
test('duos finishes when the opposite team is eliminated', () => {
  const r=room(); r.variant='duos'; eliminate(r,r.players[1]); eliminate(r,r.players[2]); finishIfNeeded(r);
  assert.equal(r.phase,'saving'); assert.deepEqual(r.players.map(p=>p.place),[1,3,3,1]);
});
test('verified online receipt opens results without URL reward parameters', () => {
  const vm=require('node:vm');
  const postgame=fs.readFileSync('artifacts/mobile/app/postgame.tsx','utf8');
  const guard=postgame.slice(postgame.indexOf('export default function PostGameScreen()'),postgame.indexOf('function PostGameContent()'));
  const js=ts.transpileModule(guard,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS}}).outputText;
  let receipt={username:'probe',xpEarned:150};
  const context={exports:{},React:{createElement:(type,props,...children)=>({type,props,children})},
    usePlayer:()=>({currentUsername:'probe'}),getCompletedMatch:()=>receipt,
    PostGameContent:()=>{},View:'View',Text:'Text',Pressable:'Pressable',palette:{},router:{}};
  vm.runInNewContext(js,context);
  assert.equal(context.exports.default().type,context.PostGameContent);
  receipt=null; assert.equal(context.exports.default().type,'View');
  receipt={username:'another'}; assert.equal(context.exports.default().type,'View');
});
