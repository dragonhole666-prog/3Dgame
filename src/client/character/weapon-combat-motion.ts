import * as T from 'three';
import type { WeaponProfile } from '../../shared/types';

export type ArmSide='right'|'left';
export interface ArmMotionKey {phase:number;hand:readonly [number,number,number];pole:readonly [number,number,number];weight:number;}
export interface ArmMotionSample {side:ArmSide;hand:T.Vector3;pole:T.Vector3;weight:number;}
interface MotionPath {side:ArmSide;keys:readonly ArmMotionKey[];}
interface WeaponMotionDefinition {guard:readonly MotionPath[];attacks:Readonly<Record<string,readonly MotionPath[]>>;fallback:readonly MotionPath[];}

const k=(phase:number,hand:readonly [number,number,number],pole:readonly [number,number,number],weight:number):ArmMotionKey=>({phase,hand,pole,weight});
const path=(side:ArmSide,...keys:ArmMotionKey[]):MotionPath=>({side,keys});

/**
 * R15 legacy hand-path metadata retained for regression/reference.
 * R24 runtime no longer uses these world-space targets to pose the primary arms; authored VRMA is authoritative.
 *
 * Coordinates are character-root local metres (+Y up, +Z forward). The authored VRMA clip still
 * supplies hips, feet, torso momentum and timing; these paths are a weighted upper-limb correction
 * layer. This mirrors the common "locomotion base + upper-body combat + IK contact" pipeline used
 * by mainstream 3D engines instead of replacing the entire body pose with hand-authored code.
 */
const MOTIONS:Readonly<Record<WeaponProfile,WeaponMotionDefinition>>={
 sword:{
  guard:[path('right',k(0,[.24,1.04,.20],[.54,1.10,-.02],.20))],
  attacks:{
   Attack1:[path('right',k(0,[.36,1.30,.10],[.68,1.18,-.02],.28),k(.20,[.56,1.55,-.02],[.78,1.25,-.05],.46),k(.50,[-.18,1.04,.78],[.48,.96,.30],.52),k(1,[.24,1.04,.20],[.54,1.10,-.02],.20))],
   Attack2:[path('right',k(0,[-.18,1.03,.65],[.52,1.0,.22],.30),k(.22,[-.42,1.42,.16],[-.70,1.20,.02],.46),k(.50,[.51,.98,.72],[.72,.94,.24],.50),k(1,[.24,1.04,.20],[.54,1.10,-.02],.20))],
   Attack3:[path('right',k(0,[.24,1.44,.02],[.58,1.25,-.04],.32),k(.28,[.14,1.72,-.05],[.55,1.47,-.10],.50),k(.58,[.02,.84,.91],[.48,.92,.35],.56),k(1,[.24,1.04,.20],[.54,1.10,-.02],.22))],
  },
  fallback:[path('right',k(0,[.42,1.48,.02],[.72,1.22,-.02],.35),k(.50,[-.12,1.02,.80],[.48,.95,.28],.48),k(1,[.24,1.04,.20],[.54,1.10,-.02],.20))],
 },
 greatsword:{
  guard:[path('right',k(0,[.17,1.02,.18],[.52,1.04,-.08],.30))],
  attacks:{
   HeavySlash:[path('right',k(0,[.44,1.42,-.02],[.78,1.18,-.08],.34),k(.24,[.52,1.68,-.13],[.80,1.38,-.15],.52),k(.60,[-.05,.78,.92],[.52,.86,.34],.58),k(1,[.17,1.02,.18],[.52,1.04,-.08],.26))],
   GreatswordMountainCleave:[path('right',k(0,[.38,1.55,-.08],[.75,1.32,-.12],.38),k(.34,[.10,1.78,-.05],[.62,1.54,-.12],.56),k(.63,[.02,.72,.98],[.48,.83,.38],.62),k(1,[.17,1.02,.18],[.52,1.04,-.08],.28))],
   GreatswordSmash:[path('right',k(0,[.50,1.56,-.16],[.82,1.26,-.20],.38),k(.36,[.18,1.80,-.14],[.62,1.52,-.18],.58),k(.66,[.03,.66,.88],[.45,.78,.34],.66),k(1,[.17,1.02,.18],[.52,1.04,-.08],.30))],
   GreatswordSunder:[path('right',k(0,[.46,1.48,-.12],[.80,1.22,-.15],.36),k(.30,[.56,1.70,.02],[.82,1.44,-.05],.56),k(.62,[-.10,.76,1.02],[.48,.80,.38],.64),k(1,[.17,1.02,.18],[.52,1.04,-.08],.30))],
  },
  fallback:[path('right',k(0,[.48,1.62,-.10],[.82,1.32,-.14],.42),k(.62,[0,.74,.95],[.48,.82,.36],.60),k(1,[.17,1.02,.18],[.52,1.04,-.08],.28))],
 },
 dual:{
  guard:[path('right',k(0,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
  attacks:{
   DualFlurry:[path('right',k(0,[.45,1.40,.03],[.73,1.17,-.03],.34),k(.34,[-.08,1.02,.72],[.48,.98,.28],.48),k(.70,[.48,1.28,.26],[.72,1.05,.08],.42),k(1,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.28,1.04,.28],[-.63,1.02,.04],.26),k(.38,[-.50,1.32,.04],[-.76,1.12,-.03],.44),k(.70,[.10,1.00,.74],[-.46,.97,.26],.48),k(1,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
   DualCross:[path('right',k(0,[.48,1.38,.02],[.75,1.15,-.02],.38),k(.52,[-.18,1.10,.72],[.46,1.00,.25],.52),k(1,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.48,1.38,.02],[-.75,1.15,-.02],.38),k(.52,[.18,1.10,.72],[-.46,1.00,.25],.52),k(1,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
   DualShadowDance:[path('right',k(0,[.38,1.24,.18],[.70,1.08,.02],.32),k(.46,[-.38,1.18,.68],[.50,1.02,.24],.50),k(1,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.38,1.24,.18],[-.70,1.08,.02],.32),k(.58,[.38,.98,.70],[-.50,.96,.24],.50),k(1,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
   DualThousandFlash:[path('right',k(0,[.46,1.38,.00],[.76,1.14,-.04],.36),k(.44,[-.22,.98,.78],[.50,.92,.30],.54),k(1,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.46,1.32,.04],[-.76,1.12,-.03],.34),k(.56,[.22,1.04,.76],[-.50,.94,.30],.54),k(1,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
  },
  fallback:[path('right',k(0,[.44,1.36,.04],[.74,1.14,-.02],.34),k(.52,[-.18,1.02,.74],[.48,.96,.28],.50),k(1,[.29,1.03,.22],[.58,1.05,-.02],.24)),path('left',k(0,[-.42,1.30,.06],[-.72,1.10,-.01],.32),k(.60,[.16,1.02,.72],[-.48,.96,.28],.48),k(1,[-.29,1.03,.22],[-.58,1.05,-.02],.24))],
 },
 spear:{
  guard:[path('right',k(0,[.27,.98,-.10],[.58,.99,-.28],.34))],
  attacks:{
   SpearThrust:[path('right',k(0,[.27,.98,-.12],[.58,.99,-.28],.42),k(.30,[.30,1.00,-.18],[.61,1.00,-.31],.56),k(.58,[.12,1.08,.54],[.48,.99,.16],.68),k(1,[.27,.98,-.10],[.58,.99,-.28],.34))],
   SpearSweep:[path('right',k(0,[.52,1.02,.20],[.80,.95,.02],.36),k(.26,[.60,1.10,.05],[.86,1.03,-.04],.50),k(.62,[-.46,1.02,.60],[.54,.92,.24],.58),k(1,[.27,.98,-.10],[.58,.99,-.28],.30))],
   SpearSkyPierce:[path('right',k(0,[.38,.95,-.22],[.70,.94,-.16],.38),k(.32,[.30,1.30,-.12],[.67,1.16,-.10],.50),k(.62,[.05,1.60,.72],[.46,1.28,.26],.60),k(1,[.27,.98,-.10],[.58,.99,-.28],.30))],
  },
  fallback:[path('right',k(0,[.40,1.00,-.28],[.74,.98,-.18],.40),k(.58,[.10,1.15,.80],[.54,.98,.26],.58),k(1,[.27,.98,-.10],[.58,.99,-.28],.30))],
 },
 staff:{
  guard:[path('right',k(0,[.25,1.02,.12],[.54,1.06,-.10],.30))],
  attacks:{
   StaffCast:[path('right',k(0,[.25,1.02,.12],[.54,1.06,-.10],.34),k(.34,[.25,1.34,.18],[.52,1.25,-.04],.46),k(.66,[.04,1.34,.48],[.42,1.18,.16],.54),k(1,[.25,1.02,.12],[.54,1.06,-.10],.30))],
   StaffFireOrb:[path('right',k(0,[.42,1.20,.02],[.74,1.12,-.06],.32),k(.36,[.18,1.58,.14],[.58,1.35,.00],.46),k(.62,[-.04,1.28,.78],[.46,1.08,.30],.52),k(1,[.25,1.02,.12],[.54,1.06,-.10],.26))],
   StaffSeal:[path('right',k(0,[.32,1.06,.12],[.68,1.02,-.04],.28),k(.40,[.00,1.62,.18],[.48,1.34,.02],.46),k(.70,[.00,1.46,.62],[.46,1.18,.26],.50),k(1,[.25,1.02,.12],[.54,1.06,-.10],.26))],
   StaffSkyCall:[path('right',k(0,[.40,1.15,.04],[.72,1.08,-.06],.30),k(.45,[.10,1.74,.04],[.52,1.42,-.06],.50),k(.72,[.00,1.56,.54],[.46,1.26,.20],.54),k(1,[.25,1.02,.12],[.54,1.06,-.10],.28))],
  },
  fallback:[path('right',k(0,[.38,1.18,.06],[.72,1.10,-.05],.32),k(.60,[.00,1.42,.70],[.46,1.16,.28],.50),k(1,[.25,1.02,.12],[.54,1.06,-.10],.26))],
 },
 bow:{
  // P0.26.4 mechanically-correct archery silhouette. Root-local +Z is target-forward: the left
  // hand owns the bow grip out in front, while the right hand travels back to the cheek/string
  // anchor.  Pole targets keep the bow elbow stable and the draw elbow behind/outside the shoulder.
  guard:[path('left',k(0,[-.30,1.34,.62],[-.62,1.22,.18],.54)),path('right',k(0,[.20,1.31,.12],[.54,1.18,-.08],.28))],
  attacks:{
   BowShot:[
    path('left',k(0,[-.30,1.34,.62],[-.62,1.22,.18],.56),k(.36,[-.31,1.38,.72],[-.64,1.25,.20],.70),k(.72,[-.31,1.38,.72],[-.64,1.25,.20],.72),k(1,[-.30,1.34,.62],[-.62,1.22,.18],.52)),
    path('right',k(0,[.20,1.31,.14],[.56,1.20,-.10],.34),k(.36,[.20,1.52,-.02],[.68,1.48,-.20],.78),k(.64,[.20,1.52,-.03],[.70,1.49,-.22],.82),k(.74,[.26,1.49,-.12],[.72,1.45,-.24],.38),k(1,[.20,1.31,.12],[.54,1.18,-.08],.28))
   ],
   BowPiercingShot:[
    path('left',k(0,[-.30,1.35,.64],[-.62,1.22,.18],.58),k(.40,[-.32,1.40,.75],[-.66,1.27,.22],.74),k(.76,[-.32,1.40,.75],[-.66,1.27,.22],.76),k(1,[-.30,1.34,.62],[-.62,1.22,.18],.52)),
    path('right',k(0,[.20,1.32,.13],[.56,1.20,-.10],.36),k(.40,[.19,1.54,-.04],[.70,1.50,-.24],.82),k(.68,[.19,1.54,-.05],[.72,1.51,-.25],.86),k(.78,[.27,1.50,-.14],[.74,1.46,-.26],.40),k(1,[.20,1.31,.12],[.54,1.18,-.08],.28))
   ],
   BowFrostShot:[
    path('left',k(0,[-.30,1.35,.64],[-.62,1.22,.18],.58),k(.39,[-.32,1.40,.74],[-.66,1.27,.22],.74),k(.74,[-.32,1.40,.74],[-.66,1.27,.22],.76),k(1,[-.30,1.34,.62],[-.62,1.22,.18],.52)),
    path('right',k(0,[.20,1.32,.13],[.56,1.20,-.10],.36),k(.39,[.19,1.53,-.04],[.70,1.50,-.24],.82),k(.67,[.19,1.53,-.04],[.72,1.51,-.25],.84),k(.77,[.27,1.50,-.13],[.74,1.46,-.26],.40),k(1,[.20,1.31,.12],[.54,1.18,-.08],.28))
   ],
   BowVolley:[
    path('left',k(0,[-.30,1.36,.62],[-.62,1.23,.18],.56),k(.34,[-.28,1.55,.64],[-.60,1.39,.20],.68),k(.58,[-.32,1.45,.73],[-.66,1.31,.22],.72),k(.74,[-.32,1.45,.73],[-.66,1.31,.22],.74),k(1,[-.30,1.34,.62],[-.62,1.22,.18],.52)),
    path('right',k(0,[.20,1.32,.13],[.56,1.20,-.10],.34),k(.34,[.20,1.58,-.03],[.70,1.53,-.24],.76),k(.58,[.19,1.55,-.04],[.72,1.51,-.25],.82),k(.68,[.19,1.55,-.05],[.72,1.51,-.25],.84),k(.78,[.27,1.51,-.13],[.74,1.47,-.26],.38),k(1,[.20,1.31,.12],[.54,1.18,-.08],.28))
   ],
  },
  fallback:[
   path('left',k(0,[-.30,1.35,.64],[-.62,1.22,.18],.58),k(.42,[-.32,1.40,.74],[-.66,1.27,.22],.72),k(1,[-.30,1.34,.62],[-.62,1.22,.18],.52)),
   path('right',k(0,[.20,1.32,.13],[.56,1.20,-.10],.36),k(.42,[.19,1.53,-.04],[.70,1.50,-.24],.82),k(.72,[.27,1.50,-.13],[.74,1.46,-.26],.38),k(1,[.20,1.31,.12],[.54,1.18,-.08],.28))
  ],
 }};

function samplePath(p:MotionPath,phase:number){
 const keys=p.keys;if(keys.length===1){const a=keys[0];return {side:p.side,hand:new T.Vector3(...a.hand),pole:new T.Vector3(...a.pole),weight:a.weight};}
 const x=T.MathUtils.clamp(phase,0,1);let a=keys[0],b=keys[keys.length-1];for(let i=1;i<keys.length;i++)if(x<=keys[i].phase){a=keys[i-1];b=keys[i];break;}
 const span=Math.max(1e-5,b.phase-a.phase),raw=T.MathUtils.clamp((x-a.phase)/span,0,1),t=raw*raw*(3-2*raw);
 return {side:p.side,hand:new T.Vector3().fromArray(a.hand as [number,number,number]).lerp(new T.Vector3().fromArray(b.hand as [number,number,number]),t),pole:new T.Vector3().fromArray(a.pole as [number,number,number]).lerp(new T.Vector3().fromArray(b.pole as [number,number,number]),t),weight:T.MathUtils.lerp(a.weight,b.weight,t)};
}

export function weaponCombatArmSamples(profile:WeaponProfile,clip:string|undefined,phase:number,inCombat:boolean){
 const def=MOTIONS[profile],paths=inCombat?(clip&&def.attacks[clip]||def.fallback):def.guard;return paths.map(p=>samplePath(p,inCombat?phase:0));
}

/**
 * Allocation-free sampler for runtime corrective IK.  It intentionally exposes the same data used
 * by the legacy/reference arm paths without constructing Vector3 objects in the animation hot path.
 */
export function sampleWeaponCombatArmInto(profile:WeaponProfile,clip:string|undefined,phase:number,inCombat:boolean,side:ArmSide,hand:T.Vector3,pole:T.Vector3){
 const def=MOTIONS[profile],paths=inCombat?(clip&&def.attacks[clip]||def.fallback):def.guard,p=paths.find(candidate=>candidate.side===side);
 if(!p){hand.set(0,0,0);pole.set(0,0,0);return 0;}
 const keys=p.keys,x=T.MathUtils.clamp(inCombat?phase:0,0,1);
 if(keys.length===1){const a=keys[0];hand.fromArray(a.hand as [number,number,number]);pole.fromArray(a.pole as [number,number,number]);return a.weight;}
 let a=keys[0],b=keys[keys.length-1];for(let i=1;i<keys.length;i++)if(x<=keys[i].phase){a=keys[i-1];b=keys[i];break;}
 const span=Math.max(1e-5,b.phase-a.phase),raw=T.MathUtils.clamp((x-a.phase)/span,0,1),t=raw*raw*(3-2*raw);
 hand.set(T.MathUtils.lerp(a.hand[0],b.hand[0],t),T.MathUtils.lerp(a.hand[1],b.hand[1],t),T.MathUtils.lerp(a.hand[2],b.hand[2],t));
 pole.set(T.MathUtils.lerp(a.pole[0],b.pole[0],t),T.MathUtils.lerp(a.pole[1],b.pole[1],t),T.MathUtils.lerp(a.pole[2],b.pole[2],t));
 return T.MathUtils.lerp(a.weight,b.weight,t);
}

export function weaponMotionDefinition(profile:WeaponProfile){return MOTIONS[profile];}
