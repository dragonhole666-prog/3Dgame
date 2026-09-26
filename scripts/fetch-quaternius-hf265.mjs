import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public','assets','quaternius','nature');
const base='https://raw.githubusercontent.com/agentkaerf/FreeModels/main/Stylized%20Nature%20MegaKit%5BStandard%5D/glTF';
const packBase='https://raw.githubusercontent.com/agentkaerf/FreeModels/main/Stylized%20Nature%20MegaKit%5BStandard%5D';
const files=[
 'CommonTree_1.gltf','CommonTree_1.bin','CommonTree_3.gltf','CommonTree_3.bin','TwistedTree_1.gltf','TwistedTree_1.bin','Pine_2.gltf','Pine_2.bin',
 'Rock_Medium_1.gltf','Rock_Medium_1.bin','Rock_Medium_3.gltf','Rock_Medium_3.bin','Bush_Common_Flowers.gltf','Bush_Common_Flowers.bin',
 'Flower_3_Group.gltf','Flower_3_Group.bin','Grass_Common_Short.gltf','Grass_Common_Short.bin','Bark_NormalTree.png','Bark_NormalTree_Normal.png',
 'Bark_TwistedTree.png','Bark_TwistedTree_Normal.png','Leaves_NormalTree_C.png','Leaves_TwistedTree_C.png','Leaf_Pine_C.png','Rocks_Diffuse.png','Flowers.png','Leaves.png','Grass.png'
];
async function download(url,target){const r=await fetch(url,{redirect:'follow'});if(!r.ok)throw new Error(`${r.status} ${url}`);const data=new Uint8Array(await r.arrayBuffer());await fs.writeFile(target,data);console.log('QUATERNIUS',path.basename(target),data.byteLength);}
await fs.mkdir(out,{recursive:true});
for(const file of files)await download(`${base}/${encodeURIComponent(file)}`,path.join(out,file));
await download(`${packBase}/License_Standard.txt`,path.join(out,'License_Standard.txt'));
console.log(`HF26.5 Quaternius vendor complete: ${files.length} runtime files + CC0 license.`);
