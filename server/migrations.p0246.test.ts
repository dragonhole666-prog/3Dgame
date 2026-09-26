import { describe,expect,it } from 'vitest';
import { migrateSave,SAVE_VERSION,type WorldSave } from './migrations';

describe('P0.24.6 save migration',()=>{
 it('adds exactly one star staff to a v2 player so the staff discipline is reachable',()=>{
  const raw={saveVersion:2,tokens:{},players:[{id:'p',name:'T',level:1,xp:0,hp:1,maxHp:1,mp:1,maxMp:1,gold:0,inventory:[],equipment:{},stats:{} as any,x:0,z:0,angle:0,speed:0,state:'Idle',hitAt:0,staggerUntil:0,input:{x:0,z:0,sprint:false},inputAt:0,path:[],cooldowns:{},known:[],kills:{},online:false,revision:0,jumpAt:0}],listings:[]} as WorldSave;
  const once=migrateSave(raw);
  expect(once.saveVersion).toBe(SAVE_VERSION);
  expect(once.players[0].inventory.filter(i=>i.baseId==='star-staff')).toHaveLength(1);
  const twice=migrateSave(once);
  expect(twice.saveVersion).toBe(SAVE_VERSION);
  expect(twice.players[0].inventory.filter(i=>i.baseId==='star-staff')).toHaveLength(1);
 });
});
