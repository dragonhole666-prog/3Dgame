import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {NPCS,WORLD,walkable} from '../src/shared/data/world';

const root=path.resolve(__dirname,'..');
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('HF26.5 Visual Reboot hard gates',()=>{
 it('physically retires the old uploaded GLB/map implementation',()=>{
  expect(fs.existsSync(path.join(root,'src/client/world/xianxia-uploaded-map-layer.ts'))).toBe(false);
  expect(fs.existsSync(path.join(root,'src/assets/xianxia_world.glb'))).toBe(false);
  expect(fs.existsSync(path.join(root,'public/assets/user-world/xianxia_world.glb'))).toBe(false);
  expect(fs.existsSync(path.join(root,'src/shared/data/xianxia-world-map.ts'))).toBe(false);
 });
 it('shares one world-layout source across client placement and authoritative navigation',()=>{
  const layout=read('src/shared/data/hf265-world-layout.ts'),nature=read('src/client/world/hf265-quaternius-nature-layer.ts'),nav=read('src/shared/domains/navigation.ts');
  expect(layout).toContain('HF265_NATURE_PLACEMENTS');expect(layout).toContain('HF265_COLLIDERS');expect(nature).toContain('HF265_NATURE_PLACEMENTS');expect(nav).toContain('hf265AreaClear');
 });
 it('keeps the player and authored NPC interaction points on walkable ground',()=>{
  expect(walkable(WORLD.spawn,.35)).toBe(true);
  for(const npc of NPCS)expect(walkable({x:npc.x,z:npc.z},.35),npc.id).toBe(true);
 });
 it('packages all new visual layers and vendor workflow',()=>{
  for(const p of ['src/client/world/hf265-terrain.ts','src/client/world/hf265-quaternius-nature-layer.ts','src/client/world/hf265-architecture-layer.ts','src/client/world/hf265-water-layer.ts','src/client/world/hf265-atmosphere.ts','src/client/world/hf265-horizon-mountains.ts','src/client/rendering/hf265-equipment-art-direction.ts','scripts/fetch-quaternius-hf265.mjs','README_P0.26.8_HF26.5_Visual_Reboot.txt'])expect(fs.existsSync(path.join(root,p))).toBe(true);
 });
});
