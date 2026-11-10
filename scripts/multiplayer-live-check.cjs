// Integration probe: only temporary guest identities, never existing player saves.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire(require('node:path').resolve('artifacts/api-server/package.json'));
const WebSocket = req('ws');
const base = process.env.ARENA_TEST_BASE || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function request(path, token, method='GET', body) {
  const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const data=response.status===204?null:await response.json();
  return {status:response.status,data};
}
async function client(session) {
  const state={room:null, snapshots:new Map(), ready:false, countdowns:new Set()};
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/api');
  ws.on('open',()=>ws.send(JSON.stringify({type:'auth',token:session.token})));
  ws.on('message',raw=>{
    const msg=JSON.parse(raw.toString());
    if(msg.type==='ready') state.ready=true;
    if(msg.type==='snapshot') {
      state.room=msg.room; state.snapshots.set(msg.room.tick,JSON.stringify({...msg.room,serverTime:0}));
      if(msg.room.phase==='countdown') state.countdowns.add(Math.ceil((msg.room.startAt-msg.room.serverTime)/1000));
    }
  });
  const ping=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'ping'}));},1000);
  return {ws,state,close(){clearInterval(ping);ws.close();}};
}
async function waitFor(fn, limit=15000) {
  const start=Date.now();
  while(!fn()){if(Date.now()-start>limit)throw new Error('Timed out waiting for live state');await sleep(100);}
}
(async()=>{
  const clients=[]; const sessions=[];
  try {
    assert.equal((await request('/multiplayer/current')).status,401);
    for(let i=0;i<4;i++) sessions.push((await request('/multiplayer/session',null,'POST')).data);
    const partyCode='T'+Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*31)]).join('');
    for(let i=0;i<4;i++) {
      const s=sessions[i];
      const p=await request('/party/'+(i?'join':'create'),s.token,'POST',{partyCode,playerId:'forged',playerName:'Probe '+i});
      assert.equal(p.status,200); assert.ok(p.data.members.some(m=>m.playerId===s.playerId));
    }
    assert.equal((await request(`/party/${partyCode}/launch`,sessions[1].token,'PATCH',{playerId:sessions[0].playerId,matchType:'ranked',variant:'classic'})).status,403);
    const roomIds=[];
    for(const [i,s] of sessions.entries()){
      const joined=await request('/multiplayer/queue',s.token,'POST',{name:'Probe '+i,color:'#F36B3F',mode:'ranked',variant:'classic',latency:50,partyCode});
      assert.equal(joined.status,200); roomIds.push(joined.data.id); clients.push(await client(s));
    }
    assert.equal(new Set(roomIds).size,1);
    await waitFor(()=>clients.every(c=>c.state.room?.phase==='playing'));
    assert.deepEqual([...clients[0].state.countdowns].filter(n=>n>0).sort(),[1,2,3]);
    assert.ok(clients.every(c=>c.state.room.players.every(p=>!p.isBot)));
    await sleep(600);
    const common=[...clients[0].state.snapshots.keys()].find(t=>t>0&&clients.every(c=>c.state.snapshots.has(t)));
    assert.ok(common); assert.equal(new Set(clients.map(c=>c.state.snapshots.get(common))).size,1);
    clients[0].ws.send(JSON.stringify({type:'input',position:870,seq:1,playerId:sessions[1].playerId}));
    await waitFor(()=>clients[1].state.room.players[0].paddle>800);
    assert.equal(clients[1].state.room.players[1].paddle,500);
    clients[0].close(); await sleep(300); clients[0]=await client(sessions[0]);
    await waitFor(()=>clients[0].state.room?.players[0].connected);
    assert.equal(clients[0].state.room.id,roomIds[0]);
    // End via authorized forfeits, not injected winner/result data.
    assert.equal((await request('/multiplayer/queue',sessions[0].token,'DELETE')).status,204);
    assert.equal((await request('/multiplayer/current',sessions[0].token)).status,404);
    const requeued=await request('/multiplayer/queue',sessions[0].token,'POST',{name:'Requeued player',color:'#F36B3F',mode:'ranked',variant:'blitz',latency:50});
    assert.equal(requeued.status,200);
    assert.notEqual(requeued.data.id,roomIds[0]);
    assert.equal(requeued.data.phase,'waiting');
    for(let i=1;i<3;i++) assert.equal((await request('/multiplayer/queue',sessions[i].token,'DELETE')).status,204);
    await waitFor(()=>clients[3].state.room?.phase==='finished');
    const first=await request('/multiplayer/result/'+roomIds[0],sessions[3].token);
    const repeat=await request('/multiplayer/result/'+roomIds[0],sessions[3].token);
    assert.equal(first.status,200); assert.equal(first.data.won,true); assert.equal(first.data.humanCount,4);
    assert.deepEqual(first.data,repeat.data);
    const skill=await request('/multiplayer/competition',sessions[3].token);
    assert.equal(skill.status,200);assert.equal(skill.data.current.games,1);assert.equal(skill.data.current.placed,false);
    assert.equal((await request('/multiplayer/competition',sessions[3].token)).data.current.games,1);
    const forfeited=await request('/multiplayer/result/'+roomIds[0],sessions[0].token);
    assert.equal(forfeited.status,200);
    assert.equal(forfeited.data.position,4);
    assert.equal((await request('/multiplayer/current',sessions[0].token)).data.id,requeued.data.id);
    console.log('PASS: forfeit detaches immediately, a different queue opens, and the old verified receipt remains retrievable');
    assert.equal((await request('/multiplayer/result/'+roomIds[0],null)).status,401);
    console.log('PASS: four synchronized clients, authenticated party membership/leader, bounded owned input, reconnect, authoritative finish and repeat-safe receipt');
    // A separate queue must not silently turn ranked into a bot match.
    for(const s of sessions) await request('/multiplayer/queue',s.token,'DELETE');
    for(const c of clients)c.close();
    clients.length=0;
    const ranked=await request('/multiplayer/queue',sessions[0].token,'POST',{name:'Ranked probe',color:'#F36B3F',mode:'ranked',variant:'classic',latency:50});
    const casual=await request('/multiplayer/queue',sessions[1].token,'POST',{name:'Casual probe',color:'#EDBA3C',mode:'casual',variant:'rally_race',latency:50});
    assert.notEqual(ranked.data.id,casual.data.id);
    clients.push(await client(sessions[0]),await client(sessions[1]));
    await waitFor(()=>clients[1].state.room?.phase==='playing',20000);
    assert.equal(clients[0].state.room.phase,'waiting');
    assert.equal(clients[0].state.room.players.length,1);
    assert.equal(clients[1].state.room.players.filter(p=>p.isBot).length,3);
    console.log('PASS: ranked remains human-only; casual waits before adding three disclosed AI seats');
    if(process.argv.includes('--rally-check')) {
      await waitFor(()=>['finished','void'].includes(clients[1].state.room?.phase),75000);
      assert.equal((await request('/multiplayer/competition',sessions[1].token)).data.current.games,1);
      console.log('PASS: live 60-second Rally Race resolves without advancing competitive placements');
    }
    if(process.argv.includes('--restart-check')) {
      console.log('READY_FOR_RESTART: waiting for a deliberate test-server restart');
      let interrupted=false;
      for(let i=0;i<90;i++){
        await sleep(1000);
        try {
          const response=await request('/multiplayer/current',sessions[0].token);
          if(response.status===404){interrupted=true;break;}
        }catch{}
      }
      assert.ok(interrupted,'Server restart was not observed within 90 seconds');
      assert.equal((await request('/multiplayer/result/'+ranked.data.id,sessions[0].token)).status,404);
      const restored=await request('/multiplayer/result/'+roomIds[0],sessions[3].token);
      assert.deepEqual(restored.data,first.data);
      console.log('PASS: interrupted room has no fabricated receipt; identity and completed receipt survive restart');
    }
  } finally {
    for(const c of clients)c.close();
    for(const s of sessions)await request('/multiplayer/queue',s.token,'DELETE').catch(()=>{});
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
