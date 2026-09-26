import * as T from 'three';
import type { WeaponProfile } from '../../shared/types';
import type { AuthoredPoseSpec,ReadyPoseSpec } from './combat-animation-types';
import { WEAPON_ANIMATION_PROFILES } from './weapon-animation-profiles';

type ArmSemantic='leftShoulder'|'leftUpperArm'|'leftLowerArm'|'leftHand'|'rightShoulder'|'rightUpperArm'|'rightLowerArm'|'rightHand';

export type ReadySpec=ReadyPoseSpec;
export type CombatStanceSpec=AuthoredPoseSpec;

/**
 * Backward-compatible exports.  P0.26.3 moves stance content into WEAPON_ANIMATION_PROFILES so
 * future class/weapon sets can replace stance data without changing the pose solver.
 */
export const ACTION_RPG_READY:Readonly<Record<WeaponProfile,ReadySpec>>=Object.fromEntries(
  (Object.entries(WEAPON_ANIMATION_PROFILES) as [WeaponProfile,(typeof WEAPON_ANIMATION_PROFILES)[WeaponProfile]][]).map(([profile,data])=>[profile,data.stance.ready])
) as Record<WeaponProfile,ReadySpec>;

export const ACTION_RPG_COMBAT_STANCE:Readonly<Record<WeaponProfile,CombatStanceSpec>>=Object.fromEntries(
  (Object.entries(WEAPON_ANIMATION_PROFILES) as [WeaponProfile,(typeof WEAPON_ANIMATION_PROFILES)[WeaponProfile]][]).map(([profile,data])=>[profile,data.stance.engaged])
) as Record<WeaponProfile,CombatStanceSpec>;



const SEMANTICS:readonly ArmSemantic[]=[
  'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
  'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
];

const MAX_ANGLE_DEG:Readonly<Record<ArmSemantic,number>>={
  leftShoulder:10,rightShoulder:10,
  leftUpperArm:28,rightUpperArm:28,
  leftLowerArm:34,rightLowerArm:34,
  leftHand:16,rightHand:16,
};
const COMBAT_MAX_ANGLE_DEG:Readonly<Record<ArmSemantic,number>>={
  leftShoulder:14,rightShoulder:14,
  leftUpperArm:42,rightUpperArm:42,
  leftLowerArm:48,rightLowerArm:48,
  leftHand:22,rightHand:22,
};

function nodeNames(node:T.Object3D){return new Set([node.name,T.PropertyBinding.sanitizeNodeName(node.name)]);}
function trackTarget(track:T.KeyframeTrack){const dot=track.name.lastIndexOf('.');return dot>0?track.name.slice(0,dot):track.name;}
function quaternionTrack(clip:T.AnimationClip,node:T.Object3D){
  const names=nodeNames(node);
  return clip.tracks.find(track=>track instanceof T.QuaternionKeyframeTrack&&names.has(trackTarget(track))) as T.QuaternionKeyframeTrack|undefined;
}
function sample(track:T.QuaternionKeyframeTrack,time:number){
  const times=track.times,values=track.values,keyCount=times.length;
  if(keyCount===0||values.length<4)return new T.Quaternion();

  const read=(index:number)=>{
    const offset=index*4;
    return new T.Quaternion(
      values[offset]??0,
      values[offset+1]??0,
      values[offset+2]??0,
      values[offset+3]??1,
    ).normalize();
  };

  if(keyCount===1)return read(0);
  const clamped=T.MathUtils.clamp(time,times[0]??0,times[keyCount-1]??0);
  if(clamped<=times[0])return read(0);
  if(clamped>=times[keyCount-1])return read(keyCount-1);

  // QuaternionKeyframeTrack's normal interpolation is spherical interpolation.
  // Sample the surrounding authored keys directly instead of depending on
  // an internal/runtime interpolant factory that is not exposed by the
  // current @types/three QuaternionKeyframeTrack surface.
  let low=0,high=keyCount-1;
  while(low+1<high){
    const mid=(low+high)>>1;
    if((times[mid]??0)<=clamped)low=mid;else high=mid;
  }
  const t0=times[low]??0,t1=times[high]??t0;
  const alpha=t1>t0?(clamped-t0)/(t1-t0):0;
  return read(low).slerp(read(high),T.MathUtils.clamp(alpha,0,1)).normalize();
}

function createAuthoredAdditivePoseClip(vrm:any,source:T.AnimationClip,idle:T.AnimationClip,spec:{phase:number;sourceBlend:number},caps:Readonly<Record<ArmSemantic,number>>,name:string){
  const tracks:T.KeyframeTrack[]=[];
  for(const semantic of SEMANTICS){
    const node=vrm.humanoid?.getNormalizedBoneNode?.(semantic) as T.Object3D|undefined;if(!node)continue;
    const sourceTrack=quaternionTrack(source,node),idleTrack=quaternionTrack(idle,node);if(!sourceTrack||!idleTrack)continue;
    const base=sample(idleTrack,0),target=sample(sourceTrack,spec.phase*source.duration);
    const angle=base.angleTo(target),cap=T.MathUtils.degToRad(caps[semantic]);
    const capFactor=angle>1e-6?Math.min(1,cap/angle):1;
    const authored=base.clone().slerp(target,T.MathUtils.clamp(spec.sourceBlend*capFactor,0,1));
    tracks.push(new T.QuaternionKeyframeTrack(`${T.PropertyBinding.sanitizeNodeName(node.name)}.quaternion`,[0,1],[authored.x,authored.y,authored.z,authored.w,authored.x,authored.y,authored.z,authored.w]));
  }
  const clip=new T.AnimationClip(name,1,tracks);
  T.AnimationUtils.makeClipAdditive(clip,0,idle,30);clip.blendMode=T.AdditiveAnimationBlendMode;return clip;
}

/** Build a constant additive relaxed-ready clip from authored animation deltas, with strict angle caps. */
export function createActionRpgReadyClip(vrm:any,profile:WeaponProfile,source:T.AnimationClip,idle:T.AnimationClip,name=`QinglanActionRpgReady_${profile}`,spec:ReadySpec=ACTION_RPG_READY[profile]){
  return createAuthoredAdditivePoseClip(vrm,source,idle,spec,MAX_ANGLE_DEG,name);
}

/** Stronger, still bounded, combat stance used only while the actor is actively engaged. */
export function createActionRpgCombatStanceClip(vrm:any,profile:WeaponProfile,source:T.AnimationClip,idle:T.AnimationClip,name=`QinglanActionCombatStance_${profile}`,spec:CombatStanceSpec=ACTION_RPG_COMBAT_STANCE[profile]){
  return createAuthoredAdditivePoseClip(vrm,source,idle,spec,COMBAT_MAX_ANGLE_DEG,name);
}
