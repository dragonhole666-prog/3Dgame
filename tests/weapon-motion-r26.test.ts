import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ACTION_RPG_READY } from '../src/client/character/action-rpg-weapon-layer';
import { PLAYER_WALK_SPEED } from '../src/shared/data/locomotion';
import { WEAPON_ANIMATION_PROFILES } from '../src/client/character/weapon-animation-profiles';

const sha=(p:string)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

describe('R26 safe action-RPG weapon layer',()=>{
  const root=path.resolve(process.cwd());
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
  const ready=fs.readFileSync(path.join(root,'src/client/character/action-rpg-weapon-layer.ts'),'utf8');

  it('keeps the accepted R25 locomotion speed and supplied locomotion assets',()=>{
    expect(PLAYER_WALK_SPEED).toBeCloseTo(3.8,6);
    expect(sha(path.join(root,'src/client/character/mixamo-retarget.ts'))).toBe('eb31206ccaa04451f363e55821d5ede909700f8cd3966a97e598b396bb909726');
    expect(sha(path.join(root,'public/assets/animations/mixamo/Walking.glb'))).toBe('dce96054f2befa04435c768ecc7c17bd22094a3b6a7013859beb773676c8ab4f');
    expect(sha(path.join(root,'public/assets/animations/mixamo/Fast_Run.glb'))).toBe('00fa9f493cbd8df6cfbd170304ca199f63aba032ef575276861f93250a412b71');
  });

  it('always keeps full Walking/Fast_Run as the equipped locomotion base',()=>{
    const start=runtime.indexOf('private setLocomotion('),end=runtime.indexOf('private oneShot',start);
    const block=runtime.slice(start,end);
    expect(block).toContain("this.activeLocomotion=selected;this.locomotionLayer='full'");
    expect(block).toContain('walkFull.setEffectiveWeight(walkWeight*weightScale)');
    expect(block).toContain('runFull.setEffectiveWeight(runWeight*weightScale)');
    expect(block).toContain('for(const action of this.layeredLocomotionActions.values())action.setEffectiveWeight(0)');
    expect(block).not.toContain('weaponMix=');
  });

  it('uses a small rig-derived additive ready pose instead of hard-coded Euler guard poses',()=>{
    for(const p of ['sword','greatsword','dual','spear','staff','bow'] as const){
      expect(ACTION_RPG_READY[p].moveWeight).toBeLessThanOrEqual(.08);
      expect(ACTION_RPG_READY[p].idleWeight).toBeLessThanOrEqual(.76);
      expect(ACTION_RPG_READY[p].sourceBlend).toBeLessThanOrEqual(.32);
    }
    expect(ready).toContain('T.AnimationUtils.makeClipAdditive');
    expect(ready).toContain('MAX_ANGLE_DEG');
    expect(runtime).toContain('createActionRpgReadyClip');
    expect(runtime).not.toContain('createClassicMmoGuardClip');
  });

  it('restores authored basic attacks and skills instead of synthetic arm replacement clips',()=>{
    expect(WEAPON_ANIMATION_PROFILES.sword.basicCombo).toEqual(['Attack1','Attack2','Attack3']);
    expect(WEAPON_ANIMATION_PROFILES.spear.basicCombo).toEqual(['SpearThrust','SpearSweep','SpearSkyPierce']);
    expect(WEAPON_ANIMATION_PROFILES.bow.basicCombo).toEqual(['BowShot','BowPiercingShot','BowFrostShot']);
    expect(runtime).toContain('basicComboClips(this.profile,this.classAnimationSetId)');
    expect(runtime).not.toContain('createClassicMmoBasicAttackClip');
    expect(runtime).not.toContain('MmoSword1');
  });

  it('keeps equip smoothing gentle while support-hand correction is profile-bounded',()=>{
    expect(runtime).toContain('Math.exp(-8.5*dt)');
    expect(runtime).toContain('T.MathUtils.lerp(1,.18,moving)');
    expect(runtime).toContain('strength=Math.min(combat?(secondary.combatCap??.08):(secondary.idleCap??.12),strength)');
  });
});
