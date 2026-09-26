import type { WeaponProfile } from '../../shared/types';
import type { SkillAnimationProfile } from '../../shared/data/skills';

export const AUTHORED_HUMANOID_CLIPS=[
 'Idle','Walk','Run','Attack1','Attack2','Attack3','SwordWave','SwordFlashStep','HeavySlash',
 'GreatswordMountainCleave','GreatswordSmash','GreatswordSunder','DualFlurry','DualCross','DualShadowDance','DualThousandFlash',
 'SpearThrust','SpearSweep','SpearSkyPierce','SwordArrayCast','StaffCast','StaffFireOrb','StaffSeal','StaffSkyCall',
 'BowShot','BowPiercingShot','BowFrostShot','BowVolley','PrimordialStarCollapse','VoidRiftSunder','CelestialPillarPierce',
 'MyriadLawHeavenWheel','HeavenfallNineStars','YinYangReversal','ThunderCast','HealCast','Dash',
 'PickupGround','PickupSpirit','PickupHeavy','Hit','Jump','Death'
] as const;

export const HUMANOID_CLIPS=AUTHORED_HUMANOID_CLIPS;
export type HumanoidClip=(typeof HUMANOID_CLIPS)[number];
export type AuthoredHumanoidClip=(typeof AUTHORED_HUMANOID_CLIPS)[number];

export type CombatActionRole=
 |'slash'|'heavy-slash'|'flurry'|'cross'|'dance'
 |'thrust'|'sweep'|'lunge'
 |'cast'|'seal'|'projectile'
 |'draw-release'|'draw-pierce'|'draw-frost'|'volley'
 |'ultimate';

export interface AuthoredPoseSpec{
 source:HumanoidClip;
 phase:number;
 sourceBlend:number;
}
export interface ReadyPoseSpec extends AuthoredPoseSpec{
 idleWeight:number;
 moveWeight:number;
}
export interface CombatBlendSpec{enter:number;exit:number}
export interface MotionTimingSpec{
 hitPhase:number;
 hitStop:number;
 anticipationPose?:number;
}
export interface BowDrawPoseCorrection{
 kind:'bow-draw';
 leftArmCap:number;
 rightArmCap:number;
 leftArmScale:number;
 rightArmScale:number;
 stringHook:boolean;
 drawInEnd:number;
 anchorStart:number;
 releaseStart:number;
 releaseEnd:number;
}
export type PoseCorrectionSpec=BowDrawPoseCorrection;
export interface AnimationAssetOverride{
 kind:'vrma'|'glb-mixamo';
 url:string;
 externalAuthority?:boolean;
}
export interface CombatMotionSpec{
 clip:HumanoidClip;
 role:CombatActionRole;
 timing:MotionTimingSpec;
 asset?:AnimationAssetOverride;
 poseCorrection?:PoseCorrectionSpec;
}
export interface WeaponAnimationProfile{
 id:string;
 weapon:WeaponProfile;
 stance:{ready:ReadyPoseSpec;engaged:AuthoredPoseSpec};
 blend:CombatBlendSpec;
 basicCombo:readonly HumanoidClip[];
 actions:Readonly<Record<string,HumanoidClip>>;
 skillBindings:Readonly<Record<string,HumanoidClip>>;
 animationProfileBindings:Readonly<Partial<Record<SkillAnimationProfile,HumanoidClip>>>;
}
export interface WeaponAnimationProfileOverride{
 stance?:Partial<{ready:Partial<ReadyPoseSpec>;engaged:Partial<AuthoredPoseSpec>}>;
 blend?:Partial<CombatBlendSpec>;
 basicCombo?:readonly HumanoidClip[];
 actions?:Readonly<Record<string,HumanoidClip>>;
 skillBindings?:Readonly<Record<string,HumanoidClip>>;
 animationProfileBindings?:Readonly<Partial<Record<SkillAnimationProfile,HumanoidClip>>>;
}
export interface ClassAnimationSet{
 id:string;
 label:string;
 specialization:'base'|'succession'|'awakening';
 weaponOverrides:Partial<Record<WeaponProfile,WeaponAnimationProfileOverride>>;
 skillOverrides:Readonly<Record<string,HumanoidClip>>;
}
