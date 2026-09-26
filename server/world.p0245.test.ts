import { describe, expect, it } from 'vitest';
import { GameWorld } from './world';
import { createItem } from '../src/shared/domains/item';
import { salvageYield } from '../src/shared/domains/salvage';
import { NPCS } from '../src/shared/data/world';

const fresh=()=>{const world=new GameWorld(()=>0.5),player=world.createPlayer('test-player','Verifier');return {world,player};};

describe('P0.24.5 authoritative interaction and inventory lifecycle',()=>{
 it('accepts NPC intel while in range',()=>{
  const {world,player}=fresh(),npc=NPCS[0];player.x=npc.x;player.z=npc.z;player.known=[];
  world.command(player.id,{type:'intel',npc:npc.id});
  expect(player.known).toEqual(expect.arrayContaining(npc.intel));
 });
 it('discards an item as a recoverable five-minute world drop',()=>{
  const {world,player}=fresh(),item=createItem('cloud-shoulders',()=>0.5);player.inventory.push(item);
  world.command(player.id,{type:'discard',id:item.id});
  expect(player.inventory.some(i=>i.id===item.id)).toBe(false);
  const drop=[...world.drops.values()].find(d=>d.item.id===item.id);expect(drop).toBeDefined();expect(drop!.expiresAt-world.time).toBe(300);
 });
 it('permanently destroys without salvage and salvages equipment deterministically',()=>{
  const {world,player}=fresh();
  const doomed=createItem('linen-boots',()=>0.5);player.inventory.push(doomed);world.command(player.id,{type:'destroy',id:doomed.id});expect(player.inventory.some(i=>i.id===doomed.id)).toBe(false);
  const gear=createItem('heaven-sword',()=>0.5);gear.quality=100;gear.enhancementLevel=3;const expected=salvageYield(gear);player.inventory.push(gear);
  const before=player.inventory.filter(i=>i.baseId==='refining-dust').reduce((n,i)=>n+i.quantity,0);world.command(player.id,{type:'salvage',id:gear.id});
  const after=player.inventory.filter(i=>i.baseId==='refining-dust').reduce((n,i)=>n+i.quantity,0);expect(after-before).toBe(expected);
 });
});
