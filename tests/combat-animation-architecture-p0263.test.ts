import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ClassAnimationSet } from '../src/client/character/combat-animation-types';
import { CLASS_ANIMATION_SETS,DEFAULT_CLASS_ANIMATION_SET_ID,resolveWeaponAnimationProfileForSet } from '../src/client/character/class-animation-sets';
import { COMBAT_MOTION_LIBRARY,WEAPON_ANIMATION_PROFILES,combatAnimationAssetOverride,combatMotionSpec } from '../src/client/character/weapon-animation-profiles';
import { resolveCombatMotionClip } from '../src/client/character/combat-animation-resolver';
import { humanoidAnimationAsset } from '../src/client/character/character-runtime-architecture';

const root=path.resolve(process.cwd());
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('P0.26.3 data-driven combat animation architecture',()=>{
  it('moves stance, combo, role and skill bindings into weapon profiles',()=>{
    for(const profile of ['sword','greatsword','dual','spear','staff','bow'] as const){
      const p=WEAPON_ANIMATION_PROFILES[profile];
      expect(p.stance.ready.source).toBeTruthy();
      expect(p.stance.engaged.source).toBeTruthy();
      expect(p.basicCombo.length).toBeGreaterThanOrEqual(3);
      expect(p.blend.enter).toBeGreaterThan(0);
    }
    expect(WEAPON_ANIMATION_PROFILES.spear.actions.thrust).toBe('SpearThrust');
    expect(WEAPON_ANIMATION_PROFILES.spear.actions.sweep).toBe('SpearSweep');
    expect(WEAPON_ANIMATION_PROFILES.spear.actions.lunge).toBe('SpearSkyPierce');
    expect(WEAPON_ANIMATION_PROFILES.bow.actions.drawRelease).toBe('BowShot');
  });

  it('keeps bow Draw/Release correction timing in motion data rather than clip-name branches',()=>{
    const bow=combatMotionSpec('BowShot').poseCorrection;
    expect(bow?.kind).toBe('bow-draw');
    if(!bow||bow.kind!=='bow-draw')throw new Error('bow correction missing');
    expect(bow.drawInEnd).toBeLessThan(bow.anchorStart);
    expect(bow.anchorStart).toBeLessThan(bow.releaseStart);
    expect(bow.releaseStart).toBeLessThan(bow.releaseEnd);
    expect(bow.stringHook).toBe(true);
    expect(combatMotionSpec('HeavenfallNineStars').poseCorrection?.kind).toBe('bow-draw');
  });

  it('resolves skill motions without skill-specific CharacterRuntime branches',()=>{
    expect(resolveCombatMotionClip('spear','dragon-thrust','weapon')).toBe('SpearThrust');
    expect(resolveCombatMotionClip('spear','spear-sweep','heavy')).toBe('SpearSweep');
    expect(resolveCombatMotionClip('spear','sky-pierce','heavy')).toBe('SpearSkyPierce');
    expect(resolveCombatMotionClip('bow','piercing-arrow','ranged')).toBe('BowPiercingShot');
    expect(resolveCombatMotionClip('spear','legacy-heavy','heavy')).toBe('SpearThrust');
    expect(resolveCombatMotionClip('staff','legacy-cast','cast')).toBe('StaffCast');
    const runtime=read('src/client/character/vrm-character-runtime.ts');
    const resolver=read('src/client/character/combat-animation-resolver.ts');
    expect(resolver).not.toContain("profile==='spear'");
    expect(resolver).not.toContain("profile==='staff'");
    expect(resolver).not.toContain("profile==='bow'");
    expect(runtime).toContain('resolveCombatMotionClip(this.profile');
    expect(runtime).not.toContain("if(a.skill==='spear-sweep')");
    expect(runtime).not.toContain('const SKILL_MOTION_CLIPS');
    expect(runtime).not.toContain('const ATTACK_HIT_PHASE');
    expect(runtime).not.toContain('const ATTACK_HITSTOP');
  });

  it('supports class animation-set overrides without changing the runtime',()=>{
    expect(CLASS_ANIMATION_SETS[DEFAULT_CLASS_ANIMATION_SET_ID]).toBeDefined();
    const set:ClassAnimationSet={
      id:'test-awakening',label:'test',specialization:'awakening',skillOverrides:{},
      weaponOverrides:{spear:{actions:{lunge:'CelestialPillarPierce'},basicCombo:['SpearThrust','SpearSweep','CelestialPillarPierce'],blend:{enter:.07},animationProfileBindings:{heavy:'CelestialPillarPierce'}}}
    };
    const spear=resolveWeaponAnimationProfileForSet('spear',set);
    expect(spear.actions.lunge).toBe('CelestialPillarPierce');
    expect(spear.basicCombo[2]).toBe('CelestialPillarPierce');
    expect(spear.blend.enter).toBeCloseTo(.07,6);
    expect(spear.animationProfileBindings.heavy).toBe('CelestialPillarPierce');
    expect(spear.stance.ready.source).toBe(WEAPON_ANIMATION_PROFILES.spear.stance.ready.source);
    expect(read('src/client/character/character-composition-runtime.ts')).toContain('setClassAnimationSet(id:string)');
  });

  it('allows any motion to switch from VRMA to GLB through the manifest/data layer',()=>{
    expect(combatAnimationAssetOverride('SpearThrust')).toBeUndefined();
    expect(humanoidAnimationAsset('SpearThrust').kind).toBe('vrma');
    expect(humanoidAnimationAsset('Walk').kind).toBe('glb-mixamo');
    expect(Object.keys(COMBAT_MOTION_LIBRARY).length).toBeGreaterThan(20);
    const architecture=read('src/client/character/character-runtime-architecture.ts');
    expect(architecture).toContain('combatAnimationAssetOverride(name)');
  });
});
