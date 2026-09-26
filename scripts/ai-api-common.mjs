import fs from 'node:fs';
import path from 'node:path';

export function parseArgs(argv){
  const out={_ : []};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(!token.startsWith('--')){out._.push(token);continue;}
    const key=token.slice(2),next=argv[i+1];
    if(next!==undefined&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;
  }
  return out;
}
export function apiConfig(args={}){
  const base=String(args.endpoint||process.env.QINGLAN_ART_API_BASE||'https://qinglan-world-b68eab.justgg.workers.dev').replace(/\/$/,'');
  const token=String(args.token||process.env.QINGLAN_ART_TOKEN||'');
  if(!token)throw new Error('缺少 QINGLAN_ART_TOKEN。請先執行 wrangler secret put ART_PIPELINE_TOKEN，並在本機設定同值的 QINGLAN_ART_TOKEN。');
  return {base,token};
}
export async function postImage(url,token,payload){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Qinglan-Art-Token':token},body:JSON.stringify(payload)});
  if(!response.ok){const text=await response.text();throw new Error(`API ${response.status}: ${text.slice(0,800)}`);}
  return new Uint8Array(await response.arrayBuffer());
}
export function readImageBase64(file){return fs.readFileSync(file).toString('base64');}
export function ensureParent(file){fs.mkdirSync(path.dirname(file),{recursive:true});}
export function writeBinary(file,data){ensureParent(file);fs.writeFileSync(file,data);}
