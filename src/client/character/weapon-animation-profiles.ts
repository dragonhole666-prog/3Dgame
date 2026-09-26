import type { WeaponProfile } from '../../shared/types';
import type { CombatMotionSpec,HumanoidClip,WeaponAnimationProfile } from './combat-animation-types';

const BOW_CORRECTION={kind:'bow-draw',leftArmCap:.76,rightArmCap:.88,leftArmScale:1.08,rightArmScale:1.20,stringHook:true,drawInEnd:.36,anchorStart:.46,releaseStart:.64,releaseEnd:.76} as const;
const m=(clip:HumanoidClip,role:CombatMotionSpec['role'],hitPhase:number,hitStop:number,poseCorrection?:CombatMotionSpec['poseCorrection']):CombatMotionSpec=>({clip,role,timing:{hitPhase,hitStop},poseCorrection});

/**
 * P0.26.3 motion library.  Clip timing, semantic role and post-pose correction live here rather
 * than in VrmCharacterRuntime.  Switching an action from VRMA to GLB only requires adding `asset`
 * to the corresponding motion entry; combat/runtime code remains unchanged.
 */
export const COMBAT_MOTION_LIBRARY:Readonly<Record<string,CombatMotionSpec>>={
 Attack1:m('Attack1','slash',.447,.036),Attack2:m('Attack2','slash',.410,.038),Attack3:m('Attack3','slash',.442,.044),
 SwordWave:m('SwordWave','slash',.48,.038),SwordFlashStep:m('SwordFlashStep','slash',.54,.030),
 HeavySlash:m('HeavySlash','heavy-slash',.532,.070),GreatswordMountainCleave:m('GreatswordMountainCleave','heavy-slash',.58,.080),GreatswordSmash:m('GreatswordSmash','heavy-slash',.625,.085),GreatswordSunder:m('GreatswordSunder','heavy-slash',.63,.075),
 DualFlurry:m('DualFlurry','flurry',.50,.030),DualCross:m('DualCross','cross',.53,.040),DualShadowDance:m('DualShadowDance','dance',.56,.026),DualThousandFlash:m('DualThousandFlash','flurry',.60,.024),
 SpearThrust:m('SpearThrust','thrust',.53,.045),SpearSweep:m('SpearSweep','sweep',.57,.052),SpearSkyPierce:m('SpearSkyPierce','lunge',.61,.055),
 SwordArrayCast:m('SwordArrayCast','cast',.66,.030),StaffCast:m('StaffCast','cast',.64,.025),StaffFireOrb:m('StaffFireOrb','projectile',.58,.026),StaffSeal:m('StaffSeal','seal',.62,.028),StaffSkyCall:m('StaffSkyCall','cast',.66,.035),
 BowShot:m('BowShot','draw-release',.64,.020,BOW_CORRECTION),BowPiercingShot:m('BowPiercingShot','draw-pierce',.68,.026,BOW_CORRECTION),BowFrostShot:m('BowFrostShot','draw-frost',.66,.030,BOW_CORRECTION),BowVolley:m('BowVolley','volley',.64,.022,BOW_CORRECTION),
 PrimordialStarCollapse:m('PrimordialStarCollapse','ultimate',.482143,.052),VoidRiftSunder:m('VoidRiftSunder','ultimate',.440678,.082),CelestialPillarPierce:m('CelestialPillarPierce','lunge',.492147,.038),MyriadLawHeavenWheel:m('MyriadLawHeavenWheel','ultimate',.469636,.060),HeavenfallNineStars:m('HeavenfallNineStars','volley',.486486,.034,BOW_CORRECTION),YinYangReversal:m('YinYangReversal','ultimate',.460674,.028),
};

const commonBindings={
 'nine-heavens-thunder-prison':'SwordArrayCast','burning-heaven-dragon':'GreatswordSunder','frost-domain-thousand-arrows':'BowVolley','taixu-return-one':'SwordArrayCast',
 'primordial-star-collapse':'PrimordialStarCollapse','void-rift-sunder':'VoidRiftSunder','celestial-pillar-pierce':'CelestialPillarPierce','myriad-law-heaven-wheel':'MyriadLawHeavenWheel','heavenfall-nine-stars':'HeavenfallNineStars','yin-yang-reversal':'YinYangReversal'
} as const;

/**
 * Per-weapon authored animation profiles.  `actions` are semantic slots: spear.lunge can later be
 * changed to a dedicated SpearLunge.glb/vrma without touching CharacterRuntime; bow draw/release
 * mechanics likewise stay in the profile layer.
 */
const DEFAULT_ANIMATION_PROFILE_BINDINGS={heavy:'HeavySlash',cast:'ThunderCast',ranged:'BowShot',dash:'Dash',heal:'HealCast'} as const;
const profileBindings=(overrides:Partial<WeaponAnimationProfile['animationProfileBindings']>={})=>({...DEFAULT_ANIMATION_PROFILE_BINDINGS,...overrides});

export const WEAPON_ANIMATION_PROFILES:Readonly<Record<WeaponProfile,WeaponAnimationProfile>>={
 sword:{id:'sword-standard',weapon:'sword',stance:{ready:{source:'Attack1',phase:.16,sourceBlend:.32,idleWeight:.72,moveWeight:.04},engaged:{source:'Attack1',phase:.18,sourceBlend:.46}},blend:{enter:.09,exit:.14},basicCombo:['Attack1','Attack2','Attack3'],actions:{slash:'Attack1',followup:'Attack2',finisher:'Attack3'},skillBindings:{'sword-wave':'SwordWave','sword-step':'SwordFlashStep','sword-array':'SwordArrayCast',...commonBindings},animationProfileBindings:profileBindings()},
 greatsword:{id:'greatsword-standard',weapon:'greatsword',stance:{ready:{source:'HeavySlash',phase:.14,sourceBlend:.28,idleWeight:.76,moveWeight:.08},engaged:{source:'HeavySlash',phase:.13,sourceBlend:.43}},blend:{enter:.14,exit:.20},basicCombo:['HeavySlash','GreatswordMountainCleave','GreatswordSmash'],actions:{slash:'HeavySlash',cleave:'GreatswordMountainCleave',smash:'GreatswordSmash',sunder:'GreatswordSunder'},skillBindings:{'mountain-cleave':'GreatswordMountainCleave','earth-break':'GreatswordSmash','sky-sunder':'GreatswordSunder',...commonBindings},animationProfileBindings:profileBindings()},
 dual:{id:'dual-standard',weapon:'dual',stance:{ready:{source:'DualFlurry',phase:.14,sourceBlend:.30,idleWeight:.72,moveWeight:.05},engaged:{source:'DualFlurry',phase:.16,sourceBlend:.48}},blend:{enter:.065,exit:.11},basicCombo:['DualFlurry','DualCross','DualShadowDance'],actions:{flurry:'DualFlurry',cross:'DualCross',dance:'DualShadowDance',flash:'DualThousandFlash'},skillBindings:{'moon-cross':'DualCross','shadow-dance':'DualShadowDance','thousand-flash':'DualThousandFlash',...commonBindings},animationProfileBindings:profileBindings()},
 spear:{id:'spear-standard',weapon:'spear',stance:{ready:{source:'SpearThrust',phase:.16,sourceBlend:.30,idleWeight:.76,moveWeight:.08},engaged:{source:'SpearThrust',phase:.18,sourceBlend:.47}},blend:{enter:.10,exit:.15},basicCombo:['SpearThrust','SpearSweep','SpearSkyPierce'],actions:{thrust:'SpearThrust',sweep:'SpearSweep',lunge:'SpearSkyPierce'},skillBindings:{'dragon-thrust':'SpearThrust','spear-sweep':'SpearSweep','sky-pierce':'SpearSkyPierce',...commonBindings},animationProfileBindings:profileBindings({heavy:'SpearThrust'})},
 staff:{id:'staff-standard',weapon:'staff',stance:{ready:{source:'StaffCast',phase:.15,sourceBlend:.24,idleWeight:.64,moveWeight:.03},engaged:{source:'StaffCast',phase:.20,sourceBlend:.36}},blend:{enter:.14,exit:.18},basicCombo:['StaffCast','StaffFireOrb','StaffSeal'],actions:{cast:'StaffCast',orb:'StaffFireOrb',seal:'StaffSeal',sky:'StaffSkyCall'},skillBindings:{'fire-orb':'StaffFireOrb','ice-spike':'StaffSeal','frost-seal':'StaffSeal','blizzard':'StaffSkyCall','thunder-mantra':'StaffSkyCall',...commonBindings},animationProfileBindings:profileBindings({cast:'StaffCast'})},
 bow:{id:'bow-standard',weapon:'bow',stance:{ready:{source:'BowShot',phase:.14,sourceBlend:.26,idleWeight:.70,moveWeight:.05},engaged:{source:'BowShot',phase:.24,sourceBlend:.40}},blend:{enter:.12,exit:.16},basicCombo:['BowShot','BowPiercingShot','BowFrostShot'],actions:{drawRelease:'BowShot',piercingDraw:'BowPiercingShot',frostDraw:'BowFrostShot',volley:'BowVolley'},skillBindings:{'piercing-arrow':'BowPiercingShot','frost-arrow':'BowFrostShot','arrow-rain':'BowVolley',...commonBindings},animationProfileBindings:profileBindings({ranged:'BowShot'})},
};

export const COMBAT_MOTION_CLIPS=new Set<HumanoidClip>(Object.values(COMBAT_MOTION_LIBRARY).map(x=>x.clip));
export const LOOP_CLIPS=new Set<HumanoidClip>(['Idle','Walk','Run']);
export const CORE_MATURE_CLIPS=new Set<HumanoidClip>(['Idle','Walk','Run','Attack1','PickupGround','ThunderCast']);

export function baseWeaponAnimationProfile(profile:WeaponProfile){return WEAPON_ANIMATION_PROFILES[profile];}
export function combatMotionSpec(clip:HumanoidClip){return COMBAT_MOTION_LIBRARY[clip];}
export function combatAnimationAssetOverride(name:string){return COMBAT_MOTION_LIBRARY[name]?.asset;}
