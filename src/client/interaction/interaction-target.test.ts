import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../shared/types';
import { NPCS } from '../../shared/data/world';
import { resolveInteractionTarget } from './interaction-target';

const snapshot=(x:number,z:number,drops:{id:string;x:number;z:number}[]=[])=>({self:{x,z},drops} as unknown as Snapshot);

describe('resolveInteractionTarget',()=>{
 it('does not let a distant drop hijack a nearby NPC',()=>{
  const guide=NPCS[0],target=resolveInteractionTarget(snapshot(guide.x,guide.z,[{id:'far',x:100,z:100}]));
  expect(target).toMatchObject({type:'npc',id:guide.id});
 });
 it('keeps a clearly closer nearby drop pickable',()=>{
  const guide=NPCS[0],target=resolveInteractionTarget(snapshot(guide.x+5.5,guide.z,[{id:'near',x:guide.x+5.5,z:guide.z}]));
  expect(target).toMatchObject({type:'drop',id:'near'});
 });
});
