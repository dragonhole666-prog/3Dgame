import * as T from 'three';
import { harmonizeXianxiaSurfaceColor } from './xianxia-visual-style';
const materials=new Map<string,T.MeshStandardMaterial>();
export function material(color:string,metalness=.15,roughness=.7,emission=0){
 const key=`${color}|${metalness}|${roughness}|${emission}`;let m=materials.get(key);
 if(!m){const styled=harmonizeXianxiaSurfaceColor(color),emissive=new T.Color(styled).multiplyScalar(emission>0?.74:.16);m=new T.MeshStandardMaterial({color:styled,metalness,roughness:Math.max(roughness,.62),emissive,emissiveIntensity:emission});m.envMapIntensity=metalness>.45?1.02:.52;m.dithering=true;m.userData.shared=true;materials.set(key,m);}return m;
}
const sphere=new T.SphereGeometry(1,16,12),cube=new T.BoxGeometry(1,1,1),shadowSphere=new T.SphereGeometry(1,8,6);sphere.userData.shared=true;cube.userData.shared=true;shadowSphere.userData.shared=true;
const shadowMaterial=new T.MeshBasicMaterial({color:'#000000',colorWrite:false,depthWrite:false});shadowMaterial.userData.shared=true;
export function mesh(parent:T.Object3D,geometry:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;parent.add(m);return m;}
export function setShadowProfile(root:T.Object3D,cast=false,receive=false){root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh){o.castShadow=cast;o.receiveShadow=receive;}});return root;}
export function shadowEllipsoid(parent:T.Object3D,pos:number[],size:number[]){const m=new T.Mesh(shadowSphere,shadowMaterial);m.position.set(...pos as [number,number,number]);m.scale.set(...size as [number,number,number]);m.castShadow=true;m.receiveShadow=false;m.userData.shadowProxy=true;parent.add(m);return m;}
export function ellipsoid(parent:T.Object3D,mat:T.Material,pos:number[],size:number[]){const m=mesh(parent,sphere,mat,...pos as [number,number,number]);m.scale.set(...size as [number,number,number]);return m;}
export function box(parent:T.Object3D,mat:T.Material,pos:number[],size:number[],rotation=0){const m=mesh(parent,cube,mat,...pos as [number,number,number]);m.scale.set(...size as [number,number,number]);m.rotation.z=rotation;return m;}
export function cylinder(parent:T.Object3D,mat:T.Material,pos:number[],top:number,bottom:number,height:number,segments=12){return mesh(parent,new T.CylinderGeometry(top,bottom,height,segments),mat,...pos as [number,number,number]);}
export function tube(parent:T.Object3D,mat:T.Material,points:number[][],radius=.03,segments=12){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));return mesh(parent,new T.TubeGeometry(curve,segments,radius,6,false),mat);}
export function ring(parent:T.Object3D,mat:T.Material,radius:number,thickness:number,pos=[0,0,0]){return mesh(parent,new T.TorusGeometry(radius,thickness,6,40),mat,...pos as [number,number,number]);}
export function joint(parent:T.Object3D,name:string,x=0,y=0,z=0){const group=new T.Group();group.name=name;group.position.set(x,y,z);parent.add(group);return group;}
export function lathe(parent:T.Object3D,mat:T.Material,profile:number[][],scaleZ=1){const g=new T.LatheGeometry(profile.map(p=>new T.Vector2(p[0],p[1])),24);g.scale(1,1,scaleZ);return mesh(parent,g,mat);}
export function ribbon(parent:T.Object3D,mat:T.Material,points:number[][],widths:number[]){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<points.length;i++){const [x,y,z]=points[i],w=widths[i]??widths[0];positions.push(x-w,y,z,x+w,y,z);uv.push(0,i/(points.length-1),1,i/(points.length-1));if(i<points.length-1){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,mat);
}
export function disposeTree(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){if(!o.geometry.userData.shared)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData.shared)m.dispose();}});root.removeFromParent();}
export function noiseTexture(size=128,base=[125,131,104]){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!,data=ctx.createImageData(size,size);let seed=7293;for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=((seed>>>16)/65535-.5)*32;for(let c=0;c<3;c++)data.data[i+c]=base[c]+n;data.data[i+3]=255;}ctx.putImageData(data,0,0);const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t;}
