import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACTION_RPG_READY } from '../src/client/character/action-rpg-weapon-layer';
import { WEAPON_ANIMATION_PROFILES } from '../src/client/character/weapon-animation-profiles';

describe('R26 responsive action-RPG weapon language compatibility',()=>{
 const root=path.resolve(process.cwd());
 const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
 it('defines a conservative authored source for every weapon family',()=>{
   for(const p of ['sword','greatsword','dual','spear','staff','bow'] as const){expect(ACTION_RPG_READY[p]).toBeDefined();expect(ACTION_RPG_READY[p].sourceBlend).toBeLessThan(.35);}
 });
 it('returns basic attacks to existing authored VRMA clips',()=>{
   expect(WEAPON_ANIMATION_PROFILES.greatsword.basicCombo).toEqual(['HeavySlash','GreatswordMountainCleave','GreatswordSmash']);
   expect(WEAPON_ANIMATION_PROFILES.staff.basicCombo).toEqual(['StaffCast','StaffFireOrb','StaffSeal']);
   expect(runtime).toContain('basicComboClips(this.profile,this.classAnimationSetId)');
   expect(runtime).not.toContain('createClassicMmoBasicAttackClip');
 });
 it('keeps primary arms free of world-space IK',()=>{
   expect(runtime).not.toContain('applyWeaponCombatChoreography()');
   expect(runtime).not.toContain('applyPrimaryWeaponOrientation()');
 });
});
