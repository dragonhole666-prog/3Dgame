import { describe,expect,it } from 'vitest';
import { MonsterModel } from '../src/client/character/monster-model';
import { MONSTERS } from '../src/shared/data/monsters';
import type { Monster } from '../src/shared/types';

const actor=(defId:string):Monster=>({
  id:`test-${defId}`,defId,x:0,z:0,home:{x:0,z:0},hp:MONSTERS[defId].hp,maxHp:MONSTERS[defId].hp,
  angle:0,speed:0,state:'Combat',hitAt:-999,staggerUntil:0,nextAttack:0,aiTimer:0,cycle:0,contributors:{},
});

describe('procedural map boss animation',()=>{
  it('keeps the three procedural bosses and registers Golden Queen as a separate rigged boss',()=>{
    const bosses=Object.values(MONSTERS).filter(m=>m.aiProfile==='boss');
    expect(bosses.map(m=>m.id).sort()).toEqual(['fox','golden-queen','gudiao','kui']);
    for(const id of ['fox','gudiao','kui'] as const){expect(MONSTERS[id].assetLocal).toBeUndefined();expect(MONSTERS[id].assetUrl).toBeUndefined();}
    expect(MONSTERS['golden-queen'].assetLocal).toBe('/assets/bosses/golden_queen.glb');
    expect(MONSTERS['golden-queen'].bossBehavior).toBe('queen-duelist');
  });

  it.each(['fox','gudiao','kui'] as const)('%s has visible locomotion/body motion',id=>{
    const model=new MonsterModel(MONSTERS[id]);
    const beforeBody=model.body.position.y;
    const beforeLeg=model.legs[0]?.rotation.x??0;
    const beforeWing=model.wings[0]?.rotation.z??0;
    const beforeTail=model.tails[0]?.rotation.z??0;
    model.update(.18,.42,undefined,2.4);
    const delta=Math.abs(model.body.position.y-beforeBody)+Math.abs((model.legs[0]?.rotation.x??0)-beforeLeg)+Math.abs((model.wings[0]?.rotation.z??0)-beforeWing)+Math.abs((model.tails[0]?.rotation.z??0)-beforeTail);
    expect(delta).toBeGreaterThan(.01);
    model.dispose();
  });

  it.each(['fox','gudiao','kui'] as const)('%s reacts through an attack pose',id=>{
    const model=new MonsterModel(MONSTERS[id]),mob=actor(id);
    mob.attack={id:1,skill:'test',started:1,hitAt:1.3,endsAt:1.8,resolved:false,point:{x:0,z:0}};
    model.update(.016,1.25,mob,0);
    expect(Math.abs(model.body.rotation.x)+Math.abs(model.head.rotation.x)).toBeGreaterThan(.03);
    model.dispose();
  });
});
