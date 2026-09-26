import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACTION_COMBAT_FLOW,bufferedChainOpenAt } from '../src/shared/combat/action-combat-flow';
import { ACTION_RPG_COMBAT_STANCE } from '../src/client/character/action-rpg-weapon-layer';
import type { AttackState,WeaponProfile } from '../src/shared/types';

describe('R27 data-driven flow combat',()=>{
  const root=path.resolve(process.cwd());
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
  const server=fs.readFileSync(path.join(root,'server/world.ts'),'utf8');

  it('defines an authored bounded engagement stance for every weapon family',()=>{
    const profiles:WeaponProfile[]=['sword','greatsword','dual','spear','staff','bow'];
    for(const profile of profiles){
      expect(ACTION_RPG_COMBAT_STANCE[profile]).toBeDefined();
      expect(ACTION_COMBAT_FLOW[profile].stance.runWeight).toBeLessThan(.06);
      expect(ACTION_COMBAT_FLOW[profile].stance.idleWeight).toBeGreaterThan(.7);
    }
    expect(runtime).toContain('createActionRpgCombatStanceClip');
    expect(runtime).toContain('this.combatStanceBlend');
    expect(runtime).toContain("actor.state==='Combat'||!!actor.attack");
  });

  it('keeps full authored locomotion underneath combat stance',()=>{
    const start=runtime.indexOf('private setLocomotion('),end=runtime.indexOf('private applyOutgoingCombatBlend',start);
    const block=runtime.slice(start,end);
    expect(block).toContain("this.activeLocomotion=selected;this.locomotionLayer='full'");
    expect(block).toContain('walkFull.setEffectiveWeight(walkWeight*weightScale)');
    expect(block).toContain('combatReadyWeight');
    expect(block).not.toContain("this.locomotionLayer='weapon'");
  });

  it('shapes anticipation, release, impact hold and recovery without changing hit authority',()=>{
    expect(runtime).toContain('flow.anticipationFraction');
    expect(runtime).toContain('flow.releaseExponent');
    expect(runtime).toContain('flow.hitStopScale');
    expect(runtime).toContain('flow.recoveryExponent');
    expect(runtime).toContain('this.reconciledCombatVisualPhase');
  });

  it('crossfades neighboring authored combat clips instead of hard snapping',()=>{
    expect(runtime).toContain('private applyOutgoingCombatBlend');
    expect(runtime).toContain('timing.transitionSeconds');
    expect(runtime).toContain('this.outgoingCombat=');
  });

  it('opens buffered chaining only inside recovery, never before the hit window',()=>{
    const attack:AttackState={id:1,skill:'basic',started:0,hitAt:.25,hitWindowEnd:.30,endsAt:.80,resolved:true,point:{x:0,z:0}};
    for(const profile of ['sword','greatsword','dual','spear','staff','bow'] as WeaponProfile[]){
      const t=bufferedChainOpenAt(attack,profile,true);
      expect(t).toBeGreaterThanOrEqual(.30);
      expect(t).toBeLessThan(.80);
    }
    expect(server).toContain('bufferedChainOpenAt(a,weaponProfile(p),currentSkill.interruptible)');
  });

  it('resets the three-hit basic chain after a weapon-specific inactivity window',()=>{
    expect(runtime).toContain('private lastBasicComboAt=-Infinity');
    expect(runtime).toContain('combo.resetSeconds');
    expect(runtime).toContain('this.basicCombo=0');
  });
});
