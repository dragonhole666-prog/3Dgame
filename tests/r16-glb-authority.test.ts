import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R26 full locomotion / authored combat ownership policy (R16 compatibility gate)',()=>{
 const root=path.resolve(process.cwd());
 const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
 const retarget=fs.readFileSync(path.join(root,'src/client/character/mixamo-retarget.ts'),'utf8');
 const locomotion=fs.readFileSync(path.join(root,'src/shared/data/locomotion.ts'),'utf8');
 const world=fs.readFileSync(path.join(root,'server/world.ts'),'utf8');

 it('retains legacy body-only masks but gives them zero runtime weight while equipped',()=>{
  expect(runtime).toContain("type LocomotionLayer='full'|'weapon'");
  const bodySemantics=runtime.match(/const BODY_LOCOMOTION_SEMANTICS=\[([\s\S]*?)\] as const;/m)?.[1]??'';
  expect(bodySemantics).toContain('leftUpperLeg');expect(bodySemantics).toContain('rightUpperLeg');
  expect(bodySemantics).not.toContain('leftUpperArm');expect(bodySemantics).not.toContain('rightUpperArm');
  expect(runtime).toContain("this.activeLocomotion=selected;this.locomotionLayer='full'");
  expect(runtime).toContain('for(const action of this.layeredLocomotionActions.values())action.setEffectiveWeight(0)');
 });

 it('keeps authored animation authoritative and runs bounded contact/finger fixups after the mixer',()=>{
  const start=runtime.indexOf('update(dt:number,time:number'),end=runtime.indexOf('dispose()',start);const updateBlock=runtime.slice(start,end);
  expect(updateBlock).toContain('this.animationMixer?.update(dt)');
  expect(updateBlock).not.toContain('this.applyWeaponCombatChoreography()');
  expect(updateBlock).not.toContain('this.applyPrimaryWeaponOrientation()');
  expect(updateBlock).toContain('this.applySecondaryHandContactIK()');
  expect(updateBlock).toContain('this.syncHandMounts()');
  expect(updateBlock.indexOf('this.animationMixer?.update(dt)')).toBeLessThan(updateBlock.indexOf('this.applySecondaryHandContactIK()'));
 });

 it('blends Walk/Run in a narrow speed band and synchronizes normalized gait phase',()=>{
  expect(runtime).toContain('PLAYER_WALK_RUN_SWITCH-PLAYER_WALK_RUN_BLEND_HALF_WIDTH');expect(runtime).toContain('PLAYER_WALK_RUN_SWITCH+PLAYER_WALK_RUN_BLEND_HALF_WIDTH');expect(runtime).toContain('syncLoopPhase');
  expect(runtime).toContain('const blendedStride=T.MathUtils.lerp(walkStride,runStride,runBlend)');
  expect(runtime).toContain('const phaseHz=this.cadenceSpeed>.02?T.MathUtils.clamp(this.cadenceSpeed/blendedStride,.16,2.6):0');
  expect(runtime).toContain('walkFull.setEffectiveTimeScale(walkClip?phaseHz*walkClip.duration:0)');
  expect(runtime).toContain('runFull.setEffectiveTimeScale(runClip?phaseHz*runClip.duration:0)');
 });

 it('fades combat against full locomotion instead of body-only weapon locomotion',()=>{
  expect(runtime).toContain('this.setLocomotion(backgroundSpeed,1-this.activeOneShotBlend,false)');
  expect(runtime).not.toContain('const weaponMix=forceWeaponLayer');
  expect(runtime).not.toContain('authoritativeGlbMotionActive');
 });

 it('retains mapped GLB bone coverage, R20 root safety and accepted world speed',()=>{
  expect(retarget).toContain("['upperChest','mixamorig:Spine2']");expect(retarget).toContain("['leftToes','mixamorig:LeftToeBase']");expect(retarget).toContain("['rightLittleDistal','mixamorig:RightHandPinky3']");
  expect(retarget).toContain('new T.VectorKeyframeTrack');expect(retarget).toContain('addScaledVector(travel,-u)');expect(retarget).toContain('premultiply(parentRestWorld).multiply(restWorldInv)');expect(retarget).toContain("if(vrm0){q.x=-q.x;q.z=-q.z;}");
  expect(retarget).toContain('worldBob.set(0,T.MathUtils.clamp(delta.y,-.10,.10),0)');
  expect(locomotion).toContain('speed:1.7502182743728725');expect(locomotion).toContain('speed:5.545185503149063');expect(locomotion).toContain('PLAYER_WALK_SPEED=3.8');
  expect(world).toContain('PLAYER_RUN_SPEED:PLAYER_WALK_SPEED');
 });
});
