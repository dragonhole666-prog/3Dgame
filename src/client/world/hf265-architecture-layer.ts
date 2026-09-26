import * as T from 'three';
import { HF265_POND,HF265_SPAWN,hf265TerrainHeight } from '../../shared/data/hf265-world-layout';

type Detail='low'|'balanced'|'high';
const WOOD='#654437',WOOD_DARK='#3F2A24',ROOF='#465866',ROOF_HI='#728694',GOLD='#A98354',STONE='#A7A39A';
function std(color:T.ColorRepresentation,roughness=.75,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness});m.envMapIntensity=metalness>.2?1.05:.55;m.dithering=true;return m;}
function addMesh(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,pos:[number,number,number],rot:[number,number,number]=[0,0,0],scale:[number,number,number]=[1,1,1]){const x=new T.Mesh(g,m);x.position.set(...pos);x.rotation.set(...rot);x.scale.set(...scale);x.castShadow=true;x.receiveShadow=true;parent.add(x);return x;}

function buildPavilion(x:number,z:number,scale=1){
 const g=new T.Group();g.name='HF265_Pavilion';g.position.set(x,hf265TerrainHeight(x,z),z);const stone=std(STONE,.9),wood=std(WOOD,.8),dark=std(WOOD_DARK,.84),roof=std(ROOF,.58,.05),trim=std(GOLD,.38,.48);
 addMesh(g,new T.CylinderGeometry(3.65*scale,3.9*scale,.34*scale,24),stone,[0,.17*scale,0]);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=2.75*scale;addMesh(g,new T.CylinderGeometry(.15*scale,.19*scale,3.7*scale,10),wood,[Math.cos(a)*r,2.05*scale,Math.sin(a)*r]);}
 addMesh(g,new T.CylinderGeometry(3.05*scale,3.2*scale,.18*scale,16),dark,[0,3.86*scale,0]);
 const roof1=addMesh(g,new T.ConeGeometry(4.25*scale,1.35*scale,8,2,false),roof,[0,4.65*scale,0],[0,Math.PI/8,0],[1,1,.86]);
 roof1.geometry.translate(0,-.15*scale,0);
 const roof2=addMesh(g,new T.ConeGeometry(3.45*scale,.92*scale,8,2,false),std(ROOF_HI,.6,.04),[0,5.08*scale,0],[0,Math.PI/8,0],[1,1,.86]);roof2.geometry.translate(0,-.12*scale,0);
 // Raised eave tips and antique-gold caps break the cheap cone silhouette.
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,r=4.02*scale;addMesh(g,new T.SphereGeometry(.12*scale,8,6),trim,[Math.cos(a)*r,4.25*scale,Math.sin(a)*r]);}
 addMesh(g,new T.CylinderGeometry(.08*scale,.11*scale,.72*scale,8),trim,[0,5.82*scale,0]);
 return g;
}

function buildBridge(){
 const root=new T.Group();root.name='HF265_Arched_Stone_Bridge';const stone=std('#AAA69D',.88),rail=std('#8D9393',.76),dummy=new T.Object3D();const count=31;
 const slabGeo=new T.BoxGeometry(.72,.24,3.15),slabs=new T.InstancedMesh(slabGeo,stone,count);slabs.castShadow=true;slabs.receiveShadow=true;
 for(let i=0;i<count;i++){const t=i/(count-1),x=T.MathUtils.lerp(-10.2,10.2,t),arch=Math.sin(Math.PI*t)*2.15,y=hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.18+arch;dummy.position.set(HF265_POND.x+x,y,HF265_POND.z);dummy.rotation.set(0,0,Math.cos(Math.PI*t)*-.12);dummy.scale.set(1,1,1);dummy.updateMatrix();slabs.setMatrixAt(i,dummy.matrix);}slabs.instanceMatrix.needsUpdate=true;root.add(slabs);
 const postGeo=new T.CylinderGeometry(.10,.13,.82,8),postMat=rail,posts=new T.InstancedMesh(postGeo,postMat,20);let k=0;
 for(const side of [-1,1])for(let i=0;i<10;i++){const t=i/9,x=T.MathUtils.lerp(-9.5,9.5,t),arch=Math.sin(Math.PI*t)*2.15,y=hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.78+arch;dummy.position.set(HF265_POND.x+x,y,HF265_POND.z+side*1.48);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();posts.setMatrixAt(k++,dummy.matrix);}posts.instanceMatrix.needsUpdate=true;posts.castShadow=true;root.add(posts);
 for(const side of [-1,1]){const curve=new T.CatmullRomCurve3(Array.from({length:12},(_,i)=>{const t=i/11,x=T.MathUtils.lerp(-9.5,9.5,t),arch=Math.sin(Math.PI*t)*2.15;return new T.Vector3(HF265_POND.x+x,hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+1.17+arch,HF265_POND.z+side*1.48);}));const bar=new T.Mesh(new T.TubeGeometry(curve,44,.075,7,false),rail);bar.castShadow=true;root.add(bar);}
 return root;
}

export class HF265ArchitectureLayer{
 readonly root=new T.Group();private detail:Detail;
 constructor(parent:T.Object3D,detail:Detail){this.detail=detail;this.root.name='HF265_Chinese_Architecture';parent.add(this.root);this.root.add(buildBridge());this.root.add(buildPavilion(HF265_SPAWN.x-18.2,HF265_SPAWN.z-15.0,1.02));this.root.add(buildPavilion(HF265_SPAWN.x+19.0,HF265_SPAWN.z-5.0,.86));}
 setDetail(detail:Detail){this.detail=detail;this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh)o.castShadow=detail!=='low';});}
 dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
