import type { Monster, Snapshot, Vec2 } from '../../shared/types';
import { distance } from '../../shared/types';
import { MONSTERS } from '../../shared/data/monsters';
import { SKILL_DEFINITIONS } from '../../shared/data/skills';
import { weaponProfile } from '../../shared/domains/equipment';
import { ATTACK_PREDICTION_FACING_TOLERANCE, isFacingTarget, isWithinAttackCommitRange } from '../../shared/combat/engagement';

export type CombatPose=Vec2&{angle:number};

export function predictionTarget(snapshot:Snapshot,targetId?:string):Monster|undefined{
 const selected=snapshot.monsters.find(m=>m.id===(targetId??snapshot.self.target)&&m.hp>0);
 if(selected)return selected;
 let best:Monster|undefined,bestDistance=35;
 for(const m of snapshot.monsters){if(m.hp<=0)continue;const d=distance(snapshot.self,m);if(d<bestDistance){best=m;bestDistance=d;}}
 return best;
}

/**
 * Client-side attack animation prediction is allowed only when the rendered pose
 * already satisfies the same range/facing gates used by the authoritative world.
 * This prevents a stale/smoothed visual position from swinging before the actor
 * has visibly reached melee range.
 */
export function canPredictAttack(snapshot:Snapshot,skillId:string,targetId?:string,selfPose?:CombatPose,targetPose?:Vec2){
 if(snapshot.self.attack)return false;
 const skill=SKILL_DEFINITIONS[skillId];if(!skill)return false;
 if(skill.targeting!=='enemy')return true;
 const target=predictionTarget(snapshot,targetId);if(!target)return false;
 const def=MONSTERS[target.defId];if(!def)return false;
 const attacker=selfPose??snapshot.self,renderedTarget=targetPose??target,profile=weaponProfile(snapshot.self);
 return isWithinAttackCommitRange(attacker,renderedTarget,skillId,profile,def)&&isFacingTarget(attacker,renderedTarget,attacker.angle,ATTACK_PREDICTION_FACING_TOLERANCE);
}
