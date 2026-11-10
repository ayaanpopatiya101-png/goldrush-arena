const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const m=new Module('color');
m._compile(ts.transpileModule(fs.readFileSync('artifacts/mobile/utils/color.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'color.cjs');
const c=m.exports;
const pickerState={platform:'ios',permission:{granted:false,canAskAgain:false},result:{canceled:true},asked:0};
const photoModule=new Module('avatarImage');
photoModule.require=name=>{
  if(name==='react-native')return{Platform:{get OS(){return pickerState.platform}},Linking:{openSettings:async()=>{}}};
  if(name==='expo-image-picker')return{
    getMediaLibraryPermissionsAsync:async()=>pickerState.permission,
    requestMediaLibraryPermissionsAsync:async()=>{pickerState.asked++;return pickerState.permission},
    launchImageLibraryAsync:async()=>pickerState.result,
  };
  if(name==='expo-image-manipulator')return{};
  throw new Error(name);
};
photoModule._compile(ts.transpileModule(fs.readFileSync('artifacts/mobile/utils/avatarImage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'avatarImage.cjs');
test('native denial, cancellation, invalid MIME and oversize produce no selected replacement',async()=>{
  const pick=photoModule.exports.pickAvatarPhoto;
  assert.deepEqual(await pick(),{kind:'denied',canAskAgain:false});
  assert.equal(pickerState.asked,0);
  pickerState.permission={granted:false,canAskAgain:true};
  assert.equal((await pick()).kind,'denied');assert.equal(pickerState.asked,1);
  pickerState.permission={granted:true,canAskAgain:true};
  assert.equal((await pick()).kind,'cancelled');
  pickerState.result={canceled:false,assets:[{uri:'x',mimeType:'image/svg+xml',fileSize:100,width:20,height:20}]};
  assert.equal((await pick()).kind,'invalid');
  pickerState.result.assets[0].mimeType='image/jpeg';pickerState.result.assets[0].fileSize=6000000;
  assert.equal((await pick()).kind,'invalid');
  pickerState.result.assets[0].fileSize=100;
  assert.equal((await pick()).kind,'picked');
});
test('hex input validates, expands and round trips full RGB range',()=>{
  assert.equal(c.normalizeHex('#3a9'),'#33AA99');
  assert.equal(c.normalizeHex('not a colour'),null);
  for(let r=0;r<256;r+=17)for(let g=0;g<256;g+=17)for(let b=0;b<256;b+=17){
    const hex=c.rgbToHex(r,g,b);
    assert.equal(c.hsvToHex(c.hexToHsv(hex)),hex);
  }
});
test('grey/black preserve intended hue and hue wraps at360',()=>{
  assert.equal(c.hexToHsv('#000000',240,80).h,240);
  assert.equal(c.hexToHsv('#000000',240,80).s,80);
  assert.equal(c.hexToHsv('#888888',123).h,123);
  assert.equal(c.hsvToHex({h:360,s:100,v:100}),'#FF0000');
});
test('onboarding and profile share picker without replacing saved-player recovery',()=>{
  for(const file of ['artifacts/mobile/components/onboarding/Steps.tsx','artifacts/mobile/app/(tabs)/profile.tsx']){
    const text=fs.readFileSync(file,'utf8');
    assert.match(text,/<ColorPicker/);assert.match(text,/<PhotoAvatarEditor/);
  }
  assert.match(fs.readFileSync('artifacts/mobile/app/onboarding.tsx','utf8'),/await loginAccount\(a.username/);
});
