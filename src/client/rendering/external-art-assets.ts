import * as T from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export type ExternalPbrRole='grass'|'stone'|'wood'|'bark'|'roof';
type TextureSet={diff:string;normal?:string;rough?:string};

/**
 * HF25 external look-dev sources.
 * Poly Haven assets are CC0. The live public API is used for model/HDRI discovery;
 * direct 1K texture URLs are used for PBR material upgrades to avoid JSON round trips.
 * Every caller retains a local bundled fallback, so offline play remains functional.
 */
const POLY_HAVEN:Record<ExternalPbrRole,TextureSet>={
 grass:{
  diff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_path_2/grass_path_2_diff_1k.jpg',
  normal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_path_2/grass_path_2_nor_gl_1k.jpg',
  rough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_path_2/grass_path_2_rough_1k.jpg',
 },
 stone:{
  diff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pathway/stone_pathway_diff_1k.jpg',
  normal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pathway/stone_pathway_nor_gl_1k.jpg',
  rough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_pathway/stone_pathway_rough_1k.jpg',
 },
 wood:{
  diff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/japanese_cedar_planks/japanese_cedar_planks_diff_1k.jpg',
  normal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/japanese_cedar_planks/japanese_cedar_planks_nor_gl_1k.jpg',
  rough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/japanese_cedar_planks/japanese_cedar_planks_rough_1k.jpg',
 },
 bark:{
  diff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/chinese_cedar_bark/chinese_cedar_bark_diff_1k.jpg',
  normal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/chinese_cedar_bark/chinese_cedar_bark_nor_gl_1k.jpg',
  rough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/chinese_cedar_bark/chinese_cedar_bark_rough_1k.jpg',
 },
 roof:{
  diff:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grey_roof_tiles/grey_roof_tiles_diff_1k.jpg',
  normal:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grey_roof_tiles/grey_roof_tiles_nor_gl_1k.jpg',
  rough:'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grey_roof_tiles/grey_roof_tiles_rough_1k.jpg',
 },
};

const POLY_HAVEN_API='https://api.polyhaven.com/files';
const FALLBACK_HDR='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/chinese_garden_1k.hdr';
const textureLoader=new T.TextureLoader().setCrossOrigin('anonymous');
const textureCache=new Map<string,T.Texture>();
const fileTreeCache=new Map<string,Promise<any>>();

function remoteTexture(url:string,srgb:boolean,repeatX:number,repeatY:number,onReady:(t:T.Texture)=>void){
 if(typeof document==='undefined')return;
 const existing=textureCache.get(url);if(existing){onReady(existing);return;}
 textureLoader.load(url,t=>{
  t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=8;
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  textureCache.set(url,t);onReady(t);
 },undefined,()=>{});
}

/** Upgrade an existing MeshStandard/Physical material in-place. Network errors
 * are deliberately silent; its local maps remain active. */
export function upgradeMaterialFromPolyHaven(material:T.MeshStandardMaterial,role:ExternalPbrRole,repeatX=4,repeatY=4,preserveLocalAlbedo=true){
 const set=POLY_HAVEN[role];
 // HF26 reference-match: do not let a late network diffuse map overwrite the
 // measured/regraded local albedo. Poly Haven still supplies mature PBR detail.
 if(!preserveLocalAlbedo||!material.map)remoteTexture(set.diff,true,repeatX,repeatY,t=>{material.map=t;material.needsUpdate=true;});
 if(set.normal)remoteTexture(set.normal,false,repeatX,repeatY,t=>{material.normalMap=t;material.normalScale.set(.72,.72);material.needsUpdate=true;});
 if(set.rough)remoteTexture(set.rough,false,repeatX,repeatY,t=>{material.roughnessMap=t;material.needsUpdate=true;});
}

async function polyHavenFiles(assetId:string){
 let cached=fileTreeCache.get(assetId);if(cached)return cached;
 cached=fetch(`${POLY_HAVEN_API}/${encodeURIComponent(assetId)}`,{mode:'cors',cache:'force-cache'}).then(r=>{
  if(!r.ok)throw new Error(`Poly Haven API ${assetId}: HTTP ${r.status}`);
  return r.json();
 });
 fileTreeCache.set(assetId,cached);return cached;
}

/** Resolve a 1K glTF model from the official Poly Haven API. */
export async function resolvePolyHavenGltf(assetId:string,resolution='1k'){
 const tree=await polyHavenFiles(assetId);
 const exact=tree?.gltf?.[resolution]?.gltf?.url;
 if(typeof exact==='string')return exact;
 const choices:string[]=[];
 const walk=(value:any)=>{
  if(!value)return;
  if(typeof value==='object'){
   if(typeof value.url==='string'&&/\.gltf(?:$|\?)/i.test(value.url))choices.push(value.url);
   for(const v of Object.values(value))walk(v);
  }
 };
 walk(tree?.gltf??tree);
 choices.sort((a,b)=>{
  const score=(u:string)=>(u.includes(`/${resolution}/`)?-8:0)+(u.includes('_1k')?-4:0)+(u.includes('lod')?-2:0)+u.length*.0001;
  return score(a)-score(b);
 });
 if(!choices.length)throw new Error(`Poly Haven ${assetId}: no glTF file found`);
 return choices[0];
}

/** Resolve a 1K HDR from the official Poly Haven API. */
async function resolvePolyHavenHdr(assetId:string,resolution='1k'){
 try{
  const tree=await polyHavenFiles(assetId);
  const exact=tree?.hdri?.[resolution]?.hdr?.url;
  if(typeof exact==='string')return exact;
 }catch{}
 return FALLBACK_HDR;
}

let environmentPromise:Promise<T.Texture|null>|undefined;
export function loadPolyHavenEnvironment(renderer:T.WebGLRenderer):Promise<T.Texture|null>{
 if(environmentPromise)return environmentPromise;
 environmentPromise=(async()=>{
  try{
   const url=await resolvePolyHavenHdr('chinese_garden','1k');
   const hdr=await new RGBELoader().setCrossOrigin('anonymous').loadAsync(url);
   hdr.mapping=T.EquirectangularReflectionMapping;
   const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
   const target=pmrem.fromEquirectangular(hdr);hdr.dispose();pmrem.dispose();
   target.texture.name='HF25_PolyHaven_ChineseGarden_Environment';
   return target.texture;
  }catch(error){console.info('[HF25] Poly Haven HDRI unavailable; retaining bundled environment.',error);return null;}
 })();
 return environmentPromise;
}
