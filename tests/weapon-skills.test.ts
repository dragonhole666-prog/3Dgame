import { describe,it,expect } from 'vitest';
import { createItem } from '../src/shared/domains/item';
import { resolveSkillHotbar,isSkillAllowed,weaponCombatIdentity } from '../src/shared/combat/weapon-skills';
import { GameWorld } from '../server/world';
import { MONSTERS } from '../src/shared/data/monsters';

describe('P0.24.4 weapon-bound skills',()=>{
 it('changes the active skill discipline with the equipped weapon',()=>{
  const sword={mainhand:createItem('iron-sword',()=>.2)},staff={mainhand:createItem('star-staff',()=>.2)},bow={mainhand:createItem('frost-bow',()=>.2)};
  expect(resolveSkillHotbar(sword).map(x=>x.skillId)).toEqual(['basic','sword-wave','sword-step','sword-array','dash']);
  expect(resolveSkillHotbar(staff).map(x=>x.skillId)).toEqual(['basic','fire-orb','ice-spike','blizzard','dash']);
  expect(resolveSkillHotbar(bow).map(x=>x.skillId)).toEqual(['basic','piercing-arrow','frost-arrow','arrow-rain','dash']);
  expect(isSkillAllowed(sword,'thunder-mantra')).toBe(false);
  expect(isSkillAllowed(staff,'ice-spike')).toBe(true);
  expect(isSkillAllowed(staff,'blizzard')).toBe(true);
  expect(isSkillAllowed(staff,'thunder-mantra')).toBe(false);
 });
 it('unlocks a seventh-key exclusive only for its named legendary weapon',()=>{
  const heaven=createItem('heaven-sword',()=>.2),fire=createItem('sunfire-blade',()=>.2),frost=createItem('frost-immortal-bow',()=>.2);
  expect(resolveSkillHotbar({mainhand:heaven}).find(x=>x.key==='7')?.skillId).toBe('nine-heavens-thunder-prison');
  expect(resolveSkillHotbar({mainhand:fire}).find(x=>x.key==='7')?.skillId).toBe('burning-heaven-dragon');
  expect(resolveSkillHotbar({mainhand:frost}).find(x=>x.key==='7')?.skillId).toBe('frost-domain-thousand-arrows');
  expect(weaponCombatIdentity({mainhand:heaven}).element).toBe('lightning');
  expect(weaponCombatIdentity({mainhand:fire}).element).toBe('fire');
  expect(weaponCombatIdentity({mainhand:frost}).element).toBe('frost');
 });
 it('server refuses a cross-discipline skill and accepts the same skill after equipping its weapon',()=>{
  const world=new GameWorld(()=>.4),p=world.createPlayer('discipline','tester'),target=[...world.monsters.values()][0];
  for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.3,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
  world.command(p.id,{type:'attack',skill:'thunder-mantra',target:target.id});
  expect(p.attack).toBeUndefined();
  expect(world.events.some(e=>e.type==='notice'&&e.actor===p.id&&e.text?.includes('目前武器無法施展'))).toBe(true);

  const staff=createItem('star-staff',()=>.4);staff.identified=true;p.equipment.mainhand=staff;p.cooldowns={};p.mp=p.maxMp;world.events=[];
  world.command(p.id,{type:'attack',skill:'blizzard',target:target.id});
  expect(p.attack?.skill).toBe('blizzard');
  expect(world.events.some(e=>e.type==='cast'&&e.skill==='blizzard')).toBe(true);
 });
 it('server accepts the named legendary exclusive only when that weapon is equipped',()=>{
  const world=new GameWorld(()=>.4),p=world.createPlayer('legendary','tester'),target=[...world.monsters.values()][0];
  for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.3,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
  world.command(p.id,{type:'attack',skill:'nine-heavens-thunder-prison',target:target.id});
  expect(p.attack).toBeUndefined();
  const heaven=createItem('heaven-sword',()=>.4);heaven.identified=true;p.equipment.mainhand=heaven;p.cooldowns={};p.mp=p.maxMp;world.events=[];
  world.command(p.id,{type:'attack',skill:'nine-heavens-thunder-prison',target:target.id});
  expect(p.attack?.skill).toBe('nine-heavens-thunder-prison');
  expect(world.events.some(e=>e.type==='cast'&&e.skill==='nine-heavens-thunder-prison')).toBe(true);
 });
});
