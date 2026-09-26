import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { QinglanVRMAPlugin, createQinglanVRMAnimationClip, type QinglanVRMA } from './vrma-runtime';
import type { AttackState, ItemInstance, PublicPlayer, Rarity, Slot, WeaponProfile } from '../../shared/types';
import { BUILD_RELEASE } from '../../shared/build-info';
import { APPEARANCES, ITEMS } from '../../shared/data/equipment';
import { itemUsesSecondaryHand } from '../../shared/domains/equipment';
import { SKILL_DEFINITIONS, WEAPON_PROFILES, mythicChoreography } from '../../shared/data/skills';
import { armorModel, weaponModel } from './appearance';
import { avatarCandidate, type AvatarCandidateId } from './avatar-candidates';
import { disposeVroid, loadVroidAvatar, updateVroid, type VroidAvatarHandle } from './vroid-runtime';
import { disposeTree } from '../rendering/primitives';
import type { CharacterCustomization } from './customization';
import { curatedEquipmentDefinition, curatedSkinTarget, instantiateCuratedEquipment, NO_PROCEDURAL_SILHOUETTE, type BaseOutfitMask } from './curated-equipment';
import { WeaponAura, type WeaponAuraKind } from './weapon-aura';
import { weaponGripProfile } from './weapon-grip';
import { sampleWeaponCombatArmInto } from './weapon-combat-motion';
import { BOW_DRAW_HAND, bowDrawFingerStrength, type BowDrawDigit } from './bow-draw-hand';
import { createActionRpgCombatStanceClip, createActionRpgReadyClip } from './action-rpg-weapon-layer';
import { loadMixamoVrmRotationClip } from './mixamo-retarget';
import { PLAYER_AUTHORED_LOCOMOTION, PLAYER_WALK_RUN_BLEND_HALF_WIDTH, PLAYER_WALK_RUN_SWITCH } from '../../shared/data/locomotion';
import { ACTION_COMBAT_FLOW } from '../../shared/combat/action-combat-flow';
import { CharacterMorphRuntime } from './character-morph-runtime';
import { GarmentMorphRuntime } from './garment-morph-runtime';
import { CharacterExpressionRuntime } from './character-expression-runtime';
import { CHARACTER_RUNTIME_ARCHITECTURE, humanoidAnimationAsset } from './character-runtime-architecture';
import { AUTHORED_HUMANOID_CLIPS,HUMANOID_CLIPS,type AuthoredHumanoidClip,type HumanoidClip } from './combat-animation-types';
import { COMBAT_MOTION_CLIPS,CORE_MATURE_CLIPS,LOOP_CLIPS } from './weapon-animation-profiles';
import { DEFAULT_CLASS_ANIMATION_SET_ID,resolveWeaponAnimationProfile } from './class-animation-sets';
import { basicComboClips,combatBlendFor,combatMotionTiming,poseCorrectionFor,resolveCombatMotionClip } from './combat-animation-resolver';

type LocomotionClip='Idle'|'Walk'|'Run';
type LocomotionLayer='full'|'weapon';
const BODY_LOCOMOTION_SEMANTICS=[
  'hips','spine','chest','upperChest','neck','head',
  'leftUpperLeg','leftLowerLeg','leftFoot','leftToes',
  'rightUpperLeg','rightLowerLeg','rightFoot','rightToes',
] as const;
// R18: equipped locomotion needs a real animated upper-body baseline.
// Using the authored Idle arm/shoulder pose prevents Three.js from blending
// a partially weighted attack against the VRM normalized T-pose/rest pose.
const WEAPON_UPPER_BASE_SEMANTICS=[
  'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
  'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
] as const;
type GripBone={bone:T.Object3D;tip:T.Object3D;rest:T.Quaternion;maxAngle:number;digit:BowDrawDigit};
type HandGripRig={hand:T.Object3D;index?:T.Object3D;middle:T.Object3D;little?:T.Object3D;thumb?:T.Object3D;fingers:GripBone[]};

const GRIP_CHAINS=[
 ['IndexProximal','IndexIntermediate',1.22],['IndexIntermediate','IndexDistal',1.42],
 ['MiddleProximal','MiddleIntermediate',1.28],['MiddleIntermediate','MiddleDistal',1.48],
 ['RingProximal','RingIntermediate',1.32],['RingIntermediate','RingDistal',1.52],
 ['LittleProximal','LittleIntermediate',1.36],['LittleIntermediate','LittleDistal',1.56],
 ['ThumbProximal','ThumbIntermediate',1.02],['ThumbIntermediate','ThumbDistal',1.24],
] as const;
const vrmaSourceCache=new Map<string,Promise<QinglanVRMA>>();
function vrmaLoader(){const loader=new GLTFLoader();loader.register(parser=>new QinglanVRMAPlugin(parser));return loader;}
async function loadDefaultVrma(name:AuthoredHumanoidClip,url:string){
  let pending=vrmaSourceCache.get(url);
  if(!pending){pending=vrmaLoader().loadAsync(url).then(gltf=>{const animation=(gltf.userData?.vrmAnimations as QinglanVRMA[]|undefined)?.[0];if(!animation)throw new Error(`VRMA parse failed: ${name}`);return animation;});vrmaSourceCache.set(url,pending);}
  return pending;
}

/** P0.24.2 VRMA Humanoid runtime.
 * Default body motion is sourced from complete VRMC_vrm_animation clips and mapped through VRM
 * normalized Humanoid semantics. A character's own embedded animation set is selected only when it
 * passes the mature/full-body gate; otherwise the shared Qinglan VRMA set remains authoritative. */
export class VrmCharacterRuntime {
  readonly root=new T.Group(); readonly loaded:Promise<boolean>;
  ready=false; failed=false; profile:WeaponProfile='sword';
  private classAnimationSetId=DEFAULT_CLASS_ANIMATION_SET_ID;
  private handle?:VroidAvatarHandle; private model?:T.Object3D;
  private morphRuntime?:CharacterMorphRuntime; private garmentMorphRuntime?:GarmentMorphRuntime; private expressionRuntime?:CharacterExpressionRuntime; private pendingCustomization?:CharacterCustomization;
  // R20 visual/gameplay root firewall. Character.root owns world X/Z/Yaw and collision alignment;
  // the loaded VRM scene keeps only its one-time scale/grounding transform.
  private readonly visualBasePosition=new T.Vector3();
  private readonly visualBaseQuaternion=new T.Quaternion();
  private readonly visualBaseScale=new T.Vector3(1,1,1);
  private visualTransformCaptured=false;
  private equipment=new Map<string,T.Object3D[]>(); private pending:Partial<Record<Slot,ItemInstance>>={};
  private equipmentVisible=true; private equipmentGeneration=0; private appliedEquipmentSignature='';
  private readonly baseOutfitMaterials=new Map<T.Material,boolean>(); private jumpAt=-1;
  private pickup?:{started:number;clip:HumanoidClip}; private deathStartedAt=-1; private lastHp=1;
  private hasMainhand=false; private hasOffhand=false; private mainhandUsesSecondaryHand=false;
  private readonly rightWeaponMount=new T.Group(); private readonly leftWeaponMount=new T.Group();
  private readonly mountPos=new T.Vector3(); private readonly mountQuat=new T.Quaternion(); private readonly rootQuat=new T.Quaternion();
  private readonly palmWrist=new T.Vector3(); private readonly palmIndex=new T.Vector3(); private readonly palmMiddle=new T.Vector3(); private readonly palmLittle=new T.Vector3(); private readonly palmThumb=new T.Vector3();
  private readonly palmFinger=new T.Vector3(); private readonly palmAcross=new T.Vector3(); private readonly palmNormal=new T.Vector3(); private readonly palmGripTangent=new T.Vector3(); private readonly palmMatrix=new T.Matrix4();
  private readonly handGripRigs:Partial<Record<'right'|'left',HandGripRig>>={};
  private readonly gripCenter=new T.Vector3(); private readonly gripAxis=new T.Vector3(); private readonly gripAxisTarget=new T.Vector3(); private readonly gripJoint=new T.Vector3(); private readonly gripTip=new T.Vector3(); private readonly gripTarget=new T.Vector3(); private readonly gripCurrentDir=new T.Vector3(); private readonly gripTargetDir=new T.Vector3();
  private readonly gripParentWorld=new T.Quaternion(); private readonly gripBoneWorld=new T.Quaternion(); private readonly gripDesiredWorld=new T.Quaternion(); private readonly gripWorldDelta=new T.Quaternion(); private readonly gripLocalDesired=new T.Quaternion(); private readonly gripIdentity=new T.Quaternion();
  private locomotionSpeed=0; private cadenceSpeed=0; private activeLocomotion:LocomotionClip='Idle'; private locomotionLayer:LocomotionLayer='full';
  private locomotionStrideLength:{Walk:number;Run:number}={Walk:PLAYER_AUTHORED_LOCOMOTION.walk.rootTravel,Run:PLAYER_AUTHORED_LOCOMOTION.run.rootTravel};
  private weaponLayerBlend=0;
  private animationMixer?:T.AnimationMixer; private animationTargetSkin?:T.SkinnedMesh; private animationReady=false;
  private readonly layeredLocomotionActions=new Map<LocomotionClip,T.AnimationAction>();
  private readonly layeredLocomotionClips=new Map<LocomotionClip,T.AnimationClip>();
  private weaponUpperBaseAction?:T.AnimationAction;
  private weaponUpperBaseClip?:T.AnimationClip;
  private readonly weaponReadyActions=new Map<WeaponProfile,T.AnimationAction>();
  private readonly weaponReadyClips=new Map<WeaponProfile,T.AnimationClip>();
  private readonly combatStanceActions=new Map<WeaponProfile,T.AnimationAction>();
  private readonly combatStanceClips=new Map<WeaponProfile,T.AnimationClip>();
  private combatStanceBlend=0; private combatStanceHoldUntil=-1;
  private outgoingCombat?:{name:HumanoidClip;action:T.AnimationAction;clip:T.AnimationClip;phase:number;started:number;duration:number};
  private readonly weaponTrailGeometry=new T.BufferGeometry(); private readonly weaponTrailPositions=new Float32Array(12*2*3); private readonly weaponTrailMaterial:T.MeshBasicMaterial; private readonly weaponTrailMesh:T.Mesh; private weaponTrailCount=0;
  private weaponAura?:WeaponAura;
  private readonly trailBaseWorld=new T.Vector3(); private readonly trailTipWorld=new T.Vector3(); private readonly trailBaseLocal=new T.Vector3(); private readonly trailTipLocal=new T.Vector3(); private readonly lastTrailTip=new T.Vector3();
  private animationSource='default-vrma';
  private animationActions=new Map<HumanoidClip,T.AnimationAction>(); private animationClips=new Map<HumanoidClip,T.AnimationClip>();
  private activeOneShot?:HumanoidClip; private activeOneShotKey=''; private activeOneShotBlend=0;
  private activeCombatSkill=''; private activeCombatPhase=0; private activeCombatBlend=0; private basicCombo=0; private lastBasicComboAt=-Infinity; private previewUntil=0;
  private predictedAttack?:AttackState; private predictedAttackDeadline=0; private predictionSerial=0;
  private combatPhaseCorrection=0; private combatPhaseCorrectionStarted=0; private combatPhaseCorrectionAttackId=0;
  private readonly ikShoulder=new T.Vector3(); private readonly ikElbow=new T.Vector3(); private readonly ikWrist=new T.Vector3(); private readonly ikTarget=new T.Vector3(); private readonly ikPole=new T.Vector3(); private readonly ikDirection=new T.Vector3(); private readonly ikPoleDirection=new T.Vector3(); private readonly ikPlaneNormal=new T.Vector3(); private readonly ikBendDirection=new T.Vector3(); private readonly ikDesiredElbow=new T.Vector3(); private readonly ikCurrentDir=new T.Vector3(); private readonly ikTargetDir=new T.Vector3();
  private readonly bowHandLocal=new T.Vector3(); private readonly bowPoleLocal=new T.Vector3();
  private readonly bowForward=new T.Vector3(); private readonly bowRight=new T.Vector3(); private readonly bowUp=new T.Vector3(); private readonly bowHead=new T.Vector3(); private readonly bowPredraw=new T.Vector3(); private readonly bowAnchor=new T.Vector3(); private readonly bowShoulder=new T.Vector3();
  private readonly ikParentWorld=new T.Quaternion(); private readonly ikBoneWorld=new T.Quaternion(); private readonly ikDesiredWorld=new T.Quaternion(); private readonly ikWorldDelta=new T.Quaternion(); private readonly ikLocalDesired=new T.Quaternion(); private readonly ikIdentity=new T.Quaternion();
  constructor(private candidateId:AvatarCandidateId){
    this.root.name=`VRM_Runtime_${candidateId}`;
    this.rightWeaponMount.name='WeaponGrip_RightPalm';this.leftWeaponMount.name='WeaponGrip_LeftPalm';
    this.weaponTrailGeometry.setAttribute('position',new T.BufferAttribute(this.weaponTrailPositions,3).setUsage(T.DynamicDrawUsage));
    const idx:number[]=[];for(let i=0;i<11;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,b,d,c);}this.weaponTrailGeometry.setIndex(idx);this.weaponTrailGeometry.setDrawRange(0,0);
    this.weaponTrailMaterial=new T.MeshBasicMaterial({color:0xcfefff,transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
    this.weaponTrailMesh=new T.Mesh(this.weaponTrailGeometry,this.weaponTrailMaterial);this.weaponTrailMesh.name='CombatBladeTrail';this.weaponTrailMesh.visible=false;this.weaponTrailMesh.frustumCulled=false;
    this.root.add(this.rightWeaponMount,this.leftWeaponMount,this.weaponTrailMesh);
    this.loaded=this.init();
  }

  private async init(){
    try{
      const candidate=avatarCandidate(this.candidateId),handle=await loadVroidAvatar(candidate.url);this.handle=handle;this.model=handle.scene;
      const model=this.model; model.visible=true;
      let meshes=0,skinned=0;
      model.traverse(o=>{
        if(o instanceof T.Mesh){meshes++;if(o instanceof T.SkinnedMesh)skinned++;}
      });
      model.updateMatrixWorld(true);
      const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
      if(box.isEmpty()||!Number.isFinite(size.y)||size.y<.01)throw new Error(`VRM has invalid render bounds: ${candidate.url}`);
      const scale=1.92/size.y;model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
      const b2=new T.Box3().setFromObject(model),center=b2.getCenter(new T.Vector3());model.position.x-=center.x;model.position.y-=b2.min.y;model.position.z-=center.z;
      // Capture the only legal transform of the visual VRM root after scale + foot grounding.
      // Bone animation may move Hips/limbs, but may never translate/tilt this scene root.
      this.visualBasePosition.copy(model.position);this.visualBaseQuaternion.copy(model.quaternion);this.visualBaseScale.copy(model.scale);this.visualTransformCaptured=true;
      this.root.add(model);this.validateHumanoid();this.installSockets();this.captureGripReferencePose();
      this.morphRuntime=new CharacterMorphRuntime(handle.vrm,model);this.garmentMorphRuntime=new GarmentMorphRuntime(model);this.expressionRuntime=new CharacterExpressionRuntime(handle.vrm);
      if(this.pendingCustomization){this.morphRuntime.setProfile(this.pendingCustomization);this.morphRuntime.apply();this.garmentMorphRuntime.setProfile(this.pendingCustomization);}
      await this.prepareHumanoidAnimations();
      this.ready=true;this.failed=false;this.setEquipment(this.pending);
      console.info(`[${BUILD_RELEASE} VRM] HUMANOID LIVE ${this.candidateId} meshes=${meshes} skinned=${skinned} humanoid=${!!handle.vrm?.humanoid} animation=${this.animationSource} architecture=${CHARACTER_RUNTIME_ARCHITECTURE.avatarAuthority}+${CHARACTER_RUNTIME_ARCHITECTURE.equipmentAuthority}+${CHARACTER_RUNTIME_ARCHITECTURE.runtimeAuthority}`);
      console.info('[P0.26 morph] coverage',this.morphRuntime?.getCoverage());console.info('[HF8 garment morph] coverage',this.garmentMorphRuntime?.getCoverage());
      return true;
    }catch(error){this.failed=true;this.ready=false;console.error(`[${BUILD_RELEASE} VRM] FAILED ${this.candidateId}`,error);return false;}
  }
  /** Runtime animation is written only to humanoid bones; scene/world transforms remain gameplay-owned. */
  private enforceVisualRootInvariant(){
    // VrmCharacterRuntime.root is a child of Character.root. Character.root receives authoritative
    // world X/Z/Yaw from Game; this inner root is allowed only a local Y jump offset.
    this.root.position.x=0;this.root.position.z=0;this.root.quaternion.identity();
    if(!this.visualTransformCaptured||!this.model)return;
    this.model.position.copy(this.visualBasePosition);this.model.quaternion.copy(this.visualBaseQuaternion);this.model.scale.copy(this.visualBaseScale);
  }
  private rawBone(name:string):T.Object3D|undefined{const h=(this.handle?.vrm as any)?.humanoid;return h?.getRawBoneNode?.(name)??undefined;}
  private validateHumanoid(){const required=['hips','spine','chest','head','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot'];const missing=required.filter(n=>!this.rawBone(n));if(missing.length)throw new Error(`VRM Humanoid missing gameplay bones: ${missing.join(', ')}`);}
  private socket(boneName:string,mountName:string){const bone=this.rawBone(boneName);if(!bone)return undefined;return bone.getObjectByName(mountName)??bone;}
  private installSockets(){
    const slots:[string,string][]=[['head','HeadMount'],['chest','ChestMount'],['hips','HipsMount'],['leftFoot','LeftFootMount'],['rightFoot','RightFootMount']];
    for(const [boneName,mountName] of slots){const bone=this.rawBone(boneName);if(!bone||bone.getObjectByName(mountName))continue;const g=new T.Group();g.name=mountName;g.userData.vrmSocket=true;bone.add(g);}
  }
  private mount(bone:string){return this.rawBone(bone)??this.model??this.root;}
  /**
   * Build an anatomical palm frame instead of assuming a VRM hand bone's local axes.
   * P0.24.1 anatomical grip frame:
   * local +Y = little-finger side -> index/thumb side (actual sword/staff handle axis through a closed fist)
   * local -X = wrist -> middle finger, local +Z = palm normal.
   * The previous wrist->finger blade axis made the weapon project from the fingertips and made arcs read backwards.
   */
  private syncHandMount(side:'right'|'left',palmInset=.014){
    const rig=this.handGripRigs[side],mount=side==='right'?this.rightWeaponMount:this.leftWeaponMount;if(!rig)return;
    const {hand,index,middle,little,thumb}=rig;
    hand.getWorldPosition(this.palmWrist);middle.getWorldPosition(this.palmMiddle);
    // Anchor inside the palm, not at the wrist and not at the knuckle itself.
    this.mountPos.copy(this.palmWrist).lerp(this.palmMiddle,.44);
    this.palmFinger.copy(this.palmMiddle).sub(this.palmWrist);
    if(this.palmFinger.lengthSq()<1e-8){hand.getWorldQuaternion(this.mountQuat);this.root.getWorldQuaternion(this.rootQuat);this.rootQuat.invert();mount.quaternion.copy(this.rootQuat.multiply(this.mountQuat));this.root.worldToLocal(this.mountPos);mount.position.copy(this.mountPos);return;}
    this.palmFinger.normalize();
    if(index&&little){
      index.getWorldPosition(this.palmIndex);little.getWorldPosition(this.palmLittle);
      this.palmAcross.copy(this.palmIndex).sub(this.palmLittle);
      // Gram-Schmidt keeps the socket orthogonal even on imperfect hand rigs.
      this.palmAcross.addScaledVector(this.palmFinger,-this.palmAcross.dot(this.palmFinger));
    }else{
      this.palmAcross.set(0,0,side==='right'?-1:1).applyQuaternion(hand.getWorldQuaternion(this.mountQuat));
      this.palmAcross.addScaledVector(this.palmFinger,-this.palmAcross.dot(this.palmFinger));
    }
    if(this.palmAcross.lengthSq()<1e-8)this.palmAcross.set(0,0,side==='right'?-1:1);else this.palmAcross.normalize();
    this.palmNormal.copy(this.palmAcross).cross(this.palmFinger).normalize();
    // The thumb's small out-of-palm-plane offset disambiguates palm from hand-back.
    if(thumb){thumb.getWorldPosition(this.palmThumb);this.palmThumb.sub(this.palmWrist);if(this.palmNormal.dot(this.palmThumb)<0){this.palmAcross.negate();this.palmNormal.negate();}}
    else if(side==='left'){this.palmAcross.negate();this.palmNormal.negate();}
    // Seat the grip just inside the palm instead of on its outer skin surface.
    this.mountPos.addScaledVector(this.palmNormal,-palmInset);

    // P0.26.8 bow-facing authority. A bow cannot inherit an arbitrary VRM palm basis: different
    // avatars expose different hand-bone local axes and the same -90deg hand-local correction can
    // turn the limbs/string backward.  Keep the grip POSITION on the anatomical left palm, but make
    // the bow frame explicit in world space: local +X = character target-forward, +Y = world up.
    // The procedural bow is authored with its limb/target side on +X and its string on -X, so this
    // guarantees the string stays between the archer and the bow on every compatible VRM.
    if(this.profile==='bow'&&this.hasMainhand&&side==='left'){
      this.root.getWorldQuaternion(this.rootQuat);
      this.bowForward.set(0,0,1).applyQuaternion(this.rootQuat).normalize();
      this.bowUp.set(0,1,0).applyQuaternion(this.rootQuat).normalize();
      this.palmNormal.copy(this.bowForward).cross(this.bowUp).normalize();
      this.palmMatrix.makeBasis(this.bowForward,this.bowUp,this.palmNormal);this.mountQuat.setFromRotationMatrix(this.palmMatrix);
      this.root.worldToLocal(this.mountPos);mount.position.copy(this.mountPos);
      this.root.getWorldQuaternion(this.rootQuat);this.rootQuat.invert();mount.quaternion.copy(this.rootQuat.multiply(this.mountQuat));
      return;
    }

    this.palmGripTangent.copy(this.palmFinger).negate();
    this.palmMatrix.makeBasis(this.palmGripTangent,this.palmAcross,this.palmNormal);this.mountQuat.setFromRotationMatrix(this.palmMatrix);
    this.root.worldToLocal(this.mountPos);mount.position.copy(this.mountPos);
    this.root.getWorldQuaternion(this.rootQuat);this.rootQuat.invert();mount.quaternion.copy(this.rootQuat.multiply(this.mountQuat));
  }
  private captureGripReferencePose(){
    for(const side of ['right','left'] as const){
      const hand=this.rawBone(`${side}Hand`),middle=this.rawBone(`${side}MiddleProximal`);if(!hand||!middle)continue;
      const fingers:GripBone[]=[];
      for(const [from,to,maxAngle] of GRIP_CHAINS){
        const bone=this.rawBone(`${side}${from}`),tip=this.rawBone(`${side}${to}`);
        if(bone&&tip){const digit=(from.startsWith('Index')?'index':from.startsWith('Middle')?'middle':from.startsWith('Ring')?'ring':from.startsWith('Little')?'little':'thumb') as BowDrawDigit;fingers.push({bone,tip,rest:bone.quaternion.clone(),maxAngle,digit});}
      }
      this.handGripRigs[side]={hand,index:this.rawBone(`${side}IndexProximal`),middle,little:this.rawBone(`${side}LittleProximal`),thumb:this.rawBone(`${side}ThumbProximal`),fingers};
    }
  }
  private resetGripRig(rig:HandGripRig){for(const entry of rig.fingers)entry.bone.quaternion.copy(entry.rest);}
  private curlGripBone(entry:GripBone,axis:T.Vector3,radius:number,strength:number){
    const bone=entry.bone,parent=bone.parent;if(!parent)return;
    bone.getWorldPosition(this.gripJoint);entry.tip.getWorldPosition(this.gripTip);
    this.gripCurrentDir.copy(this.gripTip).sub(this.gripJoint);
    const along=this.gripTarget.copy(this.gripJoint).sub(this.gripCenter).dot(axis);
    this.gripTarget.copy(this.gripCenter).addScaledVector(axis,along);
    // Stop at the physical handle surface instead of collapsing every phalanx through its centre line.
    this.gripAxisTarget.copy(this.gripJoint).sub(this.gripTarget);
    this.gripAxisTarget.addScaledVector(axis,-this.gripAxisTarget.dot(axis));
    if(this.gripAxisTarget.lengthSq()>1e-8)this.gripTarget.addScaledVector(this.gripAxisTarget.normalize(),Math.max(.004,radius*.42));
    this.gripTargetDir.copy(this.gripTarget).sub(this.gripJoint);
    if(this.gripCurrentDir.lengthSq()<1e-8||this.gripTargetDir.lengthSq()<1e-8)return;
    this.gripCurrentDir.normalize();this.gripTargetDir.normalize();
    const angle=this.gripCurrentDir.angleTo(this.gripTargetDir);if(!Number.isFinite(angle)||angle<1e-4)return;
    this.gripWorldDelta.setFromUnitVectors(this.gripCurrentDir,this.gripTargetDir);
    this.gripIdentity.identity().slerp(this.gripWorldDelta,Math.min(1,entry.maxAngle/angle)*strength);
    bone.getWorldQuaternion(this.gripBoneWorld);this.gripDesiredWorld.copy(this.gripIdentity).multiply(this.gripBoneWorld);
    parent.getWorldQuaternion(this.gripParentWorld).invert();this.gripLocalDesired.copy(this.gripParentWorld).multiply(this.gripDesiredWorld);bone.quaternion.copy(this.gripLocalDesired);
    bone.updateMatrixWorld(true);
  }
  private mountGripPoint(mount:T.Object3D,offset:[number,number,number],center:T.Vector3,axis:T.Vector3){
    center.set(offset[0],offset[1],offset[2]);mount.localToWorld(center);mount.getWorldQuaternion(this.mountQuat);axis.set(0,1,0).applyQuaternion(this.mountQuat).normalize();
  }
  private applyWeaponGrip(side:'right'|'left',active:boolean,center?:T.Vector3,axis?:T.Vector3,radius=.028,strength=1,palmInset=.014,localOffset:[number,number,number]=[0,0,0]){
    const rig=this.handGripRigs[side];if(!rig)return;
    // Always restore the anatomical reference first. The iterative solver then closes the fingers
    // around the physical handle cylinder, so an open/splayed VRM rest hand cannot leak through.
    this.resetGripRig(rig);this.root.updateMatrixWorld(true);this.syncHandMount(side,palmInset);this.root.updateMatrixWorld(true);if(!active)return;
    const mount=side==='right'?this.rightWeaponMount:this.leftWeaponMount;
    if(center&&axis){this.gripCenter.copy(center);this.gripAxis.copy(axis).normalize();}
    else this.mountGripPoint(mount,localOffset,this.gripCenter,this.gripAxis);
    // Multiple passes are deliberate: proximal motion changes the distal world-space target.
    for(let pass=0;pass<3;pass++)for(const entry of rig.fingers)this.curlGripBone(entry,this.gripAxis,radius,strength);
  }
  private alignHandAxis(side:'right'|'left',axis:T.Vector3,strength:number,palmInset=.014,allowAxisFlip=false){
    const rig=this.handGripRigs[side],hand=rig?.hand,parent=hand?.parent;if(!rig||!hand||!parent||strength<=0)return;
    this.syncHandMount(side,palmInset);
    this.gripAxisTarget.copy(axis).normalize();
    if(allowAxisFlip&&this.palmAcross.dot(this.gripAxisTarget)<0)this.gripAxisTarget.negate();
    this.gripWorldDelta.setFromUnitVectors(this.palmAcross,this.gripAxisTarget);
    this.gripIdentity.identity().slerp(this.gripWorldDelta,T.MathUtils.clamp(strength,0,1));
    hand.getWorldQuaternion(this.gripBoneWorld);this.gripDesiredWorld.copy(this.gripIdentity).multiply(this.gripBoneWorld);
    parent.getWorldQuaternion(this.gripParentWorld).invert();hand.quaternion.copy(this.gripParentWorld.multiply(this.gripDesiredWorld));
  }
  private alignSupportHandAxis(axis:T.Vector3,strength:number,palmInset=.014){
    this.alignHandAxis('left',axis,strength,palmInset,true);
  }
  private syncHandMounts(){
    const spec=weaponGripProfile(this.profile),primaryMount=spec.primary.side==='right'?this.rightWeaponMount:this.leftWeaponMount;
    const combat=!!this.activeOneShot&&COMBAT_MOTION_CLIPS.has(this.activeOneShot);
    const gripBlend=combat?1:T.MathUtils.clamp(this.weaponLayerBlend,0,1);
    const primaryActive=this.hasMainhand;this.applyWeaponGrip(spec.primary.side,primaryActive,undefined,undefined,spec.primary.handleRadius,spec.primary.fingerStrength*gripBlend,spec.primary.palmInset,spec.primary.offset);
    if(this.hasOffhand){
      // Offhand shields/items are physically mounted on the left hand. A left-primary bow cannot
      // simultaneously claim that socket, so never curl an unrelated right hand as a fake offhand.
      if(spec.primary.side==='right')this.applyWeaponGrip('left',true,undefined,undefined,.03,gripBlend,.014);
      return;
    }
    if(!primaryActive||!this.mainhandUsesSecondaryHand||!spec.secondary)return;
    if(spec.mirroredSecondaryWeapon){this.applyWeaponGrip(spec.secondary.side,true,undefined,undefined,spec.secondary.handleRadius,spec.secondary.fingerStrength*gripBlend,spec.secondary.palmInset,spec.secondary.offset);return;}
    this.mountGripPoint(primaryMount,spec.secondary.offset,this.gripCenter,this.gripAxis);
    this.applyWeaponGrip(spec.secondary.side,true,this.gripCenter,this.gripAxis,spec.secondary.handleRadius,spec.secondary.fingerStrength*gripBlend,spec.secondary.palmInset);
  }

  private rotateBoneToward(bone:T.Object3D,origin:T.Vector3,end:T.Vector3,target:T.Vector3,strength:number){
    const parent=bone.parent;if(!parent)return;this.ikCurrentDir.copy(end).sub(origin);this.ikTargetDir.copy(target).sub(origin);if(this.ikCurrentDir.lengthSq()<1e-8||this.ikTargetDir.lengthSq()<1e-8)return;
    this.ikCurrentDir.normalize();this.ikTargetDir.normalize();this.ikWorldDelta.setFromUnitVectors(this.ikCurrentDir,this.ikTargetDir);this.ikIdentity.identity().slerp(this.ikWorldDelta,strength);
    parent.getWorldQuaternion(this.ikParentWorld).invert();bone.getWorldQuaternion(this.ikBoneWorld);this.ikDesiredWorld.copy(this.ikIdentity).multiply(this.ikBoneWorld);this.ikLocalDesired.copy(this.ikParentWorld).multiply(this.ikDesiredWorld);bone.quaternion.copy(this.ikLocalDesired);
  }
  private applyTwoBoneArmIK(side:'right'|'left',target:T.Vector3,pole:T.Vector3,strength:number){
    const upper=this.rawBone(`${side}UpperArm`),lower=this.rawBone(`${side}LowerArm`),hand=this.rawBone(`${side}Hand`);if(!upper||!lower||!hand||strength<=0)return;
    const solveStrength=T.MathUtils.clamp(strength,0,1);
    for(let pass=0;pass<2;pass++){
      this.root.updateMatrixWorld(true);upper.getWorldPosition(this.ikShoulder);lower.getWorldPosition(this.ikElbow);hand.getWorldPosition(this.ikWrist);
      const upperLength=Math.max(.001,this.ikShoulder.distanceTo(this.ikElbow)),lowerLength=Math.max(.001,this.ikElbow.distanceTo(this.ikWrist));
      this.ikDirection.copy(target).sub(this.ikShoulder);let distance=this.ikDirection.length();if(distance<1e-5)return;this.ikDirection.multiplyScalar(1/distance);
      distance=T.MathUtils.clamp(distance,Math.abs(upperLength-lowerLength)+.002,upperLength+lowerLength-.002);
      this.ikPoleDirection.copy(pole).sub(this.ikShoulder);this.ikPoleDirection.addScaledVector(this.ikDirection,-this.ikPoleDirection.dot(this.ikDirection));
      if(this.ikPoleDirection.lengthSq()<1e-8){this.ikPoleDirection.copy(this.ikElbow).sub(this.ikShoulder);this.ikPoleDirection.addScaledVector(this.ikDirection,-this.ikPoleDirection.dot(this.ikDirection));}
      if(this.ikPoleDirection.lengthSq()<1e-8)this.ikPoleDirection.set(side==='right'?1:-1,0,0);this.ikPoleDirection.normalize();
      this.ikPlaneNormal.copy(this.ikDirection).cross(this.ikPoleDirection).normalize();this.ikBendDirection.copy(this.ikPlaneNormal).cross(this.ikDirection).normalize();
      const along=(upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
      this.ikDesiredElbow.copy(this.ikShoulder).addScaledVector(this.ikDirection,along).addScaledVector(this.ikBendDirection,height);
      this.rotateBoneToward(upper,this.ikShoulder,this.ikElbow,this.ikDesiredElbow,solveStrength*(pass===0?.72:.38));this.root.updateMatrixWorld(true);
      lower.getWorldPosition(this.ikElbow);hand.getWorldPosition(this.ikWrist);this.rotateBoneToward(lower,this.ikElbow,this.ikWrist,target,solveStrength*(pass===0?.88:.50));
    }
  }
  private applyBowDrawCorrection(){
    // P0.26.6: derive the archery anchors from the live humanoid proportions instead of hard-coded
    // world-height coordinates. The previous fixed targets could sit well outside the arm's reach
    // (especially after avatar scaling/customization), forcing the two-bone solver into an extreme
    // fully-extended pose. Left hand now owns a reachable bow-arm target; right hand draws from in
    // front of the face to a cheek/jaw anchor, with the draw elbow opening outward and slightly back.
    if(!this.hasMainhand||!this.activeOneShot||this.activeCombatBlend<=.001)return;
    const correction=poseCorrectionFor(this.activeOneShot);if(correction?.kind!=='bow-draw')return;
    const leftUpper=this.rawBone('leftUpperArm'),leftLower=this.rawBone('leftLowerArm'),leftHand=this.rawBone('leftHand');
    const rightUpper=this.rawBone('rightUpperArm'),rightLower=this.rawBone('rightLowerArm'),rightHand=this.rawBone('rightHand'),head=this.rawBone('head');
    if(!leftUpper||!leftLower||!leftHand||!rightUpper||!rightLower||!rightHand||!head)return;
    const phase=T.MathUtils.clamp(this.activeCombatPhase,0,1),blend=T.MathUtils.clamp(this.activeCombatBlend,0,1);
    const draw=T.MathUtils.smoothstep(phase,.06,correction.drawInEnd),release=T.MathUtils.smoothstep(phase,correction.releaseStart,correction.releaseEnd);
    this.root.getWorldQuaternion(this.rootQuat);
    this.bowForward.set(0,0,1).applyQuaternion(this.rootQuat).normalize();
    this.bowRight.set(1,0,0).applyQuaternion(this.rootQuat).normalize();
    this.bowUp.set(0,1,0).applyQuaternion(this.rootQuat).normalize();
    head.getWorldPosition(this.bowHead);

    // Bow arm: preserve a small anatomical elbow bend by staying just inside total reach. This is
    // stable across avatar heights because reach comes from the actual upper/lower arm lengths.
    leftUpper.getWorldPosition(this.bowShoulder);leftLower.getWorldPosition(this.ikElbow);leftHand.getWorldPosition(this.ikWrist);
    const leftReach=Math.max(.18,this.bowShoulder.distanceTo(this.ikElbow)+this.ikElbow.distanceTo(this.ikWrist));
    this.ikTarget.copy(this.bowShoulder).addScaledVector(this.bowForward,leftReach*T.MathUtils.lerp(.78,.94,draw)).addScaledVector(this.bowUp,-leftReach*.035).addScaledVector(this.bowRight,-leftReach*.025);
    this.ikPole.copy(this.bowShoulder).addScaledVector(this.bowRight,-leftReach*.72).addScaledVector(this.bowUp,-leftReach*.24).addScaledVector(this.bowForward,leftReach*.18);
    const leftPathWeight=sampleWeaponCombatArmInto('bow',this.activeOneShot,phase,true,'left',this.bowHandLocal,this.bowPoleLocal);
    const leftStrength=Math.min(correction.leftArmCap,leftPathWeight*blend*correction.leftArmScale);if(leftStrength>.001)this.applyTwoBoneArmIK('left',this.ikTarget,this.ikPole,leftStrength);

    // Draw arm: pre-draw begins forward of the face, then the string hand settles at the right
    // cheek/jaw. On release the hand follows slightly outward/back instead of snapping across the
    // face. The pole keeps the elbow in the arrow/shoulder plane rather than collapsed downward.
    rightUpper.getWorldPosition(this.bowShoulder);rightLower.getWorldPosition(this.ikElbow);rightHand.getWorldPosition(this.ikWrist);
    const rightReach=Math.max(.18,this.bowShoulder.distanceTo(this.ikElbow)+this.ikElbow.distanceTo(this.ikWrist));
    this.bowPredraw.copy(this.bowHead).addScaledVector(this.bowRight,rightReach*.24).addScaledVector(this.bowUp,-rightReach*.10).addScaledVector(this.bowForward,rightReach*.48);
    this.bowAnchor.copy(this.bowHead).addScaledVector(this.bowRight,rightReach*.20).addScaledVector(this.bowUp,-rightReach*.08).addScaledVector(this.bowForward,rightReach*.08);
    this.bowAnchor.addScaledVector(this.bowRight,rightReach*.08*release).addScaledVector(this.bowForward,-rightReach*.16*release);
    this.ikTarget.copy(this.bowPredraw).lerp(this.bowAnchor,draw);
    this.ikPole.copy(this.bowShoulder).addScaledVector(this.bowRight,rightReach*.96).addScaledVector(this.bowUp,rightReach*.04).addScaledVector(this.bowForward,-rightReach*.22);
    const rightPathWeight=sampleWeaponCombatArmInto('bow',this.activeOneShot,phase,true,'right',this.bowHandLocal,this.bowPoleLocal);
    const rightStrength=Math.min(correction.rightArmCap,rightPathWeight*blend*correction.rightArmScale);if(rightStrength>.001)this.applyTwoBoneArmIK('right',this.ikTarget,this.ikPole,rightStrength);
  }

  private applyBowStringHook(){
    // R27.3: real archery uses a finger hook, not a clenched fist around the string.  The draw hand
    // therefore resets to its anatomical reference and only index/middle/ring are curled around a
    // very thin virtual string line. Thumb/little stay relaxed; the hook opens through release.
    if(!this.hasMainhand||!this.activeOneShot||this.activeCombatBlend<=.001)return;
    const correction=poseCorrectionFor(this.activeOneShot);if(correction?.kind!=='bow-draw'||!correction.stringHook)return;
    const rig=this.handGripRigs.right,leftHand=this.rawBone('leftHand');if(!rig||!leftHand)return;
    const phase=T.MathUtils.clamp(this.activeCombatPhase,0,1),blend=T.MathUtils.clamp(this.activeCombatBlend,0,1);
    this.resetGripRig(rig);this.root.updateMatrixWorld(true);
    rig.hand.getWorldPosition(this.gripCenter);leftHand.getWorldPosition(this.ikTarget);
    this.gripTargetDir.copy(this.ikTarget).sub(this.gripCenter);if(this.gripTargetDir.lengthSq()<1e-8)return;this.gripTargetDir.normalize();
    this.gripCenter.addScaledVector(this.gripTargetDir,BOW_DRAW_HAND.stringContactForward);
    this.root.getWorldQuaternion(this.rootQuat);this.gripAxis.set(0,1,0).applyQuaternion(this.rootQuat).normalize();
    // Two passes are enough for a light hook; three-pass full weapon grip would read as a fist.
    for(let pass=0;pass<2;pass++)for(const entry of rig.fingers){const strength=bowDrawFingerStrength(entry.digit,phase,correction)*blend;if(strength>.001)this.curlGripBone(entry,this.gripAxis,BOW_DRAW_HAND.virtualStringRadius,strength);}
  }

  private applySecondaryHandContactIK(){
    const spec=weaponGripProfile(this.profile),secondary=spec.secondary;if(!this.hasMainhand||!this.mainhandUsesSecondaryHand||this.hasOffhand||!secondary||spec.mirroredSecondaryWeapon||secondary.side!=='left')return;
    const upper=this.rawBone('leftUpperArm'),lower=this.rawBone('leftLowerArm'),hand=this.rawBone('leftHand');if(!upper||!lower||!hand)return;
    const primaryMount=spec.primary.side==='right'?this.rightWeaponMount:this.leftWeaponMount;this.syncHandMount(spec.primary.side,spec.primary.palmInset);this.root.updateMatrixWorld(true);
    this.mountGripPoint(primaryMount,secondary.offset,this.ikTarget,this.gripAxis);
    const combat=!!this.activeOneShot&&COMBAT_MOTION_CLIPS.has(this.activeOneShot);
    let strength=combat?T.MathUtils.lerp(secondary.idleIk,secondary.combatIk,this.activeCombatBlend):secondary.idleIk*this.nonCombatArmOwnership()*T.MathUtils.clamp(this.weaponLayerBlend,0,1);
    // P0.26.8 two-hand contact is part of the weapon contract, not a cosmetic 8% hint. Spears and
    // two-hand staffs must keep the support palm on the shaft throughout authored attacks. Profiles
    // therefore own their safe contact caps; greatsword/backward-compatible profiles keep the old
    // conservative defaults, while spear/staff can use a materially stronger correction.
    if(!combat){const moving=T.MathUtils.smoothstep(this.locomotionSpeed,.35,PLAYER_AUTHORED_LOCOMOTION.run.speed);strength*=T.MathUtils.lerp(1,.18,moving);}
    strength=Math.min(combat?(secondary.combatCap??.08):(secondary.idleCap??.12),strength);
    if(strength<=.001)return;
    // CCD-style two-bone correction remains layered on top of authored body motion. Solve the
    // physical PALM grip point (not the wrist bone origin) onto the secondary weapon Grip Point.
    // This removes the several-centimetre wrist-to-palm offset that otherwise looks like a floating
    // or glued support hand on greatswords, spears and staffs.
    const contactPasses=combat&&((secondary.combatCap??0)>.5)?3:2;
    for(let i=0;i<contactPasses;i++){
      this.syncHandMount('left',secondary.palmInset);this.root.updateMatrixWorld(true);upper.getWorldPosition(this.ikShoulder);this.leftWeaponMount.getWorldPosition(this.ikWrist);this.rotateBoneToward(upper,this.ikShoulder,this.ikWrist,this.ikTarget,strength*.62);this.root.updateMatrixWorld(true);
      this.syncHandMount('left',secondary.palmInset);this.root.updateMatrixWorld(true);lower.getWorldPosition(this.ikElbow);this.leftWeaponMount.getWorldPosition(this.ikWrist);this.rotateBoneToward(lower,this.ikElbow,this.ikWrist,this.ikTarget,strength*.82);this.root.updateMatrixWorld(true);
    }
    this.alignSupportHandAxis(this.gripAxis,strength*.32,secondary.palmInset);this.root.updateMatrixWorld(true);
    // Hand-axis alignment pivots around the wrist and can move the palm contact point slightly.
    // Finish with one contact correction so the secondary Grip Point remains seated after orientation.
    this.syncHandMount('left',secondary.palmInset);this.root.updateMatrixWorld(true);lower.getWorldPosition(this.ikElbow);this.leftWeaponMount.getWorldPosition(this.ikWrist);this.rotateBoneToward(lower,this.ikElbow,this.ikWrist,this.ikTarget,strength*.55);this.root.updateMatrixWorld(true);
  }
  setEquipmentVisible(v:boolean){this.equipmentVisible=v;for(const xs of this.equipment.values())for(const o of xs)o.visible=v;if(this.weaponAura)this.weaponAura.root.visible=v;}
  setCustomization(p:CharacterCustomization){this.pendingCustomization={...p};this.morphRuntime?.setProfile(this.pendingCustomization);this.morphRuntime?.apply();this.garmentMorphRuntime?.setProfile(this.pendingCustomization);}
  setClassAnimationSet(id:string){if(id===this.classAnimationSetId)return;this.classAnimationSetId=id||DEFAULT_CLASS_ANIMATION_SET_ID;if(this.animationReady)this.rebuildWeaponPoseLayers();console.info(`[P0.26.3 animation] class set -> ${this.classAnimationSetId}`);}
  previewAnimation(name:string){const resolved=(name==='Attack'?'Attack1':name) as HumanoidClip;if(!HUMANOID_CLIPS.includes(resolved))return false;const action=this.animationActions.get(resolved),clip=this.animationClips.get(resolved);if(!action||!clip)return false;this.activeOneShot=resolved;this.activeOneShotKey=`preview:${performance.now()}`;this.activeOneShotBlend=1;this.previewUntil=performance.now()+Math.max(.35,clip.duration)*1000;this.zeroAnimationWeights();action.reset();action.enabled=true;action.paused=false;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();return true;}
  predictAttack(skill:string,now:number){
    const definition=SKILL_DEFINITIONS[skill];if(!definition||this.predictedAttack&&now<=this.predictedAttack.endsAt)return false;
    const profile=WEAPON_PROFILES[this.profile],windup=skill==='basic'?profile.windup:(definition.hitFrame||definition.windup||profile.windup),recovery=skill==='basic'?profile.recovery:definition.recovery,choreo=mythicChoreography(skill),windowEnd=choreo?choreo.hitWindow[1]:windup;
    this.pickup=undefined;this.combatPhaseCorrection=0;this.combatPhaseCorrectionStarted=0;this.combatPhaseCorrectionAttackId=0;
    this.predictedAttack={id:-(++this.predictionSerial),skill,started:now,hitAt:now+windup,hitWindowStart:choreo?now+choreo.hitWindow[0]:undefined,hitWindowEnd:choreo?now+choreo.hitWindow[1]:undefined,endsAt:now+Math.max(windup,windowEnd)+recovery,resolved:false,point:{x:0,z:0}};
    this.predictedAttackDeadline=now+Math.max(.35,Math.min(.72,windup+.14));return true;
  }
  private configureHeldWeapon(g:T.Group,ap:(typeof APPEARANCES)[string],side:'right'|'left'){
    const profile=ap.animationProfile??'sword',mirror=side==='right'?1:-1;
    // Procedural fallback only. Curated GLBs use an explicit grip pivot and never share this offset.
    if(profile==='spear'||profile==='staff')g.position.set(.006*mirror,-.16,.006);
    else if(profile==='bow')g.position.set(.012*mirror,-.02,.015);
    else g.position.set(.006*mirror,-.085,.004);
    // P0.26.4: orientation for procedural weapon geometry belongs to the weapon grip profile, not
    // to CharacterRuntime conditionals. Curated GLBs keep using CuratedEquipmentDefinition.localRotation.
    const mountRotation=weaponGripProfile(profile).proceduralMountRotation??[0,0,0];
    g.rotation.set(mountRotation[0],mountRotation[1],mountRotation[2]);
  }
  private equipmentSkinTarget(){
    if(!this.model)return undefined;
    // HF10: animationTargetSkin can legitimately be the Face mesh because VRM face/body skins often
    // share the same humanoid skeleton.  Garment fitting, however, must use the full body surface.
    // Rank compatible skins by semantic label + bind-pose geometric coverage and explicitly penalize
    // face/hair/eye meshes so Clearance/Auto-Rig never uses a head-sized fitting volume.
    const humanoidNames=new Set<string>();
    for(const name of ['hips','spine','chest','head','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){const raw=this.rawBone(name);if(raw?.name)humanoidNames.add(raw.name);}
    let skin:T.SkinnedMesh|undefined,best=-Infinity;
    this.model.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;let matches=0;for(const b of o.skeleton.bones)if(humanoidNames.has(b.name))matches++;if(matches<8)return;
      if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const size=o.geometry.boundingBox?.getSize(new T.Vector3())??new T.Vector3();const label=`${o.name} ${(Array.isArray(o.material)?o.material:[o.material]).map(m=>m?.name??'').join(' ')}`.toLowerCase();
      const semantic=/(^|[^a-z])(body|basebody|skin|torso)([^a-z]|$)/.test(label)?900:0;const penalty=/(face|hair|eye|lash|brow|teeth|mouth)/.test(label)?700:0;const score=matches*20+semantic-penalty+Math.min(3,Math.max(0,size.y))*120+Math.min(3,Math.max(0,size.x))*20;
      if(score>best){best=score;skin=o;}
    });
    if(!skin)skin=this.animationTargetSkin;
    if(!skin)this.model.traverse(o=>{if(!skin&&o instanceof T.SkinnedMesh)skin=o;});
    if(skin)console.info(`[HF10 garment fit] body target=${skin.name||'(unnamed)'} score=${best.toFixed(1)}`);
    return skin?curatedSkinTarget(skin,this.model):undefined;
  }
  private fittedGarmentRenderable(root:T.Object3D){
    let meshes=0,vertices=0,finite=true,visibleMaterials=0;const bounds=new T.Box3();
    root.updateMatrixWorld(true);root.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes++;const pos=o.geometry.getAttribute('position') as T.BufferAttribute|undefined;if(pos){vertices+=pos.count;for(let i=0;i<Math.min(pos.count,128);i+=Math.max(1,Math.floor(pos.count/128))){if(!Number.isFinite(pos.getX(i))||!Number.isFinite(pos.getY(i))||!Number.isFinite(pos.getZ(i))){finite=false;break;}}}const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m?.visible!==false)visibleMaterials++;bounds.expandByObject(o,true);});
    const size=bounds.isEmpty()?new T.Vector3():bounds.getSize(new T.Vector3()),valid=meshes>0&&vertices>0&&finite&&visibleMaterials>0&&Math.max(size.x,size.y,size.z)>.015&&Math.max(size.x,size.y,size.z)<12;
    return {valid,meshes,vertices,visibleMaterials,size};
  }
  private forceGarmentVisible(root:T.Object3D){root.visible=this.equipmentVisible;root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.visible=this.equipmentVisible;o.frustumCulled=false;for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)m.visible=true;});}
  private captureBaseOutfitMaterials(){
    if(this.baseOutfitMaterials.size||!this.model)return;this.model.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m&&!this.baseOutfitMaterials.has(m))this.baseOutfitMaterials.set(m,m.visible);});
  }
  private applyBaseOutfitMasks(masks:Set<BaseOutfitMask>){
    this.captureBaseOutfitMaterials();for(const [m,visible] of this.baseOutfitMaterials)m.visible=visible;
    for(const [m] of this.baseOutfitMaterials){const n=m.name.toLowerCase();if(masks.has('top')&&/(tops|top_|shirt|robe)/.test(n))m.visible=false;if(masks.has('tie')&&/(accessory_tie|tie_)/.test(n))m.visible=false;if(masks.has('bottom')&&/(bottoms|pants|trouser)/.test(n))m.visible=false;if(masks.has('shoes')&&/(shoes|boots)/.test(n))m.visible=false;}
  }
  private addEquipmentObject(key:string,o:T.Object3D,parent:T.Object3D){o.visible=this.equipmentVisible;parent.add(o);const list=this.equipment.get(key)??[];list.push(o);this.equipment.set(key,list);}
  private installProceduralEquipment(slot:Slot,item:ItemInstance,ap:(typeof APPEARANCES)[string]){
    if(NO_PROCEDURAL_SILHOUETTE.has(slot)){console.warn(`[P0.23.7 equipment] ${item.baseId}/${slot}: no semantically valid authored replacement; keeping the base outfit instead of drawing primitive armor.`);return;}
    if(slot==='mainhand'){
      const spec=weaponGripProfile(ap.animationProfile??'sword'),g=weaponModel(ap),side=spec.primary.side;g.name=`FallbackWeapon_${item.baseId}`;g.scale.setScalar((ap.scale||1)*.72);g.userData.gripPoint='primary';this.configureHeldWeapon(g,ap,side);this.addEquipmentObject(slot,g,side==='left'?this.leftWeaponMount:this.rightWeaponMount);
      if(spec.mirroredSecondaryWeapon){const second=weaponModel(ap);second.name=`FallbackWeapon_${item.baseId}_Left`;second.scale.setScalar((ap.scale||1)*.72);second.userData.gripPoint='mirrored-secondary';this.configureHeldWeapon(second,ap,'left');this.addEquipmentObject(slot,second,this.leftWeaponMount);}
      return;
    }
    if(slot==='offhand'){
      const defensive=ap.shape==='shield'||ap.shape==='disc',g=defensive?armorModel(ap):weaponModel(ap);g.name=`FallbackOffhand_${item.baseId}`;g.scale.setScalar((ap.scale||1)*(defensive ? .58 : .62));
      if(defensive){g.rotation.z=-.12;g.position.set(0,0,.075);}else this.configureHeldWeapon(g,ap,'left');this.addEquipmentObject(slot,g,this.leftWeaponMount);return;
    }
    const g=armorModel(ap);g.scale.setScalar((ap.scale||1)*.72);let bone='chest';if(slot==='head')bone='head';else if(['waist','charm','legs'].includes(slot))bone='hips';else if(slot==='feet')bone='leftFoot';else if(['hands','wrists','ring'].includes(slot))bone='leftHand';this.addEquipmentObject(slot,g,this.mount(bone));
  }
  setEquipment(equipment:Partial<Record<Slot,ItemInstance>>){
    this.pending={...equipment};this.hasMainhand=!!equipment.mainhand;this.hasOffhand=!!equipment.offhand;this.mainhandUsesSecondaryHand=!!equipment.mainhand&&itemUsesSecondaryHand(ITEMS[equipment.mainhand.baseId]);
    const signature=Object.entries(equipment).map(([slot,item])=>`${slot}:${item?.baseId??''}:${item?.enhancementLevel??0}`).sort().join('|');
    if(!this.ready){this.updateWeaponAura(equipment);return;}if(signature===this.appliedEquipmentSignature)return;this.appliedEquipmentSignature=signature;
    this.updateWeaponAura(equipment);void this.applyEquipment(equipment,++this.equipmentGeneration);
  }
  private updateWeaponAura(equipment:Partial<Record<Slot,ItemInstance>>){
    this.weaponAura?.dispose();this.weaponAura=undefined;this.weaponTrailMaterial.color.set(0xcfefff);this.weaponTrailMaterial.opacity=.28;
    const item=equipment.mainhand;if(!item)return;const base=ITEMS[item.baseId],ap=base?.appearanceId?APPEARANCES[base.appearanceId]:undefined,kind=ap?.vfx as WeaponAuraKind|undefined;if(!kind)return;
    const length=T.MathUtils.clamp((ap?.length??1.3)*.78,.75,1.75);this.weaponAura=new WeaponAura(kind,item.rarity,length);this.weaponAura.root.visible=this.equipmentVisible;(ap?.animationProfile==='bow'?this.leftWeaponMount:this.rightWeaponMount).add(this.weaponAura.root);
    const trailColor=kind==='lightning'?0xb995ff:kind==='flame'?0xff7b3d:kind==='frost'?0xa9ecff:0xf2d68b;this.weaponTrailMaterial.color.setHex(trailColor);this.weaponTrailMaterial.opacity=(item.rarity==='legendary'||item.rarity==='mythic') ? .52 : .36;
  }
  private async applyEquipment(equipment:Partial<Record<Slot,ItemInstance>>,generation:number){
    for(const xs of this.equipment.values())for(const o of xs){this.garmentMorphRuntime?.unregisterGarment(o);o.removeFromParent();disposeTree(o);}this.equipment.clear();this.profile='sword';this.applyBaseOutfitMasks(new Set());
    const installedMasks=new Set<BaseOutfitMask>(),skinTarget=this.equipmentSkinTarget();
    for(const [slot,item] of Object.entries(equipment) as [Slot,ItemInstance][]){
      if(generation!==this.equipmentGeneration)return;if(!item)continue;const ap=APPEARANCES[ITEMS[item.baseId]?.appearanceId??''];if(!ap)continue;if(ap.animationProfile)this.profile=ap.animationProfile;
      const def=curatedEquipmentDefinition(item.baseId);
      if(def&&def.slot===slot){
        try{
          const instance=await instantiateCuratedEquipment(item.baseId,skinTarget);if(generation!==this.equipmentGeneration){if(instance)disposeTree(instance.object);return;}
          if(instance){const o=instance.object;o.userData.curatedEquipment=true;o.userData.curatedSource=instance.definition.source;o.userData.curatedItem=item.baseId;
            if(slot==='mainhand'){const grip=weaponGripProfile(ap.animationProfile??'sword');o.userData.gripPoint='primary';this.addEquipmentObject(slot,o,grip.primary.side==='left'?this.leftWeaponMount:this.rightWeaponMount);}else if(slot==='offhand')this.addEquipmentObject(slot,o,this.leftWeaponMount);else if(instance.definition.mode!=='rigid'){
              this.forceGarmentVisible(o);const health=this.fittedGarmentRenderable(o);o.userData.fitRenderable=health;if(!health.valid)throw new Error(`HF10 fitted garment is not renderable: ${item.baseId} meshes=${health.meshes} vertices=${health.vertices} size=${health.size.toArray().map(v=>v.toFixed(3)).join('x')}`);
              this.addEquipmentObject(slot,o,this.model??this.root);o.userData.garmentMorphCoverage=this.garmentMorphRuntime?.registerGarment(o,item.baseId);o.userData.fitPipeline='HF8';o.userData.fitVisibilityVersion='HF10';
            }else{const attach=instance.definition.attach??(slot==='head'?'head':slot==='waist'?'hips':'chest');this.addEquipmentObject(slot,o,this.mount(attach));}
            // Never hide the avatar's base outfit until a fitted garment has passed the renderability gate.
            for(const mask of instance.definition.baseMask??[])installedMasks.add(mask);console.info(`[P0.23.7 equipment] curated ${instance.definition.source}: ${item.baseId} -> ${instance.definition.url}`);continue;}
        }catch(error){console.warn(`[P0.23.7 equipment] curated asset rejected at runtime: ${item.baseId}`,error);}
      }
      this.installProceduralEquipment(slot,item,ap);
    }
    if(generation===this.equipmentGeneration)this.applyBaseOutfitMasks(installedMasks);
  }
  private bestSkinned(root:T.Object3D,wanted:ReadonlySet<string>){let best:T.SkinnedMesh|undefined,bestScore=-1;root.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;let score=0;for(const b of o.skeleton.bones)if(wanted.has(b.name))score++;if(score>bestScore){best=o;bestScore=score;}});return bestScore>0?best:undefined;}
  private configureAction(name:HumanoidClip,action:T.AnimationAction){
    action.enabled=true;action.setEffectiveWeight(0);action.setEffectiveTimeScale(1);
    if(LOOP_CLIPS.has(name)){action.setLoop(T.LoopRepeat,Infinity);action.clampWhenFinished=false;action.play();}
    else{action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.paused=true;action.play();}
  }
  private semanticMaskClip(source:T.AnimationClip,vrm:any,name:string,semantics:readonly string[],minTracks:number){
    const targetNames=new Set<string>();
    for(const semantic of semantics){
      const node=vrm.humanoid?.getNormalizedBoneNode?.(semantic);if(!node?.name)continue;
      targetNames.add(node.name);targetNames.add(T.PropertyBinding.sanitizeNodeName(node.name));
    }
    const names=[...targetNames];
    const tracks=source.tracks.filter(track=>{
      const dot=track.name.lastIndexOf('.');if(dot<=0)return false;
      const target=track.name.slice(0,dot);return targetNames.has(target)||names.some(n=>target.endsWith(n));
    }).map(track=>track.clone());
    if(tracks.length<minTracks)throw new Error(`Animation mask incomplete: ${name} (${tracks.length} tracks)`);
    return new T.AnimationClip(name,source.duration,tracks);
  }
  private bodyLocomotionClip(source:T.AnimationClip,vrm:any,name:string){
    return this.semanticMaskClip(source,vrm,name,BODY_LOCOMOTION_SEMANTICS,8);
  }
  private weaponUpperBodyBaseClip(source:T.AnimationClip,vrm:any,name:string){
    return this.semanticMaskClip(source,vrm,name,WEAPON_UPPER_BASE_SEMANTICS,4);
  }
  private loopAction(name:LocomotionClip,layer:LocomotionLayer){
    return layer==='weapon'?this.layeredLocomotionActions.get(name):this.animationActions.get(name);
  }
  private normalizedPhase(action:T.AnimationAction|undefined,clip:T.AnimationClip|undefined){
    if(!action||!clip||clip.duration<=1e-6)return 0;const t=((action.time%clip.duration)+clip.duration)%clip.duration;return t/clip.duration;
  }
  private syncLoopPhase(from:T.AnimationAction|undefined,fromClip:T.AnimationClip|undefined,to:T.AnimationAction|undefined,toClip:T.AnimationClip|undefined){
    if(!from||!fromClip||!to||!toClip||toClip.duration<=1e-6)return;to.time=this.normalizedPhase(from,fromClip)*toClip.duration;
  }
  private locomotionClip(name:LocomotionClip,layer:LocomotionLayer){return layer==='weapon'?this.layeredLocomotionClips.get(name):this.animationClips.get(name);}

  private matureEmbeddedSet(){
    const clips=this.handle?.gltf.animations??[];const byName=new Map(clips.map(c=>[c.name,c] as const));
    for(const name of CORE_MATURE_CLIPS){const clip=byName.get(name);if(!clip)return undefined;const q=clip.tracks.filter(t=>t.name.endsWith('.quaternion')).length;if(q<12)return undefined;}
    const out=new Map<HumanoidClip,T.AnimationClip>();for(const name of AUTHORED_HUMANOID_CLIPS){const clip=byName.get(name);if(clip&&clip.tracks.filter(t=>t.name.endsWith('.quaternion')).length>=12)out.set(name,clip);}
    return out.size>=CORE_MATURE_CLIPS.size?out:undefined;
  }
  private async prepareHumanoidAnimations(){
    const vrm=this.handle?.vrm;if(!vrm?.humanoid||!this.model)throw new Error('VRM humanoid unavailable for VRMA animation pipeline');
    const rawNames=new Set<string>();for(const name of ['hips','spine','chest','head','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){const raw=(vrm.humanoid as any).getRawBoneNode?.(name);if(raw?.name)rawNames.add(raw.name);}
    this.animationTargetSkin=this.bestSkinned(this.model,rawNames);if(!this.animationTargetSkin)throw new Error('No VRM SkinnedMesh matches humanoid bones');
    this.animationMixer=new T.AnimationMixer(vrm.scene);
    const embedded=this.matureEmbeddedSet();
    if(embedded){this.animationSource=`embedded-mature:${this.candidateId}`;for(const name of AUTHORED_HUMANOID_CLIPS){const clip=embedded.get(name);if(clip)this.animationClips.set(name,clip);}}
    const loadedKinds=new Set<string>();
    await Promise.all(AUTHORED_HUMANOID_CLIPS.map(async name=>{
      const asset=humanoidAnimationAsset(name);if(this.animationClips.has(name)&&!asset.externalAuthority)return;
      if(asset.kind==='glb-mixamo'){
        try{const clip=await loadMixamoVrmRotationClip(asset.url,vrm,`QinglanGLB_${name}`);this.animationClips.set(name,clip);loadedKinds.add('glb');
          if(name==='Walk'||name==='Run'){const stride=Number((clip as any).qinglanStrideLength);if(Number.isFinite(stride)&&stride>.2)this.locomotionStrideLength[name]=stride;}
        }catch(error){
          // External GLB is preferred, but a packaged VRMA with the same semantic name is a safe fallback.
          const fallbackUrl=`/assets/animations/default/${name}.vrma`,source=await loadDefaultVrma(name,fallbackUrl),clip=createQinglanVRMAnimationClip(source,vrm,`QinglanVRMA_${name}`);this.animationClips.set(name,clip);loadedKinds.add('vrma-fallback');console.warn(`[P0.26 animation] GLB ${name} failed; VRMA fallback used.`,error);
        }return;
      }
      if(this.animationClips.has(name))return;const source=await loadDefaultVrma(name,asset.url),clip=createQinglanVRMAnimationClip(source,vrm,`QinglanVRMA_${name}`);if(clip.tracks.length<13)throw new Error(`Incomplete VRMA clip ${name}: ${clip.tracks.length} tracks`);this.animationClips.set(name,clip);loadedKinds.add('vrma');
    }));
    this.animationSource+=(embedded?'+manifest-overlay': 'manifest')+`[${[...loadedKinds].sort().join('+')||'embedded'}]`;
    console.info(`[P0.26 animation] manifest authority; stride walk=${this.locomotionStrideLength.Walk.toFixed(3)}m run=${this.locomotionStrideLength.Run.toFixed(3)}m`);
    for(const name of HUMANOID_CLIPS){const clip=this.animationClips.get(name);if(!clip)throw new Error(`Humanoid animation missing: ${name}`);const action=this.animationMixer.clipAction(clip,vrm.scene);this.configureAction(name,action);this.animationActions.set(name,action);}
    for(const name of ['Idle','Walk','Run'] as const){
      const source=this.animationClips.get(name);if(!source)throw new Error(`Locomotion source missing: ${name}`);
      const clip=this.bodyLocomotionClip(source,vrm,`QinglanWeaponBody_${name}`),action=this.animationMixer.clipAction(clip,vrm.scene);
      this.configureAction(name,action);this.layeredLocomotionClips.set(name,clip);this.layeredLocomotionActions.set(name,action);
    }
    const idleSource=this.animationClips.get('Idle');if(!idleSource)throw new Error('Idle source missing for weapon upper-body base');
    this.weaponUpperBaseClip=this.weaponUpperBodyBaseClip(idleSource,vrm,'QinglanWeaponUpperBase_Idle');
    this.weaponUpperBaseAction=this.animationMixer.clipAction(this.weaponUpperBaseClip,vrm.scene);
    this.configureAction('Idle',this.weaponUpperBaseAction);
    // R26 safe action-RPG ready layer: derive a small additive pose from the character's own
    // authored attack/Idle rotations. No hard-coded Euler arm pose and no world-space arm solver.
    this.rebuildWeaponPoseLayers();
    this.animationSource+=`+p0263-weapon-class-animation-profiles`;this.animationReady=true;
  }
  private rebuildWeaponPoseLayers(){
    const vrm=this.handle?.vrm,idleSource=this.animationClips.get('Idle');if(!vrm||!idleSource||!this.animationMixer)return;
    for(const [profile,action] of this.weaponReadyActions){action.stop();const clip=this.weaponReadyClips.get(profile);if(clip){this.animationMixer.uncacheAction(clip,vrm.scene);this.animationMixer.uncacheClip(clip);}}
    for(const [profile,action] of this.combatStanceActions){action.stop();const clip=this.combatStanceClips.get(profile);if(clip){this.animationMixer.uncacheAction(clip,vrm.scene);this.animationMixer.uncacheClip(clip);}}
    this.weaponReadyActions.clear();this.weaponReadyClips.clear();this.combatStanceActions.clear();this.combatStanceClips.clear();
    for(const profile of ['sword','greatsword','dual','spear','staff','bow'] as WeaponProfile[]){
      const animationProfile=resolveWeaponAnimationProfile(profile,this.classAnimationSetId),readySpec=animationProfile.stance.ready,readySource=this.animationClips.get(readySpec.source);if(!readySource)throw new Error(`Ready source missing: ${profile}/${readySpec.source}`);
      const readyClip=createActionRpgReadyClip(vrm,profile,readySource,idleSource,`QinglanActionRpgReady_${profile}`,readySpec),readyAction=this.animationMixer.clipAction(readyClip,vrm.scene);
      this.configureAction('Idle',readyAction);readyAction.time=0;readyAction.paused=true;this.weaponReadyClips.set(profile,readyClip);this.weaponReadyActions.set(profile,readyAction);
      const stanceSpec=animationProfile.stance.engaged,stanceSource=this.animationClips.get(stanceSpec.source);if(!stanceSource)throw new Error(`Combat stance source missing: ${profile}/${stanceSpec.source}`);
      const stanceClip=createActionRpgCombatStanceClip(vrm,profile,stanceSource,idleSource,`QinglanActionCombatStance_${profile}`,stanceSpec),stanceAction=this.animationMixer.clipAction(stanceClip,vrm.scene);
      this.configureAction('Idle',stanceAction);stanceAction.time=0;stanceAction.paused=true;this.combatStanceClips.set(profile,stanceClip);this.combatStanceActions.set(profile,stanceAction);
    }
  }
  private zeroAnimationWeights(){for(const action of this.animationActions.values())action.setEffectiveWeight(0);for(const action of this.layeredLocomotionActions.values())action.setEffectiveWeight(0);this.weaponUpperBaseAction?.setEffectiveWeight(0);for(const action of this.weaponReadyActions.values())action.setEffectiveWeight(0);for(const action of this.combatStanceActions.values())action.setEffectiveWeight(0);}
  private zeroOneShotWeights(){for(const [name,action] of this.animationActions)if(!LOOP_CLIPS.has(name))action.setEffectiveWeight(0);}
  private zeroLocomotionWeights(){
    for(const name of ['Idle','Walk','Run'] as const){this.animationActions.get(name)?.setEffectiveWeight(0);this.layeredLocomotionActions.get(name)?.setEffectiveWeight(0);}
    this.weaponUpperBaseAction?.setEffectiveWeight(0);for(const action of this.weaponReadyActions.values())action.setEffectiveWeight(0);for(const action of this.combatStanceActions.values())action.setEffectiveWeight(0);
  }
  private selectLocomotion(speed:number,walkWeight:number,runWeight:number,idleWeight:number):LocomotionClip{
    if(idleWeight>=walkWeight&&idleWeight>=runWeight)return 'Idle';return runWeight>walkWeight?'Run':'Walk';
  }
  private motionEnvelope(age:number,duration:number,enter=.08,exit=.12,fadeOut=true){
    const d=Math.max(.001,duration),a=T.MathUtils.clamp(age,0,d);
    let weight=enter<=1e-5?1:T.MathUtils.smoothstep(a,0,Math.min(enter,d*.45));
    if(fadeOut&&exit>1e-5)weight*=1-T.MathUtils.smoothstep(a,Math.max(0,d-exit),d);
    return T.MathUtils.clamp(weight,0,1);
  }
  private jumpDuration(){
    return T.MathUtils.clamp(this.animationClips.get('Jump')?.duration??.9,.55,1.25);
  }
  private clearCombatContinuity(){
    this.activeCombatSkill='';this.activeCombatPhase=0;this.activeCombatBlend=0;
    this.combatPhaseCorrection=0;this.combatPhaseCorrectionStarted=0;this.combatPhaseCorrectionAttackId=0;
  }
  private nonCombatArmOwnership(){
    if(!this.activeOneShot||COMBAT_MOTION_CLIPS.has(this.activeOneShot))return 1;
    const b=T.MathUtils.clamp(this.activeOneShotBlend,0,1);
    if(this.activeOneShot==='Death'||this.activeOneShot==='PickupGround'||this.activeOneShot==='PickupSpirit'||this.activeOneShot==='PickupHeavy')return 1-b;
    if(this.activeOneShot==='Hit')return 1-b*.72;
    if(this.activeOneShot==='Jump')return 1-b*.55;
    return 1-b;
  }
  private setLocomotion(speed:number,weightScale=1,_forceWeaponLayer=false){
    // R26: FULL authored locomotion always remains the base while a weapon is equipped.
    // R25 switched to body-only locomotion and then rebuilt the arms with a ready pose, which is
    // exactly why equip + walk/run looked stiff and deformed even though Walking/Fast_Run were good.
    const idleWeight=1-T.MathUtils.smoothstep(speed,.055,.26);
    const movingWeight=1-idleWeight;
    const runBlend=T.MathUtils.smoothstep(speed,PLAYER_WALK_RUN_SWITCH-PLAYER_WALK_RUN_BLEND_HALF_WIDTH,PLAYER_WALK_RUN_SWITCH+PLAYER_WALK_RUN_BLEND_HALF_WIDTH);
    const walkWeight=movingWeight*(1-runBlend),runWeight=movingWeight*runBlend;
    const selected=this.selectLocomotion(speed,walkWeight,runWeight,idleWeight),previous=this.activeLocomotion;
    if(selected!==previous)this.syncLoopPhase(this.loopAction(previous,'full'),this.locomotionClip(previous,'full'),this.loopAction(selected,'full'),this.locomotionClip(selected,'full'));
    this.activeLocomotion=selected;this.locomotionLayer='full';
    const idleFull=this.loopAction('Idle','full'),walkFull=this.loopAction('Walk','full'),runFull=this.loopAction('Run','full');
    if(!idleFull||!walkFull||!runFull)return;
    this.zeroLocomotionWeights();
    idleFull.setEffectiveWeight(idleWeight*weightScale);walkFull.setEffectiveWeight(walkWeight*weightScale);runFull.setEffectiveWeight(runWeight*weightScale);

    // Weapon-ready is ADDITIVE and intentionally almost disappears once locomotion starts.
    // This preserves the exact normal Walking/Fast_Run shoulder and arm swing reported as good.
    const readySpec=resolveWeaponAnimationProfile(this.profile,this.classAnimationSetId).stance.ready;
    const stationary=1-T.MathUtils.smoothstep(speed,.10,.90);
    const readyWeight=weightScale*T.MathUtils.clamp(this.weaponLayerBlend,0,1)*T.MathUtils.lerp(readySpec.moveWeight,readySpec.idleWeight,stationary);
    const readyAction=this.weaponReadyActions.get(this.profile);
    if(readyAction){readyAction.setEffectiveWeight(readyWeight);readyAction.setEffectiveTimeScale(0);}

    // R27 combat stance is a bounded additive layer that exists only while engaged. It gives a
    // clear weapon-ready silhouette at rest, yields strongly to Walking, and nearly disappears in
    // Fast_Run so the proven R26 locomotion remains visually authoritative.
    const flow=ACTION_COMBAT_FLOW[this.profile],combatAction=this.combatStanceActions.get(this.profile);
    const walkMix=T.MathUtils.smoothstep(speed,.18,PLAYER_WALK_RUN_SWITCH),runMix=T.MathUtils.smoothstep(speed,PLAYER_WALK_RUN_SWITCH-.35,PLAYER_WALK_RUN_SWITCH+.55);
    const engagedMoveWeight=T.MathUtils.lerp(T.MathUtils.lerp(flow.stance.idleWeight,flow.stance.walkWeight,walkMix),flow.stance.runWeight,runMix);
    const combatReadyWeight=weightScale*T.MathUtils.clamp(this.weaponLayerBlend,0,1)*T.MathUtils.clamp(this.combatStanceBlend,0,1)*engagedMoveWeight;
    if(combatAction){combatAction.setEffectiveWeight(combatReadyWeight);combatAction.setEffectiveTimeScale(0);}
    this.weaponUpperBaseAction?.setEffectiveWeight(0);

    // R21 foot-lock cadence remains unchanged.
    const walkClip=this.animationClips.get('Walk'),runClip=this.animationClips.get('Run');
    const walkStride=Math.max(.2,this.locomotionStrideLength.Walk),runStride=Math.max(.2,this.locomotionStrideLength.Run);
    const blendedStride=T.MathUtils.lerp(walkStride,runStride,runBlend);
    const phaseHz=this.cadenceSpeed>.02?T.MathUtils.clamp(this.cadenceSpeed/blendedStride,.16,2.6):0;
    idleFull.setEffectiveTimeScale(1);walkFull.setEffectiveTimeScale(walkClip?phaseHz*walkClip.duration:0);runFull.setEffectiveTimeScale(runClip?phaseHz*runClip.duration:0);
    // Legacy body-only actions remain packaged for compatibility but receive zero runtime weight.
    for(const action of this.layeredLocomotionActions.values())action.setEffectiveWeight(0);
  }
  private applyOutgoingCombatBlend(incomingWeight:number){
    const outgoing=this.outgoingCombat;if(!outgoing)return;
    const age=performance.now()/1000-outgoing.started,u=T.MathUtils.clamp(age/Math.max(.001,outgoing.duration),0,1);
    if(u>=1){outgoing.action.setEffectiveWeight(0);this.outgoingCombat=undefined;return;}
    const fade=1-u*u*(3-2*u),weight=fade*(1-T.MathUtils.clamp(incomingWeight,0,1)*.72);
    outgoing.action.setEffectiveWeight(weight);outgoing.action.time=T.MathUtils.clamp(outgoing.phase,0,.99999)*outgoing.clip.duration;
  }
  private oneShot(name:HumanoidClip,key:string,phase:number,backgroundSpeed?:number,weight=1){
    const action=this.animationActions.get(name),clip=this.animationClips.get(name);if(!action||!clip)return false;
    if(this.activeOneShot!==name||this.activeOneShotKey!==key){
      if(this.activeOneShot&&this.activeOneShot!==name&&COMBAT_MOTION_CLIPS.has(this.activeOneShot)&&COMBAT_MOTION_CLIPS.has(name)){
        const outgoingAction=this.animationActions.get(this.activeOneShot),outgoingClip=this.animationClips.get(this.activeOneShot);
        if(outgoingAction&&outgoingClip)this.outgoingCombat={name:this.activeOneShot,action:outgoingAction,clip:outgoingClip,phase:this.normalizedPhase(outgoingAction,outgoingClip),started:performance.now()/1000,duration:ACTION_COMBAT_FLOW[this.profile].timing.transitionSeconds};
      }else if(!COMBAT_MOTION_CLIPS.has(name))this.outgoingCombat=undefined;
      this.activeOneShot=name;this.activeOneShotKey=key;action.reset();action.enabled=true;action.paused=true;action.setEffectiveTimeScale(1);action.play();
    }
    this.activeOneShotBlend=T.MathUtils.clamp(weight,0,1);
    if(backgroundSpeed===undefined)this.zeroAnimationWeights();
    else{
      this.zeroOneShotWeights();
      // Every one-shot can now fade against locomotion. Combat forces the weapon-safe body layer;
      // non-combat motions retain the currently equipped locomotion mix and progressively yield
      // weapon IK according to activeOneShotBlend.
      this.setLocomotion(backgroundSpeed,1-this.activeOneShotBlend,false);
    }
    this.applyOutgoingCombatBlend(this.activeOneShotBlend);
    action.setEffectiveWeight(this.activeOneShotBlend);action.time=T.MathUtils.clamp(phase,0,.99999)*clip.duration;return true;
  }
  private combatBlendWeight(a:AttackState,time:number){
    const blend=combatBlendFor(this.profile,this.classAnimationSetId),enter=Math.min(blend.enter,Math.max(.025,(a.hitAt-a.started)*.6)),exit=Math.min(blend.exit,Math.max(.04,(a.endsAt-a.hitAt)*.65));
    if(time<a.started+enter){const u=T.MathUtils.clamp((time-a.started)/Math.max(.001,enter),0,1);return u*u*(3-2*u);}
    if(time>a.endsAt-exit){const u=T.MathUtils.clamp((a.endsAt-time)/Math.max(.001,exit),0,1);return u*u*(3-2*u);}
    return 1;
  }
  private combatVisualPhase(a:NonNullable<PublicPlayer['attack']>,time:number,name:HumanoidClip){
    const flow=ACTION_COMBAT_FLOW[this.profile].timing,motionTiming=combatMotionTiming(name),hitPhase=motionTiming.hitPhase,hold=motionTiming.hitStop*flow.hitStopScale;
    const pre=Math.max(.001,a.hitAt-a.started);
    if(time<=a.hitAt){
      const u=T.MathUtils.clamp((time-a.started)/pre,0,1),split=T.MathUtils.clamp(flow.anticipationFraction,.12,.82),pose=T.MathUtils.clamp(flow.anticipationPose,.08,.72);
      let shaped:number;
      if(u<=split){const x=u/split,s=x*x*(3-2*x);shaped=s*pose;}
      else{const x=(u-split)/Math.max(.001,1-split);shaped=pose+(1-pose)*Math.pow(x,flow.releaseExponent);}
      return T.MathUtils.clamp(shaped,0,1)*hitPhase;
    }
    const heldUntil=Math.min(a.endsAt,a.hitAt+hold);if(time<=heldUntil)return hitPhase;
    const post=Math.max(.001,a.endsAt-heldUntil),u=T.MathUtils.clamp((time-heldUntil)/post,0,1),settle=1-Math.pow(1-u,flow.recoveryExponent);
    return hitPhase+(1-hitPhase)*settle;
  }
  private reconciledCombatVisualPhase(a:NonNullable<PublicPlayer['attack']>,time:number,name:HumanoidClip){
    const raw=this.combatVisualPhase(a,time,name);
    if(this.combatPhaseCorrectionAttackId!==a.id||Math.abs(this.combatPhaseCorrection)<1e-5)return raw;
    const age=Math.max(0,time-this.combatPhaseCorrectionStarted),correction=this.combatPhaseCorrection*Math.exp(-age*18);
    if(Math.abs(correction)<.001){this.combatPhaseCorrection=0;return raw;}
    return T.MathUtils.clamp(raw+correction,0,.99999);
  }
  private clearWeaponTrail(){this.weaponTrailCount=0;this.weaponTrailMesh.visible=false;this.weaponTrailGeometry.setDrawRange(0,0);}
  private updateWeaponTrail(){
    if(!this.hasMainhand||!this.activeOneShot||!COMBAT_MOTION_CLIPS.has(this.activeOneShot)){this.clearWeaponTrail();return;}
    const choreo=mythicChoreography(this.activeCombatSkill);if(choreo&&(this.activeCombatPhase<choreo.trailWindow[0]||this.activeCombatPhase>choreo.trailWindow[1])){this.clearWeaponTrail();return;}
    if(!choreo&&(this.profile==='staff'||this.profile==='bow')){this.clearWeaponTrail();return;}
    const length=choreo?.trailLength??(this.profile==='greatsword'?1.45:this.profile==='dual'?0.92:this.profile==='spear'?1.72:1.16),base=choreo?.trailBase??.16,mount=choreo?.trailMount==='left'?this.leftWeaponMount:this.rightWeaponMount;
    this.trailBaseWorld.set(0,base,0);this.trailTipWorld.set(0,length,0);mount.localToWorld(this.trailBaseWorld);mount.localToWorld(this.trailTipWorld);
    this.trailBaseLocal.copy(this.trailBaseWorld);this.trailTipLocal.copy(this.trailTipWorld);this.root.worldToLocal(this.trailBaseLocal);this.root.worldToLocal(this.trailTipLocal);
    if(this.weaponTrailCount&&this.lastTrailTip.distanceToSquared(this.trailTipLocal)<.00045)return;this.lastTrailTip.copy(this.trailTipLocal);
    const max=12;if(this.weaponTrailCount>=max){this.weaponTrailPositions.copyWithin(0,6);this.weaponTrailCount=max-1;}
    let o=this.weaponTrailCount*6;this.weaponTrailPositions[o++]=this.trailBaseLocal.x;this.weaponTrailPositions[o++]=this.trailBaseLocal.y;this.weaponTrailPositions[o++]=this.trailBaseLocal.z;this.weaponTrailPositions[o++]=this.trailTipLocal.x;this.weaponTrailPositions[o++]=this.trailTipLocal.y;this.weaponTrailPositions[o++]=this.trailTipLocal.z;this.weaponTrailCount++;
    (this.weaponTrailGeometry.getAttribute('position') as T.BufferAttribute).needsUpdate=true;this.weaponTrailGeometry.setDrawRange(0,Math.max(0,(this.weaponTrailCount-1)*6));this.weaponTrailMesh.visible=this.weaponTrailCount>1;
  }
  private weaponAttackClip(a:NonNullable<PublicPlayer['attack']>):HumanoidClip{
    if((this.activeOneShotKey===`attack:${a.id}`||this.activeOneShotKey===`predict:${a.id}`)&&this.activeOneShot&&COMBAT_MOTION_CLIPS.has(this.activeOneShot))return this.activeOneShot;
    const direct=resolveCombatMotionClip(this.profile,a.skill,SKILL_DEFINITIONS[a.skill]?.animationProfile,this.classAnimationSetId);if(direct)return direct;
    const chain=basicComboClips(this.profile,this.classAnimationSetId);
    if(a.skill==='basic'&&a.started-this.lastBasicComboAt>ACTION_COMBAT_FLOW[this.profile].combo.resetSeconds)this.basicCombo=0;
    const name=chain[this.basicCombo%chain.length]??chain[0]??'Attack1';
    if(a.skill==='basic'){this.basicCombo=(this.basicCombo+1)%Math.max(1,chain.length);this.lastBasicComboAt=a.started;}
    return name;
  }
  private attackClip(a:NonNullable<PublicPlayer['attack']>):HumanoidClip{
    const definition=SKILL_DEFINITIONS[a.skill],resolved=resolveCombatMotionClip(this.profile,a.skill,definition?.animationProfile,this.classAnimationSetId);
    return resolved??this.weaponAttackClip(a);
  }
  private resolveAnimation(time:number,actor:PublicPlayer|undefined,speed:number){
    if(performance.now()<this.previewUntil)return;
    if(!actor){
      this.activeOneShot=undefined;this.activeOneShotKey='';this.activeOneShotBlend=0;this.predictedAttack=undefined;this.pickup=undefined;this.outgoingCombat=undefined;this.combatStanceHoldUntil=-1;this.clearCombatContinuity();
      this.zeroAnimationWeights();this.setLocomotion(speed);return;
    }

    if(this.lastHp>0&&actor.hp<=0)this.deathStartedAt=time;this.lastHp=actor.hp;

    // R19 explicit motion priority:
    // Death > Hit/Stagger > Attack > Jump > Pickup > Locomotion.
    // This prevents local prediction/pickup/jump from masking a real hit reaction and prevents
    // cosmetic pickup motion from locking out responsive combat or movement.
    if(actor.hp<=0){
      this.predictedAttack=undefined;this.pickup=undefined;this.outgoingCombat=undefined;this.clearCombatContinuity();
      const clip=this.animationClips.get('Death'),duration=Math.max(.001,clip?.duration??1.45),age=Math.max(0,time-Math.max(0,this.deathStartedAt));
      const phase=T.MathUtils.clamp(age/duration,0,.99999),weight=this.motionEnvelope(age,duration,.12,0,false);
      this.oneShot('Death','death',phase,speed,weight);return;
    }

    const hitAge=time-actor.hitAt;
    if(actor.staggerUntil>time&&hitAge>=0){
      this.predictedAttack=undefined;this.pickup=undefined;this.outgoingCombat=undefined;this.clearCombatContinuity();
      // Map the full authored Hit clip into the authoritative stagger window. R18 used clip
      // duration directly, which either cut a short stagger halfway through or held the final
      // frame during a long stagger and then snapped back to locomotion.
      const staggerDuration=Math.max(.12,actor.staggerUntil-actor.hitAt);
      const phase=T.MathUtils.clamp(hitAge/staggerDuration,0,.99999);
      const weight=this.motionEnvelope(hitAge,staggerDuration,Math.min(.045,staggerDuration*.24),Math.min(.10,staggerDuration*.38),true);
      this.oneShot('Hit',`hit:${actor.hitAt}`,phase,speed,weight);return;
    }

    const authoritative=actor.attack;let a=authoritative,predicted=false,preservedClip:HumanoidClip|undefined;
    if(authoritative){
      if(this.predictedAttack&&authoritative.skill===this.predictedAttack.skill&&this.activeOneShotKey===`predict:${this.predictedAttack.id}`&&this.activeOneShot&&COMBAT_MOTION_CLIPS.has(this.activeOneShot)){
        preservedClip=this.activeOneShot;
        // Preserve the exact visual phase reached by local prediction and converge to server time
        // over ~0.15 s instead of jumping backward/forward on the confirmation snapshot.
        const raw=this.combatVisualPhase(authoritative,time,preservedClip);
        this.combatPhaseCorrection=T.MathUtils.clamp(this.activeCombatPhase-raw,-.16,.16);
        this.combatPhaseCorrectionStarted=time;this.combatPhaseCorrectionAttackId=authoritative.id;
        this.activeOneShotKey=`attack:${authoritative.id}`;
      }else if(this.combatPhaseCorrectionAttackId!==authoritative.id){
        this.combatPhaseCorrection=0;this.combatPhaseCorrectionStarted=0;this.combatPhaseCorrectionAttackId=authoritative.id;
      }
      this.predictedAttack=undefined;
    }else if(this.predictedAttack){
      if(time<=this.predictedAttack.endsAt&&time<=this.predictedAttackDeadline){a=this.predictedAttack;predicted=true;}
      else this.predictedAttack=undefined;
    }
    if(a&&time>=a.started&&time<=a.endsAt){
      this.pickup=undefined;
      const name=preservedClip??this.attackClip(a);
      const phase=COMBAT_MOTION_CLIPS.has(name)?(predicted?this.combatVisualPhase(a,time,name):this.reconciledCombatVisualPhase(a,time,name)):(time-a.started)/Math.max(.001,a.endsAt-a.started);
      const weight=this.combatBlendWeight(a,time);
      this.activeCombatSkill=a.skill;this.activeCombatPhase=phase;this.activeCombatBlend=weight;
      this.oneShot(name,predicted?`predict:${a.id}`:`attack:${a.id}`,phase,speed,weight);return;
    }

    const jumpDuration=this.jumpDuration(),jumpAge=time-actor.jumpAt;
    if(!actor.flight&&jumpAge>=0&&jumpAge<jumpDuration){
      this.pickup=undefined;this.clearCombatContinuity();
      const weight=this.motionEnvelope(jumpAge,jumpDuration,.075,.12,true);
      this.oneShot('Jump',`jump:${actor.jumpAt}`,jumpAge/jumpDuration,speed,weight);return;
    }

    if(this.pickup){
      const clip=this.animationClips.get(this.pickup.clip),duration=Math.max(.001,clip?.duration??.9),age=time-this.pickup.started;
      // Moving away should immediately regain locomotion rather than sliding across the ground
      // while the full-body pickup pose continues.
      if(speed>.55||age>=duration)this.pickup=undefined;
      else if(age>=0){
        this.clearCombatContinuity();
        const weight=this.motionEnvelope(age,duration,.08,.13,true);
        this.oneShot(this.pickup.clip,`pickup:${this.pickup.started}`,age/duration,speed,weight);return;
      }
    }

    this.activeOneShot=undefined;this.activeOneShotKey='';this.activeOneShotBlend=0;this.clearCombatContinuity();
    this.zeroAnimationWeights();this.setLocomotion(speed);
  }
  playPickup(_id:string,_rarity:Rarity,now:number,kind:'ground'|'spirit'|'heavy'){this.pickup={started:now,clip:kind==='spirit'?'PickupSpirit':kind==='heavy'?'PickupHeavy':'PickupGround'};}
  update(dt:number,time:number,actor?:PublicPlayer,speed=0){
    if(!this.ready||!this.animationReady)return;
    this.enforceVisualRootInvariant();
    if(actor&&actor.jumpAt!==this.jumpAt)this.jumpAt=actor.jumpAt;
    const weaponTarget=this.hasMainhand||this.hasOffhand?1:0;
    this.weaponLayerBlend+=(weaponTarget-this.weaponLayerBlend)*(1-Math.exp(-8.5*dt));
    if(Math.abs(weaponTarget-this.weaponLayerBlend)<.001)this.weaponLayerBlend=weaponTarget;
    const flow=ACTION_COMBAT_FLOW[this.profile],engaged=!!actor&&(actor.state==='Combat'||!!actor.attack);
    if(engaged)this.combatStanceHoldUntil=Math.max(this.combatStanceHoldUntil,time+flow.stance.holdSeconds);
    const stanceTarget=weaponTarget&&!!actor&&(engaged||time<this.combatStanceHoldUntil)?1:0,stanceRate=stanceTarget>this.combatStanceBlend?flow.stance.enterRate:flow.stance.exitRate;
    this.combatStanceBlend+=(stanceTarget-this.combatStanceBlend)*(1-Math.exp(-stanceRate*dt));
    if(Math.abs(stanceTarget-this.combatStanceBlend)<.001)this.combatStanceBlend=stanceTarget;
    const jumpDuration=this.jumpDuration(),jump=actor?time-actor.jumpAt:jumpDuration+1;
    this.root.position.y=!actor?.flight&&jump>=0&&jump<jumpDuration?Math.sin(jump/jumpDuration*Math.PI)*1.08:0;
    // P0.26.7 `speed` is rendered X/Z travel speed, not raw server intent. This prevents
    // run-in-place when interpolation, collision or navigation makes the visible root move slower.
    const targetSpeed=actor?.flight?0:Math.max(0,speed);this.cadenceSpeed=targetSpeed;
    const response=targetSpeed>this.locomotionSpeed?7.2:10.5;this.locomotionSpeed+=(targetSpeed-this.locomotionSpeed)*(1-Math.exp(-response*dt));
    // Blend weights may be smoothed, but foot cadence follows rendered movement immediately.
    // Double-smoothing cadence made the avatar visibly skate during acceleration/deceleration.
    this.resolveAnimation(time,actor,this.locomotionSpeed);
    this.animationMixer?.update(dt);
    updateVroid(this.handle,dt);this.morphRuntime?.apply();this.expressionRuntime?.update(dt,time,actor);
    // Re-assert after Mixer + VRM normalized->raw propagation. This makes accidental future
    // scene/root tracks harmless instead of allowing animation data to detach the mesh from capsule.
    this.enforceVisualRootInvariant();
    if(this.hasMainhand||this.hasOffhand){
      this.root.updateMatrixWorld(true);
      // R27.2 final-pose order: locomotion/authored attack -> VRM propagation -> bow-only draw
      // correction -> physical two-hand support contact (greatsword/spear/staff) -> physical weapon grip ->
      // bow draw-hand three-finger string hook.  The bow
      // correction never runs during ordinary movement, preserving the proven R26 walk/run arms.
      this.applyBowDrawCorrection();this.root.updateMatrixWorld(true);
      this.applySecondaryHandContactIK();this.root.updateMatrixWorld(true);
      this.syncHandMounts();this.root.updateMatrixWorld(true);this.applyBowStringHook();this.root.updateMatrixWorld(true);this.updateWeaponTrail();
    }else this.clearWeaponTrail();this.weaponAura?.update(dt,time);
  }
  dispose(){this.animationMixer?.stopAllAction();this.weaponAura?.dispose();this.weaponAura=undefined;this.expressionRuntime?.dispose();this.expressionRuntime=undefined;this.morphRuntime?.dispose();this.morphRuntime=undefined;this.garmentMorphRuntime?.dispose();this.garmentMorphRuntime=undefined;this.weaponTrailGeometry.dispose();this.weaponTrailMaterial.dispose();this.animationMixer=undefined;for(const xs of this.equipment.values())for(const o of xs){o.removeFromParent();disposeTree(o);}this.equipment.clear();disposeVroid(this.handle);this.handle=undefined;this.root.removeFromParent();}
}
