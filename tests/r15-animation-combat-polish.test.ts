import { describe,expect,it } from 'vitest';
import { weaponMotionDefinition } from '../src/client/character/weapon-combat-motion';
import { WEAPON_GRIP_PROFILES } from '../src/client/character/weapon-grip';
import { MONSTERS } from '../src/shared/data/monsters';

describe('R15/R24 animation retarget / boss scale / weapon choreography compatibility',()=>{
 it('retains legacy choreography metadata for every weapon profile',()=>{
  for(const profile of ['sword','greatsword','dual','spear','staff','bow'] as const){
   const def=weaponMotionDefinition(profile);expect(def.guard.length).toBeGreaterThan(0);expect(def.fallback.length).toBeGreaterThan(0);
  }
  expect(Object.keys(weaponMotionDefinition('sword').attacks)).toEqual(expect.arrayContaining(['Attack1','Attack2','Attack3']));
  expect(Object.keys(weaponMotionDefinition('dual').attacks)).toEqual(expect.arrayContaining(['DualFlurry','DualCross','DualShadowDance','DualThousandFlash']));
  expect(Object.keys(weaponMotionDefinition('spear').attacks)).toEqual(expect.arrayContaining(['SpearThrust','SpearSweep','SpearSkyPierce']));
  expect(Object.keys(weaponMotionDefinition('bow').attacks)).toEqual(expect.arrayContaining(['BowShot','BowPiercingShot','BowFrostShot','BowVolley']));
 });
 it('keeps real two-hand weapons on bounded physical support-hand contact IK',()=>{
  expect(WEAPON_GRIP_PROFILES.greatsword.secondary?.combatIk).toBeGreaterThan(0);
  expect(WEAPON_GRIP_PROFILES.greatsword.secondary?.combatIk).toBeLessThanOrEqual(.30);
  expect(WEAPON_GRIP_PROFILES.spear.secondary?.combatIk).toBeGreaterThan(.70);
  expect(WEAPON_GRIP_PROFILES.spear.secondary?.combatCap).toBeGreaterThan(.70);
  expect(WEAPON_GRIP_PROFILES.staff.secondary).toBeDefined();
  expect(WEAPON_GRIP_PROFILES.staff.secondary?.combatIk).toBeGreaterThan(.65);
  expect(WEAPON_GRIP_PROFILES.staff.secondary?.combatCap).toBeGreaterThan(.65);
  expect(WEAPON_GRIP_PROFILES.bow.secondary).toBeUndefined();
 });
 it('defines Golden Queen height relative to player instead of source GLB units',()=>{
  expect(MONSTERS['golden-queen'].visualHeightRatio).toBe(2.20);
  expect(MONSTERS['golden-queen'].combatRadius).toBe(1.35);
 });
});
