import * as T from 'three';
import type { Rarity } from '../../shared/types';

export type WeaponAuraKind='lightning'|'flame'|'frost'|'runes'|'aura';
const COLORS:Record<WeaponAuraKind,number>={lightning:0xa984ff,flame:0xff6b2d,frost:0x9de8ff,runes:0xf3d58a,aura:0xc9f8ef};
const RARITY_POWER:Record<Rarity,number>={broken:.3,common:.4,fine:.5,rare:.65,epic:.9,legendary:1.25,immortal:1.35,mythic:1.5};

/** Persistent socket-local elemental VFX. No render-loop object allocation. */
export class WeaponAura {
 readonly root=new T.Group();
 private readonly materials:T.Material[]=[];
 private readonly animated:T.Object3D[]=[];
 private readonly boltGeometries:T.BufferGeometry[]=[];
 private readonly boltArrays:Float32Array[]=[];
 private readonly power:number;
 private readonly color:T.Color;
 private readonly light?:T.PointLight;
 private elapsed=0;
 constructor(readonly kind:WeaponAuraKind,readonly rarity:Rarity,private readonly length:number){
  this.root.name=`WeaponAura_${kind}_${rarity}`;this.root.renderOrder=4;this.power=RARITY_POWER[rarity]??.6;this.color=new T.Color(COLORS[kind]);
  const coreMat=this.mat(.11+.08*this.power);const core=new T.Mesh(new T.CylinderGeometry(.018+.012*this.power,.035+.012*this.power,Math.max(.7,length*.92),8,1,true),coreMat);core.position.y=length*.48;this.root.add(core);this.animated.push(core);
  if(kind==='lightning')this.buildLightning();else if(kind==='flame')this.buildFlame();else if(kind==='frost')this.buildFrost();else this.buildRunes();
  if(this.power>=1.2){this.light=new T.PointLight(this.color,1.6*this.power,4.8+length*1.8,2);this.light.position.y=length*.5;this.root.add(this.light);}
 }
 private mat(opacity:number){const m=new T.MeshBasicMaterial({color:this.color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});this.materials.push(m);return m;}
 private buildLightning(){
  const count=10;for(let strand=0;strand<(this.power>=1.2?3:2);strand++){const arr=new Float32Array(count*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(arr,3).setUsage(T.DynamicDrawUsage));const m=new T.LineBasicMaterial({color:this.color,transparent:true,opacity:.55+.18*this.power,depthWrite:false,blending:T.AdditiveBlending});const line=new T.Line(g,m);line.frustumCulled=false;this.root.add(line);this.boltGeometries.push(g);this.boltArrays.push(arr);this.materials.push(m);}
  for(let i=0;i<2;i++){const r=new T.Mesh(new T.TorusGeometry(.09+i*.035,.009,6,24),this.mat(.22+.08*this.power));r.rotation.x=Math.PI/2;r.position.y=this.length*(.34+i*.38);this.root.add(r);this.animated.push(r);}
 }
 private buildFlame(){
  const count=this.power>=1.2?5:3;for(let i=0;i<count;i++){const flame=new T.Mesh(new T.ConeGeometry(.07+.015*this.power,.34+.07*this.power,8,1,true),this.mat(.18+.07*this.power));flame.position.set(Math.sin(i*2.1)*.045,this.length*(.22+i/(count+1)*.65),Math.cos(i*2.1)*.045);flame.rotation.z=(i%2?.12:-.12);this.root.add(flame);this.animated.push(flame);}
 }
 private buildFrost(){
  const count=this.power>=1.2?7:4;for(let i=0;i<count;i++){const c=new T.Mesh(new T.OctahedronGeometry(.055+.018*this.power,0),this.mat(.2+.07*this.power));const a=i*2.399;c.position.set(Math.cos(a)*(.07+.012*(i%2)),this.length*(.18+(i+.5)/count*.68),Math.sin(a)*(.07+.012*(i%2)));c.scale.y=1.7;this.root.add(c);this.animated.push(c);}
 }
 private buildRunes(){
  const count=this.power>=1.2?4:2;for(let i=0;i<count;i++){const r=new T.Mesh(new T.TorusGeometry(.08+i*.018,.008,6,32),this.mat(.2+.06*this.power));r.rotation.x=Math.PI/2;r.position.y=this.length*(.22+(i+1)/(count+1)*.62);this.root.add(r);this.animated.push(r);}
 }
 update(dt:number,time:number){
  this.elapsed+=dt;const pulse=.82+.18*Math.sin(time*(this.kind==='flame'?8.2:5.6));this.root.scale.setScalar(.96+.04*pulse);
  for(let i=0;i<this.materials.length;i++){const m=this.materials[i];if(m instanceof T.MeshBasicMaterial||m instanceof T.LineBasicMaterial)m.opacity=Math.max(.08,Math.min(.86,(.12+.05*this.power)*(1.1+.45*Math.sin(time*4+i*1.7))));}
  for(let i=0;i<this.animated.length;i++){const o=this.animated[i];o.rotation.y+=dt*(.7+i*.09);if(this.kind==='flame')o.scale.y=.82+.28*Math.sin(time*8+i*1.9);else if(this.kind==='frost')o.rotation.z+=dt*(.55+i*.05);}
  if(this.boltArrays.length&&this.elapsed>=.045){this.elapsed=0;for(let s=0;s<this.boltArrays.length;s++){const a=this.boltArrays[s],n=a.length/3;for(let i=0;i<n;i++){const y=i/(n-1)*this.length*.9+.05,edge=i===0||i===n-1?0:1;a[i*3]=Math.sin(time*23+i*2.17+s*1.9)*(.055+.02*this.power)*edge;a[i*3+1]=y;a[i*3+2]=Math.cos(time*19+i*1.73+s*2.4)*(.045+.018*this.power)*edge;}const attr=this.boltGeometries[s].getAttribute('position') as T.BufferAttribute;attr.needsUpdate=true;}}
  if(this.light)this.light.intensity=(1.1+1.2*pulse)*this.power;
 }
 dispose(){this.root.removeFromParent();for(const g of this.boltGeometries)g.dispose();this.root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});for(const m of this.materials)m.dispose();}
}
