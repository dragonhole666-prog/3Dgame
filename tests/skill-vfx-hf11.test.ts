import { describe,expect,it } from 'vitest';
import { SKILL_VFX_PROFILES } from '../src/shared/data/skill-vfx-profiles';
import { SKILL_DEFINITIONS } from '../src/shared/data/skills';
import { WEAPON_SKILL_SETS } from '../src/shared/combat/weapon-skills';
import { WEAPON_ANIMATION_PROFILES } from '../src/client/character/weapon-animation-profiles';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fx=fs.readFileSync(path.join(root,'src/client/rendering/xianxia-skill-fx.ts'),'utf8');

describe('P0.26.8 HF11 profiled spell VFX',()=>{
 it('makes fireball a real pooled projectile with a separate impact phase',()=>{
  expect(SKILL_VFX_PROFILES['fire-orb'].projectile?.shape).toBe('orb');
  expect(SKILL_VFX_PROFILES['fire-orb'].impact?.kind).toBe('fire-burst');
  expect(fx).toContain('projectilePool');
  expect(fx).toContain('launchProfileProjectile');
  expect(fx).toContain('updateProjectiles');
 });
 it('adds a playable ice-spike projectile and persistent blizzard field to the staff discipline',()=>{
  expect(SKILL_DEFINITIONS['ice-spike'].vfx).toBe('ice-spike');
  expect(SKILL_VFX_PROFILES['ice-spike'].projectile?.shape).toBe('shard');
  expect(SKILL_VFX_PROFILES['ice-spike'].impact?.kind).toBe('ice-spikes');
  expect(SKILL_DEFINITIONS.blizzard.vfx).toBe('blizzard');
  expect(SKILL_VFX_PROFILES.blizzard.field?.kind).toBe('blizzard');
  expect(SKILL_VFX_PROFILES.blizzard.field?.life).toBeGreaterThanOrEqual(4);
  expect(WEAPON_SKILL_SETS.staff).toEqual(['basic','fire-orb','ice-spike','blizzard','dash']);
  expect(WEAPON_ANIMATION_PROFILES.staff.skillBindings['fire-orb']).toBe('StaffFireOrb');
  expect(WEAPON_ANIMATION_PROFILES.staff.skillBindings['ice-spike']).toBe('StaffSeal');
  expect(WEAPON_ANIMATION_PROFILES.staff.skillBindings.blizzard).toBe('StaffSkyCall');
 });
 it('keeps desktop/mobile VFX budgets explicit and particle memory pooled',()=>{
  expect(fx).toContain("this.quality==='reduced'?144:this.spellParticles.length");
  expect(fx).toContain("this.quality==='reduced'?.34:1");
  expect(fx).toContain('spellParticleCursor');
  expect(fx).toContain('releaseProjectile');
 });
});
