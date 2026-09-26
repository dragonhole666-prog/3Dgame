import * as T from 'three';
import type { GLTF, GLTFParser } from 'three/addons/loaders/GLTFLoader.js';
import type { VRM } from '@pixiv/three-vrm';

export type HumanoidBoneName=
  |'hips'|'spine'|'chest'|'neck'|'head'
  |'leftUpperArm'|'leftLowerArm'|'leftHand'|'rightUpperArm'|'rightLowerArm'|'rightHand'
  |'leftUpperLeg'|'leftLowerLeg'|'leftFoot'|'rightUpperLeg'|'rightLowerLeg'|'rightFoot';

export interface QinglanVRMA {
  duration:number;
  restHipsY:number;
  rotation:Map<HumanoidBoneName,T.QuaternionKeyframeTrack>;
  hipsTranslation?:T.VectorKeyframeTrack;
}

type VRMAExtension={specVersion?:string;humanoid?:{humanBones?:Record<string,{node?:number}>}};

/**
 * Lean VRMC_vrm_animation 1.0 loader used by Qinglan's authored T-pose VRMA library.
 * The semantic mapping and target-normalized-bone strategy mirrors three-vrm-animation.
 * Keeping this small adapter local avoids another runtime package while retaining real VRMA files.
 */
export class QinglanVRMAPlugin {
  readonly name='VRMC_vrm_animation';
  constructor(public readonly parser:GLTFParser){}
  async afterRoot(gltf:GLTF){
    const json:any=(gltf as any).parser?.json;
    const ext=json?.extensions?.VRMC_vrm_animation as VRMAExtension|undefined;
    if(!ext)return;
    if(ext.specVersion&&ext.specVersion!=='1.0'&&ext.specVersion!=='1.0-draft')throw new Error(`Unsupported VRMA spec ${ext.specVersion}`);
    const byNode=new Map<number,HumanoidBoneName>();
    for(const [bone,def] of Object.entries(ext.humanoid?.humanBones??{})){if(def?.node!=null)byNode.set(def.node,bone as HumanoidBoneName);}
    const nodes=await this.parser.getDependencies('node') as T.Object3D[];
    const hipsIndex=[...byNode].find(([,name])=>name==='hips')?.[0];
    let restHipsY=1;
    if(hipsIndex!=null){gltf.scene.updateWorldMatrix(false,true);restHipsY=nodes[hipsIndex]?.getWorldPosition(new T.Vector3()).y||1;}
    const vrma:QinglanVRMA[]=[];
    for(let ai=0;ai<gltf.animations.length;ai++){
      const clip=gltf.animations[ai],def=json.animations?.[ai];
      const out:QinglanVRMA={duration:clip.duration,restHipsY,rotation:new Map()};
      for(let ci=0;ci<(def?.channels?.length??0);ci++){
        const channel=def.channels[ci],bone=byNode.get(channel.target?.node),track=clip.tracks[ci];if(!bone||!track)continue;
        if(channel.target.path==='rotation')out.rotation.set(bone,track.clone() as T.QuaternionKeyframeTrack);
        else if(channel.target.path==='translation'&&bone==='hips')out.hipsTranslation=track.clone() as T.VectorKeyframeTrack;
      }
      vrma.push(out);
    }
    (gltf.userData as any).vrmAnimations=vrma;
  }
}

export function createQinglanVRMAnimationClip(source:QinglanVRMA,vrm:VRM,name:string){
  const tracks:T.KeyframeTrack[]=[];const meta0=String((vrm as any).meta?.metaVersion??'1')==='0';
  for(const [bone,orig] of source.rotation){const node=(vrm.humanoid as any).getNormalizedBoneNode?.(bone) as T.Object3D|undefined;if(!node?.name)continue;const values=Float32Array.from(orig.values,(v,i)=>meta0&&i%2===0?-v:v);tracks.push(new T.QuaternionKeyframeTrack(`${node.name}.quaternion`,orig.times.slice(),values));}
  if(source.hipsTranslation){const node=(vrm.humanoid as any).getNormalizedBoneNode?.('hips') as T.Object3D|undefined;if(node?.name){const rest=(vrm.humanoid as any).normalizedRestPose?.hips?.position?.[1]??source.restHipsY;const scale=rest/Math.max(1e-6,source.restHipsY);const values=Float32Array.from(source.hipsTranslation.values,(v,i)=>(meta0&&i%3!==1?-v:v)*scale);tracks.push(new T.VectorKeyframeTrack(`${node.name}.position`,source.hipsTranslation.times.slice(),values));}}
  return new T.AnimationClip(name,source.duration,tracks);
}
