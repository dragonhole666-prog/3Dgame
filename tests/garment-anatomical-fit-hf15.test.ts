import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {curatedEquipmentDefinition,curatedSkinTarget,remapSkinAnatomical} from '../src/client/character/curated-equipment';

function makeSkin(prefix:'source'|'target'){
 const root=new T.Group(),upper=new T.Bone(),lower=new T.Bone(),hand=new T.Bone();upper.name='LeftUpperArm';lower.name='LeftForearm';hand.name='LeftHand';
 if(prefix==='source'){upper.position.set(.3,1.6,0);lower.position.set(.02,-.3,0);hand.position.set(0,-.28,0);}
 else{upper.position.set(-.15,1.4,0);lower.position.set(-.24,0,0);hand.position.set(-.25,0,0);}
 root.add(upper);upper.add(lower);lower.add(hand);root.updateMatrixWorld(true);const skeleton=new T.Skeleton([upper,lower,hand]);skeleton.calculateInverses();
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(prefix==='source'?[.3,1.58,.08,.32,1.32,.08,.31,1.06,.08]:[-.15,1.4,.08,-.39,1.4,.08,-.64,1.4,.08],3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0,1,0,0,0,2,0,0,0],4));g.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);mesh.bind(skeleton,new T.Matrix4());return {root,mesh};
}

describe('P0.26.8 HF15 anatomical garment fit',()=>{
 it('rotates an authored hanging sleeve into the avatar limb bind direction instead of only translating it',()=>{
  const source=makeSkin('source'),target=makeSkin('target'),avatar=new T.Group();avatar.add(target.root);avatar.updateMatrixWorld(true);
  const fitted=remapSkinAnatomical(source.mesh,curatedSkinTarget(target.mesh,avatar))!,p=fitted.geometry.getAttribute('position') as T.BufferAttribute;
  expect(p.getX(2)).toBeLessThan(p.getX(0)-.3);expect(Math.abs(p.getY(2)-p.getY(0))).toBeLessThan(.18);expect(fitted.userData.fitStrategy).toBe('anatomical-transfer');
 });
 it('routes project-authored garment templates through the anatomical fit strategy',()=>{
  for(const id of ['linen-robe','cloud-robe','thunder-armor','linen-boots','thunder-bracers','woven-belt'])expect(curatedEquipmentDefinition(id)?.fitStrategy).toBe('anatomical-transfer');
  expect(curatedEquipmentDefinition('primordial-god-armor')?.fitStrategy).toBe('anatomical-transfer');
 });
});
