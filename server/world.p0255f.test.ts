import { describe, expect, it } from 'vitest';
import { GameWorld } from './world';

const quietWorld=(id:string)=>{
 const world=new GameWorld(()=>.5),player=world.createPlayer(id,'Mobile Verifier');
 for(const monster of world.monsters.values())monster.hp=0;
 return {world,player};
};

describe('P0.25.5f mobile analog movement',()=>{
 it('preserves sub-unit joystick magnitude instead of normalizing it to full speed',()=>{
  const {world,player}=quietWorld('p0255f-half');
  world.command(player.id,{type:'move',x:.5,z:0,sprint:false});
  expect(player.input.x).toBeCloseTo(.5,6);
  expect(player.input.z).toBe(0);
  world.tick(.05);
  const halfSpeed=player.speed;

  const full=quietWorld('p0255f-full');
  full.world.command(full.player.id,{type:'move',x:1,z:0,sprint:false});
  full.world.tick(.05);
  expect(full.player.speed).toBeGreaterThan(halfSpeed*1.9);
  expect(full.player.speed).toBeLessThan(halfSpeed*2.1);
 });

 it('keeps full keyboard-equivalent movement at magnitude one',()=>{
  const {world,player}=quietWorld('p0255f-keyboard');
  world.command(player.id,{type:'move',x:1,z:0,sprint:true});
  expect(Math.hypot(player.input.x,player.input.z)).toBeCloseTo(1,6);
  expect(player.input.sprint).toBe(true);
  world.tick(.05);
  expect(player.speed).toBeGreaterThan(0);
 });
});
