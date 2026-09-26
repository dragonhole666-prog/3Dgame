import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
const root=path.resolve(__dirname,'..');const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
describe('HF26.5 Visual Reboot world and equipment contract',()=>{
 it('uses the six-layer reboot world and no uploaded legacy map renderer',()=>{const world=read('src/client/world/world-renderer.ts');for(const token of ['HF265Terrain','HF265QuaterniusNatureLayer','HF265ArchitectureLayer','HF265WaterLayer','HF265Atmosphere','HF265HorizonMountains'])expect(world).toContain(token);expect(world).not.toContain('XianxiaUploadedMapLayer');});
 it('uses shared HF26.5 height/collider/nav data rather than the old GLB map',()=>{const world=read('src/shared/data/world.ts'),nav=read('src/shared/domains/navigation.ts');expect(world).toContain('hf265TerrainHeight');expect(world).toContain('hf265Walkable');expect(nav).toContain('hf265AreaClear');expect(world).not.toContain('xianxiaHeightAt');expect(nav).not.toContain('XIANXIA_MAP');});
 it('routes equipment through one mist-blue antique-gold jade art-direction contract',()=>{const equipment=read('src/client/character/curated-equipment.ts'),style=read('src/client/rendering/hf265-equipment-art-direction.ts');expect(equipment).toContain('applyHF265EquipmentArtDirection');expect(style).toContain("cloth:'#8197A2'");expect(style).toContain("trim:'#B58863'");expect(style).toContain("jade:'#92B4AA'");});
});
