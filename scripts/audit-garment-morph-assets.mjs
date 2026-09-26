import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public/assets/equipment');
const strict=process.argv.includes('--strict');
const recognized=/^(bodyfat|fat|bodyheavy|bodyslim|slim|bodythin|bodymass|bodymuscle|muscle|bodymuscular|muscular|bodysoft|shoulderwidth|shoulderwide|shouldernarrow|chestwidth|chestwide|chestnarrow|chestdepth|chestdeep|chestthick|chestshallow|chestthin|waistwidth|waistwide|waistnarrow|waistdepth|waistdeep|waistthick|waistshallow|waistthin|hipwidth|hipswidth|hipwide|hipswide|hipnarrow|hipsnarrow|hipdepth|hipsdepth|hipdeep|hipsdeep|hipshallow|hipsshallow|upperarmthickness|upperarmthick|armthick|upperarmthin|armthin|forearmthickness|forearmthick|forearmthin|thighthickness|thighthick|thighthin|calfthickness|calfthick|calfthin|bodyheight|height|bodytall|tall|bodyshort|short)$/;
function normalize(name){return name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(morph|blendshape|shape|shapekey|key|bs)/,'');}
function jsonChunk(file){const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='glTF')throw new Error('not GLB');let o=12;while(o+8<=b.length){const len=b.readUInt32LE(o),type=b.toString('ascii',o+4,o+8);o+=8;const chunk=b.subarray(o,o+len);o+=len;if(type==='JSON')return JSON.parse(chunk.toString('utf8').replace(/\u0000+$/,''));}throw new Error('JSON chunk missing');}
let missing=0,compatible=0;
for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.glb')).sort()){
 const doc=jsonChunk(path.join(dir,name));if(!(doc.skins?.length))continue;const targets=[];
 for(const mesh of doc.meshes??[]){const names=mesh.extras?.targetNames??[];for(const n of names)targets.push(String(n));}
 const body=targets.filter(n=>recognized.test(normalize(n)));if(body.length){compatible++;const unique=[...new Set(body)];console.log(`PASS ${name}: bindings=${body.length}, semanticMorphs=${unique.join(', ')}`);}else{missing++;console.log(`WARN ${name}: skinned garment has no body-shape Morph Targets; shared Skeleton only`);}
}
console.log(`GARMENT MORPH AUDIT HF5: compatible=${compatible}, skeleton-only=${missing}`);if(strict&&missing)process.exitCode=1;
