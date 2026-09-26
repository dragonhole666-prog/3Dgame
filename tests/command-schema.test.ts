import { describe,expect,it } from 'vitest';
import { parseCommand } from '../src/shared/protocol/command-schema';

describe('command runtime schema',()=>{
 it('accepts valid gameplay commands',()=>{
  expect(parseCommand({type:'move',x:1,z:0,sprint:true})).toEqual({ok:true,command:{type:'move',x:1,z:0,sprint:true}});
  expect(parseCommand({type:'attack',skill:'thunder',target:'monster-1'}).ok).toBe(true);
  expect(parseCommand({type:'unequip',slot:'mainhand'}).ok).toBe(true);
 });
 it('rejects malformed or unknown commands before world.command',()=>{
  expect(parseCommand({type:'move',x:'1',z:0,sprint:true}).ok).toBe(false);
  expect(parseCommand({type:'unequip',slot:'not-a-slot'}).ok).toBe(false);
  expect(parseCommand({type:'attack',skill:''}).ok).toBe(false);
  expect(parseCommand({type:'adminGodMode'}).ok).toBe(false);
 });
});
