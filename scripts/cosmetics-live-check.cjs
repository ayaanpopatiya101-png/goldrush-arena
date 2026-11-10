// Development-only integration fixtures. Never credits an existing player.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createRequire}=require('node:module');
const path=require('node:path');
if(process.env.REPLIT_DEPLOYMENT)throw new Error('Development checks only');
const {Pool}=createRequire(path.resolve('lib/db/package.json'))('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const base=`https://${process.env.REPLIT_DEV_DOMAIN}/api`;
async function call(route,token,method='GET',body){
  const res=await fetch(base+route,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
}
const ids=[];
(async()=>{
  const a=(await call('/multiplayer/session',null,'POST')).data;ids.push(a.playerId);
  const b=(await call('/multiplayer/session',null,'POST')).data;ids.push(b.playerId);
  assert.equal((await call('/cosmetics')).status,401);
  assert.equal((await call('/cosmetics/purchase',a.token,'POST',{id:'cobalt_set',requestId:randomUUID()})).status,409);
  await pool.query('UPDATE arena_players SET earned_coins=500 WHERE id=$1',[a.playerId]);
  const ticket=randomUUID();
  const buys=await Promise.all([1,2].map(()=>call('/cosmetics/purchase',a.token,'POST',{id:'theme:cobalt_court',requestId:ticket})));
  assert.ok(buys.every(r=>r.status===200&&r.data.balance===200));
  let state=(await call('/cosmetics',a.token)).data;
  assert.equal(state.owned.filter(i=>i==='theme:cobalt_court').length,1);
  assert.equal((await call('/cosmetics/purchase',a.token,'POST',{id:'strike:cobalt_strike',requestId:ticket})).status,409);
  const bundle=await call('/cosmetics/purchase',a.token,'POST',{id:'cobalt_set',requestId:randomUUID()});
  assert.equal(bundle.status,200);assert.equal(bundle.data.balance,120);
  const owned=await call('/cosmetics/purchase',a.token,'POST',{id:'cobalt_set',requestId:randomUUID()});
  assert.equal(owned.data.balance,120);
  assert.equal((await call('/cosmetics/purchase',a.token,'POST',{id:'skin:season_aurora',requestId:randomUUID()})).status,400);
  const design={id:'custom_'+randomUUID(),name:'Test Etching',motif:'circuit',base:'#23344B',ink:'#EEE9DE',accent:'#EDBA3C',density:4,texture:'etched'};
  assert.equal((await call('/cosmetics/designs',a.token,'POST',{...design,svg:'<script/>'})).status,400);
  assert.equal((await call('/cosmetics/designs',a.token,'POST',design)).status,200);
  assert.equal((await call('/cosmetics/equip',b.token,'POST',{kind:'skin',id:design.id})).status,403);
  assert.equal((await call('/cosmetics/equip',a.token,'POST',{kind:'skin',id:design.id})).data.equippedSkin,design.id);
  assert.equal((await call('/cosmetics',a.token)).data.designs[0].name,'Test Etching');
  assert.equal((await call('/cosmetics/designs/'+design.id,a.token,'DELETE')).data.equippedSkin,'default');
  const extra=await call('/cosmetics/purchase',a.token,'POST',{id:'skin:default',requestId:randomUUID()});
  assert.equal(extra.status,200);
  assert.equal((await call('/cosmetics/offer',a.token,'POST',{action:'shown'})).status,200);
  assert.equal((await call('/cosmetics/offer',a.token,'POST',{action:'shown'})).status,409);
  assert.equal((await call('/cosmetics/offer',a.token,'POST',{action:'dismissed'})).data.offerDismissed,true);
  if(process.argv.includes('--ai')){
    const ai=await call('/openai/paddle-design',a.token,'POST',{prompt:'Make an original navy and gold circuit paddle with etched marks.',current:design});
    assert.equal(ai.status,200,ai.data.error);
    assert.equal(ai.data.design.id,design.id);
    assert.ok(ai.data.explanation.length<=300);
    console.log('PASS: real AI returned validated renderable parameters');
  }
  console.log('PASS: atomic concurrent purchases, insufficient funds, idempotency, owned exclusions, 500/200 bundle pricing, design ownership/CRUD, offer limits');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  for(const id of ids){
    await pool.query('DELETE FROM cosmetic_receipts WHERE player_id=$1',[id]);
    await pool.query('DELETE FROM cosmetic_ai_usage WHERE id LIKE $1',[`player:${id}:%`]);
    await pool.query('DELETE FROM arena_players WHERE id=$1',[id]);
  }
  await pool.end();
});
