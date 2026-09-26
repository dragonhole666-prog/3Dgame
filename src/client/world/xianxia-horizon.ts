import * as T from 'three';

const CLOUD_VERTEX=`varying vec3 vWorld;varying vec2 vUv;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
const CLOUD_FRAGMENT=`varying vec3 vWorld;varying vec2 vUv;uniform float uTime;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}void main(){vec2 p=vWorld.xz*.009+vec2(uTime*.0045,-uTime*.003);float d=length(vWorld.xz);float outer=smoothstep(66.,116.,d)*(1.-smoothstep(330.,455.,d));float n=fbm(p)+.38*fbm(p*2.2+4.);float a=outer*smoothstep(.45,1.04,n)*.31;float edge=smoothstep(.38,.86,n);vec3 cool=vec3(.58,.70,.74);vec3 ivory=vec3(.93,.91,.84);vec3 c=mix(cool,ivory,edge*.78);float warm=smoothstep(.72,1.12,n)*.08;c+=vec3(.14,.07,.02)*warm;gl_FragColor=vec4(c,a);}`;

export class XianxiaHorizon {
 readonly root=new T.Group();private cloud:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;private lights:T.Points;private roofs:T.InstancedMesh;private bodies:T.InstancedMesh;private detail:'low'|'balanced'|'high'='balanced';
 constructor(parent:T.Object3D,initialDetail:'low'|'balanced'|'high'='balanced'){
  this.root.name='P0.15_Distant_Sect_Cloud_Sea';parent.add(this.root);
  const cloudMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending,uniforms:{uTime:{value:0}},vertexShader:CLOUD_VERTEX,fragmentShader:CLOUD_FRAGMENT});
  this.cloud=new T.Mesh(new T.PlaneGeometry(780,780,1,1),cloudMat);this.cloud.rotation.x=-Math.PI/2;this.cloud.position.y=17.5;this.root.add(this.cloud);
  const sites=[[-155,48,-90,1.25],[-112,58,-184,1.55],[-22,70,-215,1.75],[91,54,-183,1.35],[172,62,-85,1.55],[186,46,42,1.15],[-175,42,71,1.12]] as const;
  const tiers=3,total=sites.length*tiers,dummy=new T.Object3D();
  const bodyMat=new T.MeshStandardMaterial({color:'#59676A',roughness:.82,metalness:.01,envMapIntensity:.58});const roofMat=new T.MeshStandardMaterial({color:'#2F3032',roughness:.56,metalness:.08,envMapIntensity:.82});bodyMat.dithering=roofMat.dithering=true;
  this.bodies=new T.InstancedMesh(new T.CylinderGeometry(.72,.9,1,8),bodyMat,total);this.roofs=new T.InstancedMesh(new T.ConeGeometry(1.65,.52,4),roofMat,total);let i=0;const pts:number[]=[];
  for(const [x,y,z,s] of sites){for(let t=0;t<tiers;t++){const yy=y+t*2.15*s;dummy.position.set(x,yy,z);dummy.scale.set(s*(1-t*.09),2.2*s,s*(1-t*.09));dummy.rotation.set(0,Math.PI*.25,0);dummy.updateMatrix();this.bodies.setMatrixAt(i,dummy.matrix);dummy.position.y=yy+1.28*s;dummy.scale.setScalar(s*(1.1-t*.08));dummy.updateMatrix();this.roofs.setMatrixAt(i,dummy.matrix);pts.push(x+(t%2?-.45:.45)*s,yy+.65*s,z+.78*s);i++;}}
  this.bodies.castShadow=false;this.bodies.receiveShadow=false;this.roofs.castShadow=false;this.roofs.receiveShadow=false;this.bodies.computeBoundingSphere();this.roofs.computeBoundingSphere();this.root.add(this.bodies,this.roofs);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));this.lights=new T.Points(g,new T.PointsMaterial({color:'#E6C48A',size:1.05,sizeAttenuation:true,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));this.root.add(this.lights);this.setDetail(initialDetail);
 }
 setDetail(detail:'low'|'balanced'|'high'){this.detail=detail;this.root.visible=detail!=='low';this.lights.visible=detail==='high';this.cloud.material.uniforms.uTime.value=0;}
 update(time:number){if(!this.root.visible)return;this.cloud.material.uniforms.uTime.value=time;const m=this.lights.material as T.PointsMaterial;m.opacity=this.detail==='high'?.55+Math.sin(time*1.7)*.12:.45;this.cloud.position.y=17.5+Math.sin(time*.08)*.18;}
 dispose(){this.root.removeFromParent();this.cloud.geometry.dispose();this.cloud.material.dispose();this.bodies.geometry.dispose();(this.bodies.material as T.Material).dispose();this.roofs.geometry.dispose();(this.roofs.material as T.Material).dispose();this.lights.geometry.dispose();(this.lights.material as T.Material).dispose();}
}
