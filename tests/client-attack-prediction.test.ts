import { describe, expect, it } from 'vitest';
import { GameWorld } from '../server/world';
import { MONSTERS } from '../src/shared/data/monsters';
import { canPredictAttack } from '../src/client/core/combat-prediction';

function combatSnapshot(){
 const world=new GameWorld(()=>.5),p=world.createPlayer('prediction-player','tester'),target=[...world.monsters.values()][0];
 for(const m of world.monsters.values())m.hp=0;
 Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+2,z:p.z});
 p.target=target.id;p.angle=Math.atan2(target.x-p.x,target.z-p.z);
 return {world,p,target,snapshot:world.snapshot(p.id)};
}

describe('P0.25.5 client attack prediction range gate',()=>{
 it('does not animate an attack when the rendered player is still outside commit range',()=>{
  const {p,target,snapshot}=combatSnapshot();
  const visibleSelf={x:p.x-5,z:p.z,angle:p.angle};
  expect(canPredictAttack(snapshot,'basic',target.id,visibleSelf,{x:target.x,z:target.z})).toBe(false);
 });

 it('allows prediction only after rendered range and facing both agree',()=>{
  const {p,target,snapshot}=combatSnapshot();
  expect(canPredictAttack(snapshot,'basic',target.id,{x:p.x,z:p.z,angle:p.angle},{x:target.x,z:target.z})).toBe(true);
  expect(canPredictAttack(snapshot,'basic',target.id,{x:p.x,z:p.z,angle:-Math.PI/2},{x:target.x,z:target.z})).toBe(false);
 });
});
