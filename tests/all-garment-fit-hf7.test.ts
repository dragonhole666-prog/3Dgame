import {describe,expect,it} from 'vitest';
import {ITEMS} from '../src/shared/data/equipment';
import {FIT_REQUIRED_SLOTS,curatedEquipmentDefinition,fittedGarmentIds} from '../src/client/character/curated-equipment';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());

describe('P0.26.8 HF7/HF8 all body-worn equipment fit coverage',()=>{
 it('routes every body-silhouette wearable through a non-rigid fit definition',()=>{
  const ids=fittedGarmentIds();
  expect(ids.length).toBe(33);
  for(const id of ids){
   const item=ITEMS[id];
   expect(item.slot&&FIT_REQUIRED_SLOTS.has(item.slot)).toBe(true);
   const def=curatedEquipmentDefinition(id);
   expect(def,`${id} fit definition`).toBeDefined();
   expect(def?.mode,`${id} must not use rigid body clothing`).not.toBe('rigid');
   expect(['project-authored','generated-fit']).toContain(def?.source);
  }
 });
 it('keeps authored skinned garments while giving missing silhouettes skinned templates or generated skin',()=>{
  expect(curatedEquipmentDefinition('linen-robe')?.source).toBe('project-authored');
  expect(curatedEquipmentDefinition('primordial-god-armor')?.templateItemId).toBe('thunder-armor');
  expect(curatedEquipmentDefinition('reed-vest')?.templateItemId).toBe('linen-robe');
  expect(curatedEquipmentDefinition('chloroweave-legs')?.templateItemId).toBe('scale-legs');
  expect(curatedEquipmentDefinition('primordial-god-boots')?.templateItemId).toBe('thunder-boots');
  for(const id of ['reed-shoulders','cloud-shoulders','thunder-shoulders','jade-gloves','mist-cape','phoenix-cape']){
   expect(curatedEquipmentDefinition(id)?.mode).toBe('generated-skinned');
  }
 });
 it('registers both authored and generated skinned wearables with the garment Morph runtime',()=>{
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
  expect(runtime).toContain("instance.definition.mode!=='rigid'");
  expect(runtime).toContain('registerGarment(o,item.baseId)');
  expect(runtime).toContain("o.userData.fitPipeline='HF8'");
 });
});
