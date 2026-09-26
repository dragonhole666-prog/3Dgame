import * as T from 'three';
import { HF265_WORLD_HALF,hf265TerrainHeight } from '../../shared/data/hf265-world-layout';

export class HF265Terrain{
 readonly root=new T.Group();readonly raycastSurface:T.Mesh;readonly visibleSurface:T.Mesh;
 constructor(parent:T.Object3D){
  this.root.name='HF265_Terrain';parent.add(this.root);
  const segments=128,size=HF265_WORLD_HALF*2,geo=new T.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);
  const pos=geo.getAttribute('position'),colors=new Float32Array(pos.count*3),c=new T.Color();
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=pos.getZ(i),y=hf265TerrainHeight(x,z);pos.setY(i,y);
   const slopeBand=Math.max(0,Math.min(1,(y+2)/7));
   c.set(slopeBand>.66?'#87908A':slopeBand>.38?'#87906D':'#727F5D');
   const v=(Math.sin(x*.041)+Math.cos(z*.037))*.025;c.offsetHSL(0,-.03,v);
   colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const mat=new T.MeshStandardMaterial({color:'#FFFFFF',vertexColors:true,roughness:.92,metalness:0});mat.envMapIntensity=.34;mat.dithering=true;
  this.visibleSurface=new T.Mesh(geo,mat);this.visibleSurface.name='HF265_Visible_Terrain';this.visibleSurface.receiveShadow=true;this.root.add(this.visibleSurface);
  const rayMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,side:T.DoubleSide});
  this.raycastSurface=new T.Mesh(geo.clone(),rayMat);this.raycastSurface.name='HF265_Authoritative_Terrain_Raycast';this.root.add(this.raycastSurface);
 }
 dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
