import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { standardizeXianxiaMaterial } from '../rendering/xianxia-visual-style';

/**
 * P0.15 VRoid/VRM bridge.
 *
 * VRM avatars are intentionally loaded as independent instances: spring-bone state, expression
 * state and humanoid runtime state must never be shared between players. The browser HTTP cache
 * still prevents repeated network downloads of the same .vrm bytes.
 */
function makeLoader(){
  const loader=new GLTFLoader();
  loader.register(parser=>new VRMLoaderPlugin(parser));
  return loader;
}

export type VroidAvatarHandle={gltf:GLTF;vrm?:VRM;scene:T.Object3D;source:string;rawFallback?:boolean};

export async function loadVroidAvatar(url:string):Promise<VroidAvatarHandle>{
  let gltf:GLTF; let vrm:VRM|undefined; let rawFallback=false;
  try{
    gltf=await makeLoader().loadAsync(url) as GLTF;
    vrm=(gltf as any).userData?.vrm as VRM|undefined;
  }catch(error){
    // P0.22.1c HARD VISIBILITY PATH: a VRM extension/runtime problem must not prevent
    // the underlying binary glTF mesh from appearing. Load the same .vrm as plain GLB.
    console.error(`[P0.22.1c] VRM plugin load failed; retrying ${url} as raw binary glTF.`,error);
    gltf=await new GLTFLoader().loadAsync(url) as GLTF; rawFallback=true;
  }
  const scene=vrm?.scene??gltf.scene;
  if(!scene)throw new Error(`Renderable scene missing: ${url}`);
  if(vrm&&String(vrm.meta?.metaVersion??'').startsWith('0'))VRMUtils.rotateVRM0?.(vrm);
  scene.visible=true;
  // P0.23.9: configure render flags once at load time. The previous runtime forced every mesh
  // visible and disabled frustum culling on every animation frame, which became a major CPU/GPU
  // cost on VRMs with 60-130 primitives. Bind-pose bounds are expanded once for animated limbs
  // so normal Three.js frustum culling remains safe without a full scene traversal per frame.
  scene.traverse((o:T.Object3D)=>{
    o.visible=true; o.frustumCulled=true;
    if(o instanceof T.Mesh){
      o.castShadow=false;o.receiveShadow=true;
      const geometry=o.geometry;
      if(!geometry.boundingSphere)geometry.computeBoundingSphere();
      if(o instanceof T.SkinnedMesh&&geometry.boundingSphere&&!geometry.userData.qinglanVrmBoundsExpanded){
        geometry.boundingSphere.radius*=1.35;geometry.userData.qinglanVrmBoundsExpanded=true;
      }
      // HF18: avatar surfaces join the same PBR pipeline as world/equipment. Keep
      // additive gameplay VFX separate; every visible VRM mesh surface becomes
      // MeshStandardMaterial while retaining maps, alpha mode and render order.
      const convert=(m:T.Material)=>{const standard=standardizeXianxiaMaterial(m);standard.envMapIntensity=Math.max(.78,standard.envMapIntensity);standard.needsUpdate=true;return standard;};
      o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    }
  });
  console.info(`[P0.22.1c] renderable avatar loaded: ${url} mode=${rawFallback?'RAW-GLTF':'VRM'}`);
  return {gltf,vrm,scene,source:url,rawFallback};
}

export function updateVroid(handle:VroidAvatarHandle|undefined,dt:number){handle?.vrm?.update?.(dt);}
export function disposeVroid(handle:VroidAvatarHandle|undefined){if(!handle)return;try{VRMUtils.deepDispose?.(handle.scene);}catch{}}
