import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { HF265_POND,hf265TerrainHeight } from '../../shared/data/hf265-world-layout';

type Detail='low'|'balanced'|'high';
export class HF265WaterLayer{
 readonly root=new T.Group();private water:T.Mesh<T.CircleGeometry,T.MeshPhysicalMaterial>;private reflector:Reflector;private detail:Detail;
 constructor(parent:T.Object3D,detail:Detail){
  this.detail=detail;this.root.name='HF265_Cyan_Reflective_Water';parent.add(this.root);const y=hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.05;
  const geo=new T.CircleGeometry(1,128);geo.scale(HF265_POND.rx,HF265_POND.rz,1);
  this.reflector=new Reflector(geo.clone(),{clipBias:.002,textureWidth:detail==='high'?768:detail==='balanced'?512:256,textureHeight:detail==='high'?768:detail==='balanced'?512:256,color:new T.Color('#6F9FB6')});this.reflector.rotation.x=-Math.PI/2;this.reflector.position.set(HF265_POND.x,y-.015,HF265_POND.z);this.reflector.renderOrder=-3;this.root.add(this.reflector);
  const mat=new T.MeshPhysicalMaterial({color:'#6F9FB6',roughness:.09,metalness:.02,transparent:true,opacity:.78,clearcoat:.82,clearcoatRoughness:.12,ior:1.333,reflectivity:.68});mat.envMapIntensity=2.2;mat.emissive.set('#173A4B');mat.emissiveIntensity=.018;mat.dithering=true;
  this.water=new T.Mesh(geo,mat);this.water.rotation.x=-Math.PI/2;this.water.position.set(HF265_POND.x,y,HF265_POND.z);this.water.renderOrder=-2;this.root.add(this.water);this.setDetail(detail);
 }
 update(time:number){const m=this.water.material;m.color.setHSL(.555,.33,.55+Math.sin(time*.13)*.015);m.clearcoatRoughness=.10+Math.sin(time*.17)*.025;this.water.rotation.z=Math.sin(time*.07)*.0025;}
 setDetail(detail:Detail){this.detail=detail;this.reflector.visible=detail!=='low';this.water.material.opacity=detail==='low'?.88:.78;}
 dispose(){this.water.geometry.dispose();this.water.material.dispose();this.reflector.geometry.dispose();(this.reflector.material as T.Material).dispose();this.root.removeFromParent();}
}
