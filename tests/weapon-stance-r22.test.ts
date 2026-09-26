import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { WEAPON_GRIP_PROFILES } from '../src/client/character/weapon-grip';
import { PLAYER_AUTHORED_LOCOMOTION,PLAYER_WALK_SPEED,PLAYER_RUN_SPEED } from '../src/shared/data/locomotion';
import { ACTION_RPG_READY } from '../src/client/character/action-rpg-weapon-layer';

describe('R26 weapon contact / brisk-walk compatibility',()=>{
  const root=path.resolve(process.cwd());
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
  const curated=fs.readFileSync(path.join(root,'src/client/character/curated-equipment.ts'),'utf8');

  it('preserves the accepted 3.8 m/s walk and cadence foot lock',()=>{
    expect(PLAYER_WALK_SPEED).toBeCloseTo(3.8,6);
    expect(PLAYER_RUN_SPEED).toBeCloseTo(PLAYER_AUTHORED_LOCOMOTION.run.speed,6);
    expect(PLAYER_RUN_SPEED).toBeGreaterThan(PLAYER_WALK_SPEED);
    expect(runtime).toContain('this.cadenceSpeed/blendedStride');
  });

  it('uses physical second-hand contact for true two-hand weapon families',()=>{
    expect(WEAPON_GRIP_PROFILES.greatsword.secondary).toBeDefined();
    expect(WEAPON_GRIP_PROFILES.spear.secondary).toBeDefined();
    expect(WEAPON_GRIP_PROFILES.staff.secondary).toBeDefined();
    expect(WEAPON_GRIP_PROFILES.bow.secondary).toBeUndefined();
    expect(WEAPON_GRIP_PROFILES.dual.mirroredSecondaryWeapon).toBe(true);
  });

  it('uses rig-derived additive ready poses and fades them almost completely during movement',()=>{
    expect(runtime).toContain('createActionRpgReadyClip');
    expect(runtime).toContain('const stationary=1-T.MathUtils.smoothstep(speed,.10,.90)');
    for(const p of Object.keys(ACTION_RPG_READY) as (keyof typeof ACTION_RPG_READY)[])expect(ACTION_RPG_READY[p].moveWeight).toBeLessThanOrEqual(.08);
  });

  it('does not drive primary shoulders/wrists with procedural weapon IK',()=>{
    const start=runtime.indexOf('update(dt:number,time:number'),end=runtime.indexOf('dispose()',start);
    const update=runtime.slice(start,end);
    expect(update).not.toContain('applyPrimaryWeaponOrientation');
    expect(update).not.toContain('applyWeaponCombatChoreography');
    expect(runtime).not.toContain('BASIC_ATTACK_ARM_IK');
    expect(runtime).not.toContain('primaryAxis:');
  });

  it('keeps curated bow normalization without a forced 90-degree roll',()=>{
    expect(curated).not.toContain("localRotation:[0,0,-Math.PI/2]");
  });
});
