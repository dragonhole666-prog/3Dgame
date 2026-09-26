import type { AttackState, WeaponProfile } from '../types';

/**
 * Data-only action-combat tuning shared by the authoritative server and the visual runtime.
 *
 * Goals:
 * - deliberate ready stance while engaged, without replacing authored Walk / Run;
 * - readable anticipation -> fast release -> impact hold -> controlled recovery;
 * - buffered skills may flow out of recovery without skipping the authoritative hit window;
 * - each weapon family keeps a distinct tempo.
 */
export interface ActionCombatFlowProfile {
  stance: {
    holdSeconds:number;
    enterRate:number;
    exitRate:number;
    idleWeight:number;
    walkWeight:number;
    runWeight:number;
  };
  timing: {
    anticipationFraction:number;
    anticipationPose:number;
    releaseExponent:number;
    recoveryExponent:number;
    hitStopScale:number;
    transitionSeconds:number;
  };
  combo: {
    resetSeconds:number;
    recoveryCancelRatio:number;
    lockedRecoveryCancelRatio:number;
  };
}

export const ACTION_COMBAT_FLOW:Readonly<Record<WeaponProfile,ActionCombatFlowProfile>>={
  sword:{
    stance:{holdSeconds:3.6,enterRate:11.5,exitRate:4.6,idleWeight:.82,walkWeight:.24,runWeight:.035},
    timing:{anticipationFraction:.42,anticipationPose:.30,releaseExponent:.58,recoveryExponent:1.55,hitStopScale:1.0,transitionSeconds:.085},
    combo:{resetSeconds:1.15,recoveryCancelRatio:.18,lockedRecoveryCancelRatio:.70},
  },
  greatsword:{
    stance:{holdSeconds:4.2,enterRate:8.2,exitRate:3.8,idleWeight:.90,walkWeight:.30,runWeight:.05},
    timing:{anticipationFraction:.52,anticipationPose:.36,releaseExponent:.50,recoveryExponent:1.35,hitStopScale:1.22,transitionSeconds:.13},
    combo:{resetSeconds:1.45,recoveryCancelRatio:.30,lockedRecoveryCancelRatio:.78},
  },
  dual:{
    stance:{holdSeconds:3.3,enterRate:14,exitRate:5.4,idleWeight:.78,walkWeight:.20,runWeight:.025},
    timing:{anticipationFraction:.34,anticipationPose:.24,releaseExponent:.66,recoveryExponent:1.75,hitStopScale:.82,transitionSeconds:.055},
    combo:{resetSeconds:.92,recoveryCancelRatio:.08,lockedRecoveryCancelRatio:.62},
  },
  spear:{
    stance:{holdSeconds:4,enterRate:10.2,exitRate:4.2,idleWeight:.88,walkWeight:.28,runWeight:.045},
    timing:{anticipationFraction:.44,anticipationPose:.31,releaseExponent:.54,recoveryExponent:1.48,hitStopScale:1.08,transitionSeconds:.095},
    combo:{resetSeconds:1.2,recoveryCancelRatio:.16,lockedRecoveryCancelRatio:.70},
  },
  staff:{
    stance:{holdSeconds:4.1,enterRate:8.5,exitRate:3.9,idleWeight:.72,walkWeight:.16,runWeight:.02},
    timing:{anticipationFraction:.48,anticipationPose:.35,releaseExponent:.60,recoveryExponent:1.38,hitStopScale:.72,transitionSeconds:.11},
    combo:{resetSeconds:1.28,recoveryCancelRatio:.22,lockedRecoveryCancelRatio:.74},
  },
  bow:{
    stance:{holdSeconds:4,enterRate:9.4,exitRate:4,idleWeight:.84,walkWeight:.22,runWeight:.025},
    timing:{anticipationFraction:.46,anticipationPose:.34,releaseExponent:.58,recoveryExponent:1.42,hitStopScale:.68,transitionSeconds:.10},
    combo:{resetSeconds:1.18,recoveryCancelRatio:.18,lockedRecoveryCancelRatio:.72},
  },
};

/** Earliest server time at which a buffered action may replace recovery of the current action. */
export function bufferedChainOpenAt(attack:AttackState,profile:WeaponProfile,interruptible:boolean){
  const start=Math.max(attack.hitAt,attack.hitWindowEnd??attack.hitAt);
  const recovery=Math.max(0,attack.endsAt-start);
  const flow=ACTION_COMBAT_FLOW[profile].combo;
  const ratio=interruptible?flow.recoveryCancelRatio:flow.lockedRecoveryCancelRatio;
  return start+recovery*ratio;
}
