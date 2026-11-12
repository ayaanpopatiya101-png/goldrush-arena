// Run against the development workflow, then restart that workflow after READY.
// Credentials stay only in this short-lived process and are never logged.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base='http://localhost:80/api';
const s=await (await fetch(base+'/multiplayer/session',{method:'POST'})).json();
const headers={Authorization:`Bearer ${s.token}`,'Content-Type':'application/json'};
const call=(path,method='GET',body)=>fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
const preset={id:`workshop_${randomUUID()}`,name:'Restart verification',court:{floor:'#23344B',lines:'#EEE9DE',markings:'rings',texture:'grain'},
  hit:{color:'#EDBA3C',shape:'ring',size:16,duration:280},rules:{paddleScale:1,ballSpeed:.75,bounce:'gentle',lives:5,balls:1,maxBalls:3}};
try {
  assert.equal((await call('/cosmetics/workshop','POST',preset)).status,200);
  assert.equal((await call('/cosmetics/workshop/equip','POST',{kind:'court',id:preset.id})).status,200);
  const room=await (await call('/multiplayer/custom','POST',{preset,name:'Restart test',color:'#EDBA3C'})).json();
  assert.equal(room.phase,'waiting');
  console.log('READY_FOR_RESTART: immutable configuration and preset saved');
  const deadline=Date.now()+90000;
  let recovered=false;
  while(Date.now()<deadline){
    await new Promise(r=>setTimeout(r,1500));
    try {
      const response=await call('/multiplayer/current');
      if(!response.ok)continue;
      const next=await response.json();
      if(next.phase!=='void')continue;
      assert.equal(next.id,room.id);assert.deepEqual(next.customPreset,preset);assert.equal(next.configHash,room.configHash);
      const state=await (await call('/cosmetics/workshop')).json();
      assert.equal(state.equippedCourtId,preset.id);assert.deepEqual(state.presets[0],preset);
      assert.equal((await call(`/multiplayer/result/${room.id}`)).status,404);
      recovered=true;break;
    }catch(e){if(e.code==='ERR_ASSERTION')throw e;}
  }
  assert(recovered,'Restart recovery did not appear before timeout');
  console.log('PASS: saved/equipped preset and immutable room configuration survived restart; game explicitly void with no receipt');
} finally {
  await call('/multiplayer/queue','DELETE').catch(()=>{});
  await call(`/cosmetics/workshop/${preset.id}`,'DELETE').catch(()=>{});
  // Retire the dedicated test identity through the existing endpoint.
  await call('/multiplayer/avatar/retire','POST').catch(()=>{});
}
