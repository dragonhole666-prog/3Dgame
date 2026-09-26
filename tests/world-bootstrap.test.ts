import { describe, expect, it } from 'vitest';
import { GameWorld } from '../server/world';

describe('fresh world bootstrap',()=>{
 it('creates and snapshots a level-1 player even when starter alternatives include gated gear',()=>{
  const world=new GameWorld(()=>0.42);
  const player=world.createPlayer('bootstrap-probe','測試行者');
  expect(world.players.get(player.id)).toBe(player);
  expect(player.level).toBe(1);
  expect(player.equipment.mainhand?.baseId).toBe('iron-sword');
  expect(player.inventory.some(item=>item.baseId==='heaven-sword')).toBe(true);
  expect(player.inventory.some(item=>item.baseId==='thunder-bracers')).toBe(true);
  expect(()=>JSON.stringify(world.snapshot(player.id))).not.toThrow();
 });
});
