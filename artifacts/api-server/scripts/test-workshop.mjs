import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const temporary=await mkdtemp(path.join(tmpdir(),'goldrush-workshop-'));
try {
  const input=process.argv.includes('--api')?'tests/workshop-api.test.ts':'tests/workshop.test.ts';
  const out=path.join(temporary,'test.cjs');
  await build({entryPoints:[input],outfile:out,bundle:true,platform:'node',format:'cjs',external:['pg-native'],logLevel:'warning'});
  const result=spawnSync(process.execPath,['--test',out],{stdio:'inherit',env:{...process.env,NODE_ENV:'test'},timeout:120000});
  process.exitCode=result.status??1;
} finally {await rm(temporary,{recursive:true,force:true});}
