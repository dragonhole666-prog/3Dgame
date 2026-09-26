import * as T from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type { Appearance, Slot } from '../../shared/types';
import { APPEARANCES, ITEMS } from '../../shared/data/equipment';
import { armorModel } from './appearance';
import { canonicalBoneName } from './bone-names';
import { createGameGLTFLoader } from '../assets/game-gltf-loader';
import { EQUIPMENT_FIT_MODULES } from '../../shared/data/equipment-fit-modules.generated';
import { BODY_FIT_SLOTS,HF8_CLEARANCE_MORPH,autoRigBoneNames,garmentFitSafety,garmentMorphNames,isBodyFitSlot } from './garment-fit-standard';
import { standardizeXianxiaMaterial } from '../rendering/xianxia-visual-style';
import { applyHF265EquipmentArtDirection } from '../rendering/hf265-equipment-art-direction';

export type BaseOutfitMask='top'|'tie'|'bottom'|'shoes';
export type CuratedEquipmentSource='project-authored'|'user-supplied'|'generated-fit'|'auto-module';
export type CuratedEquipmentMode='skinned'|'rigid'|'generated-skinned'|'auto-fit';

export interface CuratedEquipmentDefinition {
  itemId:string;
  slot:Slot;
  url:string;
  mode:CuratedEquipmentMode;
  source:CuratedEquipmentSource;
  baseMask?:BaseOutfitMask[];
  targetLength?:number;
  targetSize?:number;
  fitMode?:'weapon'|'center';
  gripMode?:'end'|'center';
  bladeAxis?:'positiveY'|'negativeY';
  /** HF9 imported weapons normalize their longest source axis to the held +Y axis. */
  autoOrientWeapon?:boolean;
  attach?:'rightHand'|'leftHand'|'head'|'chest'|'hips';
  localOffset?:readonly [number,number,number];
  localRotation?:readonly [number,number,number];
  localScale?:number;
  /** Defensive props: holder origin is the physical hand grip, while the plate is offset away from the palm. */
  shieldGrip?:{handleLength:number;handleRadius:number;plateOffset:number};
  /** HF8: another validated garment GLB can be reused as a slot-fit template. */
  templateItemId?:string;
  /** HF8: template/generated pieces inherit the gameplay item's authored palette. */
  tintFromItem?:boolean;
  /**
   * HF14 fit safety mode.
   * Existing project garments were authored against the Qinglan humanoid rest pose and already
   * rendered correctly before HF6.  Keep their authored rest geometry and only remap bone indices;
   * imported/custom garments can still opt into full bind-pose transfer.
   */
  fitStrategy?:'preserve-authored'|'bind-transfer'|'anatomical-transfer';
}

/**
 * P0.23.7 curated semantic replacement table.
 *
 * Important: this is intentionally conservative. A model is listed only when its actual geometry
 * matches the gameplay item category. Uploaded files whose filename lies about the geometry are
 * never allowed into this table.
 */
const DEFINITIONS:Record<string,CuratedEquipmentDefinition>={
  // Real project-authored garments. These files were already bundled but the VRM runtime previously
  // ignored them and drew procedural primitives instead.
  'linen-robe':{itemId:'linen-robe',slot:'chest',url:'/assets/equipment/linen_robe.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['top','tie','bottom']},
  'cloud-robe':{itemId:'cloud-robe',slot:'chest',url:'/assets/equipment/cloud_robe.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['top','tie','bottom']},
  'thunder-armor':{itemId:'thunder-armor',slot:'chest',url:'/assets/equipment/thunder_armor.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['top','tie','bottom']},
  'snow-fashion':{itemId:'snow-fashion',slot:'fashion',url:'/assets/equipment/snow_fashion.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['top','tie','bottom']},
  'linen-legs':{itemId:'linen-legs',slot:'legs',url:'/assets/equipment/linen_legs.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['bottom']},
  'scale-legs':{itemId:'scale-legs',slot:'legs',url:'/assets/equipment/scale_legs.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['bottom']},
  'linen-boots':{itemId:'linen-boots',slot:'feet',url:'/assets/equipment/linen_boots.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['shoes']},
  'cloud-boots':{itemId:'cloud-boots',slot:'feet',url:'/assets/equipment/cloud_boots.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['shoes']},
  'thunder-boots':{itemId:'thunder-boots',slot:'feet',url:'/assets/equipment/thunder_boots.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer',baseMask:['shoes']},
  'cloth-wrists':{itemId:'cloth-wrists',slot:'wrists',url:'/assets/equipment/cloth_wrists.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer'},
  'thunder-bracers':{itemId:'thunder-bracers',slot:'wrists',url:'/assets/equipment/thunder_bracers.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer'},
  'woven-belt':{itemId:'woven-belt',slot:'waist',url:'/assets/equipment/woven_belt.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer'},
  'thunder-belt':{itemId:'thunder-belt',slot:'waist',url:'/assets/equipment/thunder_belt.glb',mode:'skinned',source:'project-authored',fitStrategy:'anatomical-transfer'},

  // Rigid authored head pieces.
  'cloth-head':{itemId:'cloth-head',slot:'head',url:'/assets/equipment/cloth_head.glb',mode:'rigid',source:'project-authored',attach:'head'},
  'jade-crown':{itemId:'jade-crown',slot:'head',url:'/assets/equipment/jade_crown.glb',mode:'rigid',source:'project-authored',attach:'head'},

  // Correct sword models. The bundled sword mesh points blade-down in source coordinates, so it is
  // explicitly flipped into the anatomical palm +Y direction. This does NOT alter combat animation.
  'iron-sword':{itemId:'iron-sword',slot:'mainhand',url:'/assets/equipment/iron_sword.glb',mode:'rigid',source:'project-authored',attach:'rightHand',targetLength:1.05,bladeAxis:'negativeY'},
  'thunder-sword':{itemId:'thunder-sword',slot:'mainhand',url:'/assets/equipment/thunder_sword.glb',mode:'rigid',source:'project-authored',attach:'rightHand',targetLength:1.45,bladeAxis:'negativeY'},
  'heaven-sword':{itemId:'heaven-sword',slot:'mainhand',url:'/assets/equipment/heaven_sword.glb',mode:'rigid',source:'project-authored',attach:'rightHand',targetLength:1.65,bladeAxis:'negativeY'},
  'bamboo-sword':{itemId:'bamboo-sword',slot:'mainhand',url:'/assets/equipment/qinglan_immortal_jian.glb',mode:'rigid',source:'project-authored',attach:'rightHand',targetLength:1.18,bladeAxis:'negativeY'},
  'cloud-sword':{itemId:'cloud-sword',slot:'mainhand',url:'/assets/equipment/qinglan_immortal_jian.glb',mode:'rigid',source:'project-authored',attach:'rightHand',targetLength:1.32,bladeAxis:'negativeY'},

  // User-supplied ice sword. Geometry inspection confirms a single rigid sword mesh with the blade
  // extending along local +Y; the grip sits at the negative-Y end. Keep gameplay identity unchanged.
  'mythic-sword':{itemId:'mythic-sword',slot:'mainhand',url:'/assets/user-equipment/ice-mythic-sword.glb',mode:'rigid',source:'user-supplied',attach:'rightHand',targetLength:1.72,bladeAxis:'positiveY'},


  // User-supplied equipment. Center-fit is used for wearable/defensive props;
  // weapons are normalized independently so source authoring scale does not leak into gameplay.
  'primordial-god-crown':{itemId:'primordial-god-crown',slot:'head',url:'/assets/user-equipment/divine_helmet.glb',mode:'rigid',source:'user-supplied',attach:'head',fitMode:'center',targetSize:.46,localRotation:[0,Math.PI,0],localOffset:[0,.08,0]},
  'heavenfall-bow':{itemId:'heavenfall-bow',slot:'mainhand',url:'/assets/user-equipment/mythic_demon_bow.glb',mode:'rigid',source:'user-supplied',attach:'leftHand',targetLength:1.58,gripMode:'center',bladeAxis:'positiveY'},
  'celestial-burial-spear':{itemId:'celestial-burial-spear',slot:'mainhand',url:'/assets/user-equipment/mythic_demon_spear.glb',mode:'rigid',source:'user-supplied',attach:'rightHand',targetLength:2.35,gripMode:'end',bladeAxis:'positiveY'},
  'demon-king-shield':{itemId:'demon-king-shield',slot:'offhand',url:'/assets/user-equipment/demon_king_shield.glb',mode:'rigid',source:'user-supplied',attach:'leftHand',fitMode:'center',targetSize:.78,localRotation:[0,Math.PI/2,0],shieldGrip:{handleLength:.24,handleRadius:.026,plateOffset:.105}},
};

/** Body silhouette slots never fall back to primitive boxes/cylinders in P0.23.7. */
export const NO_PROCEDURAL_SILHOUETTE=new Set<Slot>(['head','shoulders','chest','wrists','hands','waist','legs','feet','cape','fashion']);

export const FIT_REQUIRED_SLOTS=BODY_FIT_SLOTS;

const FIT_TEMPLATE_BY_SLOT:Partial<Record<Slot,Readonly<Record<string,string>>>>={
  chest:{plate:'thunder-armor',lamellar:'thunder-armor',vest:'linen-robe',robe:'linen-robe',silk:'cloud-robe',default:'linen-robe'},
  fashion:{default:'snow-fashion'},
  wrists:{scale:'thunder-bracers',plate:'thunder-bracers',fang:'thunder-bracers',wrap:'cloth-wrists',default:'cloth-wrists'},
  waist:{plate:'thunder-belt',sash:'woven-belt',default:'woven-belt'},
  legs:{plate:'scale-legs',lamellar:'scale-legs',cloth:'linen-legs',default:'linen-legs'},
  feet:{spiked:'thunder-boots',boots:'cloud-boots',shoes:'linen-boots',plate:'thunder-boots',default:'cloud-boots'},
};
const GENERATED_SKINNED_SLOTS=new Set<Slot>(['shoulders','hands','cape']);
const BASE_MASK_BY_SLOT:Partial<Record<Slot,BaseOutfitMask[]>>={fashion:['top','tie','bottom'],legs:['bottom'],feet:['shoes']};
function fitBaseMask(slot:Slot,ap:Appearance,template?:CuratedEquipmentDefinition):BaseOutfitMask[]|undefined{
  if(slot==='chest')return ap.length>=.76||['plate','lamellar','robe','silk'].includes(ap.shape)?['top','tie','bottom']:['top','tie'];
  return BASE_MASK_BY_SLOT[slot]??template?.baseMask;
}

function appearanceFor(itemId:string){const item=ITEMS[itemId];return item?.appearanceId?APPEARANCES[item.appearanceId]:undefined;}
function explicitGlbUrl(itemId:string){
  const item=ITEMS[itemId],ap=appearanceFor(itemId);
  const moduleUrl=EQUIPMENT_FIT_MODULES[itemId];if(moduleUrl)return moduleUrl;
  for(const value of [item?.mesh,ap?.mesh])if(typeof value==='string'&&/\.glb(?:[?#].*)?$/i.test(value))return value;
  return undefined;
}
function automaticGlbFitDefinition(itemId:string):CuratedEquipmentDefinition|undefined{
  const item=ITEMS[itemId],ap=appearanceFor(itemId);if(!item?.slot||!ap)return undefined;
  const url=explicitGlbUrl(itemId);if(!url)return undefined;
  if(isBodyFitSlot(item.slot))return {itemId,slot:item.slot,url,mode:'auto-fit',source:'auto-module',baseMask:fitBaseMask(item.slot,ap),tintFromItem:false};
  const attach=item.slot==='mainhand'?(ap.animationProfile==='bow'?'leftHand':'rightHand'):item.slot==='offhand'?'leftHand':item.slot==='head'?'head':item.slot==='waist'||item.slot==='charm'?'hips':'chest';
  if(item.slot==='mainhand')return {itemId,slot:item.slot,url,mode:'rigid',source:'auto-module',attach,targetLength:ap.length,gripMode:ap.animationProfile==='bow'?'center':'end',bladeAxis:'positiveY',autoOrientWeapon:true};
  if(item.slot==='offhand')return {itemId,slot:item.slot,url,mode:'rigid',source:'auto-module',attach,fitMode:'center',targetSize:Math.max(.18,ap.length),localRotation:ap.shape==='shield'?[0,Math.PI/2,0]:undefined};
  return {itemId,slot:item.slot,url,mode:'rigid',source:'auto-module',attach,fitMode:'center',targetSize:Math.max(.05,Math.min(1.4,ap.length))};
}
function generatedFitDefinition(itemId:string):CuratedEquipmentDefinition|undefined{
  const item=ITEMS[itemId],ap=appearanceFor(itemId);if(!item?.slot||!ap||!FIT_REQUIRED_SLOTS.has(item.slot))return undefined;
  const slot=item.slot;if(GENERATED_SKINNED_SLOTS.has(slot))return {itemId,slot,url:`generated-fit://${itemId}`,mode:'generated-skinned',source:'generated-fit',baseMask:fitBaseMask(slot,ap),tintFromItem:true};
  const byShape=FIT_TEMPLATE_BY_SLOT[slot],templateItemId=byShape?.[ap.shape]??byShape?.default;if(!templateItemId)return undefined;
  const template=DEFINITIONS[templateItemId];if(!template||template.mode!=='skinned')return undefined;
  return {itemId,slot,url:template.url,mode:'skinned',source:'generated-fit',baseMask:fitBaseMask(slot,ap,template),templateItemId,tintFromItem:true,fitStrategy:template.fitStrategy};
}

/** HF9 resolution order: preserve hand-tuned curated assets; new editor/module item ids then auto-resolve; finally template/generated fit. */
export function curatedEquipmentDefinition(itemId:string){return DEFINITIONS[itemId]??automaticGlbFitDefinition(itemId)??generatedFitDefinition(itemId);}
export function curatedEquipmentIds(){return [...new Set([...Object.keys(DEFINITIONS),...Object.keys(ITEMS).filter(id=>!!generatedFitDefinition(id))])];}
export function fittedGarmentIds(){return Object.keys(ITEMS).filter(id=>{const slot=ITEMS[id]?.slot;return !!slot&&FIT_REQUIRED_SLOTS.has(slot);});}

const loader=createGameGLTFLoader();
const cache=new Map<string,Promise<GLTF>>();
function load(url:string){let p=cache.get(url);if(!p){p=loader.loadAsync(url);cache.set(url,p);}return p;}
function cloneMaterial(material:T.Material|T.Material[]){const convert=(m:T.Material)=>standardizeXianxiaMaterial(m);return Array.isArray(material)?material.map(convert):convert(material);}

function cloneRigid(root:T.Object3D){
  const clone=SkeletonUtils.clone(root);
  clone.traverse(o=>{if(!(o instanceof T.Mesh))return;o.geometry=o.geometry.clone();o.material=cloneMaterial(o.material);o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.userData.assetOwned=true;});
  return clone;
}

export interface GarmentBodySurface {
  cellSize:number;
  positions:Float32Array;
  normals:Float32Array;
  cells:Map<string,number[]>;
  bounds:T.Box3;
}
export interface CuratedSkinTarget {
  skeleton:T.Skeleton;
  bindMatrix:T.Matrix4;
  bindMatrixInverse:T.Matrix4;
  meshMatrixInAvatar:T.Matrix4;
  surface?:GarmentBodySurface;
}
function surfaceKey(x:number,y:number,z:number,cell:number){return `${Math.floor(x/cell)},${Math.floor(y/cell)},${Math.floor(z/cell)}`;}
function buildBodySurface(skin:T.SkinnedMesh):GarmentBodySurface|undefined{
  const src=skin.geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!src?.count)return undefined;
  let normal=skin.geometry.getAttribute('normal') as T.BufferAttribute|undefined;
  if(!normal){const clone=skin.geometry.clone();clone.computeVertexNormals();normal=clone.getAttribute('normal') as T.BufferAttribute|undefined;}
  if(!normal)return undefined;
  const maxSamples=12000,step=Math.max(1,Math.ceil(src.count/maxSamples)),count=Math.ceil(src.count/step),positions=new Float32Array(count*3),normals=new Float32Array(count*3),cells=new Map<string,number[]>(),bounds=new T.Box3(),p=new T.Vector3(),n=new T.Vector3();
  const cellSize=.055;let out=0;
  for(let i=0;i<src.count;i+=step){p.fromBufferAttribute(src,i);n.fromBufferAttribute(normal,i).normalize();positions[out*3]=p.x;positions[out*3+1]=p.y;positions[out*3+2]=p.z;normals[out*3]=n.x;normals[out*3+1]=n.y;normals[out*3+2]=n.z;bounds.expandByPoint(p);const key=surfaceKey(p.x,p.y,p.z,cellSize),bucket=cells.get(key);if(bucket)bucket.push(out);else cells.set(key,[out]);out++;}
  return {cellSize,positions,normals,cells,bounds};
}

/** Build a stable bind-pose target from the avatar skin, independent of the current animation pose. */
export function curatedSkinTarget(skin:T.SkinnedMesh,avatarRoot:T.Object3D):CuratedSkinTarget{
  avatarRoot.updateWorldMatrix(true,false);skin.updateWorldMatrix(true,false);
  const rootInverse=avatarRoot.matrixWorld.clone().invert();
  return {
    skeleton:skin.skeleton,
    bindMatrix:skin.bindMatrix.clone(),
    bindMatrixInverse:skin.bindMatrixInverse.clone(),
    meshMatrixInAvatar:rootInverse.multiply(skin.matrixWorld.clone()),
    surface:buildBodySurface(skin),
  };
}

const _bindPoint=new T.Vector3(),_boneLocal=new T.Vector3(),_targetBindPoint=new T.Vector3(),_weightedBindPoint=new T.Vector3(),_tmpVec=new T.Vector3();
const _linearA=new T.Matrix3(),_linearB=new T.Matrix3(),_linearC=new T.Matrix3();

function transferBindPoint(position:T.Vector3,sourceBind:T.Matrix4,sourceBoneInverse:T.Matrix4,targetBoneBind:T.Matrix4,targetBindInverse:T.Matrix4,out:T.Vector3){
  return out.copy(position).applyMatrix4(sourceBind).applyMatrix4(sourceBoneInverse).applyMatrix4(targetBoneBind).applyMatrix4(targetBindInverse);
}
function transferBindDelta(delta:T.Vector3,sourceBind:T.Matrix4,sourceBoneInverse:T.Matrix4,targetBoneBind:T.Matrix4,targetBindInverse:T.Matrix4,out:T.Vector3){
  _linearA.setFromMatrix4(sourceBind);_linearB.setFromMatrix4(sourceBoneInverse);_linearC.setFromMatrix4(targetBoneBind);
  out.copy(delta).applyMatrix3(_linearA).applyMatrix3(_linearB).applyMatrix3(_linearC);_linearA.setFromMatrix4(targetBindInverse);return out.applyMatrix3(_linearA);
}

/**
 * HF6 bind-pose transfer.
 * A garment GLB can use correct semantic bone names yet still have a different authored body
 * proportion. Merely replacing skin indices therefore binds the OLD rest-shape to the NEW skeleton.
 * Transfer every vertex through source-bone bind space into the matching avatar-bone bind space
 * before binding; Morph deltas are transferred through the same linear frames.
 */
export function remapSkin(source:T.SkinnedMesh,target:CuratedSkinTarget){
  const srcIndex=source.geometry.getAttribute('skinIndex') as T.BufferAttribute|undefined;
  const srcWeight=source.geometry.getAttribute('skinWeight') as T.BufferAttribute|undefined;
  const srcPosition=source.geometry.getAttribute('position') as T.BufferAttribute|undefined;
  if(!srcIndex||!srcWeight||!srcPosition)return undefined;
  const targetByName=new Map<string,number>(),targetByCanonical=new Map<string,number>();
  target.skeleton.bones.forEach((b,i)=>{targetByName.set(b.name,i);const c=canonicalBoneName(b.name);if(c&&!targetByCanonical.has(c))targetByCanonical.set(c,i);});
  const fallback=targetByCanonical.get('Hips')??0;
  const sourceMap=source.skeleton.bones.map(bone=>{
    const exact=targetByName.get(bone.name);if(exact!==undefined)return exact;
    let cur:T.Object3D|null=bone;
    while(cur){const named=targetByName.get(cur.name);if(named!==undefined)return named;const c=canonicalBoneName(cur.name),i=c===undefined?undefined:targetByCanonical.get(c);if(i!==undefined)return i;cur=cur.parent;}
    return fallback;
  });
  const targetBoneBind=target.skeleton.boneInverses.map(inv=>inv.clone().invert());
  const count=srcIndex.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  const geometry=source.geometry.clone(),positions=new Float32Array(count*3);
  const mappedInfluences:{sourceIndex:number;targetIndex:number;weight:number}[][]=new Array(count);
  for(let v=0;v<count;v++){
    const idx=[srcIndex.getX(v),srcIndex.getY(v),srcIndex.getZ(v),srcIndex.getW(v)];
    const wei=[srcWeight.getX(v),srcWeight.getY(v),srcWeight.getZ(v),srcWeight.getW(v)];
    const merged=new Map<number,number>(),raw:{sourceIndex:number;targetIndex:number;weight:number}[]=[];
    for(let j=0;j<4;j++){const sourceIndex=idx[j]??0,targetIndex=sourceMap[sourceIndex]??fallback,w=wei[j]||0;if(w<=0)continue;merged.set(targetIndex,(merged.get(targetIndex)??0)+w);raw.push({sourceIndex,targetIndex,weight:w});}
    const top=[...merged.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);let total=top.reduce((sum,p)=>sum+p[1],0);
    if(total<=1e-6){top.splice(0,top.length,[fallback,1]);total=1;}
    for(let j=0;j<4;j++){const pair=top[j]??[fallback,0];indices[v*4+j]=pair[0];weights[v*4+j]=pair[1]/total;}
    const rawTotal=raw.reduce((sum,p)=>sum+p.weight,0)||1;mappedInfluences[v]=raw.map(p=>({...p,weight:p.weight/rawTotal}));
    _bindPoint.fromBufferAttribute(srcPosition,v);_weightedBindPoint.set(0,0,0);
    for(const influence of mappedInfluences[v]){
      const sourceInverse=source.skeleton.boneInverses[influence.sourceIndex]??source.skeleton.boneInverses[0];
      const targetBind=targetBoneBind[influence.targetIndex]??targetBoneBind[fallback];
      transferBindPoint(_bindPoint,source.bindMatrix,sourceInverse,targetBind,target.bindMatrixInverse,_boneLocal);
      _weightedBindPoint.addScaledVector(_boneLocal,influence.weight);
    }
    positions[v*3]=_weightedBindPoint.x;positions[v*3+1]=_weightedBindPoint.y;positions[v*3+2]=_weightedBindPoint.z;
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const morphPositions=geometry.morphAttributes.position as T.BufferAttribute[]|undefined;
  const sourceMorphPositions=source.geometry.morphAttributes.position as T.BufferAttribute[]|undefined;
  if(morphPositions&&sourceMorphPositions){
    for(let m=0;m<morphPositions.length;m++){
      const srcMorph=sourceMorphPositions[m];if(!srcMorph||srcMorph.count!==count)continue;const dst=new Float32Array(count*3);
      for(let v=0;v<count;v++){
        _bindPoint.fromBufferAttribute(srcMorph,v);_weightedBindPoint.set(0,0,0);
        if(source.geometry.morphTargetsRelative){
          for(const influence of mappedInfluences[v]){
            const sourceInverse=source.skeleton.boneInverses[influence.sourceIndex]??source.skeleton.boneInverses[0];
            const targetBind=targetBoneBind[influence.targetIndex]??targetBoneBind[fallback];
            transferBindDelta(_bindPoint,source.bindMatrix,sourceInverse,targetBind,target.bindMatrixInverse,_tmpVec);
            _weightedBindPoint.addScaledVector(_tmpVec,influence.weight);
          }
        }else{
          for(const influence of mappedInfluences[v]){
            const sourceInverse=source.skeleton.boneInverses[influence.sourceIndex]??source.skeleton.boneInverses[0];
            const targetBind=targetBoneBind[influence.targetIndex]??targetBoneBind[fallback];
            transferBindPoint(_bindPoint,source.bindMatrix,sourceInverse,targetBind,target.bindMatrixInverse,_tmpVec);
            _weightedBindPoint.addScaledVector(_tmpVec,influence.weight);
          }
        }
        dst[v*3]=_weightedBindPoint.x;dst[v*3+1]=_weightedBindPoint.y;dst[v*3+2]=_weightedBindPoint.z;
      }
      const attr=new T.Float32BufferAttribute(dst,3);attr.name=srcMorph.name;morphPositions[m]=attr;
    }
  }
  if(geometry.getIndex())geometry.computeVertexNormals();
  const mesh=new T.SkinnedMesh(geometry,cloneMaterial(source.material));mesh.name=`Curated_${source.name}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.visible=true;mesh.frustumCulled=false;for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m)m.visible=true;mesh.userData.assetOwned=true;mesh.userData.sharedAvatarSkeleton=true;mesh.userData.bindPoseTransferred=true;
  target.meshMatrixInAvatar.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.bind(target.skeleton,target.bindMatrix.clone());try{mesh.normalizeSkinWeights();}catch{}
  mesh.updateMorphTargets();
  if(source.morphTargetDictionary&&source.morphTargetInfluences&&mesh.morphTargetDictionary&&mesh.morphTargetInfluences){for(const [name,index] of Object.entries(mesh.morphTargetDictionary)){const src=source.morphTargetDictionary[name];if(src!==undefined)mesh.morphTargetInfluences[index]=source.morphTargetInfluences[src]??0;}}
  return mesh;
}

/**
 * HF14 compatibility rebind for the project's existing authored garment library.
 *
 * These meshes were already authored in the same Qinglan character space.  HF6's full bind-pose
 * vertex transfer is useful for foreign GLBs, but applying it again to these native garments can
 * move the rest geometry into a second body space and make the item effectively disappear inside
 * the avatar.  Preserve the authored geometry/morphs and only remap semantic bone indices to the
 * live avatar skeleton.  This is the proven pre-HF6 display path, isolated behind fitStrategy so
 * new/imported equipment continues to use the modern transfer pipeline.
 */
export function remapSkinPreserveAuthored(source:T.SkinnedMesh,target:CuratedSkinTarget){
  const srcIndex=source.geometry.getAttribute('skinIndex') as T.BufferAttribute|undefined;
  const srcWeight=source.geometry.getAttribute('skinWeight') as T.BufferAttribute|undefined;
  if(!srcIndex||!srcWeight)return undefined;
  const targetByName=new Map<string,number>(),targetByCanonical=new Map<string,number>();
  target.skeleton.bones.forEach((b,i)=>{targetByName.set(b.name,i);const c=canonicalBoneName(b.name);if(c&&!targetByCanonical.has(c))targetByCanonical.set(c,i);});
  const fallback=targetByCanonical.get('Hips')??0;
  const sourceMap=source.skeleton.bones.map(bone=>{
    const exact=targetByName.get(bone.name);if(exact!==undefined)return exact;
    let cur:T.Object3D|null=bone;
    while(cur){const named=targetByName.get(cur.name);if(named!==undefined)return named;const c=canonicalBoneName(cur.name),i=c===undefined?undefined:targetByCanonical.get(c);if(i!==undefined)return i;cur=cur.parent;}
    return fallback;
  });
  const count=srcIndex.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let v=0;v<count;v++){
    const idx=[srcIndex.getX(v),srcIndex.getY(v),srcIndex.getZ(v),srcIndex.getW(v)];
    const wei=[srcWeight.getX(v),srcWeight.getY(v),srcWeight.getZ(v),srcWeight.getW(v)];
    const merged=new Map<number,number>();
    for(let j=0;j<4;j++){const targetIndex=sourceMap[idx[j]]??fallback,w=wei[j]||0;merged.set(targetIndex,(merged.get(targetIndex)??0)+w);}
    const top=[...merged.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);let total=top.reduce((sum,p)=>sum+p[1],0);
    if(total<=1e-6){top.splice(0,top.length,[fallback,1]);total=1;}
    for(let j=0;j<4;j++){const pair=top[j]??[fallback,0];indices[v*4+j]=pair[0];weights[v*4+j]=pair[1]/total;}
  }
  const geometry=source.geometry.clone();geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const mesh=new T.SkinnedMesh(geometry,cloneMaterial(source.material));mesh.name=`CuratedCompat_${source.name}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.visible=true;mesh.frustumCulled=false;for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m)m.visible=true;
  mesh.userData.assetOwned=true;mesh.userData.sharedAvatarSkeleton=true;mesh.userData.bindPoseTransferred=false;mesh.userData.fitStrategy='preserve-authored';
  source.updateWorldMatrix(true,false);source.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.bind(target.skeleton,source.bindMatrix.clone());try{mesh.normalizeSkinWeights();}catch{}
  mesh.updateMorphTargets();
  if(source.morphTargetDictionary&&source.morphTargetInfluences&&mesh.morphTargetDictionary&&mesh.morphTargetInfluences){for(const [name,index] of Object.entries(mesh.morphTargetDictionary)){const src=source.morphTargetDictionary[name];if(src!==undefined)mesh.morphTargetInfluences[index]=source.morphTargetInfluences[src]??0;}}
  return mesh;
}


const ANATOMICAL_CHILD:Readonly<Record<string,string>>={
 Root:'Hips',Hips:'Spine',Spine:'Chest',Chest:'Neck',Neck:'Head',
 LeftShoulder:'LeftUpperArm',LeftUpperArm:'LeftForearm',LeftForearm:'LeftHand',
 RightShoulder:'RightUpperArm',RightUpperArm:'RightForearm',RightForearm:'RightHand',
 LeftThigh:'LeftShin',LeftShin:'LeftFoot',LeftFoot:'LeftToe',
 RightThigh:'RightShin',RightShin:'RightFoot',RightFoot:'RightToe',
};
const ANATOMICAL_PARENT:Readonly<Record<string,string>>=Object.fromEntries(Object.entries(ANATOMICAL_CHILD).map(([parent,child])=>[child,parent]));
interface AnatomicalTransferFrame{sourceOrigin:T.Vector3;targetOrigin:T.Vector3;linear:T.Matrix3;}
const _frameY=new T.Vector3(),_frameZ=new T.Vector3(),_frameX=new T.Vector3();
function anatomicalBasis(origin:T.Vector3,end:T.Vector3){
  const y=_frameY.copy(end).sub(origin);const length=y.length();if(length<1e-6)return undefined;y.multiplyScalar(1/length);
  const z=_frameZ.set(0,0,1).addScaledVector(y,-y.z);if(z.lengthSq()<1e-6)z.set(1,0,0).addScaledVector(y,-y.x);z.normalize();
  const x=_frameX.copy(y).cross(z).normalize();const basis4=new T.Matrix4().makeBasis(x,y,z);return {basis:new T.Matrix3().setFromMatrix4(basis4),length};
}
function skeletonBindOrigins(skeleton:T.Skeleton){
  const byCanonical=new Map<string,{index:number;origin:T.Vector3}>();
  for(let i=0;i<skeleton.bones.length;i++){
    const canonical=canonicalBoneName(skeleton.bones[i].name);if(!canonical||byCanonical.has(canonical))continue;
    const origin=new T.Vector3().setFromMatrixPosition(skeleton.boneInverses[i].clone().invert());byCanonical.set(canonical,{index:i,origin});
  }
  return byCanonical;
}
function transferFrameForBone(source:T.SkinnedMesh,target:CuratedSkinTarget,sourceIndex:number,globalScale:number,sourceOrigins:Map<string,{index:number;origin:T.Vector3}>,targetOrigins:Map<string,{index:number;origin:T.Vector3}>):AnatomicalTransferFrame|undefined{
  const semantic=canonicalBoneName(source.skeleton.bones[sourceIndex]?.name??'');if(!semantic)return undefined;
  const sourceEntry=sourceOrigins.get(semantic),targetEntry=targetOrigins.get(semantic);if(!sourceEntry||!targetEntry)return undefined;
  const child=ANATOMICAL_CHILD[semantic],parent=ANATOMICAL_PARENT[semantic];
  const neighbor=(child&&sourceOrigins.has(child)&&targetOrigins.has(child))?child:(parent&&sourceOrigins.has(parent)&&targetOrigins.has(parent))?parent:undefined;
  if(!neighbor)return undefined;
  const sourceNeighbor=sourceOrigins.get(neighbor)!,targetNeighbor=targetOrigins.get(neighbor)!;
  const sourceFrame=anatomicalBasis(sourceEntry.origin,sourceNeighbor.origin),targetFrame=anatomicalBasis(targetEntry.origin,targetNeighbor.origin);if(!sourceFrame||!targetFrame)return undefined;
  const axial=T.MathUtils.clamp(targetFrame.length/sourceFrame.length,.45,1.45),radial=T.MathUtils.clamp(globalScale,.52,1.12);
  const scale=new T.Matrix3().set(radial,0,0,0,axial,0,0,0,radial),sourceInverse=sourceFrame.basis.clone().transpose(),linear=targetFrame.basis.clone().multiply(scale).multiply(sourceInverse);
  return {sourceOrigin:sourceEntry.origin.clone(),targetOrigin:targetEntry.origin.clone(),linear};
}

/**
 * HF15 anatomical rest-pose transfer.
 *
 * The bundled garments use a different authored humanoid: arms hang downward and left/right axes are
 * opposite the VRM avatar.  Bone names alone are therefore insufficient.  Build an anatomical frame
 * from each limb/torso segment, rotate + scale every weighted vertex into the avatar's bind frame,
 * then share the live avatar bones.  This preserves animation while making sleeves, bracers, boots,
 * belts and robes follow the actual Qinglan proportions instead of floating in the source body shape.
 */
export function remapSkinAnatomical(source:T.SkinnedMesh,target:CuratedSkinTarget){
  const srcIndex=source.geometry.getAttribute('skinIndex') as T.BufferAttribute|undefined,srcWeight=source.geometry.getAttribute('skinWeight') as T.BufferAttribute|undefined,srcPosition=source.geometry.getAttribute('position') as T.BufferAttribute|undefined;
  if(!srcIndex||!srcWeight||!srcPosition)return undefined;
  const targetByName=new Map<string,number>(),targetByCanonical=new Map<string,number>();target.skeleton.bones.forEach((b,i)=>{targetByName.set(b.name,i);const c=canonicalBoneName(b.name);if(c&&!targetByCanonical.has(c))targetByCanonical.set(c,i);});
  const fallback=targetByCanonical.get('Hips')??0,sourceMap=source.skeleton.bones.map(bone=>{const exact=targetByName.get(bone.name);if(exact!==undefined)return exact;let cur:T.Object3D|null=bone;while(cur){const named=targetByName.get(cur.name);if(named!==undefined)return named;const c=canonicalBoneName(cur.name),i=c===undefined?undefined:targetByCanonical.get(c);if(i!==undefined)return i;cur=cur.parent;}return fallback;});
  const sourceOrigins=skeletonBindOrigins(source.skeleton),targetOrigins=skeletonBindOrigins(target.skeleton),sourceHead=sourceOrigins.get('Head')?.origin,sourceHips=sourceOrigins.get('Hips')?.origin,targetHead=targetOrigins.get('Head')?.origin,targetHips=targetOrigins.get('Hips')?.origin;
  const sourceHeight=sourceHead&&sourceHips?sourceHead.distanceTo(sourceHips):0,targetHeight=targetHead&&targetHips?targetHead.distanceTo(targetHips):0,globalScale=sourceHeight>1e-5&&targetHeight>1e-5?T.MathUtils.clamp(targetHeight/sourceHeight,.52,1.12):1;
  const frames=source.skeleton.bones.map((_,sourceIndex)=>transferFrameForBone(source,target,sourceIndex,globalScale,sourceOrigins,targetOrigins));
  const targetBoneBind=target.skeleton.boneInverses.map(inv=>inv.clone().invert()),count=srcIndex.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4),geometry=source.geometry.clone(),positions=new Float32Array(count*3),mappedInfluences:{sourceIndex:number;targetIndex:number;weight:number}[][]=new Array(count);
  const mapPoint=(point:T.Vector3,influence:{sourceIndex:number;targetIndex:number;weight:number},out:T.Vector3)=>{const frame=frames[influence.sourceIndex];if(frame)return out.copy(point).sub(frame.sourceOrigin).applyMatrix3(frame.linear).add(frame.targetOrigin);const sourceInverse=source.skeleton.boneInverses[influence.sourceIndex]??source.skeleton.boneInverses[0],targetBind=targetBoneBind[influence.targetIndex]??targetBoneBind[fallback];return transferBindPoint(point,source.bindMatrix,sourceInverse,targetBind,target.bindMatrixInverse,out);};
  const mapDelta=(delta:T.Vector3,influence:{sourceIndex:number;targetIndex:number;weight:number},out:T.Vector3)=>{const frame=frames[influence.sourceIndex];if(frame)return out.copy(delta).applyMatrix3(frame.linear);const sourceInverse=source.skeleton.boneInverses[influence.sourceIndex]??source.skeleton.boneInverses[0],targetBind=targetBoneBind[influence.targetIndex]??targetBoneBind[fallback];return transferBindDelta(delta,source.bindMatrix,sourceInverse,targetBind,target.bindMatrixInverse,out);};
  for(let v=0;v<count;v++){
    const idx=[srcIndex.getX(v),srcIndex.getY(v),srcIndex.getZ(v),srcIndex.getW(v)],wei=[srcWeight.getX(v),srcWeight.getY(v),srcWeight.getZ(v),srcWeight.getW(v)],merged=new Map<number,number>(),raw:{sourceIndex:number;targetIndex:number;weight:number}[]=[];
    for(let j=0;j<4;j++){const sourceIndex=idx[j]??0,targetIndex=sourceMap[sourceIndex]??fallback,w=wei[j]||0;if(w<=0)continue;merged.set(targetIndex,(merged.get(targetIndex)??0)+w);raw.push({sourceIndex,targetIndex,weight:w});}
    const top=[...merged.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);let total=top.reduce((sum,p)=>sum+p[1],0);if(total<=1e-6){top.splice(0,top.length,[fallback,1]);total=1;}for(let j=0;j<4;j++){const pair=top[j]??[fallback,0];indices[v*4+j]=pair[0];weights[v*4+j]=pair[1]/total;}
    const rawTotal=raw.reduce((sum,p)=>sum+p.weight,0)||1;mappedInfluences[v]=raw.map(p=>({...p,weight:p.weight/rawTotal}));_bindPoint.fromBufferAttribute(srcPosition,v);_weightedBindPoint.set(0,0,0);for(const influence of mappedInfluences[v])_weightedBindPoint.addScaledVector(mapPoint(_bindPoint,influence,_boneLocal),influence.weight);positions[v*3]=_weightedBindPoint.x;positions[v*3+1]=_weightedBindPoint.y;positions[v*3+2]=_weightedBindPoint.z;
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const morphPositions=geometry.morphAttributes.position as T.BufferAttribute[]|undefined,sourceMorphPositions=source.geometry.morphAttributes.position as T.BufferAttribute[]|undefined;if(morphPositions&&sourceMorphPositions){for(let m=0;m<morphPositions.length;m++){const srcMorph=sourceMorphPositions[m];if(!srcMorph||srcMorph.count!==count)continue;const dst=new Float32Array(count*3);for(let v=0;v<count;v++){_bindPoint.fromBufferAttribute(srcMorph,v);_weightedBindPoint.set(0,0,0);for(const influence of mappedInfluences[v])_weightedBindPoint.addScaledVector(source.geometry.morphTargetsRelative?mapDelta(_bindPoint,influence,_tmpVec):mapPoint(_bindPoint,influence,_tmpVec),influence.weight);dst[v*3]=_weightedBindPoint.x;dst[v*3+1]=_weightedBindPoint.y;dst[v*3+2]=_weightedBindPoint.z;}const attr=new T.Float32BufferAttribute(dst,3);attr.name=srcMorph.name;morphPositions[m]=attr;}}
  if(geometry.getIndex())geometry.computeVertexNormals();const mesh=new T.SkinnedMesh(geometry,cloneMaterial(source.material));mesh.name=`CuratedAnatomical_${source.name}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.visible=true;mesh.frustumCulled=false;for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m)m.visible=true;mesh.userData.assetOwned=true;mesh.userData.sharedAvatarSkeleton=true;mesh.userData.bindPoseTransferred=true;mesh.userData.fitStrategy='anatomical-transfer';target.meshMatrixInAvatar.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.bind(target.skeleton,target.bindMatrix.clone());try{mesh.normalizeSkinWeights();}catch{}mesh.updateMorphTargets();if(source.morphTargetDictionary&&source.morphTargetInfluences&&mesh.morphTargetDictionary&&mesh.morphTargetInfluences){for(const [name,index] of Object.entries(mesh.morphTargetDictionary)){const src=source.morphTargetDictionary[name];if(src!==undefined)mesh.morphTargetInfluences[index]=source.morphTargetInfluences[src]??0;}}return mesh;
}

function gripPivot(root:T.Object3D,bladeAxis:'positiveY'|'negativeY',gripMode:'end'|'center'='end'){
  root.updateMatrixWorld(true);const points:T.Vector3[]=[];
  // R22: a named physical handle beats a geometric center even for center-grip weapons such as bows.
  root.traverse(o=>{if(!(o instanceof T.Mesh))return;const mats=Array.isArray(o.material)?o.material:[o.material];const label=[o.name,...mats.map(m=>m.name)].join(' ');if(!/(grip|handle|hilt|guard|pommel)/i.test(label))return;const b=new T.Box3().setFromObject(o);if(!b.isEmpty())points.push(b.getCenter(new T.Vector3()));});
  if(points.length){const p=new T.Vector3();for(const x of points)p.add(x);return p.multiplyScalar(1/points.length);}
  const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  if(gripMode==='center')return center;
  // No named grip (user-supplied magic sword). Estimate the hilt at the short end opposite the blade.
  center.y=bladeAxis==='positiveY'?box.min.y+size.y*.12:box.max.y-size.y*.12;return center;
}

function normalizeCentered(root:T.Object3D,def:CuratedEquipmentDefinition){
  const holder=new T.Group();holder.name=`CuratedCentered_${def.itemId}`;holder.add(root);
  root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),sourceSize=Math.max(size.x,size.y,size.z,.001),scale=(def.targetSize??.6)/sourceSize;root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);const fitted=new T.Box3().setFromObject(root),center=fitted.getCenter(new T.Vector3());holder.worldToLocal(center);root.position.sub(center);
  return holder;
}

function installShieldGrip(holder:T.Object3D,def:CuratedEquipmentDefinition){
  const grip=def.shieldGrip;if(!grip)return;
  // Keep the holder origin at the actual handle. Move the plate away from the palm in final mount-space
  // even when the source GLB needs a corrective local rotation.
  const correction=new T.Quaternion().setFromEuler(new T.Euler(...(def.localRotation??[0,0,0])));
  const preRotatedOffset=new T.Vector3(0,0,grip.plateOffset).applyQuaternion(correction.clone().invert());
  for(const child of holder.children)child.position.add(preRotatedOffset);
  const geometry=new T.CylinderGeometry(grip.handleRadius,grip.handleRadius,grip.handleLength,10);
  const material=new T.MeshStandardMaterial({color:0x2d3034,roughness:.72,metalness:.38});
  const handle=new T.Mesh(geometry,material);handle.name=`ShieldGrip_${def.itemId}`;handle.castShadow=false;handle.receiveShadow=true;handle.userData.assetOwned=true;holder.add(handle);
}

function normalizeWeapon(root:T.Object3D,def:CuratedEquipmentDefinition){
  const holder=new T.Group();holder.name=`CuratedWeapon_${def.itemId}`;holder.add(root);
  root.updateMatrixWorld(true);let box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
  if(def.autoOrientWeapon){if(size.x>=size.y&&size.x>=size.z)root.rotation.z+=Math.PI/2;else if(size.z>size.y&&size.z>size.x)root.rotation.x-=Math.PI/2;root.updateMatrixWorld(true);box=new T.Box3().setFromObject(root);size=box.getSize(new T.Vector3());}
  const sourceLength=Math.max(size.y,size.x,size.z,.001);const scale=(def.targetLength??1.2)/sourceLength;root.scale.multiplyScalar(scale);
  if(def.bladeAxis==='negativeY')root.rotation.z+=Math.PI;
  root.updateMatrixWorld(true);const pivot=gripPivot(root,def.bladeAxis??'positiveY',def.gripMode??'end');holder.worldToLocal(pivot);root.position.sub(pivot);
  return holder;
}


function tintWearable(root:T.Object3D,ap:Appearance){
 const tint=new T.Color(ap.color),trim=new T.Color(ap.trim);let materialIndex=0;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const material of mats){const m=material as T.MeshStandardMaterial;if(!m.color)continue;const target=materialIndex++%4===0?trim:tint;m.color.lerp(target,.72);if('roughness' in m)m.roughness=T.MathUtils.clamp(m.roughness??.6,.32,.92);m.needsUpdate=true;}});
}

function existingMorphNames(geometry:T.BufferGeometry){return new Set((geometry.morphAttributes.position as T.BufferAttribute[]|undefined)?.map(a=>a.name).filter(Boolean)??[]);}
function semanticResidual(name:string,p:T.Vector3,center:T.Vector3,out:T.Vector3){
 const d=out.copy(p).sub(center),radial=Math.hypot(d.x,d.z)||1;out.set(0,0,0);
 if(/BodyMass|BodyMuscle/.test(name))out.set(d.x/radial*.005,0,d.z/radial*.005);
 else if(/ShoulderWidth|ChestWidth|WaistWidth|HipWidth/.test(name))out.x=Math.sign(d.x||1)*.006;
 else if(/ChestDepth|WaistDepth|HipDepth/.test(name))out.z=Math.sign(d.z||1)*.006;
 else if(/ForearmThickness|UpperArmThickness|ThighThickness|CalfThickness/.test(name))out.set(d.x/radial*.0045,0,d.z/radial*.0045);
 return out;
}
function appendMorph(geometry:T.BufferGeometry,name:string,delta:Float32Array){
 const pos=geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!pos)return;
 const data=new Float32Array(delta.length);
 if(geometry.morphTargetsRelative)data.set(delta);else for(let i=0;i<pos.count;i++){data[i*3]=pos.getX(i)+delta[i*3];data[i*3+1]=pos.getY(i)+delta[i*3+1];data[i*3+2]=pos.getZ(i)+delta[i*3+2];}
 const attr=new T.Float32BufferAttribute(data,3);attr.name=name;const attrs=[...((geometry.morphAttributes.position as T.BufferAttribute[]|undefined)??[])];attrs.push(attr);geometry.morphAttributes.position=attrs;
}
function ensureStandardMorphTargets(mesh:T.SkinnedMesh,slot:Slot){
 const geometry=mesh.geometry,pos=geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!pos)return 0;const wanted=garmentMorphNames(slot),existing=existingMorphNames(geometry);if(!wanted.length)return 0;
 geometry.computeBoundingBox();const center=geometry.boundingBox?.getCenter(new T.Vector3())??new T.Vector3();let added=0,p=new T.Vector3(),d=new T.Vector3();
 for(const name of wanted){if(existing.has(name))continue;const data=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);semanticResidual(name,p,center,d);data[i*3]=d.x;data[i*3+1]=d.y;data[i*3+2]=d.z;}appendMorph(geometry,name,data);added++;}
 if(added)mesh.updateMorphTargets();return added;
}
function nearbySurface(surface:GarmentBodySurface,p:T.Vector3,radius:number){
 const cell=surface.cellSize,range=Math.max(1,Math.ceil(radius/cell)),cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell),cz=Math.floor(p.z/cell);let best=-1,bestD2=radius*radius;
 for(let x=-range;x<=range;x++)for(let y=-range;y<=range;y++)for(let z=-range;z<=range;z++){const bucket=surface.cells.get(`${cx+x},${cy+y},${cz+z}`);if(!bucket)continue;for(const i of bucket){const dx=p.x-surface.positions[i*3],dy=p.y-surface.positions[i*3+1],dz=p.z-surface.positions[i*3+2],d2=dx*dx+dy*dy+dz*dz;if(d2<bestD2){bestD2=d2;best=i;}}}
 return best;
}
export interface GarmentClearanceReport{vertices:number;adjusted:number;maxCorrection:number;meanCorrection:number;}
export function applyGarmentClearanceMorph(mesh:T.SkinnedMesh,target:CuratedSkinTarget,slot:Slot):GarmentClearanceReport{
 const pos=mesh.geometry.getAttribute('position') as T.BufferAttribute|undefined,surface=target.surface,safety=garmentFitSafety(slot);if(!pos||!surface)return {vertices:pos?.count??0,adjusted:0,maxCorrection:0,meanCorrection:0};
 const existing=existingMorphNames(mesh.geometry);if(existing.has(HF8_CLEARANCE_MORPH))return {vertices:pos.count,adjusted:0,maxCorrection:0,meanCorrection:0};
 const delta=new Float32Array(pos.count*3),p=new T.Vector3(),n=new T.Vector3(),q=new T.Vector3();let adjusted=0,maxCorrection=0,total=0;
 for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);const j=nearbySurface(surface,p,safety.searchRadius);if(j<0)continue;q.set(surface.positions[j*3],surface.positions[j*3+1],surface.positions[j*3+2]);n.set(surface.normals[j*3],surface.normals[j*3+1],surface.normals[j*3+2]).normalize();const signed=p.clone().sub(q).dot(n);if(signed>=safety.clearance)continue;const correction=Math.min(safety.maxCorrection,safety.clearance-signed);if(correction<=1e-5)continue;delta[i*3]=n.x*correction;delta[i*3+1]=n.y*correction;delta[i*3+2]=n.z*correction;adjusted++;maxCorrection=Math.max(maxCorrection,correction);total+=correction;}
 if(adjusted){appendMorph(mesh.geometry,HF8_CLEARANCE_MORPH,delta);mesh.updateMorphTargets();const index=mesh.morphTargetDictionary?.[HF8_CLEARANCE_MORPH];if(index!==undefined&&mesh.morphTargetInfluences)mesh.morphTargetInfluences[index]=1;}
 const report={vertices:pos.count,adjusted,maxCorrection,meanCorrection:adjusted?total/adjusted:0};mesh.userData.fitClearance=report;return report;
}
function finalizeGarmentMesh(mesh:T.SkinnedMesh,target:CuratedSkinTarget,slot:Slot){const addedMorphs=ensureStandardMorphTargets(mesh,slot),clearance=applyGarmentClearanceMorph(mesh,target,slot);mesh.userData.fitPipeline='HF8';mesh.userData.fitStandardMorphsAdded=addedMorphs;mesh.userData.fitClearance=clearance;return mesh;}
function finalizePreservedGarmentMesh(mesh:T.SkinnedMesh,target:CuratedSkinTarget,slot:Slot){const addedMorphs=ensureStandardMorphTargets(mesh,slot),clearance=applyGarmentClearanceMorph(mesh,target,slot);mesh.userData.fitPipeline='HF14-compat';mesh.userData.fitStandardMorphsAdded=addedMorphs;mesh.userData.fitClearance=clearance;return mesh;}
function finalizeAnatomicalGarmentMesh(mesh:T.SkinnedMesh,target:CuratedSkinTarget,slot:Slot){const addedMorphs=ensureStandardMorphTargets(mesh,slot),clearance=applyGarmentClearanceMorph(mesh,target,slot);mesh.userData.fitPipeline='HF15-anatomical';mesh.userData.fitStandardMorphsAdded=addedMorphs;mesh.userData.fitClearance=clearance;return mesh;}

function bodyRegion(target:CuratedSkinTarget,slot:Slot){
 const box=target.surface?.bounds.clone()??new T.Box3(new T.Vector3(-.4,0,-.25),new T.Vector3(.4,1.9,.25)),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),h=size.y||1.9;
 const region=(y:number,height:number,width:number,depth:number)=>({center:new T.Vector3(center.x,box.min.y+h*y,center.z),size:new T.Vector3(size.x*width,h*height,Math.max(size.z,.25)*depth)});
 if(slot==='shoulders')return region(.78,.18,1.18,1.05);if(slot==='chest')return region(.63,.40,1.05,1.05);if(slot==='fashion')return region(.53,.78,1.08,1.08);if(slot==='wrists')return region(.57,.32,1.20,1.0);if(slot==='hands')return region(.48,.28,1.28,1.0);if(slot==='waist')return region(.48,.20,1.04,1.05);if(slot==='legs')return region(.29,.52,1.0,1.0);if(slot==='feet')return region(.08,.18,1.02,1.0);if(slot==='cape')return region(.55,.72,1.10,1.12);return region(.5,.5,1,1);
}
function targetBoneLocalPositions(target:CuratedSkinTarget,slot:Slot){const wanted=new Set(autoRigBoneNames(slot)),rows:{index:number;position:T.Vector3}[]=[];for(let i=0;i<target.skeleton.bones.length;i++){const c=canonicalBoneName(target.skeleton.bones[i].name);if(!c||!wanted.has(c))continue;const bind=target.skeleton.boneInverses[i].clone().invert();rows.push({index:i,position:new T.Vector3().applyMatrix4(bind).applyMatrix4(target.bindMatrixInverse)});}return rows;}
function autoRigRigidMesh(source:T.Mesh,normalizer:T.Matrix4,target:CuratedSkinTarget,slot:Slot){
 const sourcePos=source.geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!sourcePos)return undefined;const bones=targetBoneLocalPositions(target,slot);if(!bones.length)return undefined;source.updateWorldMatrix(true,false);const geometry=source.geometry.clone(),positions=new Float32Array(sourcePos.count*3),indices=new Uint16Array(sourcePos.count*4),weights=new Float32Array(sourcePos.count*4),p=new T.Vector3();
 for(let i=0;i<sourcePos.count;i++){p.fromBufferAttribute(sourcePos,i).applyMatrix4(source.matrixWorld).applyMatrix4(normalizer);positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;const ranked=bones.map(b=>({index:b.index,d2:Math.max(1e-5,p.distanceToSquared(b.position))})).sort((a,b)=>a.d2-b.d2).slice(0,4),raw=ranked.map(x=>1/x.d2),sum=raw.reduce((a,b)=>a+b,0)||1;for(let j=0;j<4;j++){indices[i*4+j]=ranked[j]?.index??ranked[0].index;weights[i*4+j]=(raw[j]??0)/sum;}}
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));if(geometry.getIndex())geometry.computeVertexNormals();const mesh=new T.SkinnedMesh(geometry,cloneMaterial(source.material));target.meshMatrixInAvatar.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.name=`HF8AutoRig_${source.name||slot}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.visible=true;mesh.frustumCulled=false;for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m)m.visible=true;mesh.userData.assetOwned=true;mesh.userData.sharedAvatarSkeleton=true;mesh.userData.bindPoseTransferred=true;mesh.userData.autoRiggedRigid=true;mesh.bind(target.skeleton,target.bindMatrix.clone());try{mesh.normalizeSkinWeights();}catch{}mesh.updateMorphTargets();return finalizeGarmentMesh(mesh,target,slot);
}
function autoRigRigidWearable(root:T.Object3D,target:CuratedSkinTarget,slot:Slot){
 root.updateMatrixWorld(true);const sourceBox=new T.Box3().setFromObject(root),sourceSize=sourceBox.getSize(new T.Vector3()),sourceCenter=sourceBox.getCenter(new T.Vector3()),region=bodyRegion(target,slot),scale=Math.min(region.size.x/Math.max(.001,sourceSize.x),region.size.y/Math.max(.001,sourceSize.y),region.size.z/Math.max(.001,sourceSize.z));const normalizer=new T.Matrix4().makeTranslation(region.center.x,region.center.y,region.center.z).multiply(new T.Matrix4().makeScale(scale,scale,scale)).multiply(new T.Matrix4().makeTranslation(-sourceCenter.x,-sourceCenter.y,-sourceCenter.z));const group=new T.Group();group.name=`HF8AutoRig_${slot}`;root.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.SkinnedMesh)return;const mesh=autoRigRigidMesh(o,normalizer,target,slot);if(mesh)group.add(mesh);});return group.children.length?group:undefined;
}
function canonicalIndex(target:CuratedSkinTarget,name:string){for(let i=0;i<target.skeleton.bones.length;i++)if(canonicalBoneName(target.skeleton.bones[i].name)===name)return i;return target.skeleton.bones.findIndex(b=>b.name===name);}

function generatedResidualMorphs(geometry:T.BufferGeometry,anchorLocal:T.Vector3,names:readonly string[]){
 const pos=geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!pos||!names.length)return;geometry.morphTargetsRelative=true;const attrs:T.BufferAttribute[]=[];
 for(const name of names){const data=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){_tmpVec.fromBufferAttribute(pos,i).sub(anchorLocal);let dx=0,dy=0,dz=0;const radial=Math.hypot(_tmpVec.x,_tmpVec.z)||1;
   if(/BodyMass|BodyMuscle/.test(name)){dx=_tmpVec.x/radial*.006;dz=_tmpVec.z/radial*.006;}
   else if(/ShoulderWidth|ChestWidth|WaistWidth|HipWidth/.test(name))dx=Math.sign(_tmpVec.x||1)*.007;
   else if(/ChestDepth|WaistDepth|HipDepth/.test(name))dz=Math.sign(_tmpVec.z||1)*.007;
   else if(/ForearmThickness|UpperArmThickness|ThighThickness|CalfThickness/.test(name)){dx=_tmpVec.x/radial*.005;dz=_tmpVec.z/radial*.005;}
   data[i*3]=dx;data[i*3+1]=dy;data[i*3+2]=dz;}
  const attr=new T.Float32BufferAttribute(data,3);attr.name=name;attrs.push(attr);}
 geometry.morphAttributes.position=attrs;
}
function skinnedFromGeneratedMesh(source:T.Mesh,target:CuratedSkinTarget,anchorCanonical:string,morphNames:readonly string[],secondaryCanonical?:string){
 const anchor=canonicalIndex(target,anchorCanonical),secondary=secondaryCanonical?canonicalIndex(target,secondaryCanonical):-1;if(anchor<0)return undefined;const anchorBind=target.skeleton.boneInverses[anchor].clone().invert(),anchorLocal=new T.Vector3().applyMatrix4(anchorBind).applyMatrix4(target.bindMatrixInverse);
 const g=source.geometry.clone();source.updateWorldMatrix(true,false);const pos=g.getAttribute('position') as T.BufferAttribute|undefined;if(!pos)return undefined;const out=new Float32Array(pos.count*3),indices=new Uint16Array(pos.count*4),weights=new Float32Array(pos.count*4);
 for(let i=0;i<pos.count;i++){_bindPoint.fromBufferAttribute(pos,i).applyMatrix4(source.matrixWorld);const localY=_bindPoint.y;_bindPoint.applyMatrix4(anchorBind).applyMatrix4(target.bindMatrixInverse);out[i*3]=_bindPoint.x;out[i*3+1]=_bindPoint.y;out[i*3+2]=_bindPoint.z;let secondaryWeight=0;if(secondary>=0)secondaryWeight=T.MathUtils.clamp((-localY-.05)/1.25,0,.58);indices[i*4]=anchor;weights[i*4]=1-secondaryWeight;if(secondary>=0){indices[i*4+1]=secondary;weights[i*4+1]=secondaryWeight;}}
 g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));generatedResidualMorphs(g,anchorLocal,morphNames);if(g.getIndex())g.computeVertexNormals();
 const mesh=new T.SkinnedMesh(g,cloneMaterial(source.material));target.meshMatrixInAvatar.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.name=`HF8Generated_${source.name||anchorCanonical}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.visible=true;mesh.frustumCulled=false;for(const m of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(m)m.visible=true;mesh.userData.assetOwned=true;mesh.userData.sharedAvatarSkeleton=true;mesh.userData.bindPoseTransferred=true;mesh.userData.generatedFit=true;mesh.userData.fitPipeline='HF8';mesh.bind(target.skeleton,target.bindMatrix.clone());try{mesh.normalizeSkinWeights();}catch{}mesh.updateMorphTargets();return mesh;
}
function generatedMeshesFor(ap:Appearance,target:CuratedSkinTarget){const out:T.SkinnedMesh[]=[];
 const convert=(group:T.Group,anchor:string,morphs:readonly string[],secondary?:string)=>{group.updateMatrixWorld(true);group.traverse(o=>{if(!(o instanceof T.Mesh))return;const mesh=skinnedFromGeneratedMesh(o,target,anchor,morphs,secondary);if(mesh)out.push(mesh);});};
 if(ap.slot==='shoulders'){for(const [side,anchor] of [[-1,'LeftShoulder'],[1,'RightShoulder']] as const)convert(armorModel(ap,side),anchor,['BodyMass','BodyMuscle','ShoulderWidth','UpperArmThickness'],'Chest');}
 else if(ap.slot==='hands'){for(const [side,anchor] of [[-1,'LeftHand'],[1,'RightHand']] as const)convert(armorModel(ap,side),anchor,['BodyMass','BodyMuscle','ForearmThickness']);}
 else if(ap.slot==='cape')convert(armorModel(ap),'Chest',['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','HipWidth'],'Hips');
 return out;
}
function instantiateGeneratedSkinnedWearable(itemId:string,ap:Appearance,target:CuratedSkinTarget){const group=new T.Group();group.name=`HF8GeneratedSkin_${itemId}`;for(const mesh of generatedMeshesFor(ap,target)){finalizeGarmentMesh(mesh,target,ap.slot);group.add(mesh);}if(!group.children.length)throw new Error(`HF8 could not generate a skinned wearable for ${itemId}/${ap.slot}`);tintWearable(group,ap);applyHF265EquipmentArtDirection(group,itemId,ap.slot);group.userData.fitPipeline='HF8';group.userData.fitStrategy='generated-skinned';group.userData.fitTemplate='procedural-skin';return group;}

export async function instantiateCuratedEquipment(itemId:string,targetSkin?:CuratedSkinTarget){
  const def=curatedEquipmentDefinition(itemId);if(!def)return undefined;
  const ap=appearanceFor(itemId);
  if(def.mode==='generated-skinned'){if(!targetSkin||!ap)throw new Error(`Target skin/appearance missing for generated-fit ${itemId}`);const object=instantiateGeneratedSkinnedWearable(itemId,ap,targetSkin);return {definition:def,object};}
  const gltf=await load(def.url);
  if(def.mode==='skinned'||def.mode==='auto-fit'){
    if(!targetSkin)throw new Error(`Target skin missing for fitted ${itemId}`);
    if(!ap)throw new Error(`Appearance missing for fitted ${itemId}`);
    const source=SkeletonUtils.clone(gltf.scene);source.updateMatrixWorld(true);const group=new T.Group();group.name=`HF8Fit_${itemId}`;let skinned=0,autoRigged=0;
    source.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;const strategy=def.fitStrategy??'bind-transfer',rebound=strategy==='preserve-authored'?remapSkinPreserveAuthored(o,targetSkin):strategy==='anatomical-transfer'?remapSkinAnatomical(o,targetSkin):remapSkin(o,targetSkin);if(rebound){if(strategy==='preserve-authored')finalizePreservedGarmentMesh(rebound,targetSkin,def.slot);else if(strategy==='anatomical-transfer')finalizeAnatomicalGarmentMesh(rebound,targetSkin,def.slot);else finalizeGarmentMesh(rebound,targetSkin,def.slot);group.add(rebound);skinned++;}});
    if(def.mode==='auto-fit'){const rigid=autoRigRigidWearable(source,targetSkin,def.slot);if(rigid){for(const child of [...rigid.children]){group.add(child);autoRigged++;}}}
    if(!skinned&&!autoRigged)throw new Error(`No fit-compatible Mesh in ${def.url}`);
    if(def.tintFromItem)tintWearable(group,ap);
    applyHF265EquipmentArtDirection(group,itemId,def.slot);
    group.userData.fitPipeline=def.fitStrategy==='preserve-authored'?'HF14-compat':def.fitStrategy==='anatomical-transfer'?'HF15-anatomical':'HF8';group.userData.fitStrategy=def.fitStrategy==='preserve-authored'?'preserve-authored':def.fitStrategy==='anatomical-transfer'?'anatomical-transfer':def.mode==='auto-fit'?(skinned?'auto-module-skinned':'auto-module-rigid-autorig'):def.templateItemId?'skinned-template':'authored-skinned';group.userData.fitTemplate=def.templateItemId??itemId;group.userData.fitQa={skinned,autoRigged,slot:def.slot,url:def.url};
    return {definition:def,object:group};
  }
  let object=cloneRigid(gltf.scene);
  if(def.fitMode==='center')object=normalizeCentered(object,def);else if(def.slot==='mainhand'||def.slot==='offhand')object=normalizeWeapon(object,def);
  installShieldGrip(object,def);
  if(def.localScale)object.scale.multiplyScalar(def.localScale);
  if(def.localRotation)object.rotation.set(...def.localRotation);
  if(def.localOffset)object.position.set(...def.localOffset);
  object.name=`CuratedRigid_${itemId}`;
  applyHF265EquipmentArtDirection(object,itemId,def.slot);
  return {definition:def,object};
}
