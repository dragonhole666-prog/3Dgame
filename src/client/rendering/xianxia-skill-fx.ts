import * as T from 'three';
import type { GameEvent } from '../../shared/types';
import { heightAt } from '../../shared/data/world';
import { SKILL_DEFINITIONS, WEAPON_PROFILES, mythicChoreography, type MythicVfxCue } from '../../shared/data/skills';
import { skillVfxProfile, type SpellProjectileShape, type SkillVfxProfile } from '../../shared/data/skill-vfx-profiles';

type ActiveFx={root:T.Group;age:number;life:number;materials:T.ShaderMaterial[];light?:T.PointLight;spin:number};
type ScheduledFx={age:number;delay:number;event:GameEvent;cue?:MythicVfxCue};
type SpellParticle={x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;max:number;gravity:number;drag:number;color:T.Color};
type PooledProjectile={root:T.Group;core:T.Mesh;shell:T.Mesh;coreMat:T.MeshBasicMaterial;shellMat:T.MeshBasicMaterial;shape:SpellProjectileShape;busy:boolean};
type ActiveProjectile={visual:PooledProjectile;event:GameEvent;age:number;duration:number;start:T.Vector3;control:T.Vector3;end:T.Vector3;last:T.Vector3;color:string;trailRate:number;trailAcc:number;impact:boolean};
type ActiveField={root:T.Group;event:GameEvent;age:number;life:number;radius:number;particleRate:number;strikeRate:number;particleAcc:number;strikeAcc:number;color:string;secondaryColor:string;materials:T.ShaderMaterial[]};
type ActiveTelegraph={root:T.Group;age:number;life:number;materials:T.ShaderMaterial[];baseScale:number;startPhase:number};
const VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAG=`varying vec2 vUv;uniform vec3 uColor;uniform float uAlpha;uniform float uPulse;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float glow=1.-smoothstep(.28,1.,r);float rays=.62+.38*sin(atan(p.y,p.x)*12.+uPulse*6.);float a=uAlpha*(.28+glow*.72)*rays;gl_FragColor=vec4(uColor*(1.+glow*.95),a);}`;
const ELEMENT_COLOR={physical:'#f2d5a0',wind:'#9beee1',lightning:'#b48cff',fire:'#ff6b38',frost:'#9ce8ff',arcane:'#ebd39b'} as const;
function shader(color:string){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{uColor:{value:new T.Color(color)},uAlpha:{value:1},uPulse:{value:0}},vertexShader:VERT,fragmentShader:FRAG});}

export class XianxiaSkillFx {
 private active:ActiveFx[]=[];private scheduled:ScheduledFx[]=[];private quality:'off'|'reduced'|'full'='full';
 private projectiles:ActiveProjectile[]=[];private projectilePool:PooledProjectile[]=[];private fields:ActiveField[]=[];private telegraphs:ActiveTelegraph[]=[];
 private spellParticles:SpellParticle[]=[];private spellPoints:T.Points;private spellParticleCursor=0;
 private readonly scratchDirection=new T.Vector3();private readonly projectileUp=new T.Vector3(0,1,0);
 private readonly orbGeometry=new T.IcosahedronGeometry(.5,2);private readonly orbShellGeometry=new T.IcosahedronGeometry(.72,1);private readonly shardGeometry=new T.ConeGeometry(.24,1.45,6);private readonly shardShellGeometry=new T.ConeGeometry(.34,1.65,6);
 constructor(private scene:T.Scene){
  const max=384,geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(max*3),3));geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(max*3),3));
  this.spellPoints=new T.Points(geometry,new T.PointsMaterial({size:.11,transparent:true,vertexColors:true,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true}));this.spellPoints.frustumCulled=false;scene.add(this.spellPoints);
  for(let i=0;i<max;i++)this.spellParticles.push({x:0,y:-100,z:0,vx:0,vy:0,vz:0,life:0,max:1,gravity:0,drag:0,color:new T.Color()});
 }
 setQuality(q:'off'|'reduced'|'full'){
  this.quality=q;this.spellPoints.visible=q!=='off';
  for(const p of this.projectilePool)p.root.visible=q!=='off'&&p.busy;
  for(const f of this.fields)f.root.visible=q!=='off';
  for(const t of this.telegraphs)t.root.visible=q!=='off';
  this.trimBudgets();
 }
 private add(root:T.Group,life:number,materials:T.ShaderMaterial[],light?:T.PointLight,spin=.55){this.scene.add(root);this.active.push({root,life,age:0,materials,light,spin});}
 private light(root:T.Group,color:string,power:number,radius:number){if(this.quality!=='full')return undefined;const l=new T.PointLight(color,power,radius,2);l.position.y=1.2;root.add(l);return l;}
 private groundRoot(x:number,z:number){const root=new T.Group();root.position.set(x,heightAt(x,z)+.1,z);return root;}
 private ring(root:T.Group,color:string,inner:number,outer:number,y=0,segments=64){const mat=shader(color),m=new T.Mesh(new T.RingGeometry(inner,outer,segments),mat);m.rotation.x=-Math.PI/2;m.position.y=y;root.add(m);return mat;}
 private projectileBudget(){return this.quality==='reduced'?8:20;}
 private fieldBudget(){return this.quality==='reduced'?2:4;}
 private telegraphBudget(){return this.quality==='reduced'?4:10;}
 private disposeDynamicRoot(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});root.removeFromParent();}
 private trimBudgets(){
  while(this.projectiles.length>this.projectileBudget()){const p=this.projectiles.shift()!;this.releaseProjectile(p.visual);}
  while(this.fields.length>this.fieldBudget()){const f=this.fields.shift()!;this.disposeDynamicRoot(f.root);}
  while(this.telegraphs.length>this.telegraphBudget()){const t=this.telegraphs.shift()!;this.disposeDynamicRoot(t.root);}
 }
 private slash(x:number,z:number,angle:number,color:string,radius:number,life:number,wide=false){const root=this.groundRoot(x,z),mat=shader(color),span=wide?2.8:2.15,start=-Math.PI/2-span/2,arc=new T.Mesh(new T.RingGeometry(radius*.45,radius,72,1,start,span),mat);arc.rotation.x=-Math.PI/2;root.rotation.y=angle;arc.position.y=.28;root.add(arc);this.add(root,life,[mat],this.light(root,color,wide?3.8:2.2,radius*3.2),.25);}
 private boltField(x:number,z:number,color:string,count:number,radius:number,life:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];materials.push(this.ring(root,color,radius*.18,radius,.02));const bolts=this.quality==='reduced'?Math.max(2,Math.ceil(count*.5)):count;for(let b=0;b<bolts;b++){const a=b/bolts*Math.PI*2,ox=Math.cos(a)*radius*.55,oz=Math.sin(a)*radius*.55,pts:T.Vector3[]=[];for(let i=0;i<11;i++){const y=i/10*(8+radius*.7),edge=1-i/10;pts.push(new T.Vector3(ox+Math.sin(i*7.2+b*2.1)*.22*edge,y,oz+Math.cos(i*5.7+b)*.18*edge));}const lm=new T.LineBasicMaterial({color,transparent:true,opacity:.92,blending:T.AdditiveBlending,depthWrite:false}),line=new T.Line(new T.BufferGeometry().setFromPoints(pts),lm);root.add(line);}this.add(root,life,materials,this.light(root,color,8,radius*2.5),.12);}
 private crystals(x:number,z:number,color:string,count:number,radius:number,life:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];materials.push(this.ring(root,color,radius*.25,radius,.02));const n=this.quality==='reduced'?Math.max(4,Math.ceil(count*.55)):count;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=radius*(.35+.55*((i%3)/2)),mat=shader(color),c=new T.Mesh(new T.OctahedronGeometry(.16+(i%3)*.06,0),mat);c.position.set(Math.cos(a)*r,.35+(i%2)*.32,Math.sin(a)*r);c.scale.y=2.5+(i%3)*.5;c.rotation.y=a;root.add(c);materials.push(mat);}this.add(root,life,materials,this.light(root,color,5,radius*2.4),.35);}
 private arrowRain(x:number,z:number,color:string,count:number,radius:number,life:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,color,radius*.2,radius,.01)];const n=this.quality==='reduced'?Math.ceil(count*.5):count;for(let i=0;i<n;i++){const a=i*2.399,r=radius*Math.sqrt((i+.5)/n),px=Math.cos(a)*r,pz=Math.sin(a)*r;const g=new T.BufferGeometry().setFromPoints([new T.Vector3(px,7.5+(i%4)*.8,pz),new T.Vector3(px-.08,0,pz+.08)]),m=new T.LineBasicMaterial({color,transparent:true,opacity:.78,depthWrite:false,blending:T.AdditiveBlending});root.add(new T.Line(g,m));}this.add(root,life,materials,this.light(root,color,4.5,radius*2.2),.08);}
 private swordArray(x:number,z:number,color:string,count:number,radius:number,life:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,color,radius*.38,radius,.02)];const n=this.quality==='reduced'?Math.ceil(count*.6):count;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,mat=shader(color),blade=new T.Mesh(new T.PlaneGeometry(.12,1.55),mat);blade.position.set(Math.cos(a)*radius*.78,.9,Math.sin(a)*radius*.78);blade.rotation.y=-a;blade.rotation.z=.18;root.add(blade);materials.push(mat);}this.add(root,life,materials,this.light(root,color,5.5,radius*2.4),1.1);}
 private fireDragon(x:number,z:number,angle:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,'#ff7438',.7,5.3,.02)];const pts:T.Vector3[]=[];for(let i=0;i<44;i++){const t=i/43*Math.PI*4.7,r=2.2*(1-i/55);pts.push(new T.Vector3(Math.cos(t)*r,.4+i*.075,Math.sin(t)*r));}const lm=new T.LineBasicMaterial({color:'#ffb052',transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending}),line=new T.Line(new T.BufferGeometry().setFromPoints(pts),lm);root.add(line);root.rotation.y=angle;this.add(root,1.35,materials,this.light(root,'#ff5729',10,14),1.25);}
 private taixu(x:number,z:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];for(let i=0;i<4;i++){const m=this.ring(root,i%2?'#ffffff':'#f2d48a',.5+i*.85,.55+i*.9,.03+i*.08,72);materials.push(m);}const n=this.quality==='reduced'?8:16;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,g=new T.BufferGeometry().setFromPoints([new T.Vector3(Math.cos(a)*5,.2,Math.sin(a)*5),new T.Vector3(0,2.2,0)]),lm=new T.LineBasicMaterial({color:'#f7e8bc',transparent:true,opacity:.78,depthWrite:false,blending:T.AdditiveBlending});root.add(new T.Line(g,lm));}this.add(root,1.5,materials,this.light(root,'#f6df9b',9,15),1.6);}
 private crossSlash(x:number,z:number,angle:number,color:string,radius=2.2,life=.46){this.slash(x,z,angle-.62,color,radius,life,true);this.slash(x,z,angle+.62,color,radius*.94,life*.92,true);}
 private lineStrike(x:number,z:number,angle:number,color:string,length:number,life:number,rings=1){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];for(let i=0;i<rings;i++)materials.push(this.ring(root,color,.12+i*.28,.72+i*.42,.04+i*.06,42));const g=new T.BufferGeometry().setFromPoints([new T.Vector3(-Math.sin(angle)*length,1.05,-Math.cos(angle)*length),new T.Vector3(0,.3,0)]),lm=new T.LineBasicMaterial({color,transparent:true,opacity:.94,depthWrite:false,blending:T.AdditiveBlending});root.add(new T.Line(g,lm));this.add(root,life,materials,this.light(root,color,3.4,Math.max(5,length*.7)),.08);}
 private bladeFall(x:number,z:number,color:string,radius:number,life:number){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,color,.35,radius,.02,64)],mat=shader(color),blade=new T.Mesh(new T.PlaneGeometry(.42,7.5),mat);blade.position.y=3.8;blade.rotation.y=Math.PI/4;root.add(blade);materials.push(mat);this.add(root,life,materials,this.light(root,color,6.5,radius*2.3),.16);}
 private staffSigil(x:number,z:number,color:string,life=.7){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];for(let i=0;i<3;i++)materials.push(this.ring(root,color,.4+i*.55,.48+i*.62,.05+i*.28,56));this.add(root,life,materials,this.light(root,color,4.8,7),1.35);}
 private chargePulse(x:number,z:number,color:string,life:number,profile:string,scale=1){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];const outer=(profile==='greatsword'?1.45:profile==='staff'?1.25:profile==='bow' ? .9 : 1.05)*scale;materials.push(this.ring(root,color,.18,outer,.025,48));if(profile==='staff'||profile==='bow')materials.push(this.ring(root,color,.08,outer*.62,.12,40));this.add(root,life,materials,this.light(root,color,profile==='staff'?3.2:2.2,4.8),profile==='staff'?1.8:.9);}
 private basicWeapon(e:GameEvent,x:number,z:number,angle:number,color:string){const profile=e.weaponProfile??'sword',element=e.weaponElement;const auraColor=element&&element!=='none'?ELEMENT_COLOR[element]:color;if(profile==='greatsword'){this.slash(x,z,angle,auraColor,2.35,.48,true);const root=this.groundRoot(x,z),m=this.ring(root,auraColor,.45,2.15,.02,52);this.add(root,.45,[m],undefined,.12);return;}if(profile==='dual'){this.crossSlash(x,z,angle,auraColor,1.85,.34);return;}if(profile==='spear'){this.lineStrike(x,z,angle,auraColor,6.2,.34,1);return;}if(profile==='staff'){this.staffSigil(x,z,auraColor,.52);return;}if(profile==='bow'){this.lineStrike(x,z,angle,auraColor,7.4,.32,0);return;}this.slash(x,z,angle,auraColor,1.7,.32);}
 private emitSpellParticle(x:number,y:number,z:number,color:string,vx:number,vy:number,vz:number,life:number,gravity=0,drag=.25){
  if(this.quality==='off')return;const limit=this.quality==='reduced'?144:this.spellParticles.length,p=this.spellParticles[this.spellParticleCursor++%limit];p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.life=life;p.max=Math.max(.001,life);p.gravity=gravity;p.drag=drag;p.color.set(color);
 }
 private acquireProjectile(shape:SpellProjectileShape,color:string,coreColor:string,size:number){
  let visual=this.projectilePool.find(p=>!p.busy&&p.shape===shape);if(!visual){
   const root=new T.Group(),coreMat=new T.MeshBasicMaterial({color:coreColor,transparent:true,opacity:.98,depthWrite:false,blending:T.AdditiveBlending}),shellMat=new T.MeshBasicMaterial({color,transparent:true,opacity:.32,wireframe:shape==='shard',depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
   const core=new T.Mesh(shape==='orb'?this.orbGeometry:this.shardGeometry,coreMat),shell=new T.Mesh(shape==='orb'?this.orbShellGeometry:this.shardShellGeometry,shellMat);root.add(core,shell);root.visible=false;root.frustumCulled=false;this.scene.add(root);visual={root,core,shell,coreMat,shellMat,shape,busy:false};this.projectilePool.push(visual);
  }
  visual.busy=true;visual.root.visible=true;visual.root.scale.setScalar(size);visual.coreMat.color.set(coreColor);visual.shellMat.color.set(color);visual.coreMat.opacity=.98;visual.shellMat.opacity=.32;return visual;
 }
 private releaseProjectile(visual:PooledProjectile){visual.busy=false;visual.root.visible=false;visual.root.position.set(0,-100,0);visual.root.scale.setScalar(1);}
 private launchProfileProjectile(e:GameEvent,profile:SkillVfxProfile,duration:number,elapsed=0){
  const spec=profile.projectile;if(!spec||e.x===undefined||e.z===undefined)return;
  while(this.projectiles.length>=this.projectileBudget()){const old=this.projectiles.shift()!;this.releaseProjectile(old.visual);}
  const ox=e.originX??e.x,oz=e.originZ??e.z,start=new T.Vector3(ox,heightAt(ox,oz)+1.38,oz),end=new T.Vector3(e.x,heightAt(e.x,e.z)+.62,e.z),distance=start.distanceTo(end),control=start.clone().lerp(end,.5);
  control.y=Math.max(start.y,end.y)+spec.arcHeight+Math.min(1.5,distance*.055);
  const visual=this.acquireProjectile(spec.shape,spec.color,spec.coreColor,spec.size),total=Math.max(.16,duration),age=Math.max(0,Math.min(total-.001,elapsed)),u=1-age/total,t=age/total;
  visual.root.position.set(start.x*u*u+2*control.x*u*t+end.x*t*t,start.y*u*u+2*control.y*u*t+end.y*t*t,start.z*u*u+2*control.z*u*t+end.z*t*t);
  this.projectiles.push({visual,event:e,age,duration:total,start,control,end,last:visual.root.position.clone(),color:spec.color,trailRate:spec.trailRate,trailAcc:0,impact:true});
 }
 private startTelegraph(e:GameEvent,profile:SkillVfxProfile,life:number,elapsedRatio=0){
  const spec=profile.telegraph;if(!spec||e.x===undefined||e.z===undefined||life<=.025)return;
  while(this.telegraphs.length>=this.telegraphBudget()){const old=this.telegraphs.shift()!;this.disposeDynamicRoot(old.root);}
  const root=this.groundRoot(e.x,e.z),materials:T.ShaderMaterial[]=[
   this.ring(root,spec.color,spec.radius*.78,spec.radius,.015,spec.style==='rune'?80:64),
   this.ring(root,spec.secondaryColor,spec.radius*.18,spec.radius*.24,.035,48),
  ];
  if(spec.style==='rune')materials.push(this.ring(root,spec.secondaryColor,spec.radius*.46,spec.radius*.5,.055,72));
  for(const m of materials)m.uniforms.uAlpha.value=.22;
  const startPhase=Math.min(1,Math.max(0,elapsedRatio)),baseScale=.9+startPhase*.08;root.scale.setScalar(baseScale);this.scene.add(root);this.telegraphs.push({root,age:0,life:Math.max(.03,life),materials,baseScale,startPhase});
 }
 private fireBurst(x:number,z:number,profile:SkillVfxProfile){
  const spec=profile.impact!;const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,spec.color,.22,spec.radius,.03,72),this.ring(root,spec.secondaryColor,spec.radius*.28,spec.radius*.72,.18,64)],coreMat=shader(spec.secondaryColor),core=new T.Mesh(new T.IcosahedronGeometry(.7,2),coreMat);core.position.y=.8;root.add(core);materials.push(coreMat);this.add(root,spec.life,materials,this.light(root,spec.color,7.5,spec.radius*3),.62);
  const count=this.quality==='reduced'?18:46;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=.9+Math.random()*4.2;this.emitSpellParticle(x,heightAt(x,z)+.55,z,i%3?spec.color:spec.secondaryColor,Math.cos(a)*s,.5+Math.random()*3.7,Math.sin(a)*s,.42+Math.random()*.65,1.9,.35);}
 }
 private iceSpikeBurst(x:number,z:number,profile:SkillVfxProfile,radius=profile.impact?.radius??3.4){
  const spec=profile.impact!,root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[this.ring(root,spec.color,radius*.15,radius,.025,72)],count=this.quality==='reduced'?7:15;for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(i%2)*.18,r=radius*(.16+.72*((i%5)/4)),mat=shader(i%3?spec.color:spec.secondaryColor),spike=new T.Mesh(new T.ConeGeometry(.17+(i%4)*.035,1.05+(i%5)*.23,6),mat);spike.position.set(Math.cos(a)*r,.46+(i%3)*.12,Math.sin(a)*r);spike.rotation.z=(Math.random()-.5)*.34;spike.rotation.x=(Math.random()-.5)*.18;root.add(spike);materials.push(mat);}this.add(root,spec.life,materials,this.light(root,spec.color,5.2,radius*2.3),.18);
  const particles=this.quality==='reduced'?14:34;for(let i=0;i<particles;i++){const a=Math.random()*Math.PI*2,s=.6+Math.random()*2.7;this.emitSpellParticle(x,heightAt(x,z)+.45,z,i%4?spec.color:spec.secondaryColor,Math.cos(a)*s,.7+Math.random()*2.2,Math.sin(a)*s,.5+Math.random()*.65,1.4,.18);}
 }
 private blizzardStrike(x:number,z:number,color:string){
  const root=this.groundRoot(x,z),mat=shader(color),spike=new T.Mesh(new T.ConeGeometry(.16,1.5,6),mat);spike.position.y=.68;spike.rotation.z=(Math.random()-.5)*.18;root.add(spike);this.add(root,.42,[mat],undefined,.08);
 }
 private startBlizzard(e:GameEvent,profile:SkillVfxProfile){
  if(e.x===undefined||e.z===undefined||!profile.field)return;
  while(this.fields.length>=this.fieldBudget()){const old=this.fields.shift()!;this.disposeDynamicRoot(old.root);}
  const f=profile.field,root=this.groundRoot(e.x,e.z),materials:T.ShaderMaterial[]=[this.ring(root,f.color,f.radius*.18,f.radius,.025,80),this.ring(root,f.secondaryColor,f.radius*.58,f.radius*.82,.07,72)];
  if(this.quality==='full'){const hazeMat=shader(f.color),haze=new T.Mesh(new T.CylinderGeometry(f.radius*.94,f.radius*.72,3.4,36,1,true),hazeMat);haze.position.y=1.7;root.add(haze);materials.push(hazeMat);}this.scene.add(root);this.fields.push({root,event:e,age:0,life:f.life,radius:f.radius,particleRate:f.particleRate,strikeRate:f.strikeRate,particleAcc:0,strikeAcc:0,color:f.color,secondaryColor:f.secondaryColor,materials});
  this.crystals(e.x,e.z,f.secondaryColor,this.quality==='reduced'?5:9,f.radius*.62,.72);
 }
 private profiledImpact(e:GameEvent,profile:SkillVfxProfile){
  if(e.x===undefined||e.z===undefined||!profile.impact)return;const kind=profile.impact.kind;if(kind==='fire-burst'){this.fireBurst(e.x,e.z,profile);return;}if(kind==='ice-spikes'){this.iceSpikeBurst(e.x,e.z,profile);return;}if(kind==='blizzard'){const root=this.groundRoot(e.x,e.z),mats=[this.ring(root,profile.impact.color,.35,profile.impact.radius,.03,80),this.ring(root,profile.impact.secondaryColor,1.4,profile.impact.radius*.68,.12,72)];this.add(root,profile.impact.life,mats,this.light(root,profile.impact.color,5.4,profile.impact.radius*2.2),.3);this.startBlizzard(e,profile);}
 }

 private mythicCue(e:GameEvent,cue:MythicVfxCue){
  if(e.x===undefined||e.z===undefined)return;const id=e.skill??'',x=e.x,z=e.z,angle=e.angle??0,ox=e.originX??x,oz=e.originZ??z;
  const shock=(color:string,inner:number,outer:number,life:number)=>{const root=this.groundRoot(x,z),m=this.ring(root,color,inner,outer,.02,72);this.add(root,life,[m],this.light(root,color,4.6,outer*2.2),.45);};
  if(id==='primordial-star-collapse'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#f0d48c',.42,'sword');return;}if(cue==='manifest'){this.swordArray(x,z,'#f4dfa0',12,5.2,.82);return;}if(cue==='release'){this.bladeFall(x,z,'#fff0b8',4.5,.62);return;}if(cue==='impact'){this.taixu(x,z);return;}shock('#f7dfa0',1.6,6.8,.72);return;
  }
  if(id==='void-rift-sunder'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#8162a8',.46,'greatsword');return;}if(cue==='manifest'){this.bladeFall(x,z,'#6e4f96',3.8,.72);return;}if(cue==='release'){this.slash(x,z,angle,'#9f7ccc',4.8,.62,true);return;}if(cue==='impact'){this.crossSlash(x,z,angle+.35,'#d0b4f0',5.0,.86);return;}shock('#7d5aa7',.6,6.2,.76);return;
  }
  if(id==='celestial-pillar-pierce'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#d7e5ff',.34,'spear');return;}if(cue==='manifest'){this.lineStrike(ox,oz,angle,'#9fb6df',4.2,.48,2);return;}if(cue==='release'){this.lineStrike(x,z,angle,'#eff5ff',15.5,.72,4);return;}if(cue==='impact'){this.bladeFall(x,z,'#bdcfff',3.0,.66);return;}shock('#d9e6ff',.4,3.8,.54);return;
  }
  if(id==='myriad-law-heaven-wheel'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#d9c8ff',.50,'staff');return;}if(cue==='manifest'){this.staffSigil(ox,oz,'#e5d8ff',.86);return;}if(cue==='release'){this.boltField(x,z,'#b99cff',4,5.2,.78);return;}if(cue==='impact'){this.crystals(x,z,'#b9efff',8,5.5,1.02);this.boltField(x,z,'#e6c3ff',6,6.6,1.05);return;}shock('#e5d8ff',1.2,6.9,.82);return;
  }
  if(id==='heavenfall-nine-stars'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#f1e0aa',.42,'bow');return;}if(cue==='manifest'){this.swordArray(x,z,'#f5e8bd',9,4.2,.72);return;}if(cue==='release'){this.lineStrike(x,z,angle,'#fff3c9',10.5,.56,1);return;}if(cue==='impact'){this.arrowRain(x,z,'#f4e5ae',28,7.1,1.28);return;}this.crystals(x,z,'#dbeeff',9,5.8,.88);return;
  }
  if(id==='yin-yang-reversal'){
   if(cue==='charge'){this.chargePulse(ox,oz,'#d9d3c4',.30,'dual');return;}if(cue==='manifest'){this.crossSlash(ox,oz,angle,'#8e84a5',2.6,.42);return;}if(cue==='release'){this.crossSlash(x,z,angle+.8,'#f6f0d8',4.2,.62);return;}if(cue==='impact'){const root=this.groundRoot(x,z),mats=[this.ring(root,'#ece6d5',.55,5.5,.03,80),this.ring(root,'#8e84a5',2.2,4.2,.09,72)];this.add(root,1.1,mats,this.light(root,'#d7cdef',6.5,11),2.1);return;}shock('#c9bedf',1.4,5.9,.66);
  }
 }
 private impact(e:GameEvent){if(this.quality==='off'||e.type!=='cast'||e.x===undefined||e.z===undefined)return;const skill=SKILL_DEFINITIONS[e.skill??''],vfx=skill?.vfx??e.skill??'',color=ELEMENT_COLOR[skill?.element??'wind'],x=e.x,z=e.z,angle=e.angle??0,profiled=skillVfxProfile(vfx);
  if(profiled){this.profiledImpact(e,profiled);return;}
  if(vfx==='weapon-basic'){this.basicWeapon(e,x,z,angle,color);return;}
  if(vfx==='sword-wave'){this.slash(x,z,angle,'#9cf5de',2.35,.46,true);this.lineStrike(x,z,angle,'#b8fff0',8.2,.48,1);return;}
  if(vfx==='sword-step'){this.slash(x,z,angle,'#a8f1e8',2.15,.4,true);this.lineStrike(x,z,angle,'#7fe4ee',3.6,.35,0);return;}
  if(vfx==='shadow-dance'){this.crossSlash(x,z,angle,'#b9f3ea',2.5,.48);const root=this.groundRoot(x,z),m=this.ring(root,'#85d8cf',1.2,3.0,.04,58);this.add(root,.62,[m],undefined,1.9);return;}
  if(vfx==='sword-array'){this.swordArray(x,z,'#caeee2',12,4.2,.9);return;}
  if(vfx==='mountain-cleave'){this.slash(x,z,angle,'#e4c899',3.1,.68,true);const root=this.groundRoot(x,z),m=this.ring(root,'#d8b978',.35,3.25,.02,60);this.add(root,.64,[m],this.light(root,'#d4b06e',3.5,7),.1);return;}
  if(vfx==='sky-sunder'){this.bladeFall(x,z,'#b9efe3',3.6,.9);return;}
  if(vfx==='spear-sweep'){const root=this.groundRoot(x,z),m=this.ring(root,'#e6d5aa',1.0,4.0,.04,72);this.add(root,.58,[m],this.light(root,'#d9c28f',3.2,7),2.4);return;}
  if(vfx==='earth-break'){const root=this.groundRoot(x,z),mats=[this.ring(root,'#e2c18b',.55,4.4,.02),this.ring(root,'#fff0c2',1.7,3.5,.06)];this.add(root,.8,mats,this.light(root,'#e2b87e',4.2,9),.18);return;}
  if(vfx==='moon-cross'){this.crossSlash(x,z,angle,'#d7e8ef',2.1,.42);return;}
  if(vfx==='thousand-flash'){for(const d of [-.9,-.3,.3,.9])this.slash(x,z,angle+d,'#e6f2f4',2.7,.46,true);return;}
  if(vfx==='dragon-thrust'){this.lineStrike(x,z,angle,'#9beee1',7,.48,1);return;}
  if(vfx==='sky-pierce'){this.lineStrike(x,z,angle,'#ebd39b',9,.7,3);return;}
  if(vfx==='piercing-arrow'){this.lineStrike(x,z,angle,'#e8fff8',12,.5,2);return;}
  if(vfx==='fire-orb'){const root=this.groundRoot(x,z),mats=[this.ring(root,'#ff6b38',.35,3.1,.04),this.ring(root,'#ffd06e',1.1,2.2,.18)],orbMat=shader('#ffb04f'),orb=new T.Mesh(new T.IcosahedronGeometry(.55,1),orbMat);orb.position.y=1.1;root.add(orb);mats.push(orbMat);this.add(root,.82,mats,this.light(root,'#ff5b2c',6,8),.7);return;}
  if(vfx==='frost-seal'){this.crystals(x,z,'#9feaff',10,4.2,.95);return;}
  if(vfx==='frost-arrow'){this.lineStrike(x,z,angle,'#c9f7ff',9.5,.46,1);this.crystals(x,z,'#9feaff',6,2.5,.82);return;}
  if(vfx==='thunder-mantra'){this.boltField(x,z,'#b48cff',4,4.3,.62);return;}
  if(vfx==='arrow-rain'){this.arrowRain(x,z,'#d4e9ff',16,5.1,.95);return;}
  if(vfx==='wind-dash'){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];for(let i=0;i<(this.quality==='full'?4:2);i++)materials.push(this.ring(root,'#7fe4ee',.25+i*.13,.31+i*.16,.02+i*.02,40));root.rotation.y=angle;this.add(root,.48,materials,undefined,.3);return;}
  if(vfx==='heal'){const root=this.groundRoot(x,z),materials:T.ShaderMaterial[]=[];for(let i=0;i<(this.quality==='full'?3:2);i++)materials.push(this.ring(root,i%2?'#9ee7b9':'#d2f7cd',.5+i*.45,.62+i*.53,i*.32,48));this.add(root,1.05,materials,this.light(root,'#9ee7b9',2.8,5),.45);return;}
  if(vfx==='legendary-thunder-prison'){this.boltField(x,z,'#c49bff',9,6.1,1.25);return;}
  if(vfx==='legendary-fire-dragon'){this.fireDragon(x,z,angle);return;}
  if(vfx==='legendary-frost-volley'){this.crystals(x,z,'#b4f0ff',12,6.2,1.35);this.arrowRain(x,z,'#d8f8ff',24,6.1,1.2);return;}
  if(vfx==='mythic-taixu'){this.taixu(x,z);return;}
  if(vfx==='mythic-star-collapse'){this.swordArray(x,z,'#f3df9f',18,6.5,1.35);this.taixu(x,z);return;}
  if(vfx==='mythic-void-rift'){this.bladeFall(x,z,'#8e73bb',5.8,1.22);this.crossSlash(x,z,angle,'#c1a3e8',4.4,.88);return;}
  if(vfx==='mythic-star-pierce'){this.lineStrike(x,z,angle,'#d7e5ff',15.5,.95,4);this.bladeFall(x,z,'#9fb6df',3.2,.82);return;}
  if(vfx==='mythic-law-wheel'){this.staffSigil(x,z,'#e5d8ff',1.18);this.boltField(x,z,'#b99cff',6,6.6,1.18);this.crystals(x,z,'#b9efff',8,5.5,1.05);return;}
  if(vfx==='mythic-nine-stars'){this.arrowRain(x,z,'#f4e5ae',28,7.1,1.28);this.crystals(x,z,'#dbeeff',9,5.8,1.08);return;}
  if(vfx==='mythic-yinyang'){this.crossSlash(x,z,angle,'#f6f0d8',4.8,.9);const root=this.groundRoot(x,z),mats=[this.ring(root,'#ece6d5',.55,5.5,.03,80),this.ring(root,'#8e84a5',2.2,4.2,.09,72)];this.add(root,1.1,mats,this.light(root,'#d7cdef',6.5,11),2.1);return;}
  if(e.skill==='flight-on'||e.skill==='flight-off'){const root=this.groundRoot(x,z),m=this.ring(root,e.skill==='flight-on'?'#82e7ed':'#c8d9d6',.35,e.skill==='flight-on'?2.15:1.35,.02);this.add(root,.65,[m]);}
 }
 cast(e:GameEvent,serverTime?:number){
  if(this.quality==='off'||e.type!=='cast'||e.x===undefined||e.z===undefined)return;if(e.skill==='flight-on'||e.skill==='flight-off'){this.impact(e);return;}
  const skill=SKILL_DEFINITIONS[e.skill??''];if(!skill){this.impact(e);return;}
  const weaponProfile=e.weaponProfile??'sword',fallbackWindup=e.skill==='basic'?WEAPON_PROFILES[weaponProfile].windup:(skill.hitFrame||skill.windup||WEAPON_PROFILES[weaponProfile].windup),authoredImpactDelay=Math.max(.02,e.impactDelay??fallbackWindup),elapsed=e.castAt!==undefined&&serverTime!==undefined?Math.max(0,serverTime-e.castAt):0,remainingImpactDelay=e.impactAt!==undefined&&serverTime!==undefined?Math.max(.02,e.impactAt-serverTime):Math.max(.02,authoredImpactDelay-elapsed),color=ELEMENT_COLOR[skill.element??'physical'],ox=e.originX??e.x,oz=e.originZ??e.z,choreo=mythicChoreography(e.skill??''),profiled=skillVfxProfile(skill.vfx);
  if(choreo){const scale=authoredImpactDelay/Math.max(.001,skill.hitFrame);let impactRecovered=false;for(const cue of choreo.vfxTimeline){const delay=cue.at*scale-elapsed;if(delay>.01)this.scheduled.push({age:0,delay,event:e,cue:cue.cue});else if(cue.cue==='impact'&&!impactRecovered&&elapsed>=authoredImpactDelay){this.mythicCue(e,'impact');impactRecovered=true;}}return;}
  if(profiled){
   this.startTelegraph(e,profiled,remainingImpactDelay,Math.min(1,elapsed/authoredImpactDelay));
   if(elapsed<authoredImpactDelay*.72)this.chargePulse(ox,oz,profiled.chargeColor,Math.min(.58,Math.max(.12,remainingImpactDelay*.72)),weaponProfile,profiled.chargeScale);
   if(profiled.projectile){this.launchProfileProjectile(e,profiled,authoredImpactDelay,elapsed);return;}
   this.scheduled.push({age:0,delay:Math.max(.02,remainingImpactDelay-.02),event:e});return;
  }
  if(e.skill!=='basic'&&elapsed<authoredImpactDelay*.75)this.chargePulse(ox,oz,color,Math.min(.52,Math.max(.14,remainingImpactDelay*.8)),weaponProfile);this.scheduled.push({age:0,delay:Math.max(.02,remainingImpactDelay-.02),event:e});
 }
 private updateProjectiles(dt:number,time:number){
  for(let i=this.projectiles.length-1;i>=0;i--){
   const p=this.projectiles[i];p.age+=dt;const t=Math.min(1,p.age/p.duration),u=1-t,pos=p.visual.root.position;
   pos.set(p.start.x*u*u+2*p.control.x*u*t+p.end.x*t*t,p.start.y*u*u+2*p.control.y*u*t+p.end.y*t*t,p.start.z*u*u+2*p.control.z*u*t+p.end.z*t*t);
   p.visual.root.rotation.y+=dt*5.2;p.visual.shell.scale.setScalar(.92+.18*Math.sin(time*13));p.visual.shellMat.opacity=.24+.13*Math.sin(time*10)*.5+.07;
   if(p.visual.shape==='shard'){
    const dx=2*u*(p.control.x-p.start.x)+2*t*(p.end.x-p.control.x),dy=2*u*(p.control.y-p.start.y)+2*t*(p.end.y-p.control.y),dz=2*u*(p.control.z-p.start.z)+2*t*(p.end.z-p.control.z);
    this.scratchDirection.set(dx,dy,dz).normalize();p.visual.root.quaternion.setFromUnitVectors(this.projectileUp,this.scratchDirection);
   }
   p.trailAcc+=dt*p.trailRate*(this.quality==='reduced'?.42:1);while(p.trailAcc>=1){p.trailAcc-=1;const jitter=.08,fire=p.visual.shape==='orb';this.emitSpellParticle(pos.x+(Math.random()-.5)*jitter,pos.y+(Math.random()-.5)*jitter,pos.z+(Math.random()-.5)*jitter,p.color,(Math.random()-.5)*.18,fire?.18:-.05,(Math.random()-.5)*.18,fire?.34:.42,fire?-.15:.12,.12);}
   p.last.copy(pos);if(t>=1){this.releaseProjectile(p.visual);this.projectiles.splice(i,1);if(p.impact)this.impact(p.event);}
  }
 }
 private updateFields(dt:number,time:number){
  for(let i=this.fields.length-1;i>=0;i--){const f=this.fields[i];f.age+=dt;const fade=Math.min(1,(f.life-f.age)/.65);f.root.rotation.y+=dt*.34;for(const mat of f.materials){mat.uniforms.uAlpha.value=Math.max(0,.45+.4*fade);mat.uniforms.uPulse.value=time*1.35;}
   const particleRate=f.particleRate*(this.quality==='reduced'?.34:1);f.particleAcc+=dt*particleRate;while(f.particleAcc>=1){f.particleAcc-=1;const a=Math.random()*Math.PI*2,r=f.radius*Math.sqrt(Math.random()),x=f.root.position.x+Math.cos(a)*r,z=f.root.position.z+Math.sin(a)*r,y=f.root.position.y+2.4+Math.random()*4.2;this.emitSpellParticle(x,y,z,Math.random()>.18?f.color:f.secondaryColor,(Math.random()-.5)*.7,-1.2-Math.random()*2.2,(Math.random()-.5)*.7,.75+Math.random()*.8,.55,.04);}
   f.strikeAcc+=dt*f.strikeRate*(this.quality==='reduced'?.42:1);while(f.strikeAcc>=1){f.strikeAcc-=1;const a=Math.random()*Math.PI*2,r=f.radius*Math.sqrt(Math.random())*.85,px=f.root.position.x+Math.cos(a)*r,pz=f.root.position.z+Math.sin(a)*r;this.blizzardStrike(px,pz,f.secondaryColor);for(let n=0;n<(this.quality==='reduced'?2:5);n++)this.emitSpellParticle(px,heightAt(px,pz)+2.6+Math.random()*2,pz,f.secondaryColor,(Math.random()-.5)*.35,-3.4-Math.random()*2,(Math.random()-.5)*.35,.5+Math.random()*.35,.5,.02);}
   if(f.age>=f.life){f.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});f.root.removeFromParent();this.fields.splice(i,1);}
  }
 }
 private updateTelegraphs(dt:number,time:number){
  for(let i=this.telegraphs.length-1;i>=0;i--){const t=this.telegraphs[i];t.age+=dt;const local=Math.min(1,t.age/Math.max(.001,t.life)),phase=t.startPhase+(1-t.startPhase)*local,pulse=.012*Math.sin(time*9.5);t.root.scale.setScalar(t.baseScale+phase*.1+pulse);t.root.rotation.y+=dt*(.32+phase*.55);for(const mat of t.materials){mat.uniforms.uAlpha.value=.16+phase*.62;mat.uniforms.uPulse.value=time*(1.2+phase*1.8);}if(t.age>=t.life){this.disposeDynamicRoot(t.root);this.telegraphs.splice(i,1);}}
 }
 private updateSpellParticles(dt:number){const pos=this.spellPoints.geometry.attributes.position as T.BufferAttribute,col=this.spellPoints.geometry.attributes.color as T.BufferAttribute,limit=this.quality==='reduced'?144:this.spellParticles.length;for(let i=0;i<this.spellParticles.length;i++){const p=this.spellParticles[i];if(i>=limit||p.life<=0){pos.setXYZ(i,0,-100,0);continue;}p.life-=dt;const damping=Math.max(0,1-p.drag*dt);p.vx*=damping;p.vz*=damping;p.vy-=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const alpha=Math.max(0,p.life/p.max);pos.setXYZ(i,p.x,p.y,p.z);col.setXYZ(i,p.color.r*alpha,p.color.g*alpha,p.color.b*alpha);}pos.needsUpdate=true;col.needsUpdate=true;}
 update(dt:number,time:number){
  for(let i=this.scheduled.length-1;i>=0;i--){const fx=this.scheduled[i];fx.age+=dt;if(fx.age>=fx.delay){if(fx.cue)this.mythicCue(fx.event,fx.cue);else this.impact(fx.event);this.scheduled.splice(i,1);}}
  this.updateProjectiles(dt,time);this.updateFields(dt,time);this.updateTelegraphs(dt,time);this.updateSpellParticles(dt);
  for(let i=this.active.length-1;i>=0;i--){const fx=this.active[i];fx.age+=dt;const t=Math.min(1,fx.age/fx.life),fade=1-t;fx.root.scale.setScalar(.74+t*.78);fx.root.rotation.y+=dt*fx.spin;for(const m of fx.materials){m.uniforms.uAlpha.value=fade*fade;m.uniforms.uPulse.value=time;}if(fx.light)fx.light.intensity=4.5*fade;if(fx.age>=fx.life){fx.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});fx.root.removeFromParent();this.active.splice(i,1);}}
 }
 dispose(){
  this.scheduled.length=0;for(const fx of this.active){fx.root.removeFromParent();fx.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)m.dispose();}});}this.active.length=0;
  for(const p of this.projectiles)this.releaseProjectile(p.visual);this.projectiles.length=0;for(const p of this.projectilePool){p.root.removeFromParent();p.coreMat.dispose();p.shellMat.dispose();}this.projectilePool.length=0;
  for(const f of this.fields)this.disposeDynamicRoot(f.root);this.fields.length=0;for(const t of this.telegraphs)this.disposeDynamicRoot(t.root);this.telegraphs.length=0;
  this.spellPoints.removeFromParent();this.spellPoints.geometry.dispose();(this.spellPoints.material as T.Material).dispose();this.orbGeometry.dispose();this.orbShellGeometry.dispose();this.shardGeometry.dispose();this.shardShellGeometry.dispose();
 }
}
