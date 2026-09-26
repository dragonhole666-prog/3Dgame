import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { PLAYER_AUTHORED_LOCOMOTION } from '../../shared/data/locomotion';
import { locomotionStyleFilters, type LocomotionKind } from './locomotion-style-profiles';

const loader=new GLTFLoader();
const cache=new Map<string,Promise<GLTF>>();
function load(url:string){let pending=cache.get(url);if(!pending){pending=loader.loadAsync(url);cache.set(url,pending);}return pending;}

/**
 * Mixamo -> VRM mapping.
 *
 * R21 deliberately follows the official three-vrm Mixamo retarget strategy for normalized bones:
 *   normalizedQ = sourceParentRestWorld * sourceLocalAnimatedQ * inverse(sourceBoneRestWorld)
 * and VRM0 additionally flips quaternion X/Z.  Normalized VRM rest rotations are identity, so
 * no target-rest world quaternion is injected into the rotation track.
 */
const VRM_TO_MIXAMO=[
 ['hips','mixamorig:Hips'],['spine','mixamorig:Spine'],['chest','mixamorig:Spine1'],['upperChest','mixamorig:Spine2'],['neck','mixamorig:Neck'],['head','mixamorig:Head'],
 ['leftShoulder','mixamorig:LeftShoulder'],['leftUpperArm','mixamorig:LeftArm'],['leftLowerArm','mixamorig:LeftForeArm'],['leftHand','mixamorig:LeftHand'],
 ['rightShoulder','mixamorig:RightShoulder'],['rightUpperArm','mixamorig:RightArm'],['rightLowerArm','mixamorig:RightForeArm'],['rightHand','mixamorig:RightHand'],
 ['leftUpperLeg','mixamorig:LeftUpLeg'],['leftLowerLeg','mixamorig:LeftLeg'],['leftFoot','mixamorig:LeftFoot'],['leftToes','mixamorig:LeftToeBase'],
 ['rightUpperLeg','mixamorig:RightUpLeg'],['rightLowerLeg','mixamorig:RightLeg'],['rightFoot','mixamorig:RightFoot'],['rightToes','mixamorig:RightToeBase'],
 ['leftThumbProximal','mixamorig:LeftHandThumb1'],['leftThumbIntermediate','mixamorig:LeftHandThumb2'],['leftThumbDistal','mixamorig:LeftHandThumb3'],
 ['leftIndexProximal','mixamorig:LeftHandIndex1'],['leftIndexIntermediate','mixamorig:LeftHandIndex2'],['leftIndexDistal','mixamorig:LeftHandIndex3'],
 ['leftMiddleProximal','mixamorig:LeftHandMiddle1'],['leftMiddleIntermediate','mixamorig:LeftHandMiddle2'],['leftMiddleDistal','mixamorig:LeftHandMiddle3'],
 ['leftRingProximal','mixamorig:LeftHandRing1'],['leftRingIntermediate','mixamorig:LeftHandRing2'],['leftRingDistal','mixamorig:LeftHandRing3'],
 ['leftLittleProximal','mixamorig:LeftHandPinky1'],['leftLittleIntermediate','mixamorig:LeftHandPinky2'],['leftLittleDistal','mixamorig:LeftHandPinky3'],
 ['rightThumbProximal','mixamorig:RightHandThumb1'],['rightThumbIntermediate','mixamorig:RightHandThumb2'],['rightThumbDistal','mixamorig:RightHandThumb3'],
 ['rightIndexProximal','mixamorig:RightHandIndex1'],['rightIndexIntermediate','mixamorig:RightHandIndex2'],['rightIndexDistal','mixamorig:RightHandIndex3'],
 ['rightMiddleProximal','mixamorig:RightHandMiddle1'],['rightMiddleIntermediate','mixamorig:RightHandMiddle2'],['rightMiddleDistal','mixamorig:RightHandMiddle3'],
 ['rightRingProximal','mixamorig:RightHandRing1'],['rightRingIntermediate','mixamorig:RightHandRing2'],['rightRingDistal','mixamorig:RightHandRing3'],
 ['rightLittleProximal','mixamorig:RightHandPinky1'],['rightLittleIntermediate','mixamorig:RightHandPinky2'],['rightLittleDistal','mixamorig:RightHandPinky3'],
] as const;

type HumanoidSemantic=(typeof VRM_TO_MIXAMO)[number][0];
function bindingName(nodeName:string){return T.PropertyBinding.sanitizeNodeName(nodeName);}
export function mixamoBone(root:T.Object3D,nodeName:string){const sanitized=bindingName(nodeName);return root.getObjectByName(nodeName)??root.getObjectByName(sanitized);}
function channelTrack(clip:T.AnimationClip,nodeName:string,property:'quaternion'|'position'){
 const suffix=`.${property}`,names=new Set([nodeName,bindingName(nodeName)]);
 return clip.tracks.find(track=>{if(!track.name.endsWith(suffix))return false;const target=track.name.slice(0,-suffix.length);return names.has(target)||[...names].some(name=>target.endsWith(name));});
}
function quaternionTrack(clip:T.AnimationClip,nodeName:string){return channelTrack(clip,nodeName,'quaternion') as T.QuaternionKeyframeTrack|undefined;}

type RetargetPair={semantic?:HumanoidSemantic;sourceName:string;source:T.Object3D;target:T.Object3D};
type LocalSnapshot={node:T.Object3D;position:T.Vector3;quaternion:T.Quaternion;scale:T.Vector3};
function snapshotAnimatedScene(root:T.Object3D){const out:LocalSnapshot[]=[];root.traverse(node=>out.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));return out;}
function restoreAnimatedScene(snapshots:readonly LocalSnapshot[]){for(const s of snapshots){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);}}
function sampleTimes(clip:T.AnimationClip,pairs:readonly RetargetPair[]){
 const wanted=new Set(pairs.map(p=>p.sourceName)),times=new Set<number>([0]);
 for(const track of clip.tracks){
  if(!track.name.endsWith('.quaternion')&&!track.name.endsWith('.position'))continue;
  const suffix=track.name.endsWith('.quaternion')?'.quaternion':'.position',target=track.name.slice(0,-suffix.length);
  if(![...wanted].some(name=>target===name||target===bindingName(name)||target.endsWith(name)||target.endsWith(bindingName(name))))continue;
  for(const t of track.times)times.add(Number(t));
 }
 const duration=Math.max(0,clip.duration);if(duration>0)times.add(duration);return [...times].filter(Number.isFinite).sort((a,b)=>a-b);
}
function legScale(pairs:readonly RetargetPair[]){
 const hip=pairs.find(p=>p.semantic==='hips'),left=pairs.find(p=>p.semantic==='leftFoot'),right=pairs.find(p=>p.semantic==='rightFoot');
 if(!hip||(!left&&!right))return 1;
 const hS=hip.source.getWorldPosition(new T.Vector3()),hT=hip.target.getWorldPosition(new T.Vector3());let source=0,target=0,count=0;
 for(const foot of [left,right])if(foot){source+=hS.distanceTo(foot.source.getWorldPosition(new T.Vector3()));target+=hT.distanceTo(foot.target.getWorldPosition(new T.Vector3()));count++;}
 return source>1e-6&&count?T.MathUtils.clamp(target/source,.25,4):1;
}
function canonicalizeQuaternionValues(values:number[]){
 for(let i=4;i<values.length;i+=4){const dot=values[i-4]*values[i]+values[i-3]*values[i+1]+values[i-2]*values[i+2]+values[i-1]*values[i+3];if(dot<0){values[i]*=-1;values[i+1]*=-1;values[i+2]*=-1;values[i+3]*=-1;}}
}

function styledSourceClip(sourceRoot:T.Object3D,sourceClip:T.AnimationClip,kind:LocomotionKind){
 const filters=locomotionStyleFilters(kind),tracks=sourceClip.tracks.map(track=>{
  if(!(track instanceof T.QuaternionKeyframeTrack))return track.clone();
  const target=track.name.slice(0,-'.quaternion'.length),entry=Object.entries(filters).find(([name])=>target===name||target===bindingName(name)||target.endsWith(name)||target.endsWith(bindingName(name)));
  if(!entry)return track.clone();
  const [sourceName,filter]=entry,bone=mixamoBone(sourceRoot,sourceName);if(!bone)return track.clone();
  const rest=bone.quaternion.clone(),restInv=rest.clone().invert(),delta=new T.Quaternion(),styled=new T.Quaternion(),euler=new T.Euler(0,0,0,'XYZ'),values:number[]=[];
  for(let i=0;i<track.values.length;i+=4){
   styled.fromArray(track.values as ArrayLike<number>,i);delta.copy(restInv).multiply(styled).normalize();euler.setFromQuaternion(delta,'XYZ');
   euler.y*=filter.yawScale;euler.z*=filter.rollScale;
   if(filter.amplitudeScale!==undefined){euler.x*=filter.amplitudeScale;euler.y*=filter.amplitudeScale;euler.z*=filter.amplitudeScale;}
   delta.setFromEuler(euler);styled.copy(rest).multiply(delta).normalize();values.push(styled.x,styled.y,styled.z,styled.w);
  }
  canonicalizeQuaternionValues(values);return new T.QuaternionKeyframeTrack(track.name,track.times,Float32Array.from(values));
 });
 const clip=new T.AnimationClip(`${sourceClip.name}_${kind}_heroic_grounded`,sourceClip.duration,tracks);clip.blendMode=sourceClip.blendMode;return clip;
}

/**
 * Keep gameplay/world motion outside the skeleton. We sample the source Hips world path, remove
 * its linear travel, and transfer only bounded vertical pelvis bob. The returned strideLength is
 * the target-proportioned forward distance represented by one authored cycle; the runtime uses it
 * to synchronize foot cadence with actual Character.root speed.
 */
function buildHipsPositionTrack(sourceRoot:T.Object3D,sourceClip:T.AnimationClip,pairs:readonly RetargetPair[],times:readonly number[]){
 const hips=pairs.find(p=>p.semantic==='hips'&&channelTrack(sourceClip,p.sourceName,'position'));if(!hips||!times.length)return {track:undefined as T.VectorKeyframeTrack|undefined,strideLength:0};
 const snapshot=snapshotAnimatedScene(sourceRoot),mixer=new T.AnimationMixer(sourceRoot),action=mixer.clipAction(sourceClip);action.enabled=true;action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
 const scale=legScale(pairs),first=new T.Vector3(),last=new T.Vector3(),current=new T.Vector3(),travel=new T.Vector3(),delta=new T.Vector3(),worldBob=new T.Vector3(),localBob=new T.Vector3(),parentQuatInv=new T.Quaternion(),parentScale=new T.Vector3();
 const rest=hips.target.position.clone(),values:number[]=[];let strideLength=0;
 try{
  mixer.setTime(times[0]);sourceRoot.updateMatrixWorld(true);hips.source.getWorldPosition(first);
  mixer.setTime(times[times.length-1]);sourceRoot.updateMatrixWorld(true);hips.source.getWorldPosition(last);travel.copy(last).sub(first);
  strideLength=Math.hypot(travel.x,travel.z)*scale;
  for(const time of times){
   mixer.setTime(Math.min(Math.max(0,time),Math.max(0,sourceClip.duration)));sourceRoot.updateMatrixWorld(true);hips.source.getWorldPosition(current);
   const u=sourceClip.duration>1e-6?T.MathUtils.clamp(time/sourceClip.duration,0,1):0;
   delta.copy(current).sub(first).addScaledVector(travel,-u).multiplyScalar(scale);
   // Horizontal gameplay displacement is owned by Character.root. Preserve only a small vertical
   // pelvis cycle; this cannot accumulate or push the avatar away from the capsule/root.
   worldBob.set(0,T.MathUtils.clamp(delta.y,-.10,.10),0);
   const parent=hips.target.parent;if(parent){parent.getWorldQuaternion(parentQuatInv).invert();parent.getWorldScale(parentScale);localBob.copy(worldBob).applyQuaternion(parentQuatInv);localBob.set(localBob.x/Math.max(1e-6,parentScale.x),localBob.y/Math.max(1e-6,parentScale.y),localBob.z/Math.max(1e-6,parentScale.z));}else localBob.copy(worldBob);
   values.push(rest.x,rest.y+localBob.y,rest.z);
  }
 }finally{action.stop();mixer.stopAllAction();restoreAnimatedScene(snapshot);sourceRoot.updateMatrixWorld(true);}
 return {track:new T.VectorKeyframeTrack(`${hips.target.name}.position`,Float32Array.from(times),Float32Array.from(values)),strideLength};
}

/** Official three-vrm-style Mixamo conversion for VRM normalized bones. */
function retargetVrmNormalizedClip(sourceRoot:T.Object3D,sourceClip:T.AnimationClip,vrm:any,pairs:readonly RetargetPair[],name:string){
 if(pairs.length<12)throw new Error(`Mixamo retarget incomplete (${pairs.length} mapped bones)`);
 sourceRoot.updateMatrixWorld(true);(vrm.scene as T.Object3D).updateMatrixWorld(true);
 const tracks:T.KeyframeTrack[]=[],restWorldInv=new T.Quaternion(),parentRestWorld=new T.Quaternion(),q=new T.Quaternion();
 const vrm0=String(vrm.meta?.metaVersion??'').startsWith('0');
 for(const pair of pairs){
  const sourceTrack=quaternionTrack(sourceClip,pair.sourceName);if(!sourceTrack)continue;
  pair.source.getWorldQuaternion(restWorldInv).invert();if(pair.source.parent)pair.source.parent.getWorldQuaternion(parentRestWorld);else parentRestWorld.identity();
  const values:number[]=[];
  for(let i=0;i<sourceTrack.values.length;i+=4){
   q.fromArray(sourceTrack.values as ArrayLike<number>,i).premultiply(parentRestWorld).multiply(restWorldInv).normalize();
   // Official three-vrm Mixamo example applies this even when VRMUtils.rotateVRM0() is used.
   if(vrm0){q.x=-q.x;q.z=-q.z;}
   values.push(q.x,q.y,q.z,q.w);
  }
  canonicalizeQuaternionValues(values);
  tracks.push(new T.QuaternionKeyframeTrack(`${pair.target.name}.quaternion`,sourceTrack.times,Float32Array.from(values)));
 }
 const times=sampleTimes(sourceClip,pairs),hips=buildHipsPositionTrack(sourceRoot,sourceClip,pairs,times);if(hips.track)tracks.push(hips.track);
 if(tracks.length<12)throw new Error(`Mixamo normalized retarget incomplete (${tracks.length} tracks)`);
 const clip=new T.AnimationClip(name,sourceClip.duration,tracks);(clip as any).qinglanStrideLength=hips.strideLength;return clip;
}

/** Same-rig retarget for the supplied Golden Queen: preserve local authored delta, no VRM0 axis flip. */
function retargetSameRigClip(sourceRoot:T.Object3D,sourceClip:T.AnimationClip,targetRoot:T.Object3D,pairs:readonly RetargetPair[],name:string){
 if(pairs.length<12)throw new Error(`Mixamo same-rig retarget incomplete (${pairs.length} mapped bones)`);
 sourceRoot.updateMatrixWorld(true);targetRoot.updateMatrixWorld(true);
 const tracks:T.KeyframeTrack[]=[],sourceRest=new T.Quaternion(),targetRest=new T.Quaternion(),delta=new T.Quaternion(),q=new T.Quaternion();
 for(const pair of pairs){
  const sourceTrack=quaternionTrack(sourceClip,pair.sourceName);if(!sourceTrack)continue;sourceRest.copy(pair.source.quaternion).invert();targetRest.copy(pair.target.quaternion);
  const values:number[]=[];
  for(let i=0;i<sourceTrack.values.length;i+=4){q.fromArray(sourceTrack.values as ArrayLike<number>,i);delta.copy(sourceRest).multiply(q).normalize();q.copy(targetRest).multiply(delta).normalize();values.push(q.x,q.y,q.z,q.w);}
  canonicalizeQuaternionValues(values);tracks.push(new T.QuaternionKeyframeTrack(`${pair.target.name}.quaternion`,sourceTrack.times,Float32Array.from(values)));
 }
 const times=sampleTimes(sourceClip,pairs),hips=buildHipsPositionTrack(sourceRoot,sourceClip,pairs,times);if(hips.track)tracks.push(hips.track);
 if(tracks.length<12)throw new Error(`Mixamo same-rig retarget incomplete (${tracks.length} tracks)`);
 const clip=new T.AnimationClip(name,sourceClip.duration,tracks);(clip as any).qinglanStrideLength=hips.strideLength;return clip;
}

export async function loadMixamoVrmRotationClip(url:string,vrm:any,name:string){
 const gltf=await load(url),rawSource=gltf.animations[0];if(!rawSource)throw new Error(`Mixamo clip missing: ${url}`);
 const kind:LocomotionKind|undefined=url===PLAYER_AUTHORED_LOCOMOTION.walk.asset?'walk':url===PLAYER_AUTHORED_LOCOMOTION.run.asset?'run':undefined;
 const source=kind?styledSourceClip(gltf.scene,rawSource,kind):rawSource;
 const pairs:RetargetPair[]=[];
 for(const [semantic,sourceName] of VRM_TO_MIXAMO){const sourceBone=mixamoBone(gltf.scene,sourceName),targetBone=vrm.humanoid?.getNormalizedBoneNode?.(semantic);if(sourceBone&&targetBone&&quaternionTrack(source,sourceName))pairs.push({semantic,sourceName,source:sourceBone,target:targetBone});}
 const clip=retargetVrmNormalizedClip(gltf.scene,source,vrm,pairs,name);(clip as any).qinglanLocomotionStyle=kind?'heroic-grounded':'source';return clip;
}

export async function loadMixamoNamedRigRotationClip(url:string,targetRoot:T.Object3D,name:string){
 const gltf=await load(url),source=gltf.animations[0];if(!source)throw new Error(`Mixamo clip missing: ${url}`);
 const pairs:RetargetPair[]=[];
 for(const [semantic,sourceName] of VRM_TO_MIXAMO){const sourceBone=mixamoBone(gltf.scene,sourceName),targetBone=mixamoBone(targetRoot,sourceName);if(sourceBone&&targetBone&&quaternionTrack(source,sourceName))pairs.push({semantic,sourceName,source:sourceBone,target:targetBone});}
 return retargetSameRigClip(gltf.scene,source,targetRoot,pairs,name);
}

export const MIXAMO_LOCOMOTION={walk:PLAYER_AUTHORED_LOCOMOTION.walk.asset,run:PLAYER_AUTHORED_LOCOMOTION.run.asset} as const;
