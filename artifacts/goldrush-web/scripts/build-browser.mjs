// A separate browser release, sharing real screens/physics rather than a demo.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const mobile=resolve(root,'mobile');
const output=resolve(root,'goldrush-web/dist/public');
const result=spawnSync('pnpm',['exec','expo','export','--platform','web','--max-workers','1','--output-dir',output],{
  cwd:mobile,stdio:'inherit',env:{...process.env,CI:'1',NODE_ENV:'production'},
});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
const index=resolve(output,'index.html');
if(!existsSync(index))throw new Error('Browser export did not produce index.html');
const html=readFileSync(index,'utf8');
if(!html.includes('GoldRush') || html.includes('BASE_URL_PLACEHOLDER'))throw new Error('Invalid browser entry');
console.log('GoldRush browser release ready; native build and Metro are unchanged.');
