import type { WeaponProfile } from '../../shared/types';
import type { ClassAnimationSet,HumanoidClip,WeaponAnimationProfile } from './combat-animation-types';
import { baseWeaponAnimationProfile } from './weapon-animation-profiles';

export const DEFAULT_CLASS_ANIMATION_SET_ID='qinglan-wanderer';

/**
 * Class Animation Sets are content data, not CharacterRuntime branches.  A future class/specialized
 * stance can override only the weapon/skill motions it owns while inheriting the stable base set.
 */
export const CLASS_ANIMATION_SETS:Readonly<Record<string,ClassAnimationSet>>={
 'qinglan-wanderer':{id:'qinglan-wanderer',label:'青嵐行者',specialization:'base',weaponOverrides:{},skillOverrides:{}},
};

export function resolveWeaponAnimationProfileForSet(profile:WeaponProfile,set:ClassAnimationSet):WeaponAnimationProfile{
 const base=baseWeaponAnimationProfile(profile);
 const o=set.weaponOverrides[base.weapon];if(!o)return base;
 return {
  ...base,
  id:`${base.id}@${set.id}`,
  stance:{
   ready:{...base.stance.ready,...o.stance?.ready},
   engaged:{...base.stance.engaged,...o.stance?.engaged},
  },
  blend:{...base.blend,...o.blend},
  basicCombo:o.basicCombo??base.basicCombo,
  actions:{...base.actions,...o.actions},
  skillBindings:{...base.skillBindings,...o.skillBindings},
  animationProfileBindings:{...base.animationProfileBindings,...o.animationProfileBindings},
 };
}

export function classAnimationSet(id:string=DEFAULT_CLASS_ANIMATION_SET_ID){return CLASS_ANIMATION_SETS[id]??CLASS_ANIMATION_SETS[DEFAULT_CLASS_ANIMATION_SET_ID];}
export function resolveWeaponAnimationProfile(profile:WeaponProfile,classSetId:string=DEFAULT_CLASS_ANIMATION_SET_ID){return resolveWeaponAnimationProfileForSet(profile,classAnimationSet(classSetId));}
export function resolveClassSkillOverride(skillId:string,classSetId:string=DEFAULT_CLASS_ANIMATION_SET_ID):HumanoidClip|undefined{return classAnimationSet(classSetId).skillOverrides[skillId];}
