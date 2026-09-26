import type { MonsterDef, Vec2, WeaponProfile } from '../types';
import { SKILL_DEFINITIONS, WEAPON_PROFILES } from '../data/skills';

/**
 * Authoritative combat engagement geometry.
 *
 * Weapon/skill range remains authored gameplay reach. Monster combatRadius is
 * independent from visual GLB scale, so swapping a model cannot silently alter
 * when melee attacks are allowed to commit.
 */
export const ATTACK_RANGE_HYSTERESIS = 0.35;
export const ATTACK_APPROACH_PADDING = 0.28;
export const ATTACK_FACING_TOLERANCE = Math.PI / 9; // 20 degrees
export const ATTACK_PREDICTION_FACING_TOLERANCE = Math.PI / 7.2; // 25 degrees
export const PURSUIT_REPATH_INTERVAL = 0.14;
export const PURSUIT_REPATH_DISTANCE = 0.65;

export function authoredAttackRange(skillId:string,profile:WeaponProfile){
 const skill=SKILL_DEFINITIONS[skillId];
 return skill?.range||WEAPON_PROFILES[profile].range;
}

export function monsterCombatRadius(monster:MonsterDef){
 const authored=monster.combatRadius;if(Number.isFinite(authored)&&authored! > 0)return authored!;
 // Backward compatibility for pre-P0.25.5 content packs only. New content should author combatRadius explicitly.
 return Math.max(.45,Math.min(1.8,monster.scale*.56));
}

export function attackCommitDistance(skillId:string,profile:WeaponProfile,monster:MonsterDef){
 return authoredAttackRange(skillId,profile)+monsterCombatRadius(monster);
}

export function attackHitDistance(skillId:string,profile:WeaponProfile,monster:MonsterDef){
 return attackCommitDistance(skillId,profile,monster)+ATTACK_RANGE_HYSTERESIS;
}

export function isWithinAttackCommitRange(attacker:Vec2,target:Vec2,skillId:string,profile:WeaponProfile,monster:MonsterDef){
 return Math.hypot(attacker.x-target.x,attacker.z-target.z)<=attackCommitDistance(skillId,profile,monster);
}

export function isWithinAttackHitRange(attacker:Vec2,target:Vec2,skillId:string,profile:WeaponProfile,monster:MonsterDef){
 return Math.hypot(attacker.x-target.x,attacker.z-target.z)<=attackHitDistance(skillId,profile,monster);
}

export function desiredApproachPoint(attacker:Vec2,target:Vec2,skillId:string,profile:WeaponProfile,monster:MonsterDef):Vec2{
 const dx=attacker.x-target.x,dz=attacker.z-target.z,d=Math.max(.001,Math.hypot(dx,dz));
 const stop=Math.max(.7,attackCommitDistance(skillId,profile,monster)-ATTACK_APPROACH_PADDING);
 return {x:target.x+dx/d*stop,z:target.z+dz/d*stop};
}

export function targetAngle(attacker:Vec2,target:Vec2){return Math.atan2(target.x-attacker.x,target.z-attacker.z);}
export function signedAngleDelta(current:number,wanted:number){return Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current));}
export function isFacingTarget(attacker:Vec2,target:Vec2,angle:number,tolerance=ATTACK_FACING_TOLERANCE){return Math.abs(signedAngleDelta(angle,targetAngle(attacker,target)))<=tolerance;}
