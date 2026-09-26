import './sync-equipment-fit-modules.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public/assets/equipment/modules');
const equipment=fs.readFileSync(path.join(root,'src/shared/data/equipment.ts'),'utf8');
const fitSlots=new Set(['shoulders','chest','wrists','hands','waist','legs','feet','cape','fashion']);
const items=new Map();
for(const m of equipment.matchAll(/^\s*\['([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'/gm))items.set(m[1],{name:m[2],slot:m[3],shape:m[5],source:'authored'});
const generated=path.join(root,'src/shared/data/editor-equipment.generated.ts');
if(fs.existsSync(generated)){
 const text=fs.readFileSync(generated,'utf8');
 for(const m of text.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"slot":\s*"([^"]+)"[\s\S]*?"appearanceId":\s*"([^"]+)"/g)){if(!items.has(m[1]))items.set(m[1],{name:m[2],slot:m[3],shape:'editor-imported',source:'editor'});}
}
const must=(ok,msg)=>{if(!ok)throw new Error(`HF9 EQUIPMENT MODULE FAIL: ${msg}`);console.log('PASS ',msg)};
function glbJson(file){const b=fs.readFileSync(file);must(b.length>=20,`${path.basename(file)} has GLB header`);must(b.readUInt32LE(0)===0x46546c67,`${path.basename(file)} magic is glTF`);must(b.readUInt32LE(4)===2,`${path.basename(file)} is GLB v2`);const len=b.readUInt32LE(12),type=b.readUInt32LE(16);must(type===0x4e4f534a,`${path.basename(file)} has JSON chunk`);return JSON.parse(b.subarray(20,20+len).toString('utf8').replace(/\0+$/,''));}
const files=fs.readdirSync(dir).filter(x=>/\.glb$/i.test(x)).sort(),assets=[];
for(const name of files){
 const id=name.replace(/\.glb$/i,''),sidecarFile=path.join(dir,`${id}.fit.json`),sidecar=fs.existsSync(sidecarFile)?JSON.parse(fs.readFileSync(sidecarFile,'utf8')):undefined,item=items.get(id)??(sidecar?{name:sidecar.displayName??id,slot:sidecar.slot,shape:sidecar.shape??'imported',source:'sidecar'}:undefined);
 must(Boolean(item),`${name} maps to authored/editor equipment metadata or an HF9 fit sidecar`);must(typeof item.slot==='string',`${id} has an equipment slot`);
 const doc=glbJson(path.join(dir,name)),meshNodes=(doc.nodes??[]).filter(n=>Number.isInteger(n.mesh)),skinnedNodes=meshNodes.filter(n=>Number.isInteger(n.skin)),targetBindings=(doc.meshes??[]).reduce((sum,m)=>sum+(m.primitives??[]).reduce((s,p)=>s+(p.targets?.length??0),0),0);must((doc.meshes??[]).length>0,`${id} contains renderable mesh data`);
 const bodyFit=fitSlots.has(item.slot),strategy=bodyFit?(skinnedNodes.length?'skinned-rebind':'rigid-auto-rig'):'rigid-attachment';if(sidecar){must(sidecar.itemId===id,`${id} sidecar item id matches filename`);must(sidecar.slot===item.slot,`${id} sidecar slot matches equipment metadata`);must(sidecar.strategy===strategy,`${id} sidecar strategy matches GLB structure/slot`);}
 assets.push({id,name,slot:item.slot,shape:item.shape,meshCount:(doc.meshes??[]).length,skinnedNodes:skinnedNodes.length,morphTargetBindings:targetBindings,strategy,source:item.source});console.log(`MODULE ${id}: ${strategy}, morphBindings=${targetBindings}`);
}
const report={fitVersion:'HF9',generatedAt:new Date().toISOString(),moduleCount:assets.length,assets};fs.writeFileSync(path.join(root,'scripts/equipment-fit-module-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`HF9 EQUIPMENT MODULE VERIFY: PASS modules=${assets.length}`);
