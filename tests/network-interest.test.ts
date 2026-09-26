import {describe,expect,it} from 'vitest';
import {GameWorld} from '../server/world';
import {MONSTERS} from '../src/shared/data/monsters';

describe('network interest management',()=>{
 it('keeps self, nearby actors, current target and global bosses while excluding distant ordinary actors',()=>{
  const world=new GameWorld(()=>.4);
  const a=world.createPlayer('a','A');
  const b=world.createPlayer('b','B');
  b.x=a.x+500;b.z=a.z+500;
  const scoped=world.snapshot(a.id,[],{playerRadius:80,monsterRadius:35,dropRadius:30,eventRadius:60});
  expect(scoped.players.some(p=>p.id==='a')).toBe(true);
  expect(scoped.players.some(p=>p.id==='b')).toBe(false);
  expect(scoped.monsters.every(m=>m.id===a.target||Math.hypot(m.x-a.x,m.z-a.z)<=35||MONSTERS[m.defId]?.aiProfile==='boss')).toBe(true);
  for(const monster of world.monsters.values())if(MONSTERS[monster.defId]?.aiProfile==='boss')expect(scoped.monsters.some(m=>m.id===monster.id)).toBe(true);
 });
 it('does not affect full authoritative snapshots used by tests and tools',()=>{
  const world=new GameWorld(()=>.4);
  const a=world.createPlayer('a','A');
  const b=world.createPlayer('b','B');
  b.x=a.x+500;b.z=a.z+500;
  expect(world.snapshot(a.id).players.some(p=>p.id==='b')).toBe(true);
 });
});
