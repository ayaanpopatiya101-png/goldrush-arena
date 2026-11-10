const assert = require('node:assert/strict');
const {createRequire}=require('node:module');
const path=require('node:path');
const sharp=createRequire(path.resolve('artifacts/api-server/package.json'))('sharp');
const base=`https://${process.env.REPLIT_DEV_DOMAIN}/api`;
const uploadUrl=p=>new URL(p,base).href;
async function request(endpoint,token,method='GET',body) {
  const r=await fetch(base+endpoint,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
  return {status:r.status,data};
}
(async()=>{
  const a=(await request('/multiplayer/session',null,'POST')).data;
  const b=(await request('/multiplayer/session',null,'POST')).data;
  assert.equal((await request('/multiplayer/avatar',null)).status,401);
  assert.equal((await request('/multiplayer/avatar/upload',a.token,'POST',{size:100,contentType:'image/svg+xml'})).status,400);
  assert.equal((await request('/multiplayer/avatar/upload',a.token,'POST',{size:5242881,contentType:'image/jpeg'})).status,400);
  const image=await sharp({create:{width:300,height:180,channels:3,background:'#F36B3F'}}).jpeg().toBuffer();
  const pending=await request('/multiplayer/avatar/upload',a.token,'POST',{size:image.length,contentType:'image/jpeg'});
  assert.equal(pending.status,200);
  assert.ok((await fetch(uploadUrl(pending.data.uploadUrl),{method:'PUT',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'image/jpeg'},body:image})).ok);
  assert.equal((await request('/multiplayer/avatar/commit',b.token,'POST',{uploadId:pending.data.id,shared:true})).status,400);
  const committed=await request('/multiplayer/avatar/commit',a.token,'POST',{uploadId:pending.data.id,shared:false});
  assert.equal(committed.status,200);assert.equal(committed.data.shared,false);
  assert.equal((await request('/avatars/'+committed.data.id,null)).status,404);
  const own=await fetch(base+'/multiplayer/avatar/image',{headers:{Authorization:`Bearer ${a.token}`}});
  assert.equal(own.status,200);
  const meta=await sharp(Buffer.from(await own.arrayBuffer())).metadata();
  assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.format,'jpeg');assert.equal(meta.exif,undefined);
  const bad=await request('/multiplayer/avatar/upload',a.token,'POST',{size:20,contentType:'image/jpeg'});
  assert.equal(bad.status,200);
  assert.ok((await fetch(uploadUrl(bad.data.uploadUrl),{method:'PUT',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'image/jpeg'},body:'not an actual image'})).ok);
  assert.equal((await request('/multiplayer/avatar/commit',a.token,'POST',{uploadId:bad.data.id,shared:true})).status,400);
  assert.equal((await request('/multiplayer/avatar',a.token)).data.id,committed.data.id);
  assert.equal((await request('/multiplayer/avatar',b.token,'PATCH',{shared:true,playerId:a.playerId})).data.id,null);
  assert.equal((await request('/avatars/'+committed.data.id,null)).status,404);
  assert.equal((await request('/multiplayer/avatar',a.token,'PATCH',{shared:true})).status,200);
  assert.equal((await fetch(base+'/avatars/'+committed.data.id)).status,200);
  assert.equal((await request('/multiplayer/avatar',a.token,'PATCH',{shared:false})).status,200);
  assert.equal((await fetch(base+'/avatars/'+committed.data.id)).status,404);
  assert.equal((await request('/multiplayer/avatar',a.token,'DELETE')).status,204);
  assert.equal((await request('/multiplayer/avatar',a.token)).data.id,null);
  const huge=await request('/multiplayer/avatar/upload',a.token,'POST',{size:10,contentType:'image/jpeg'});
  assert.equal(huge.status,200);
  assert.equal((await fetch(uploadUrl(huge.data.uploadUrl),{method:'PUT',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'image/jpeg'},body:Buffer.alloc(5242881)})).status,413);
  // No Content-Length: the streaming parser must enforce the same limit.
  const stream=new ReadableStream({start(c){for(let i=0;i<6;i++)c.enqueue(new Uint8Array(1048576));c.close();}});
  assert.equal((await fetch(uploadUrl(huge.data.uploadUrl),{method:'PUT',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'image/jpeg'},body:stream,duplex:'half'})).status,413);
  assert.equal((await request('/multiplayer/avatar/commit',a.token,'POST',{uploadId:huge.data.id,shared:false})).status,400);
  assert.equal((await request('/multiplayer/avatar/retire',a.token,'POST')).status,204);
  assert.equal((await request('/multiplayer/avatar',a.token)).status,401);
  console.log('PASS: ownership, bounded uploads including chunked uncommitted oversized rejection, sanitization, privacy, removal and retired-credential rejection');
})().catch(error=>{console.error(error.message);process.exitCode=1});
