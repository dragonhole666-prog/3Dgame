import { describe, expect, it } from 'vitest';
import { GameWorld } from './world';
import { createItem } from '../src/shared/domains/item';
import { MYTHIC_SKILL_CHOREOGRAPHY, SKILL_DEFINITIONS } from '../src/shared/data/skills';
import { MONSTERS } from '../src/shared/data/monsters';

const divine={
 'primordial-star-sword':'primordial-star-collapse',
 'void-sundering-blade':'void-rift-sunder',
 'celestial-burial-spear':'celestial-pillar-pierce',
 'myriad-law-staff':'myriad-law-heaven-wheel',
 'heavenfall-bow':'heavenfall-nine-stars',
 'yin-yang-dual':'yin-yang-reversal',
} as const;

describe('P0.25.2 dedicated mythic choreography',()=>{
 it('creates six different authoritative hit windows aligned to each skill',()=>{
  const seen=new Set<string>();
  for(const [itemId,skillId] of Object.entries(divine)){
   const world=new GameWorld(()=>.4),p=world.createPlayer(`p0252-${skillId}`,'Verifier'),target=[...world.monsters.values()][0];
   for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.25,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
   const weapon=createItem(itemId,()=>.4);weapon.identified=true;p.equipment.mainhand=weapon;p.cooldowns={};p.attack=undefined;p.mp=p.maxMp;
   world.command(p.id,{type:'attack',skill:skillId,target:target.id});const attack=p.attack!,choreo=MYTHIC_SKILL_CHOREOGRAPHY[skillId],skill=SKILL_DEFINITIONS[skillId],haste=1-p.stats.haste/100;
   expect(attack).toBeDefined();expect(attack.hitAt-attack.started).toBeCloseTo(skill.hitFrame*haste,5);expect(attack.hitWindowStart!-attack.started).toBeCloseTo(choreo.hitWindow[0]*haste,5);expect(attack.hitWindowEnd!-attack.started).toBeCloseTo(choreo.hitWindow[1]*haste,5);expect(attack.endsAt-attack.started).toBeCloseTo((choreo.hitWindow[1]+skill.recovery)*haste,5);seen.add(choreo.hitWindow.join(':'));
  }
  expect(seen.size).toBe(6);
 });
 it('keeps a mythic strike live after its nominal hit frame until the window closes',()=>{
  const world=new GameWorld(()=>.4),p=world.createPlayer('p0252-window','Verifier'),target=[...world.monsters.values()][0];for(const m of world.monsters.values())m.hp=0;Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.2,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
  const weapon=createItem('primordial-star-sword',()=>.4);weapon.identified=true;p.equipment.mainhand=weapon;p.cooldowns={};p.mp=p.maxMp;world.command(p.id,{type:'attack',skill:'primordial-star-collapse',target:target.id});const attack=p.attack!,startHp=target.hp;
  target.x=p.x+40;world.tick((attack.hitWindowStart!-world.time)+.01);expect(p.attack?.resolved).toBe(false);expect(target.hp).toBe(startHp);
  target.x=p.x+1.2;world.tick(.04);expect(p.attack?.resolved).toBe(true);expect(target.hp).toBeLessThan(startHp);
 });
});
