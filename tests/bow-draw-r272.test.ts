import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PLAYER_WALK_SPEED } from '../src/shared/data/locomotion';
import { sampleWeaponCombatArmInto } from '../src/client/character/weapon-combat-motion';
import * as T from 'three';
import { combatMotionSpec } from '../src/client/character/weapon-animation-profiles';

const root=path.resolve(import.meta.dirname,'..');

describe('R27.2 walk speed + bow draw correction',()=>{
 it('raises default ground travel while keeping run faster',()=>{
   expect(PLAYER_WALK_SPEED).toBeCloseTo(3.8,6);
 });
 it('keeps a true left bow arm and right cheek/string arm path',()=>{
   const left=new T.Vector3(),leftPole=new T.Vector3(),right=new T.Vector3(),rightPole=new T.Vector3();
   const lw=sampleWeaponCombatArmInto('bow','BowShot',.50,true,'left',left,leftPole);
   const rw=sampleWeaponCombatArmInto('bow','BowShot',.50,true,'right',right,rightPole);
   expect(lw).toBeGreaterThan(.5);expect(rw).toBeGreaterThan(.65);
   expect(left.z).toBeGreaterThan(.55); // bow hand is extended forward
   expect(right.z).toBeLessThan(.12);  // string hand stays near the face plane
   expect(right.y).toBeGreaterThan(1.45); // cheek/eye-line anchor
   expect(rightPole.x).toBeGreaterThan(.35); // elbow opens outward instead of collapsing inward
 });
 it('applies corrective IK only to active bow attacks',()=>{
   const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
   const correction=combatMotionSpec('BowShot').poseCorrection;
   expect(correction?.kind).toBe('bow-draw');
   expect(correction&&correction.kind==='bow-draw'?correction.leftArmCap:0).toBeCloseTo(.76,6);
   expect(correction&&correction.kind==='bow-draw'?correction.rightArmCap:0).toBeCloseTo(.88,6);
   expect(runtime).toContain('poseCorrectionFor(this.activeOneShot)');
   expect(runtime).toContain('this.applyBowDrawCorrection()');
   expect(runtime).toContain("this.rawBone('leftUpperArm')");
   expect(runtime).toContain("this.rawBone('rightUpperArm')");
   expect(runtime).toContain('leftReach');
   expect(runtime).toContain('rightReach');
   expect(runtime).toContain('this.bowAnchor');
 });
});
