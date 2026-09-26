import * as T from 'three';
import type { HF265NatureAsset,HF265Placement } from '../../shared/data/hf265-world-layout';

const CORAL=new T.Color('#C9684F'),PEACH=new T.Color('#E7A184'),SAGE=new T.Color('#76815F'),COOL=new T.Color('#647E83'),STONE=new T.Color('#A6A198'),WOOD=new T.Color('#765244');

function classifyMaterial(name:string){
 const key=name.toLowerCase();
 if(/leaf|leaves|foliage|grass|plant/.test(key))return 'leaf';
 if(/flower|petal/.test(key))return 'flower';
 if(/bark|trunk|wood/.test(key))return 'wood';
 if(/rock|stone/.test(key))return 'stone';
 return 'generic';
}
function tintFor(p:HF265Placement,asset:HF265NatureAsset){
 if(asset.startsWith('rock'))return STONE;
 if(p.tint==='coral')return CORAL;if(p.tint==='peach')return PEACH;if(p.tint==='sage')return SAGE;if(p.tint==='cool')return COOL;return SAGE;
}
export function hf265NatureMaterial(source:T.Material,placement:HF265Placement,asset:HF265NatureAsset){
 if(!(source instanceof T.MeshStandardMaterial))return source.clone();
 const m=source.clone(),role=classifyMaterial(`${source.name}`),target=tintFor(placement,asset);
 m.dithering=true;m.metalness=Math.min(m.metalness,.04);
 if(role==='leaf'){
   m.color.lerp(target,.78);m.roughness=Math.max(.68,m.roughness);m.envMapIntensity=.62;m.alphaTest=Math.max(m.alphaTest,.18);m.side=T.DoubleSide;
 }else if(role==='flower'){
   m.color.lerp(PEACH,.76);m.roughness=Math.max(.62,m.roughness);m.envMapIntensity=.55;m.alphaTest=Math.max(m.alphaTest,.15);m.side=T.DoubleSide;
 }else if(role==='wood'){
   m.color.lerp(WOOD,.62);m.roughness=Math.max(.76,m.roughness);m.envMapIntensity=.42;
 }else if(role==='stone'){
   m.color.lerp(STONE,.72);m.roughness=Math.max(.80,m.roughness);m.envMapIntensity=.45;
 }else{
   m.color.lerp(target,.45);m.roughness=Math.max(.66,m.roughness);m.envMapIntensity=.55;
 }
 return m;
}
