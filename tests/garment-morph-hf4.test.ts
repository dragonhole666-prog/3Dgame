import { describe,expect,it } from 'vitest';
import * as T from 'three';
import { DEFAULT_CUSTOMIZATION } from '../src/client/character/customization';
import { GarmentMorphRuntime,garmentMorphBinding,garmentMorphWeight } from '../src/client/character/garment-morph-runtime';

function morphMesh(...names:string[]){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
 g.morphAttributes.position=names.map(name=>{const a=new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3);a.name=name;return a;});
 const m=new T.Mesh(g,new T.MeshBasicMaterial());m.updateMorphTargets();return m;
}

describe('P0.26.8 HF4 modular garment morph synchronization',()=>{
 it('resolves body-shape morphs by semantic name instead of array index',()=>{
  expect(garmentMorphBinding('BodyFat')).toEqual({key:'bodyMass',mode:'positive'});
  expect(garmentMorphBinding('blendshape_BodyMuscle')).toEqual({key:'muscle',mode:'direct'});
  expect(garmentMorphBinding('WaistNarrow')).toEqual({key:'waistWidth',mode:'negative'});
 });
 it('derives fat/slim and muscle weights from the same creator profile',()=>{
  const p={...DEFAULT_CUSTOMIZATION,bodyMass:100,muscle:75};
  expect(garmentMorphWeight('BodyFat',p)).toBeCloseTo(1,6);
  expect(garmentMorphWeight('BodySlim',p)).toBeCloseTo(0,6);
  expect(garmentMorphWeight('BodyMuscle',p)).toBeCloseTo(.5,6);
 });
 it('applies creator body-shape weights to registered garments without scaling the garment object',()=>{
  const body=new T.Group(),garment=new T.Group(),b=morphMesh('BodyFat','BodyMuscle'),g=morphMesh('BodyMuscle','BodyFat');body.add(b);garment.add(g);
  const runtime=new GarmentMorphRuntime(body);runtime.registerGarment(garment,'test-shirt');const before=garment.scale.clone();runtime.setProfile({...DEFAULT_CUSTOMIZATION,bodyMass:75,muscle:100});
  const gi=g.morphTargetDictionary!;expect(g.morphTargetInfluences![gi.BodyFat]).toBeCloseTo(.5,6);expect(g.morphTargetInfluences![gi.BodyMuscle]).toBeCloseTo(1,6);expect(garment.scale).toEqual(before);
 });
});
