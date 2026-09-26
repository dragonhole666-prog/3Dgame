import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HF265_NATURE_PLACEMENTS,hf265TerrainHeight,type HF265Placement,type HF265NatureAsset } from '../../shared/data/hf265-world-layout';
import { quaterniusNatureUrl } from '../assets/quaternius-asset-registry';
import { hf265NatureMaterial } from '../rendering/hf265-nature-materials';

type Detail='low'|'balanced'|'high';
const loader=new GLTFLoader().setCrossOrigin('anonymous');
const cache=new Map<string,Promise<T.Object3D>>();
function loadUrl(url:string){let p=cache.get(url);if(p)return p;p=loader.loadAsync(url).then(g=>g.scene);cache.set(url,p);return p;}
async function loadAsset(id:HF265NatureAsset){
 const urls=quaterniusNatureUrl(id as any);
 try{return await loadUrl(urls.local);}catch(localError){try{return await loadUrl(urls.remote);}catch(remoteError){console.info(`[HF26.5] Quaternius ${id} unavailable`,{localError,remoteError});throw remoteError;}}
}
function normalizedScale(source:T.Object3D,targetHeight:number){source.updateMatrixWorld(true);const box=new T.Box3().setFromObject(source),size=new T.Vector3();box.getSize(size);return targetHeight/Math.max(.001,size.y);}
function placementMatrix(p:HF265Placement,scale:number){
 const y=hf265TerrainHeight(p.x,p.z),q=new T.Quaternion().setFromEuler(new T.Euler(0,p.rotationY,0)),s=new T.Vector3(scale,scale,scale);return new T.Matrix4().compose(new T.Vector3(p.x,y,p.z),q,s);
}
function fallbackProp(p:HF265Placement){
 const root=new T.Group(),tint=p.tint==='coral'?'#C9684F':p.tint==='peach'?'#E7A184':p.tint==='stone'?'#A6A198':p.tint==='cool'?'#647E83':'#76815F';
 if(p.asset.includes('tree')||p.asset.includes('pine')){
  const wood=new T.MeshStandardMaterial({color:'#765244',roughness:.86}),leaf=new T.MeshStandardMaterial({color:tint,roughness:.78});
  const trunk=new T.Mesh(new T.CylinderGeometry(.22,.34,p.height*.42,8),wood);trunk.position.y=p.height*.21;const crown=new T.Mesh(new T.IcosahedronGeometry(p.height*.24,2),leaf);crown.scale.set(1.35,.8,1.15);crown.position.y=p.height*.62;root.add(trunk,crown);
 }else if(p.asset.startsWith('rock')){
  const stone=new T.MeshStandardMaterial({color:'#A6A198',roughness:.86});const rock=new T.Mesh(new T.DodecahedronGeometry(p.height*.48,1),stone);rock.scale.set(1.28,.72,1.0);rock.position.y=p.height*.34;root.add(rock);
 }else{
  const foliage=new T.MeshStandardMaterial({color:tint,roughness:.78,side:T.DoubleSide});const crown=new T.Mesh(new T.IcosahedronGeometry(Math.max(.18,p.height*.35),1),foliage);crown.scale.set(1.35,.7,1.1);crown.position.y=p.height*.34;root.add(crown);
 }
 root.position.set(p.x,hf265TerrainHeight(p.x,p.z),p.z);root.rotation.y=p.rotationY;return root;
}

export class HF265QuaterniusNatureLayer{
 readonly root=new T.Group();private detail:Detail;private disposed=false;private groups:Record<string,T.Group>={};
 constructor(parent:T.Object3D,detail:Detail){this.detail=detail;this.root.name='HF265_Quaternius_Nature_CC0';parent.add(this.root);void this.init();}
 private async init(){
  // Group by asset + art-direction tint so coral/peach/sage variants do not share a single material.
  const batches=new Map<string,{asset:HF265NatureAsset;placements:HF265Placement[]}>();
  for(const p of HF265_NATURE_PLACEMENTS){const key=`${p.asset}:${p.tint??'sage'}`,batch=batches.get(key)??{asset:p.asset,placements:[]};batch.placements.push(p);batches.set(key,batch);}
  await Promise.allSettled([...batches.entries()].map(async([batchKey,batch])=>{
   const {asset,placements}=batch,group=new T.Group();group.name=`HF265_Q_${batchKey.replace(':','_')}`;this.groups[batchKey]=group;this.root.add(group);
   try{
    const source=await loadAsset(asset);if(this.disposed)return;source.updateMatrixWorld(true);const scaleRef=normalizedScale(source,1);
    const meshes:T.Mesh[]=[];source.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
    for(const src of meshes){
      src.updateWorldMatrix(true,false);const mats=Array.isArray(src.material)?src.material:[src.material];
      // Quaternius Standard nature models in this pack use one material per mesh in practice.
      const baseMat=mats[0]??new T.MeshStandardMaterial({color:'#888'});
      const instanced=new T.InstancedMesh(src.geometry,baseMat.clone(),placements.length);instanced.name=`HF265_Instanced_${asset}_${src.name||'mesh'}`;instanced.castShadow=this.detail==='high';instanced.receiveShadow=true;instanced.frustumCulled=true;
      const meshLocal=src.matrixWorld.clone();
      placements.forEach((p,i)=>{const scale=scaleRef*p.height,world=placementMatrix(p,scale),m=new T.Matrix4().multiplyMatrices(world,meshLocal);instanced.setMatrixAt(i,m);});
      instanced.instanceMatrix.needsUpdate=true;
      // Mesh-wide material uses representative placement tint. Hero trees are split by asset/tint families in layout.
      instanced.material=hf265NatureMaterial(baseMat,placements[0],asset);group.add(instanced);
    }
   }catch{for(const p of placements)group.add(fallbackProp(p));}
  }));
  this.setDetail(this.detail);
 }
 setDetail(detail:Detail){this.detail=detail;for(const g of Object.values(this.groups)){const low=/flower|grass|bush/.test(g.name);g.visible=detail!=='low'||!low;g.traverse(o=>{if(o instanceof T.InstancedMesh)o.castShadow=detail==='high';});}}
 dispose(){this.disposed=true;this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
