import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected=['linen_robe.glb','cloud_robe.glb','thunder_armor.glb','snow_fashion.glb','linen_legs.glb','scale_legs.glb','linen_boots.glb','cloud_boots.glb','thunder_boots.glb','cloth_wrists.glb','thunder_bracers.glb','woven_belt.glb','thunder_belt.glb'];
function glbJson(file:string){const b=fs.readFileSync(file);expect(b.toString('ascii',0,4)).toBe('glTF');let off=12;while(off+8<=b.length){const len=b.readUInt32LE(off),type=b.readUInt32LE(off+4);off+=8;const c=b.subarray(off,off+len);off+=len;if(type===0x4e4f534a)return JSON.parse(c.toString('utf8').replace(/[\u0000 ]+$/,''));}throw new Error('JSON chunk missing');}
describe('P0.26.8 HF5 baked garment body morph assets',()=>{
 it('bakes compatible body-shape morph targets into all 13 skinned garments',()=>{
  let bindings=0;for(const name of expected){const doc=glbJson(path.join(root,'public/assets/equipment',name));const meshes=doc.meshes??[];const generated=meshes.flatMap((m:any)=>m.extras?.qinglanGeneratedMorphs??[]);expect(generated.length,name).toBeGreaterThan(0);expect(meshes.some((m:any)=>m.extras?.qinglanGarmentMorphBakeVersion==='HF5'),name).toBe(true);bindings+=generated.length;}expect(bindings).toBeGreaterThanOrEqual(900);
 });
 it('ships the reproducible baker, strict verifier and asset report',()=>{
  expect(fs.existsSync(path.join(root,'scripts/bake-garment-morph-assets.mjs'))).toBe(true);expect(fs.existsSync(path.join(root,'scripts/verify-garment-morph-assets.mjs'))).toBe(true);const report=JSON.parse(fs.readFileSync(path.join(root,'scripts/garment-morph-asset-report.json'),'utf8'));expect(report.bakeVersion).toBe('HF5');expect(report.totalAssets).toBe(13);expect(report.totalGeneratedMorphBindings).toBeGreaterThanOrEqual(900);
 });
});
