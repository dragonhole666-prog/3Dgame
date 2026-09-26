import * as T from 'three';
import { HF265_SPAWN } from '../../shared/data/hf265-world-layout';

type Detail='low'|'balanced'|'high';
function seeded(seed:number){let s=seed*48271%2147483647;return()=>((s=s*48271%2147483647)-1)/2147483646;}
function mountainField(seed:number,width:number,depth:number,height:number,color:T.ColorRepresentation){
 const segX=34,segZ=24,geo=new T.PlaneGeometry(width,depth,segX,segZ);geo.rotateX(-Math.PI/2);const pos=geo.getAttribute('position'),rnd=seeded(seed);const peaks=Array.from({length:5},(_,i)=>({x:(rnd()-.5)*width*.72,z:(rnd()-.5)*depth*.72,h:height*(.58+rnd()*.55),sx:width*(.09+rnd()*.10),sz:depth*(.12+rnd()*.12)}));
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);let y=0;for(const p of peaks){const dx=(x-p.x)/p.sx,dz=(z-p.z)/p.sz;y+=p.h*Math.exp(-(dx*dx+dz*dz)*1.35);}y+=Math.sin(x*.07+seed)*.55+Math.cos(z*.09-seed)*.42;pos.setY(i,Math.max(0,y));}
 geo.computeVertexNormals();const mat=new T.MeshStandardMaterial({color,roughness:.98,metalness:0});mat.envMapIntensity=.16;mat.dithering=true;const mesh=new T.Mesh(geo,mat);mesh.receiveShadow=false;mesh.castShadow=false;return mesh;
}
export class HF265HorizonMountains{
 readonly root=new T.Group();private detail:Detail;private cloud:T.Mesh;
 constructor(parent:T.Object3D,detail:Detail){this.detail=detail;this.root.name='HF265_Layered_Karst_Horizon';parent.add(this.root);
  const back=mountainField(2651,230,110,40,'#7694A1');back.position.set(HF265_SPAWN.x,-4,HF265_SPAWN.z-145);this.root.add(back);
  const mid=mountainField(2652,190,90,31,'#667F8A');mid.position.set(HF265_SPAWN.x-28,-3,HF265_SPAWN.z-112);this.root.add(mid);
  const side=mountainField(2653,130,75,25,'#596F79');side.position.set(HF265_SPAWN.x+92,-3,HF265_SPAWN.z-98);side.rotation.y=-.18;this.root.add(side);
  const cloudMat=new T.MeshBasicMaterial({color:'#D6E5EB',transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});this.cloud=new T.Mesh(new T.PlaneGeometry(260,55),cloudMat);this.cloud.rotation.x=-Math.PI/2;this.cloud.position.set(HF265_SPAWN.x,12,HF265_SPAWN.z-118);this.root.add(this.cloud);this.setDetail(detail);
 }
 update(time:number){this.cloud.position.x=HF265_SPAWN.x+Math.sin(time*.035)*4;(this.cloud.material as T.MeshBasicMaterial).opacity=this.detail==='high'?.14:.10;}
 setDetail(detail:Detail){this.detail=detail;this.root.visible=true;this.cloud.visible=detail!=='low';}
 dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
