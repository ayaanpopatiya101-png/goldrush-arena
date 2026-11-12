import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { db, pool, arenaPlayers, arenaResults, cosmeticAiUsage } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { LiveRoom, WorkshopPreset, PlayerSession } from "@workspace/api-zod";

const base="http://localhost:80/api";
const sessions:PlayerSession[]=[];
const sockets:WebSocket[]=[];
const preset:WorkshopPreset={id:`workshop_${randomUUID()}`,name:'Private test court',
  court:{floor:'#23344B',lines:'#EEE9DE',markings:'lanes',texture:'beveled'},
  hit:{color:'#EDBA3C',shape:'diamond',size:20,duration:250},
  rules:{paddleScale:.8,ballSpeed:1.25,bounce:'lively',lives:1,balls:4,maxBalls:4}};
async function session(){
  const r=await fetch(`${base}/multiplayer/session`,{method:'POST'});assert.equal(r.status,200);
  const s=await r.json() as PlayerSession;sessions.push(s);return s;
}
async function call(s:PlayerSession,path:string,method='GET',data?:unknown) {
  return fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${s.token}`,'Content-Type':'application/json'},
    ...(data?{body:JSON.stringify(data)}:{})});
}
async function json(s:PlayerSession,path:string,method='GET',data?:unknown):Promise<any> {
  const r=await call(s,path,method,data);
  assert.equal(r.status,200,`${method} ${path}: ${await r.clone().text()}`);
  return r.json();
}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function connect(s:PlayerSession,onSnapshot:(r:LiveRoom)=>void) {
  const ws=new WebSocket("ws://localhost:80/api");sockets.push(ws);
  await new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("Socket auth timeout")),10000);
    ws.once('error',reject);
    ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token:s.token})));
    ws.on('message',raw=>{
      const m=JSON.parse(raw.toString());
      if(m.type==='ready'){clearTimeout(timeout);resolve();}
      if(m.type==='snapshot')onSnapshot(m.room);
    });
  });
  return ws;
}
after(async()=>{
  sockets.forEach(ws=>ws.close());
  for(const s of sessions){
    await call(s,'/multiplayer/queue','DELETE').catch(()=>{});
    await db.delete(arenaResults).where(eq(arenaResults.playerId,s.playerId));
    await db.delete(arenaPlayers).where(eq(arenaPlayers.id,s.playerId));
    await db.delete(cosmeticAiUsage).where(eq(cosmeticAiUsage.id,`player:${s.playerId}:${new Date().toISOString().slice(0,10)}`));
  }
  await pool.end();
});
test("private presets preserve legacy equipment, isolate owners and reject abuse",async()=>{
  assert.notEqual(process.env.NODE_ENV,'production');
  const a=await session(),b=await session();
  assert.equal((await call({token:'invalid',playerId:''},'/cosmetics/workshop')).status,401);
  const legacy={owned:['theme:cobalt_court','strike:brass_strike'],designs:[],equippedSkin:'legacy',equippedTheme:'cobalt_court',equippedStrike:'brass_strike'};
  await db.update(arenaPlayers).set({cosmetics:legacy,earnedCoins:123}).where(eq(arenaPlayers.id,a.playerId));
  const save=await json(a,'/cosmetics/workshop','POST',preset);
  assert.equal(save.presets.length,1);
  await json(a,'/cosmetics/workshop/equip','POST',{kind:'court',id:preset.id});
  await json(a,'/cosmetics/workshop/equip','POST',{kind:'hit',id:preset.id});
  assert.equal((await json(b,'/cosmetics/workshop')).presets.length,0);
  assert.equal((await call(b,'/cosmetics/workshop/equip','POST',{kind:'court',id:preset.id})).status,403);
  assert.equal((await call(b,'/cosmetics/workshop','POST',{...preset,name:'Not mine'})).status,403);
  assert.equal((await call(b,`/cosmetics/workshop/${preset.id}`,'DELETE')).status,404);
  const edited={...preset,name:'Edited private test'};
  await json(a,'/cosmetics/workshop','POST',edited);
  assert.equal((await json(a,'/cosmetics/workshop')).presets[0].name,edited.name);
  await json(a,'/cosmetics/designs','POST',{id:`custom_${randomUUID()}`,name:'Existing plate',base:'#23344B',ink:'#EEE9DE',accent:'#EDBA3C',motif:'chevron',texture:'none',density:4});
  assert.equal((await json(a,'/cosmetics/workshop')).equippedCourtId,preset.id);
  const stored=await json(a,'/cosmetics');
  assert.deepEqual(stored.owned,legacy.owned);assert.equal(stored.balance,123);assert.equal(stored.equippedTheme,legacy.equippedTheme);
  for(const bad of [{...preset,rules:{...preset.rules,balls:4,maxBalls:1}},{...preset,court:{...preset.court,script:'eval(1)'}},{...preset,rules:{...preset.rules,lives:1.5}}])
    assert.equal((await call(a,'/cosmetics/workshop','POST',bad)).status,400);
  assert.equal((await call(a,'/openai/workshop','POST',{prompt:'Call +1 (202) 555-0177',current:preset,history:[]})).status,400);
  assert.equal((await call(a,'/openai/workshop','POST',{prompt:'x'.repeat(601),current:preset,history:[]})).status,400);
  // Both assistants use the same persisted allowance. This check never calls AI.
  const budgetId=`player:${a.playerId}:${new Date().toISOString().slice(0,10)}`;
  await db.insert(cosmeticAiUsage).values({id:budgetId,count:10});
  assert.equal((await call(a,'/openai/workshop','POST',{prompt:'Quiet stone court',current:preset,history:[]})).status,429);
  assert.equal((await call(a,'/openai/paddle-design','POST',{prompt:'Quiet stone plate',current:{id:`custom_${randomUUID()}`,name:'Test',base:'#23344B',ink:'#EEE9DE',accent:'#EDBA3C',motif:'chevron',texture:'none',density:4}})).status,429);
  assert.equal((await call(a,'/multiplayer/queue','POST',{name:'test',color:'#23344B',mode:'ranked',variant:'classic',latency:0,customPreset:preset})).status,400);
  const removed=await json(a,`/cosmetics/workshop/${preset.id}`,'DELETE');
  assert.equal(removed.equippedCourtId,null);assert.equal(removed.equippedHitId,null);
  assert.equal((await json(a,'/cosmetics')).equippedTheme,legacy.equippedTheme);
});
test("four actual socket clients agree to immutable custom rules; no public queue mixing or rewards", {timeout:90000},async()=>{
  const players=await Promise.all(Array.from({length:4},()=>session()));
  const host=players[0]!;
  const roomPreset={...preset,rules:{...preset.rules,lives:12,balls:1,maxBalls:1,ballSpeed:.75 as const}};
  let room=await json(host,'/multiplayer/custom','POST',{preset:roomPreset,name:'Host',color:'#F36B3F'}) as LiveRoom;
  const id=room.id,hash=room.configHash;
  let latest:LiveRoom=room;
  const views=new Map<string,LiveRoom>();
  const hostSocket=await connect(host,r=>{latest=r;views.set(host.playerId,r);});
  assert.equal((await call(host,'/multiplayer/queue','POST',{name:'Host',color:'#23344B',mode:'ranked',variant:'classic',latency:0})).status,409);
  for(const [i,p] of players.slice(1).entries()){
    room=await json(p,'/multiplayer/custom/join','POST',{code:room.customCode,name:`Player${i}`,color:'#EDBA3C'});
    await connect(p,r=>{views.set(p.playerId,r);});
  }
  await sleep(5500);
  assert.equal(latest.phase,'waiting');assert.equal(latest.players.length,4);
  assert(latest.players.every(p=>!p.isBot));
  assert.equal((await call(host,'/multiplayer/custom/agree','POST',{roomId:id,configHash:'bad'})).status,409);
  for(const p of players.slice(0,3))await json(p,'/multiplayer/custom/agree','POST',{roomId:id,configHash:hash});
  await sleep(300);
  assert.equal(latest.phase,'waiting');
  // A fifth standard client must not be matched into the code-only room.
  const standard=await session();
  const standardRoom=await json(standard,'/multiplayer/queue','POST',{name:'Standard',color:'#23344B',mode:'casual',variant:'classic',latency:0});
  assert.notEqual(standardRoom.id,id);assert.equal(standardRoom.customPreset,undefined);
  await call(standard,'/multiplayer/queue','DELETE');
  // Editing a saved preset cannot mutate the room's deep-frozen copy.
  await json(host,'/cosmetics/workshop','POST',{...preset,rules:{...preset.rules,lives:1}});
  assert.equal((await json(host,'/multiplayer/current')).customPreset.rules.lives,12);
  assert.equal((await call(host,'/multiplayer/custom/agree','POST',{roomId:id,configHash:hash,preset:{...preset,rules:{lives:999}}})).status,400);
  await json(players[3]!,'/multiplayer/custom/agree','POST',{roomId:id,configHash:hash});
  const ping=setInterval(()=>sockets.forEach(ws=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'ping'}));}),2000);
  try {
    const started=Date.now()+10000;
    while(Date.now()<started && String(latest.phase)!=='playing')await sleep(50);
    assert.equal(String(latest.phase),'playing','Real private simulation must start');
    // These are four real synchronized clients. Intent moves one authoritative
    // paddle, and every independent client must observe the same bounded result.
    hostSocket.send(JSON.stringify({type:'input',position:-999,seq:1,lives:999,winner:host.playerId}));
    await sleep(1000);
    for(const p of players){
      const view=views.get(p.playerId);
      assert(view && view.id===id);
      assert.equal(view.players.find(v=>v.id===host.playerId)!.paddle,112);
      assert(view.balls.length===1);
      assert(view.players.every(v=>v.lives<=12),'Clients cannot inject lives');
    }
    // Forfeit the other seats only after synchronized input was observed.
    for(const p of players.slice(1))assert.equal((await call(p,'/multiplayer/queue','DELETE')).status,204);
    const until=Date.now()+10000;
    while(Date.now()<until && String(latest.phase)!=='finished' && String(latest.phase)!=='void') {
      await sleep(100);
    }
    assert.equal(latest.phase,'finished');
    assert.equal(latest.configHash,hash);
    assert.equal(latest.customPreset!.rules.lives,12);
    for(const p of players){
      assert.equal((await call(p,`/multiplayer/result/${id}`)).status,404);
      const [row]=await db.select().from(arenaPlayers).where(eq(arenaPlayers.id,p.playerId));
      assert.equal(row!.earnedCoins,0);assert.equal(row!.earnedXP,0);assert.equal(row!.rating,1000);assert.deepEqual(row!.competitive,{});
      if(p.playerId===host.playerId)assert((row!.cosmetics.lastCustomRoom as any)?.customPreset);
    }
    assert.equal((await db.select().from(arenaResults).where(eq(arenaResults.matchId,id))).length,0);
  } finally {clearInterval(ping);}
});
