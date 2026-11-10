import http from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../dist/public/',import.meta.url)));
const port=Number(process.env.PORT);
if(!Number.isInteger(port)||port<1)throw new Error('A valid PORT is required');
if(!existsSync(resolve(root,'index.html')))throw new Error('Run the browser build first');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.mp4':'video/mp4','.webp':'image/webp','.wasm':'application/wasm'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://browser.invalid').pathname);}
  catch{res.writeHead(400);res.end();return;}
  if(name.includes('\0')||name.includes('\\')){res.writeHead(400);res.end();return;}
  let file=resolve(root,'.'+name);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  if(!existsSync(file)||!statSync(file).isFile()){
    if(extname(name)){res.writeHead(404);res.end();return;}
    file=resolve(root,'index.html');
  }
  const stat=statSync(file),ext=extname(file);
  res.writeHead(200,{'Content-Type':types[ext]??'application/octet-stream','Content-Length':stat.size,
    'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();
  else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
}).listen(port,'0.0.0.0',()=>console.log(`GoldRush browser server listening on ${port}`));
