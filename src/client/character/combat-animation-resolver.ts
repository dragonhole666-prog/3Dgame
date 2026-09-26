import type { SkillAnimationProfile } from '../../shared/data/skills';
import type { WeaponProfile } from '../../shared/types';
import type { HumanoidClip } from './combat-animation-types';
import { resolveClassSkillOverride,resolveWeaponAnimationProfile } from './class-animation-sets';
import { combatMotionSpec } from './weapon-animation-profiles';

export function basicComboClips(profile:WeaponProfile,classSetId?:string){return resolveWeaponAnimationProfile(profile,classSetId).basicCombo;}
export function combatBlendFor(profile:WeaponProfile,classSetId?:string){return resolveWeaponAnimationProfile(profile,classSetId).blend;}
export function combatMotionTiming(clip:HumanoidClip){return combatMotionSpec(clip)?.timing??{hitPhase:.45,hitStop:0};}
export function poseCorrectionFor(clip:HumanoidClip){return combatMotionSpec(clip)?.poseCorrection;}

/** Resolve skill -> authored motion without skill-specific branches in CharacterRuntime. */
export function resolveCombatMotionClip(profile:WeaponProfile,skillId:string,animationProfile:SkillAnimationProfile|undefined,classSetId?:string):HumanoidClip|undefined{
 const classOverride=resolveClassSkillOverride(skillId,classSetId);if(classOverride)return classOverride;
 const weapon=resolveWeaponAnimationProfile(profile,classSetId),bound=weapon.skillBindings[skillId];if(bound)return bound;
 if(skillId==='basic'||!animationProfile||animationProfile==='weapon')return undefined;
 return weapon.animationProfileBindings[animationProfile];
}
