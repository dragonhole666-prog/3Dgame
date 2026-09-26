import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {HEROIC_GROUNDED_LOCOMOTION} from '../src/client/character/locomotion-style-profiles';
import {curatedEquipmentDefinition} from '../src/client/character/curated-equipment';
import {weaponGripProfile} from '../src/client/character/weapon-grip';
import {sampleWeaponCombatArmInto} from '../src/client/character/weapon-combat-motion';
import {combatMotionSpec} from '../src/client/character/weapon-animation-profiles';

describe('P0.26.4 grounded locomotion + mechanically-correct archery',()=>{
  it('damps pelvis/torso lateral sway without replacing authored walk/run timing',()=>{
    expect(HEROIC_GROUNDED_LOCOMOTION.id).toBe('heroic-grounded');
    expect(HEROIC_GROUNDED_LOCOMOTION.walk['mixamorig:Hips'].rollScale).toBeLessThan(.5);
    expect(HEROIC_GROUNDED_LOCOMOTION.walk['mixamorig:Hips'].yawScale).toBeLessThan(.7);
    expect(HEROIC_GROUNDED_LOCOMOTION.run['mixamorig:Hips'].rollScale).toBeLessThan(.6);
    expect(HEROIC_GROUNDED_LOCOMOTION.referenceSources.some(s=>s.name.includes('Quaternius'))).toBe(true);
  });

  it('keeps the left hand on the physical bow and turns the bow plane target-forward',()=>{
    const bow=curatedEquipmentDefinition('heavenfall-bow');
    expect(bow?.attach).toBe('leftHand');
    expect(weaponGripProfile('bow').primary.side).toBe('left');
    expect(bow?.localRotation).toBeUndefined();
    expect(weaponGripProfile('bow').secondary).toBeUndefined();
    expect(weaponGripProfile('bow').proceduralMountRotation).toEqual([0,0,0]);
  });

  it('draws the string hand back to the cheek with the elbow behind/outside the shoulder',()=>{
    const left=new T.Vector3(),leftPole=new T.Vector3(),right=new T.Vector3(),rightPole=new T.Vector3();
    const lw=sampleWeaponCombatArmInto('bow','BowShot',.56,true,'left',left,leftPole);
    const rw=sampleWeaponCombatArmInto('bow','BowShot',.56,true,'right',right,rightPole);
    expect(lw).toBeGreaterThan(.65);expect(rw).toBeGreaterThan(.75);
    expect(left.z).toBeGreaterThan(.68);       // bow grip remains toward target (+Z)
    expect(right.z).toBeLessThan(0);           // string hand is behind the body/face plane
    expect(right.y).toBeGreaterThan(1.50);     // cheek / eye-line anchor
    expect(rightPole.x).toBeGreaterThan(.65);  // draw elbow opens outward
    expect(rightPole.z).toBeLessThan(-.18);    // draw elbow stays behind the shoulder
  });

  it('keeps Draw -> Anchor -> Release -> Follow-through ordered in weapon data',()=>{
    const correction=combatMotionSpec('BowShot').poseCorrection;
    expect(correction?.kind).toBe('bow-draw');
    if(!correction||correction.kind!=='bow-draw')throw new Error('BowShot correction missing');
    expect(correction.drawInEnd).toBeLessThan(correction.anchorStart);
    expect(correction.anchorStart).toBeLessThan(correction.releaseStart);
    expect(correction.releaseStart).toBeLessThan(correction.releaseEnd);
    expect(correction.stringHook).toBe(true);
  });
});
