import { describe,expect,it } from 'vitest';
import { WEAPON_GRIP_PROFILES } from '../src/client/character/weapon-grip';
import { MIXAMO_LOCOMOTION } from '../src/client/character/mixamo-retarget';
import { MONSTERS } from '../src/shared/data/monsters';
import { MONSTER_SKILLS } from '../src/shared/domains/combat';
import { REGIONS } from '../src/shared/data/world';

describe('R14/R24 grip / locomotion / Golden Queen integration',()=>{
 it('defines physical grip behavior for every weapon profile',()=>{
  expect(Object.keys(WEAPON_GRIP_PROFILES).sort()).toEqual(['bow','dual','greatsword','spear','staff','sword']);
  expect(WEAPON_GRIP_PROFILES.dual.mirroredSecondaryWeapon).toBe(true);
  for(const id of ['greatsword','spear'] as const){expect(WEAPON_GRIP_PROFILES[id].secondary?.side).toBe('left');expect(WEAPON_GRIP_PROFILES[id].secondary?.combatIk).toBeGreaterThan(0);}
  expect(WEAPON_GRIP_PROFILES.staff.secondary).toBeDefined();
  expect(WEAPON_GRIP_PROFILES.staff.secondary?.idleIk).toBeLessThanOrEqual(.34);
  expect(WEAPON_GRIP_PROFILES.staff.secondary?.combatIk).toBeGreaterThan(.65);
  expect(WEAPON_GRIP_PROFILES.staff.secondary?.combatCap).toBeGreaterThan(.65);
  expect(WEAPON_GRIP_PROFILES.bow.primary.side).toBe('left');
 });
 it('uses the supplied Walking and Fast Run assets',()=>{
  expect(MIXAMO_LOCOMOTION.walk).toBe('/assets/animations/mixamo/Walking.glb');
  expect(MIXAMO_LOCOMOTION.run).toBe('/assets/animations/mixamo/Fast_Run.glb');
 });
 it('registers a phase-driven Golden Queen boss kit and region',()=>{
  const queen=MONSTERS['golden-queen'];expect(queen.aiProfile).toBe('boss');expect(queen.bossBehavior).toBe('queen-duelist');expect(queen.assetLocal).toBe('/assets/bosses/golden_queen.glb');
  expect(queen.skills).toEqual(['queen-slash','queen-cross','queen-spin','queen-dash','queen-burst']);
  for(const skill of queen.skills)expect(MONSTER_SKILLS[skill]).toBeDefined();
  expect(REGIONS.find(region=>region.id==='queen')).toMatchObject({x:8,z:140});
 });
});
