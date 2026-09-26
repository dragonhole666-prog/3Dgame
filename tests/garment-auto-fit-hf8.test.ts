import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {APPEARANCES,ITEMS} from '../src/shared/data/equipment';
import {applyGarmentClearanceMorph,curatedEquipmentDefinition,type CuratedSkinTarget} from '../src/client/character/curated-equipment';
import {garmentMorphWeight} from '../src/client/character/garment-morph-runtime';
import {HF8_CLEARANCE_MORPH} from '../src/client/character/garment-fit-standard';
import {DEFAULT_CUSTOMIZATION} from '../src/client/character/customization';

describe('P0.26.8 HF8 automatic garment fit contract',()=>{
  it('auto-resolves future body-worn GLB items without a curated per-item entry',()=>{
    const base=ITEMS['linen-robe'],baseAppearance=APPEARANCES[base.appearanceId!],id='hf8-future-test',appearanceId='equipment_hf8-future-test';
    ITEMS[id]={...base,id,name:'HF8 Future Test',appearanceId,mesh:'/assets/equipment/modules/hf8-future-test.glb'};
    APPEARANCES[appearanceId]={...baseAppearance,id:appearanceId,mesh:'/assets/equipment/modules/hf8-future-test.glb'};
    try{const def=curatedEquipmentDefinition(id);expect(def?.mode).toBe('auto-fit');expect(def?.source).toBe('auto-module');expect(def?.url).toBe('/assets/equipment/modules/hf8-future-test.glb');}
    finally{delete ITEMS[id];delete APPEARANCES[appearanceId];}
  });
  it('adds a permanent body-surface clearance corrective morph when a garment is too close',()=>{
    const bone=new T.Bone(),skeleton=new T.Skeleton([bone],[new T.Matrix4()]),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,.002],3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0],4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0],4));const mesh=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());mesh.bind(skeleton,new T.Matrix4());
    const target:CuratedSkinTarget={skeleton,bindMatrix:new T.Matrix4(),bindMatrixInverse:new T.Matrix4(),meshMatrixInAvatar:new T.Matrix4(),surface:{cellSize:.055,positions:new Float32Array([0,0,0]),normals:new Float32Array([0,0,1]),cells:new Map([['0,0,0',[0]]]),bounds:new T.Box3(new T.Vector3(-.3,0,-.2),new T.Vector3(.3,1.9,.2))}};
    const report=applyGarmentClearanceMorph(mesh,target,'chest');expect(report.adjusted).toBe(1);expect(report.maxCorrection).toBeCloseTo(.008,5);expect(mesh.morphTargetDictionary?.[HF8_CLEARANCE_MORPH]).toBeDefined();expect(mesh.morphTargetInfluences?.[mesh.morphTargetDictionary![HF8_CLEARANCE_MORPH]]).toBe(1);
    expect(garmentMorphWeight(HF8_CLEARANCE_MORPH,DEFAULT_CUSTOMIZATION)).toBe(1);
  });
});
