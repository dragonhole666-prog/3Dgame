import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outDir=join(root,'public','assets','ai-models','generated');
const manifestPath=join(root,'public','assets','ai-models','manifest.json');
await mkdir(outDir,{recursive:true});

const jobs=[
 {id:'threews-pavilion',file:'xianxia-pavilion.glb',prompt:'single traditional Chinese xianxia garden pavilion, elegant upturned dark ceramic tiled roof, refined red-brown cedar columns, carved wooden railings, small antique-gold ornaments, weathered realistic materials, isolated object, no ground, game-ready proportions',position:[-18,0,-15],scale:1.0,rotationY:.15},
 {id:'threews-bridge',file:'xianxia-stone-bridge.glb',prompt:'single elegant traditional Chinese arched garden stone bridge, weathered pale grey stone, carved low railings, subtle moss in crevices, realistic xianxia garden prop, isolated object, no water, no ground',position:[0,0,-9],scale:1.0,rotationY:0},
 {id:'threews-scholar-rock',file:'taihu-scholar-rock.glb',prompt:'single large Taihu scholar rock for a Chinese classical garden, weathered limestone, irregular eroded holes and sculptural silhouette, realistic PBR stone appearance, isolated object, no ground',position:[13,0,-16],scale:2.0,rotationY:.5},
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function requestJson(url,options){const response=await fetch(url,options);if(response.status===429){const retry=Math.min(120,Number(response.headers.get('retry-after')||15));await sleep(retry*1000);return requestJson(url,options);}if(!response.ok)throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);return response.json();}

async function verifyFreeApi(){
 const info=await requestJson('https://three.ws/api/3d');
 const generate=(info.endpoints??[]).find(x=>x?.path==='/api/3d/generate');
 if(info.free!==true||info.keyless!==true||!generate)throw new Error(`three.ws discovery does not advertise the expected free/keyless generator: ${JSON.stringify(info).slice(0,600)}`);
 console.log(`[three.ws] discovery verified: free=${info.free} keyless=${info.keyless} version=${info.version??'unknown'}`);
 return info;
}

async function generate(prompt){
 let data=await requestJson('https://three.ws/api/3d/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,format:'glb'})});
 for(let attempt=0;data.status==='pending'&&attempt<90;attempt++){
  await sleep(Math.max(2500,Number(data.retryAfter||3)*1000));
  const poll=data.poll?.startsWith('http')?data.poll:`https://three.ws${data.poll??`/api/3d/generate?job=${encodeURIComponent(data.job)}`}`;
  data=await requestJson(poll);
 }
 if(data.status!=='done'||!data.glbUrl)throw new Error(data.error||`generation did not finish: ${JSON.stringify(data)}`);
 return data.glbUrl;
}
async function download(url,path){const r=await fetch(url);if(!r.ok)throw new Error(`GLB download ${r.status}`);await writeFile(path,Buffer.from(await r.arrayBuffer()));}

const props=[];
try{await verifyFreeApi();}catch(error){console.error('[three.ws] free API preflight failed:',error?.message??error);process.exitCode=1;}
for(const job of jobs){
 console.log(`\n[three.ws] generating ${job.id}...`);
 try{
  const url=await generate(job.prompt);const dest=join(outDir,job.file);await download(url,dest);console.log(`[three.ws] saved ${job.file}`);
  props.push({id:job.id,asset:`/assets/ai-models/generated/${job.file}`,position:job.position,scale:job.scale,rotationY:job.rotationY,relativeToSpawn:true});
 }catch(error){console.error(`[three.ws] ${job.id} failed:`,error?.message??error);}
}
let manifest={version:2,props:[]};try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
const keep=(manifest.props??[]).filter(p=>!String(p.id).startsWith('threews-'));
manifest={version:2,props:[...keep,...props]};await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`\nUpdated ${manifestPath} with ${props.length} generated prop(s).`);
if(!props.length)process.exitCode=1;
