import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R18/R26 weapon upper-body layering regression',()=>{
  const root=path.resolve(process.cwd());
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');

  it('retains the historical upper-body mask data but does not use it to replace equipped locomotion arms',()=>{
    const upper=runtime.match(/const WEAPON_UPPER_BASE_SEMANTICS=\[([\s\S]*?)\] as const;/m)?.[1]??'';
    expect(upper).toContain('leftShoulder');expect(upper).toContain('leftUpperArm');expect(upper).toContain('leftLowerArm');expect(upper).toContain('leftHand');
    expect(upper).toContain('rightShoulder');expect(upper).toContain('rightUpperArm');expect(upper).toContain('rightLowerArm');expect(upper).toContain('rightHand');
    expect(runtime).toContain('QinglanWeaponUpperBase_Idle');
  });

  it('keeps full locomotion authoritative and applies only a tiny additive ready layer',()=>{
    const setLocomotion=runtime.match(/private setLocomotion\([\s\S]*?\n  \}\n  private oneShot/m)?.[0]??'';
    expect(setLocomotion).toContain("this.locomotionLayer='full'");
    expect(setLocomotion).toContain('resolveWeaponAnimationProfile(this.profile,this.classAnimationSetId).stance.ready');
    expect(setLocomotion).toContain('this.weaponUpperBaseAction?.setEffectiveWeight(0)');
    expect(runtime).toContain('this.setLocomotion(backgroundSpeed,1-this.activeOneShotBlend,false)');
  });

  it('uses authored basic attacks without world-space primary-arm rewriting',()=>{
    const update=runtime.match(/update\(dt:number,time:number,[\s\S]*?\n  dispose\(/m)?.[0]??'';
    expect(runtime).not.toContain('BASIC_ATTACK_ARM_IK');
    expect(runtime).not.toContain('createClassicMmoBasicAttackClip');
    expect(update).not.toContain('applyWeaponCombatChoreography');
    expect(update).not.toContain('applyPrimaryWeaponOrientation');
    expect(update).toContain('this.applySecondaryHandContactIK()');
  });

  it('keeps legacy body-only locomotion masks disjoint even though R26 gives them zero runtime weight',()=>{
    const body=runtime.match(/const BODY_LOCOMOTION_SEMANTICS=\[([\s\S]*?)\] as const;/m)?.[1]??'';
    const upper=runtime.match(/const WEAPON_UPPER_BASE_SEMANTICS=\[([\s\S]*?)\] as const;/m)?.[1]??'';
    expect(body).toContain('upperChest');expect(body).not.toContain('UpperArm');expect(body).not.toContain('Hand');
    expect(upper).not.toContain('hips');expect(upper).not.toContain('UpperLeg');
  });
});
