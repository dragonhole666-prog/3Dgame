import * as T from 'three';
import type { Monster } from '../../shared/types';
import { loadMixamoNamedRigRotationClip, mixamoBone, MIXAMO_LOCOMOTION } from './mixamo-retarget';
import { PLAYER_AUTHORED_LOCOMOTION, PLAYER_WALK_RUN_SWITCH } from '../../shared/data/locomotion';

type BoneState={bone:T.Object3D;rest:T.Quaternion};
const TRACKED=[
 'mixamorig:Hips','mixamorig:Spine','mixamorig:Spine1','mixamorig:Spine2','mixamorig:Neck','mixamorig:Head',
 'mixamorig:LeftShoulder','mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand',
 'mixamorig:RightShoulder','mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand',
 'mixamorig:LeftUpLeg','mixamorig:LeftLeg','mixamorig:LeftFoot','mixamorig:RightUpLeg','mixamorig:RightLeg','mixamorig:RightFoot',
] as const;
const QUEEN_WEAPON_ARM_TOKENS=['LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand'] as const;

/** Dedicated animator for the user-supplied Golden Queen Mixamo rig. */
export class GoldenQueenAnimator {
 private mixer:T.AnimationMixer;private walk?:T.AnimationAction;private run?:T.AnimationAction;
 private walkClip?:T.AnimationClip;private runClip?:T.AnimationClip;private walkStride:number=PLAYER_AUTHORED_LOCOMOTION.walk.rootTravel;private runStride:number=PLAYER_AUTHORED_LOCOMOTION.run.rootTravel;private ready=false;private disposed=false;
 private readonly bones=new Map<string,BoneState>();private readonly delta=new T.Quaternion();private readonly euler=new T.Euler();
 constructor(private root:T.Object3D){
  this.mixer=new T.AnimationMixer(root);
  for(const name of TRACKED){const bone=mixamoBone(root,name);if(bone)this.bones.set(name,{bone,rest:bone.quaternion.clone()});}
 }
 private bodyOnlyClip(source:T.AnimationClip,name:string){
  const tracks=source.tracks.filter(track=>!QUEEN_WEAPON_ARM_TOKENS.some(token=>track.name.includes(token))).map(track=>track.clone());
  return new T.AnimationClip(name,source.duration,tracks);
 }
 private phase(action:T.AnimationAction|undefined,clip:T.AnimationClip|undefined){
  if(!action||!clip||clip.duration<=1e-6)return 0;
  return (((action.time%clip.duration)+clip.duration)%clip.duration)/clip.duration;
 }
 private syncPhase(from:T.AnimationAction|undefined,fromClip:T.AnimationClip|undefined,to:T.AnimationAction|undefined,toClip:T.AnimationClip|undefined){
  if(!from||!fromClip||!to||!toClip||toClip.duration<=1e-6)return;
  to.time=this.phase(from,fromClip)*toClip.duration;
 }
 async init(){
  try{
   const [walkSource,runSource]=await Promise.all([
    loadMixamoNamedRigRotationClip(MIXAMO_LOCOMOTION.walk,this.root,'GoldenQueen_Walking'),
    loadMixamoNamedRigRotationClip(MIXAMO_LOCOMOTION.run,this.root,'GoldenQueen_FastRun'),
   ]);
   if(this.disposed)return false;
   // R19: the Queen also carries a weapon, so locomotion owns body/legs while her authored
   // sword guard owns shoulders/arms. This removes the old full-body GLB -> guard hard snap.
   this.walkStride=Number((walkSource as any).qinglanStrideLength)||this.walkStride;this.runStride=Number((runSource as any).qinglanStrideLength)||this.runStride;
   this.walkClip=this.bodyOnlyClip(walkSource,'GoldenQueen_WeaponBody_Walking');
   this.runClip=this.bodyOnlyClip(runSource,'GoldenQueen_WeaponBody_FastRun');
   this.walk=this.mixer.clipAction(this.walkClip);this.run=this.mixer.clipAction(this.runClip);
   for(const action of [this.walk,this.run]){action.enabled=true;action.setLoop(T.LoopRepeat,Infinity);action.setEffectiveWeight(0);action.play();}
   this.ready=true;return true;
  }catch(error){console.warn('[R19 Golden Queen] locomotion retarget failed; procedural pose fallback remains active.',error);return false;}
 }
 private reset(){for(const {bone,rest} of this.bones.values())bone.quaternion.copy(rest);}
 private rotate(name:string,x:number,y:number,z:number,weight=1){const state=this.bones.get(name);if(!state||weight<=0)return;this.euler.set(x*weight,y*weight,z*weight,'XYZ');this.delta.setFromEuler(this.euler);state.bone.quaternion.multiply(this.delta).normalize();}
 private baseSwordPose(weight=1){
  // Mixamo reference is a T-pose. Keep a stable sword guard on top of body-only locomotion.
  this.rotate('mixamorig:RightArm',.10,-.08,-1.08,weight);this.rotate('mixamorig:RightForeArm',-.16,.06,-.18,weight);
  this.rotate('mixamorig:LeftArm',.08,.05,1.02,weight);this.rotate('mixamorig:LeftForeArm',-.22,-.08,.24,weight);
 }
 private attackWeight(p:number){
  const x=T.MathUtils.clamp(p,0,1);
  return T.MathUtils.smoothstep(x,0,.10)*(1-T.MathUtils.smoothstep(x,.86,1));
 }
 private attackPose(skill:string,p:number,weight=1){
  if(weight<=.001)return;
  const x=T.MathUtils.clamp(p,0,1),arc=Math.sin(x*Math.PI),snap=Math.sin(x*Math.PI*2);
  // Dash used to leave the arm offset at p=1 because smoothstep stayed at 1.
  // Fade late thrust ownership back to zero before the transition returns to guard.
  const late=T.MathUtils.smoothstep(x,.22,.72)*(1-T.MathUtils.smoothstep(x,.84,1));
  switch(skill){
   case 'queen-cross':
    this.rotate('mixamorig:Spine2',-.08,.52*snap,.12*arc,weight);this.rotate('mixamorig:RightArm',-.75*arc,.42*snap,.74*arc,weight);this.rotate('mixamorig:RightForeArm',-.72*arc,0,.38*arc,weight);this.rotate('mixamorig:LeftArm',.18*arc,-.25*snap,-.2*arc,weight);break;
   case 'queen-spin':
    this.rotate('mixamorig:Hips',0,x*Math.PI*2,0,weight);this.rotate('mixamorig:Spine2',-.12,.7*arc,.05,weight);this.rotate('mixamorig:RightArm',-.25,.15,.92*arc,weight);this.rotate('mixamorig:LeftArm',.1,-.1,-.72*arc,weight);break;
   case 'queen-dash':
    this.rotate('mixamorig:Spine',-.5*arc,0,0,weight);this.rotate('mixamorig:Spine2',-.28*arc,-.22*arc,0,weight);this.rotate('mixamorig:RightArm',-.82*late,-.55*arc,.5*arc,weight);this.rotate('mixamorig:RightForeArm',-.5*arc,0,.28*arc,weight);this.rotate('mixamorig:LeftArm',.18*arc,0,.35*arc,weight);break;
   case 'queen-burst':
    this.rotate('mixamorig:Spine2',-.18*arc,.25*snap,0,weight);this.rotate('mixamorig:RightArm',-.9*arc,0,1.0*arc,weight);this.rotate('mixamorig:LeftArm',-.72*arc,0,-1.0*arc,weight);this.rotate('mixamorig:RightForeArm',-.55*arc,0,.25*arc,weight);this.rotate('mixamorig:LeftForeArm',-.45*arc,0,-.2*arc,weight);this.rotate('mixamorig:Head',.12*arc,0,0,weight);break;
   case 'queen-slash':default:
    this.rotate('mixamorig:Spine2',-.1,-.5*snap,-.12*arc,weight);this.rotate('mixamorig:RightArm',-.88*arc,-.44*snap,.82*arc,weight);this.rotate('mixamorig:RightForeArm',-.64*arc,.08,.36*arc,weight);break;
  }
 }
 update(dt:number,time:number,actor?:Monster,speed=0){
  this.reset();const dead=!!actor&&actor.hp<=0,attack=actor?.attack;
  if(this.ready&&this.walk&&this.run&&this.walkClip&&this.runClip){
   const move=dead?0:T.MathUtils.smoothstep(speed,.06,.30);
   const runBlend=T.MathUtils.smoothstep(speed,PLAYER_WALK_RUN_SWITCH-.42,PLAYER_WALK_RUN_SWITCH+.42);
   const walkWeight=move*(1-runBlend),runWeight=move*runBlend;
   this.walk.setEffectiveWeight(walkWeight);this.run.setEffectiveWeight(runWeight);
   const blendedStride=T.MathUtils.lerp(Math.max(.2,this.walkStride),Math.max(.2,this.runStride),runBlend);
   const phaseHz=speed>.02?T.MathUtils.clamp(speed/blendedStride,.16,2.6):0;
   // Same normalized cycle frequency for both clips: no per-frame phase re-snap / skate jitter.
   this.walk.setEffectiveTimeScale(phaseHz*this.walkClip.duration);this.run.setEffectiveTimeScale(phaseHz*this.runClip.duration);
   this.mixer.update(dt);
  }else{this.walk?.setEffectiveWeight(0);this.run?.setEffectiveWeight(0);}
  if(!dead){
   // Stable guard is always the arm baseline; attacks are smooth additive overlays.
   this.baseSwordPose(1);
   if(attack){
    const p=T.MathUtils.clamp((time-attack.started)/Math.max(.001,attack.endsAt-attack.started),0,1);
    this.attackPose(attack.skill,p,this.attackWeight(p));
   }else this.rotate('mixamorig:Spine2',Math.sin(time*1.5)*.018,0,0);
  }
  this.root.updateMatrixWorld(true);
 }
 dispose(){this.disposed=true;this.mixer.stopAllAction();this.bones.clear();}
}
