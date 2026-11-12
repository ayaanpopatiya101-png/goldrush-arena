import test from "node:test";
import assert from "node:assert/strict";
import { createPracticeRoom, stepArena, spawnBall, RULES, rulesFor, type WorkshopPreset } from "@workspace/goldrush-catalog/arenaSimulation";
import { workshopPresetSchema, workshopAssistSchema, promptSafe, validateProposal } from "../src/lib/workshopValidation.js";
const preset:WorkshopPreset={id:'workshop_00000000-0000-4000-8000-000000000001',name:'Test court',
  court:{floor:'#23344B',lines:'#EEE9DE',markings:'classic',texture:'flat'},
  hit:{color:'#EDBA3C',shape:'ring',size:16,duration:280},
  rules:{paddleScale:1,ballSpeed:1,bounce:'standard',lives:5,balls:1,maxBalls:8}};
const clone=()=>JSON.parse(JSON.stringify(preset)) as WorkshopPreset;
test("strict preset and AI boundaries reject scripts, invalid numbers and incompatible rules",()=>{
  assert(workshopPresetSchema.safeParse(preset).success);
  for(const bad of [
    {...preset,script:'eval(1)'},{...preset,rules:{...preset.rules,script:'x'}},
    {...preset,rules:{...preset.rules,balls:4,maxBalls:1}},
    {...preset,rules:{...preset.rules,lives:1.2}},
    {...preset,rules:{...preset.rules,ballSpeed:Infinity}},
    {...preset,hit:{...preset.hit,size:29}},
    {...preset,court:{...preset.court,mesh:'sphere'}},
    {...preset,name:'   '},
  ])assert.equal(workshopPresetSchema.safeParse(bad).success,false);
  assert.equal(workshopAssistSchema.safeParse({prompt:'x'.repeat(601),current:preset,history:[]}).success,false);
  assert.equal(workshopAssistSchema.safeParse({prompt:'style',current:preset,history:Array(7).fill({role:'user',text:'x'})}).success,false);
  for(const text of ['call +1 (202) 555-0177','data:image/png;base64,a','https://example.com/photo','me@example.com'])assert.equal(promptSafe(text),false);
  assert(promptSafe('Make a quiet stone court with slower balls'));
  assert.throws(()=>validateProposal({proposal:{...preset,id:'someone-else'},explanation:'ok',question:''},preset.id));
  assert.throws(()=>validateProposal({proposal:preset,explanation:'ok',question:'',award:100},preset.id));
  assert.throws(()=>validateProposal({proposal:{...preset,rules:{...preset.rules,lives:999}},explanation:'ok',question:''},preset.id));
  assert.equal(validateProposal({proposal:preset,explanation:'Slower balls are easier to intercept.',question:'Do you want longer rallies?'},preset.id).proposal.id,preset.id);
});
test("cosmetics never change shared physics; standard presets and timings stay unchanged",()=>{
  const a=createPracticeRoom(preset), b=createPracticeRoom({...clone(),court:{...preset.court,floor:'#112233',texture:'beveled'},hit:{...preset.hit,shape:'burst'}});
  a.customPreset=undefined;b.customPreset=undefined;
  a.balls=[];b.balls=[];spawnBall(a,()=>.1);spawnBall(b,()=>.1);
  a.players.forEach(p=>{p.isBot=true;p.nextThink=Infinity;});b.players.forEach(p=>{p.isBot=true;p.nextThink=Infinity;});
  for(let i=0;i<400;i++){stepArena(a,1000,()=>.1);stepArena(b,1000,()=>.1);}
  assert.deepEqual(a.balls,b.balls);assert.deepEqual(a.players.map(p=>[p.lives,p.hits,p.paddle]),b.players.map(p=>[p.lives,p.hits,p.paddle]));
  assert.equal(RULES.classic!.speed,300);assert.equal(RULES.classic!.spawn,10);assert.equal(RULES.classic!.lives,5);
  const r=createPracticeRoom(preset);r.customPreset=undefined;r.tick=419;r.balls=[];r.players.forEach(p=>{p.isBot=true;p.nextThink=Infinity;});
  stepArena(r,1000,()=>.1);assert.equal(r.balls.length,1);
  r.tick=1019;r.balls=[];stepArena(r,1000,()=>.1);assert.equal(r.balls.length,1);
  for(const [variant,expected] of Object.entries(RULES)){r.variant=variant;assert.equal(rulesFor(r).lives,expected.lives);assert.equal(rulesFor(r).speed,expected.speed);}
});
test("custom paddle bounds, hitboxes, bounce and ball limits are real engine controls",()=>{
  const p=clone();p.rules={paddleScale:.8,ballSpeed:1.25,bounce:'gentle',lives:2,balls:2,maxBalls:2};
  const r=createPracticeRoom(p);
  assert.equal(r.balls.length,2);assert.equal(r.players[0]!.lives,2);
  r.players.forEach(v=>{v.isBot=true;v.nextThink=Infinity;v.target=500;});
  r.balls=[{id:0,x:500,y:947,vx:0,vy:375}];
  stepArena(r,1000,()=>.1);assert.equal(r.players[0]!.hits,1);assert.equal(Math.hypot(r.balls[0]!.vx,r.balls[0]!.vy),375);
  r.balls=[{id:0,x:590,y:947,vx:0,vy:375}];
  stepArena(r,1000,()=>.1);assert.equal(r.players[0]!.goals,1); // outside 72+12 radius
  r.players[0]!.target=-999;for(let i=0;i<50;i++)stepArena(r,1000,()=>.1);
  assert.equal(r.players[0]!.paddle,112);
  r.tick=419;r.balls=[{id:1,x:500,y:500,vx:0,vy:1},{id:2,x:500,y:500,vx:0,vy:1}];
  stepArena(r,1000,()=>.1);assert.equal(r.balls.length,2);
});
