import {describe,it,expect} from 'vitest';
import {characterNameKey,validateCharacterName,uniqueMigratedCharacterName} from '../src/shared/identity/character-name';
import {migrateSave,type WorldSave} from '../server/migrations';
import type {Player} from '../src/shared/types';

const player=(id:string,name:string):Player=>({id,name,level:1,xp:0,hp:100,maxHp:100,mp:100,maxMp:100,gold:0,inventory:[],equipment:{},stats:{} as Player['stats'],x:0,z:0,angle:0,speed:0,state:'Idle',hitAt:0,staggerUntil:0,input:{x:0,z:0,sprint:false},inputAt:0,path:[],cooldowns:{},known:[],kills:{},online:false,revision:0,jumpAt:-10});

describe('HF17 character identity',()=>{
 it('normalizes full-width/case/spacing into one uniqueness key',()=>{
  expect(characterNameKey(' Hero ')).toBe(characterNameKey('ＨＥＲＯ'));
  expect(characterNameKey('青 嵐')).toBe(characterNameKey('青　嵐'));
 });
 it('accepts Chinese names and rejects invalid/reserved names',()=>{
  expect(validateCharacterName('青嵐劍客')).toMatchObject({ok:true,name:'青嵐劍客'});
  expect(validateCharacterName('A')).toMatchObject({ok:false,code:'CHARACTER_NAME_LENGTH'});
  expect(validateCharacterName('GM')).toMatchObject({ok:false,code:'CHARACTER_NAME_RESERVED'});
  expect(validateCharacterName('青嵐!')).toMatchObject({ok:false,code:'CHARACTER_NAME_INVALID'});
 });
 it('deterministically suffixes legacy duplicate names',()=>{
  const used=new Set<string>();
  expect(uniqueMigratedCharacterName('行山劍客',used)).toBe('行山劍客');
  expect(uniqueMigratedCharacterName('行山劍客',used)).toBe('行山劍客·2');
  expect(uniqueMigratedCharacterName('行山劍客',used)).toBe('行山劍客·3');
 });
 it('migrates v3 worlds to globally unique character names without changing ids or tokens',()=>{
  const raw:WorldSave={saveVersion:3,tokens:{t1:'p1',t2:'p2',t3:'p3'},players:[player('p1','Hero'),player('p2','ＨＥＲＯ'),player('p3','青嵐')],listings:[]};
  const migrated=migrateSave(raw);
  expect(migrated.saveVersion).toBe(4);
  expect(migrated.tokens).toEqual(raw.tokens);
  expect(migrated.players.map(p=>p.id)).toEqual(['p1','p2','p3']);
  expect(new Set(migrated.players.map(p=>characterNameKey(p.name))).size).toBe(3);
  expect(migrated.players[0].name).toBe('Hero');
  expect(migrated.players[1].name).toContain('·2');
 });
});
