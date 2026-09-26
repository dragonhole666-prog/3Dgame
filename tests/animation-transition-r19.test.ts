import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R19 unified character animation transition policy',()=>{
  const root=path.resolve(process.cwd());
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
  const queen=fs.readFileSync(path.join(root,'src/client/character/golden-queen-animator.ts'),'utf8');

  it('uses explicit interruption priority death > hit > attack > jump > pickup > locomotion',()=>{
    const block=runtime.match(/private resolveAnimation\([\s\S]*?\n  \}\n  playPickup/m)?.[0]??'';
    const death=block.indexOf('if(actor.hp<=0)');
    const hit=block.indexOf('if(actor.staggerUntil>time&&hitAge>=0)');
    const attack=block.indexOf('const authoritative=actor.attack');
    const jump=block.indexOf('if(!actor.flight&&jumpAge>=0&&jumpAge<jumpDuration)');
    const pickup=block.lastIndexOf('if(this.pickup)');
    const locomotion=block.lastIndexOf('this.zeroAnimationWeights();this.setLocomotion(speed)');
    expect(death).toBeGreaterThan(-1);
    expect(death).toBeLessThan(hit);
    expect(hit).toBeLessThan(attack);
    expect(attack).toBeLessThan(jump);
    expect(jump).toBeLessThan(pickup);
    expect(pickup).toBeLessThan(locomotion);
    const tail=block.slice(pickup);
    expect(tail).toContain("this.oneShot(this.pickup.clip,`pickup:${this.pickup.started}`,age/duration,speed,weight);return;");
    expect(tail).toContain('this.zeroAnimationWeights();this.setLocomotion(speed)');
  });

  it('blends non-combat one-shots instead of hard cutting locomotion',()=>{
    expect(runtime).toContain('private motionEnvelope(');
    expect(runtime).toContain("this.oneShot('Hit',`hit:${actor.hitAt}`,phase,speed,weight)");
    expect(runtime).toContain("this.oneShot('Jump',`jump:${actor.jumpAt}`,jumpAge/jumpDuration,speed,weight)");
    expect(runtime).toContain('this.oneShot(this.pickup.clip,`pickup:${this.pickup.started}`,age/duration,speed,weight)');
    expect(runtime).toContain("this.oneShot('Death','death',phase,speed,weight)");
    expect(runtime).toContain('this.activeOneShotBlend=T.MathUtils.clamp(weight,0,1)');
  });

  it('maps Hit over authoritative stagger duration and prevents predicted attack masking it',()=>{
    const block=runtime.match(/private resolveAnimation\([\s\S]*?\n  \}\n  playPickup/m)?.[0]??'';
    expect(block).toContain('const staggerDuration=Math.max(.12,actor.staggerUntil-actor.hitAt)');
    const hitStart=block.indexOf('if(actor.staggerUntil>time&&hitAge>=0)');
    const attackStart=block.indexOf('const authoritative=actor.attack');
    const hitBlock=block.slice(hitStart,attackStart);
    expect(hitBlock).toContain('this.predictedAttack=undefined');
    expect(hitBlock).toContain('this.pickup=undefined');
    expect(hitBlock).toContain('this.outgoingCombat=undefined');
    expect(hitBlock).toContain('this.clearCombatContinuity()');
    expect(hitStart).toBeGreaterThan(-1);
    expect(hitStart).toBeLessThan(attackStart);
  });

  it('reconciles prediction to authoritative attack phase without a network-confirmation jump',()=>{
    expect(runtime).toContain('private reconciledCombatVisualPhase(');
    expect(runtime).toContain('this.combatPhaseCorrection=T.MathUtils.clamp(this.activeCombatPhase-raw,-.16,.16)');
    expect(runtime).toContain('this.combatPhaseCorrection*Math.exp(-age*18)');
  });

  it('smoothly equips a tiny additive ready layer without taking locomotion arm ownership',()=>{
    expect(runtime).toContain('private weaponLayerBlend=0');
    expect(runtime).toContain('this.weaponLayerBlend+=(weaponTarget-this.weaponLayerBlend)*(1-Math.exp(-8.5*dt))');
    expect(runtime).toContain('idleFull.setEffectiveWeight(idleWeight*weightScale)');
    expect(runtime).toContain('walkFull.setEffectiveWeight(walkWeight*weightScale)');
    expect(runtime).toContain('runFull.setEffectiveWeight(runWeight*weightScale)');
    expect(runtime).toContain("this.activeLocomotion=selected;this.locomotionLayer='full'");
    expect(runtime).toContain('const readyWeight=weightScale*T.MathUtils.clamp(this.weaponLayerBlend,0,1)');
  });

  it('fades contact-only support-hand ownership with transient motion and shares Jump duration with vertical root motion',()=>{
    expect(runtime).toContain('private nonCombatArmOwnership()');
    expect(runtime).not.toContain('const transientOwnership=combat?1:this.nonCombatArmOwnership()*T.MathUtils.clamp(this.weaponLayerBlend,0,1)');
    expect(runtime).not.toContain('sample.weight*guardScale)*transientOwnership');
    expect(runtime).toContain('secondary.idleIk*this.nonCombatArmOwnership()*T.MathUtils.clamp(this.weaponLayerBlend,0,1)');
    expect(runtime).toContain('strength*=T.MathUtils.lerp(1,.18,moving)');
    expect(runtime).toContain('strength=Math.min(combat?(secondary.combatCap??.08):(secondary.idleCap??.12),strength)');
    expect(runtime).toContain('const jumpDuration=this.jumpDuration(),jump=actor?time-actor.jumpAt:jumpDuration+1');
    expect(runtime).toContain('jumpAge<jumpDuration');
  });
  it('brings the rigged Golden Queen onto the same smooth transition policy',()=>{
    expect(queen).toContain('GoldenQueen_WeaponBody_Walking');
    expect(queen).toContain('GoldenQueen_WeaponBody_FastRun');
    expect(queen).toContain('const runBlend=T.MathUtils.smoothstep(speed,PLAYER_WALK_RUN_SWITCH-.42,PLAYER_WALK_RUN_SWITCH+.42)');
    expect(queen).toContain('const blendedStride=T.MathUtils.lerp');
    expect(queen).toContain('const phaseHz=speed>.02?T.MathUtils.clamp(speed/blendedStride,.16,2.6):0');
    expect(queen).toContain('this.baseSwordPose(1)');
    expect(queen).toContain('this.attackPose(attack.skill,p,this.attackWeight(p))');
    expect(queen).toContain("const late=T.MathUtils.smoothstep(x,.22,.72)*(1-T.MathUtils.smoothstep(x,.84,1))");
    expect(queen).not.toContain('const useRun=speed>=PLAYER_WALK_RUN_SWITCH');
  });

});
