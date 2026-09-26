import * as T from 'three';
import { HF265_POND,HF265_SPAWN,hf265TerrainHeight } from '../../shared/data/hf265-world-layout';

type Detail='low'|'balanced'|'high';
function fogMaterial(color:T.ColorRepresentation,opacity:number){const m=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending});m.fog=true;return m;}
export class HF265Atmosphere{
 readonly root=new T.Group();private mist:T.Mesh[]=[];private petals:T.InstancedMesh;private detail:Detail;
 constructor(parent:T.Object3D,detail:Detail){
  this.detail=detail;this.root.name='HF265_Layered_Atmosphere';parent.add(this.root);
  for(let i=0;i<5;i++){const m=new T.Mesh(new T.PlaneGeometry(22+i*7,5+i*.6),fogMaterial(i<2?'#C8DDE6':'#9FBCC9',.045+i*.008));m.rotation.x=-Math.PI/2;m.position.set(HF265_POND.x+(i-2)*4,hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.48+i*.11,HF265_POND.z-6-i*7);this.root.add(m);this.mist.push(m);}
  const petalMat=new T.MeshStandardMaterial({color:'#D9856A',roughness:.72,metalness:0,transparent:true,opacity:.84,side:T.DoubleSide,depthWrite:false});const geo=new T.PlaneGeometry(.16,.09);this.petals=new T.InstancedMesh(geo,petalMat,72);const d=new T.Object3D();for(let i=0;i<72;i++){const a=i/72*Math.PI*2,r=8+(i%14)*1.35;d.position.set(HF265_SPAWN.x+Math.cos(a)*r,hf265TerrainHeight(HF265_SPAWN.x,HF265_SPAWN.z)+1.3+(i%8)*.38,HF265_SPAWN.z-9+Math.sin(a)*r);d.rotation.set(a*.4,a,a*.7);d.scale.setScalar(.7+(i%5)*.12);d.updateMatrix();this.petals.setMatrixAt(i,d.matrix);}this.petals.instanceMatrix.needsUpdate=true;this.root.add(this.petals);this.setDetail(detail);
 }
 update(time:number){for(let i=0;i<this.mist.length;i++){const m=this.mist[i];m.position.x=HF265_POND.x+(i-2)*4+Math.sin(time*.08+i)*1.6;(m.material as T.MeshBasicMaterial).opacity=(this.detail==='high'?.07:this.detail==='balanced'?.052:.03)*(1+Math.sin(time*.11+i)*.08);}if(this.petals.visible){const d=new T.Object3D();for(let i=0;i<this.petals.count;i++){const a=i/this.petals.count*Math.PI*2+time*(.018+(i%3)*.006),r=8+(i%14)*1.35;d.position.set(HF265_SPAWN.x+Math.cos(a)*r,hf265TerrainHeight(HF265_SPAWN.x,HF265_SPAWN.z)+1.2+((i*.37+time*.15)%4.2),HF265_SPAWN.z-9+Math.sin(a)*r);d.rotation.set(time*.16+i,a,time*.11+i*.4);d.scale.setScalar(.7+(i%5)*.12);d.updateMatrix();this.petals.setMatrixAt(i,d.matrix);}this.petals.instanceMatrix.needsUpdate=true;}}
 setDetail(detail:Detail){this.detail=detail;this.petals.visible=detail!=='low';for(const m of this.mist)m.visible=detail!=='low';}
 dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
