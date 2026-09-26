import * as T from 'three';
import { WORLD } from '../../shared/data/world';
import { HF265_COLLIDERS,hf265TerrainHeight } from '../../shared/data/hf265-world-layout';
import { createXianxiaGradientSky } from '../rendering/xianxia-visual-style';
import { HF265Terrain } from './hf265-terrain';
import { HF265QuaterniusNatureLayer } from './hf265-quaternius-nature-layer';
import { HF265ArchitectureLayer } from './hf265-architecture-layer';
import { HF265WaterLayer } from './hf265-water-layer';
import { HF265Atmosphere } from './hf265-atmosphere';
import { HF265HorizonMountains } from './hf265-horizon-mountains';

/** HF26.5 Visual Reboot: no uploaded legacy world GLB, no legacy forest layer. */
export class WorldRenderer{
 readonly root=new T.Group();
 terrain:T.Mesh;
 collision:T.Object3D[]=[];
 private terrainLayer:HF265Terrain;
 private nature:HF265QuaterniusNatureLayer;
 private architecture:HF265ArchitectureLayer;
 private water:HF265WaterLayer;
 private atmosphere:HF265Atmosphere;
 private horizon:HF265HorizonMountains;
 private cameraCollision:T.InstancedMesh;
 private detail:'low'|'balanced'|'high';

 constructor(scene:T.Scene,initialDetail:'low'|'balanced'|'high'='balanced'){
  this.detail=initialDetail;this.root.name='HF265_Visual_Reboot_World';scene.add(this.root);this.root.add(createXianxiaGradientSky());
  this.terrainLayer=new HF265Terrain(this.root);this.terrain=this.terrainLayer.raycastSurface;
  this.nature=new HF265QuaterniusNatureLayer(this.root,initialDetail);
  this.architecture=new HF265ArchitectureLayer(this.root,initialDetail);
  this.water=new HF265WaterLayer(this.root,initialDetail);
  this.atmosphere=new HF265Atmosphere(this.root,initialDetail);
  this.horizon=new HF265HorizonMountains(this.root,initialDetail);

  const box=new T.BoxGeometry(1,1,1),mat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
  this.cameraCollision=new T.InstancedMesh(box,mat,HF265_COLLIDERS.length);this.cameraCollision.name='HF265_Camera_Collision';const d=new T.Object3D();
  HF265_COLLIDERS.forEach((c,i)=>{const h=c.kind==='tree'?7:c.kind==='pavilion'?5:2.8;d.position.set(c.x,hf265TerrainHeight(c.x,c.z)+h*.5,c.z);d.scale.set(c.r*2,h,c.r*2);d.rotation.set(0,0,0);d.updateMatrix();this.cameraCollision.setMatrixAt(i,d.matrix);});this.cameraCollision.instanceMatrix.needsUpdate=true;this.root.add(this.cameraCollision);this.collision=[this.cameraCollision];
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('qinglan-map-ready',{detail:{source:'hf265-visual-reboot',collision:`${HF265_COLLIDERS.length} shared authored colliders`,terrain:'HF26.5 procedural terrain + Quaternius CC0 nature'}}));
 }
 update(_position:{x:number;z:number},time:number){this.water.update(time);this.atmosphere.update(time);this.horizon.update(time);}
 setHighDetailAssets(enabled:boolean){const d=enabled?this.detail:'low';this.nature.setDetail(d);this.architecture.setDetail(d);this.water.setDetail(d);this.atmosphere.setDetail(d);this.horizon.setDetail(d);}
 setModelDetail(detail:'low'|'balanced'|'high'){this.detail=detail;this.nature.setDetail(detail);this.architecture.setDetail(detail);this.water.setDetail(detail);this.atmosphere.setDetail(detail);this.horizon.setDetail(detail);}
 setVegetationQuality(quality:'off'|'low'|'full'){this.nature.setDetail(quality==='full'?this.detail:'low');}
 setChunkRadius(_radius:number){}
 get loadedChunks(){return 1;}
 dispose(){this.horizon.dispose();this.atmosphere.dispose();this.water.dispose();this.architecture.dispose();this.nature.dispose();this.terrainLayer.dispose();this.cameraCollision.geometry.dispose();for(const m of Array.isArray(this.cameraCollision.material)?this.cameraCollision.material:[this.cameraCollision.material])m.dispose();this.root.removeFromParent();}
}
