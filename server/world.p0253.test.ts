import { describe, expect, it } from 'vitest';
import { GameWorld } from './world';
import { MONSTERS } from '../src/shared/data/monsters';
import { MONSTER_SKILLS } from '../src/shared/domains/combat';
import { distance } from '../src/shared/types';

describe('P0.25.3 monster knockback integration',()=>{
 it('does not launch a player farther when hit almost at monster center',()=>{
  const world=new GameWorld(()=>.5),p=world.createPlayer('p0253-knockback','Verifier');
  const m=[...world.monsters.values()][0];
  for(const other of world.monsters.values())other.hp=0;

  Object.assign(p,{x:.1,z:0,hp:1_000_000,maxHp:1_000_000});
  Object.assign(m,{
   x:0,z:0,home:{x:0,z:0},hp:MONSTERS[m.defId].hp,maxHp:MONSTERS[m.defId].hp,
   target:p.id,angle:Math.PI/2,state:'Combat',
   attack:{id:999,skill:'stomp',started:0,hitAt:0,endsAt:1,resolved:false,target:p.id,point:{x:0,z:0}},
  });

  const start={x:p.x,z:p.z},budget=MONSTER_SKILLS.stomp.knockback;
  world.tick(.01);
  const displacement=distance(start,p);

  expect(displacement).toBeGreaterThan(0);
  expect(displacement).toBeLessThanOrEqual(budget+1e-6);
  expect(displacement).toBeCloseTo(budget,5);
 });
});
