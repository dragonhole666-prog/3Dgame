import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as T from 'three';
import type { MonsterDef } from '../../shared/types';
import { createGameGLTFLoader } from './game-gltf-loader';
import { standardizeXianxiaMeshMaterials } from '../rendering/xianxia-visual-style';

/**
 * P0.25.1 open-monster bridge.
 *
 * Runtime order is deliberately resilient:
 *  1. vendored local asset cache,
 *  2. immutable-ish public GitHub raw source supplied by the content definition,
 *  3. caller keeps Qinglan's procedural monster when both fail.
 *
 * Loaded GLTF resources are cached once. SkeletonUtils.clone() gives each actor an independent
 * skeleton/transform graph while retaining shared immutable geometry/material resources.
 */
const loader=createGameGLTFLoader();
const cache=new Map<string,Promise<GLTF>>();
const warned=new Set<string>();

function load(url:string){
 let p=cache.get(url);
 if(!p){p=loader.loadAsync(url);cache.set(url,p);}
 return p;
}
async function loadFirst(local?:string,remote?:string){
 if(local){try{return await load(local);}catch(error){if(!warned.has(local)){warned.add(local);console.warn(`[P0.25.1] Local monster asset unavailable: ${local}`,error);}}}
 if(remote)return load(remote);
 return undefined;
}

export interface OpenMonsterAsset {object:T.Object3D;clip?:T.AnimationClip;source:string;license:'CC0-1.0'|'user-supplied'}
export async function openMonsterAsset(def:MonsterDef):Promise<OpenMonsterAsset|undefined>{
 if(!def.assetLocal&&!def.assetUrl)return undefined;
 try{
  const gltf=await loadFirst(def.assetLocal,def.assetUrl);
  if(!gltf)return undefined;
  const object=SkeletonUtils.clone(gltf.scene);
  object.traverse(o=>{if(o instanceof T.Mesh){standardizeXianxiaMeshMaterials(o);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;}});
  return {object,clip:gltf.animations[0],source:def.assetLocal??def.assetUrl!,license:def.assetLicense??'user-supplied'};
 }catch(error){
  const key=def.assetUrl??def.assetLocal??def.id;
  if(!warned.has(key)){warned.add(key);console.warn(`[P0.25.1] Monster asset failed; procedural fallback remains active for ${def.id}.`,error);}
  return undefined;
 }
}
