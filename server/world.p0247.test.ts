import { describe, expect, it } from 'vitest';
import { GameWorld } from './world';
import { createItem } from '../src/shared/domains/item';
import { WEAPON_PROFILES } from '../src/shared/data/skills';
import { MONSTERS } from '../src/shared/data/monsters';
import type { WeaponProfile } from '../src/shared/types';

const weaponByProfile:Record<WeaponProfile,string>={
 sword:'iron-sword',greatsword:'mountain-blade',dual:'twin-moon',spear:'jade-spear',staff:'star-staff',bow:'frost-bow'
};

describe('P0.24.7 authoritative combat timing',()=>{
 it('uses each weapon profile windup and recovery for basic attacks',()=>{
  for(const profile of Object.keys(weaponByProfile) as WeaponProfile[]){
   const world=new GameWorld(()=>.4),p=world.createPlayer(`timing-${profile}`,'Verifier'),target=[...world.monsters.values()][0];
   for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
   const weapon=createItem(weaponByProfile[profile],()=>.4);weapon.identified=true;p.equipment.mainhand=weapon;p.cooldowns={};p.attack=undefined;p.mp=p.maxMp;
   world.command(p.id,{type:'attack',skill:'basic',target:target.id});
   const attack=world.players.get(p.id)?.attack;
   expect(attack?.skill).toBe('basic');
   expect((attack!.hitAt-attack!.started)).toBeCloseTo(WEAPON_PROFILES[profile].windup,5);
   expect((attack!.endsAt-attack!.hitAt)).toBeCloseTo(WEAPON_PROFILES[profile].recovery,5);
  }
 });
 it('emits caster origin separately from the target impact point for staged VFX',()=>{
  const world=new GameWorld(()=>.4),p=world.createPlayer('staged-vfx','Verifier'),target=[...world.monsters.values()][0];
  for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.25,z:p.z+.2});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
  const staff=createItem('star-staff',()=>.4);staff.identified=true;p.equipment.mainhand=staff;p.cooldowns={};p.mp=p.maxMp;
  world.command(p.id,{type:'attack',skill:'fire-orb',target:target.id});
  const cast=world.events.find(e=>e.type==='cast'&&e.actor===p.id&&e.skill==='fire-orb');
  expect(cast).toBeDefined();expect(cast!.impactDelay).toBeCloseTo(p.attack!.hitAt-p.attack!.started,5);expect(cast!.castAt).toBeCloseTo(p.attack!.started,5);expect(cast!.impactAt).toBeCloseTo(p.attack!.hitAt,5);expect(cast!.originX).toBeCloseTo(p.x,5);expect(cast!.originZ).toBeCloseTo(p.z,5);expect(cast!.x).toBeCloseTo(target.x,5);expect(cast!.z).toBeCloseTo(target.z,5);
 });
});
