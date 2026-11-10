const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {createServer}=require('node:net');
const {readFileSync}=require('node:fs');
test('browser release serves the real game, assets and deep links without a native-launch page',async()=>{
  const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));
  const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const child=spawn(process.execPath,['artifacts/goldrush-web/scripts/serve-browser.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Browser server did not start')),10000);
      child.stdout.once('data',()=>{clearTimeout(timer);resolve();});
      child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});
    });
    const base=`http://127.0.0.1:${port}`;
    const root=await fetch(base),html=await root.text();
    assert.equal(root.status,200);assert.match(html,/_expo\/static\/js\/web\/entry-/);
    assert.doesNotMatch(html,/BASE_URL_PLACEHOLDER|Scan.*QR|Install Expo Go/);
    const asset=html.match(/src="([^"]+entry-[^"]+\.js)"/)[1];
    const js=await fetch(base+asset,{method:'HEAD'});
    assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
    assert.equal((await fetch(base+'/practice')).status,200);
    assert.equal((await fetch(base+'/missing-bundle.js')).status,404);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/%00')).status,400);
    const manifest=readFileSync('artifacts/mobile/.replit-artifact/artifact.toml','utf8');
    assert.match(manifest,/router = "expo-domain"/);
  }finally{child.kill();}
});
