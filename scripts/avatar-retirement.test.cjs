const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
function load(file,mocks){
  const m=new Module(file);
  m.require=name=>{if(name in mocks)return mocks[name];throw new Error(name)};
  m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  return m.exports;
}
test('delete/recreate same name gets a fresh credential and clears private cache',async()=>{
  const values=new Map();let sequence=0;
  const originalFetch=global.fetch;
  global.fetch=async()=>({ok:true,status:204,blob:async()=>new Blob(['image'])});
  try{
    const session=load('artifacts/mobile/utils/arenaSession.ts',{
      '@react-native-async-storage/async-storage':{getItem:async()=>null},
      '@workspace/api-client-react':{setBaseUrl:()=>{},createPlayerSession:async()=>({playerId:`id${++sequence}`,token:String(sequence).padStart(64,'0')})},
      './api':{getApiBase:()=> 'http://test'},
      './arenaCredentials':{readCredential:async k=>values.get(k),writeCredential:async(k,v)=>values.set(k,v),removeCredential:async k=>values.delete(k)},
    });
    const first=await session.getArenaSession('SameName');
    global.fetch=async()=>({ok:false,status:503});
    await assert.rejects(session.retireArenaProfile('SameName'));
    assert.equal(values.size,1);
    assert.equal((await session.getArenaSession('SameName')).playerId,first.playerId);
    global.fetch=async()=>({ok:true,status:204,blob:async()=>new Blob(['image'])});
    await session.retireArenaProfile('SameName');
    assert.equal(values.size,0);
    const second=await session.getArenaSession('SameName');
    assert.notEqual(second.playerId,first.playerId);
    assert.notEqual(second.token,first.token);
    const cache=load('artifacts/mobile/hooks/useAvatar.ts',{
      react:{useCallback:f=>f,useEffect:()=>{},useSyncExternalStore:(_subscribe,snapshot)=>snapshot()},
      '@workspace/api-client-react':{getAvatar:async()=>({id:'private-old',shared:false})},
      '@/utils/arenaSession':{arenaRequestOptions:async()=>({headers:{}})},
      '@/utils/api':{apiUrl:p=>p},
      '@/utils/avatarImage':{blobToDataUri:async()=> 'data:old-private-photo'},
    });
    await cache.useAvatar('SameName').reload();
    assert.equal(cache.useAvatar('SameName').uri,'data:old-private-photo');
    cache.clearAvatarState('SameName');
    assert.equal(cache.useAvatar('SameName').uri,null);
    assert.equal(cache.useAvatar('SameName').info,null);
  } finally {global.fetch=originalFetch;}
});
test('scheduled staging cleanup does not require the original guest',async()=>{
  const removed=[];const deleted=[];
  const rows=[{id:'a',playerId:'gone-a',objectPath:'a'},{id:'b',playerId:'gone-b',objectPath:'b'}];
  const router={get(){},post(){},put(){},patch(){},delete(){},use(){}};
  const api=load('artifacts/api-server/src/routes/avatars.ts',{
    express:{Router:()=>router,raw:()=>()=>{}},
    'node:crypto':require('node:crypto'),sharp:()=>{},
    '@workspace/db':{db:{
      select:()=>({from:()=>({where:()=>({limit:async()=>rows})})}),
      delete:()=>({where:async expression=>deleted.push(expression.value)}),
    },avatarUploads:{createdAt:'createdAt',id:'id'},arenaPlayers:{}},
    'drizzle-orm':{lt:(_k,date)=>{assert.ok(Date.now()-date.getTime()>=1200000);return{}},eq:(key,value)=>({key,value}),and:()=>({})},
    '../lib/arenaIdentity.js':{limited:()=>false,requireArenaIdentity:()=>{}},
    '../lib/objectStorage.js':{ObjectStorageService:class{async getObjectEntityFile(p){return{delete:async()=>removed.push(p)}}},ObjectNotFoundError:class extends Error{},objectStorageClient:{}},
    '@workspace/api-zod':{},'../lib/arenaService.js':{rooms:new Map()},
    '../lib/logger.js':{logger:{warn:()=>{}}},
  });
  await api.cleanupAvatarUploads();
  assert.deepEqual(removed,['a','b']);assert.deepEqual(deleted,['a','b']);
});
