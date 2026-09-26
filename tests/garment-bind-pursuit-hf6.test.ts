import { describe,expect,it } from 'vitest';
import * as T from 'three';
import { curatedSkinTarget,remapSkin } from '../src/client/character/curated-equipment';
import { GameWorld } from '../server/world';
import { MONSTERS } from '../src/shared/data/monsters';

function singleBoneSkin(name:string,boneX:number,boneScaleX=1){
  const root=new T.Group(),bone=new T.Bone();bone.name=name;bone.position.x=boneX;bone.scale.x=boneScaleX;root.add(bone);root.updateMatrixWorld(true);
  const skeleton=new T.Skeleton([bone]);skeleton.calculateInverses();
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([boneX+.2,0,0,boneX+.2,.1,0,boneX+.2,0,.1],3));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
  geometry.morphTargetsRelative=true;
  const morph=new T.Float32BufferAttribute([.1,0,0,.1,0,0,.1,0,0],3);morph.name='BodyFat';geometry.morphAttributes.position=[morph];
  const mesh=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);mesh.bind(skeleton,new T.Matrix4());mesh.updateMorphTargets();
  return {root,bone,skeleton,mesh};
}

describe('P0.26.8 HF6 garment bind-pose fit + combat pursuit continuity',()=>{
  it('transfers garment rest vertices and morph deltas into the avatar bind pose before sharing its skeleton',()=>{
    const source=singleBoneSkin('Hips',1,1),target=singleBoneSkin('Hips',2,1.5);
    const avatar=new T.Group();avatar.add(target.root);avatar.updateMatrixWorld(true);target.root.updateMatrixWorld(true);target.mesh.updateMatrixWorld(true);
    const rebound=remapSkin(source.mesh,curatedSkinTarget(target.mesh,avatar))!;
    const position=rebound.geometry.getAttribute('position') as T.BufferAttribute;
    expect(position.getX(0)).toBeCloseTo(2.3,5);
    expect(rebound.userData.bindPoseTransferred).toBe(true);
    const morph=rebound.geometry.morphAttributes.position?.[0] as T.BufferAttribute;
    expect(morph.getX(0)).toBeCloseTo(.15,5);
    expect(rebound.skeleton).toBe(target.skeleton);
  });

  it('moves along the validated path vector while facing turns independently',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('hf6-path','tester');for(const m of world.monsters.values())m.hp=0;
    const before={x:p.x,z:p.z};p.angle=0;p.path=[{x:p.x+5,z:p.z}];p.input={x:0,z:0,sprint:true};p.inputAt=-10;
    world.tick(.1);
    expect(p.x).toBeGreaterThan(before.x);
    expect(Math.abs(p.z-before.z)).toBeLessThan(.03);
  });

  it('does not brake to zero when a pursuit path expires before its repath timer',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('hf6-pursuit','tester'),target=[...world.monsters.values()][0];
    for(const m of world.monsters.values())m.hp=0;
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+12,z:p.z});
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    expect(p.queuedSkill).toBe('basic');
    p.path=[];p.pursuitNextAt=world.time+1;const before={x:p.x,z:p.z};world.tick(.05);
    expect(p.speed).toBeGreaterThan(0);
    expect(Math.hypot(p.x-before.x,p.z-before.z)).toBeGreaterThan(0);
  });
});
