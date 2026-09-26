import * as T from 'three';
import type { Actor,Drop,GameEvent,Monster } from '../../shared/types';
import { ITEMS,APPEARANCES } from '../../shared/data/equipment';
import { RARITIES } from '../../shared/data/rarities';
import { EFFECTS } from '../../shared/data/effects';
import { MONSTER_SKILLS } from '../../shared/domains/combat';
import { monsterTelegraphProfile } from '../../shared/data/monster-telegraph-profiles';
import { heightAt } from '../../shared/data/world';
import { MONSTERS } from '../../shared/data/monsters';
import { armorModel,weaponModel } from '../character/appearance';
import { disposeTree,material,mesh,ring } from './primitives';
import { OpenQuarksVfx } from './open-quarks-vfx';
import { XianxiaSkillFx } from './xianxia-skill-fx';
import { SKILL_DEFINITIONS } from '../../shared/data/skills';

type Particle={x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;max:number;color:T.Color};
type MonsterTelegraphVisual={root:T.Group;attack:Monster['attack'];fill:T.MeshBasicMaterial;border:T.MeshBasicMaterial;guides:T.MeshBasicMaterial[]};
type StatusVisual={root:T.Group;accent:T.Group;ground:T.MeshBasicMaterial;glow:T.MeshBasicMaterial;phase:number;effectId:string};
const WORLD_STATUS_EFFECTS=new Set(['poison','burn','bleed','slow','freeze','shock']);

export class VisualEffects {
 drops=new Map<string,T.Group>();telegraphs=new Map<string,MonsterTelegraphVisual>();private statusVisuals=new Map<string,StatusVisual>();private particles:Particle[]=[];private points:T.Points;private cursor=0;private age=0;private quality:'off'|'reduced'|'full'='full';
 private openVfx:OpenQuarksVfx;private skillFx:XianxiaSkillFx;
 constructor(private scene:T.Scene){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(768*3),3));geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(768*3),3));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'white');gradient.addColorStop(.2,'rgba(255,255,255,.8)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  this.points=new T.Points(geometry,new T.PointsMaterial({size:.12,map:new T.CanvasTexture(canvas),transparent:true,vertexColors:true,depthWrite:false,blending:T.AdditiveBlending}));this.points.frustumCulled=false;scene.add(this.points);this.openVfx=new OpenQuarksVfx(scene);this.skillFx=new XianxiaSkillFx(scene);
  for(let i=0;i<768;i++)this.particles.push({x:0,y:-100,z:0,vx:0,vy:0,vz:0,life:0,max:1,color:new T.Color()});
 }
 burst(x:number,y:number,z:number,color:string,count=24,strength=2){if(this.quality==='off')return;count=this.quality==='reduced'?Math.max(1,Math.ceil(count*.35)):count;if(this.quality==='full')this.openVfx.burst(x,y,z,color,Math.ceil(count*.75),strength);const pool=this.quality==='reduced'?256:768;for(let i=0;i<count;i++){const p=this.particles[this.cursor++%pool],a=Math.random()*6.28,s=.4+Math.random()*strength;Object.assign(p,{x,y,z,vx:Math.cos(a)*s,vy:1+Math.random()*strength,vz:Math.sin(a)*s,life:.35+Math.random()*.65,max:1});p.color.set(color);}}
 event(e:GameEvent,serverTime?:number){this.skillFx.cast(e,serverTime);if(e.x===undefined||e.z===undefined)return;const y=heightAt(e.x,e.z)+.9,element=SKILL_DEFINITIONS[e.skill??'']?.element,elementColor=element==='lightning'?'#c7a8ff':element==='fire'?'#ff8a50':element==='frost'?'#b8f1ff':element==='wind'?'#a7eadc':element==='arcane'?'#f2dda1':'#d9e8df';if(e.type==='hit')this.burst(e.x,y,e.z,e.value!<0?'#a6e4b3':e.critical?'#ffd297':elementColor,e.critical?34:18,2.5);if(e.type==='drop')this.burst(e.x,y-.4,e.z,RARITIES[e.rarity!].color,32,1.3);if(e.type==='pickup')this.burst(e.x,y-.5,e.z,RARITIES[e.rarity??'common'].color,e.rarity==='epic'||e.rarity==='legendary'?42:24,1.65);}
 private createTelegraph(m:Monster){
  const a=m.attack!;const skill=MONSTER_SKILLS[a.skill],radius=skill?.radius??2,profile=monsterTelegraphProfile(a.skill),root=new T.Group();root.userData.attack=a;root.position.set(0,0,0);
  const endpoint=new T.Group();endpoint.position.set(a.point.x,heightAt(a.point.x,a.point.z)+.07,a.point.z);root.add(endpoint);
  const fill=new T.MeshBasicMaterial({color:profile.color,transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide});const fillMesh=new T.Mesh(new T.CircleGeometry(radius,48),fill);fillMesh.rotation.x=-Math.PI/2;endpoint.add(fillMesh);
  const border=new T.MeshBasicMaterial({color:profile.color,transparent:true,opacity:.72,depthWrite:false});const borderMesh=ring(endpoint,border,radius,.045);borderMesh.rotation.x=-Math.PI/2;
  const guides:T.MeshBasicMaterial[]=[];const dx=a.point.x-m.x,dz=a.point.z-m.z,length=Math.max(.2,Math.hypot(dx,dz)),angle=Math.atan2(dx,dz);
  if(profile.guide==='path'){
   const guideRoot=new T.Group();guideRoot.position.set(m.x,(heightAt(m.x,m.z)+heightAt(a.point.x,a.point.z))*.5+.055,m.z);guideRoot.rotation.y=angle;root.add(guideRoot);
   const mat=new T.MeshBasicMaterial({color:profile.color,transparent:true,opacity:profile.guideOpacity,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});guides.push(mat);
   const lane=new T.Mesh(new T.PlaneGeometry(Math.max(.42,radius*profile.widthScale),length),mat);lane.rotation.x=-Math.PI/2;lane.position.z=length*.5;guideRoot.add(lane);
   const edgeMat=mat.clone();edgeMat.opacity=profile.guideOpacity*1.8;guides.push(edgeMat);for(const side of [-1,1]){const edge=new T.Mesh(new T.PlaneGeometry(.035,length),edgeMat);edge.rotation.x=-Math.PI/2;edge.position.set(side*Math.max(.22,radius*profile.widthScale*.5),.004,length*.5);guideRoot.add(edge);}
  }else if(profile.guide==='cone'){
   const guideRoot=new T.Group();guideRoot.position.set(m.x,heightAt(m.x,m.z)+.06,m.z);guideRoot.rotation.y=angle;root.add(guideRoot);
   const shape=new T.Shape();shape.moveTo(0,0);shape.absarc(0,0,Math.max(length,skill?.range??radius),-Math.PI/2-profile.coneAngle,-Math.PI/2+profile.coneAngle,false);shape.lineTo(0,0);
   const mat=new T.MeshBasicMaterial({color:profile.color,transparent:true,opacity:profile.guideOpacity,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});guides.push(mat);const cone=new T.Mesh(new T.ShapeGeometry(shape,20),mat);cone.rotation.x=-Math.PI/2;guideRoot.add(cone);
  }
  this.scene.add(root);return {root,attack:a,fill,border,guides};
 }
 private createStatusVisual(actor:Actor,effectId:string,radius:number){
  const def=EFFECTS[effectId],root=new T.Group(),accent=new T.Group();root.position.set(actor.x,heightAt(actor.x,actor.z)+.035,actor.z);root.add(accent);
  const ground=new T.MeshBasicMaterial({color:def.color,transparent:true,opacity:.34,depthWrite:false,blending:T.AdditiveBlending});const groundRing=ring(root,ground,radius,.025);groundRing.rotation.x=-Math.PI/2;
  const glow=new T.MeshBasicMaterial({color:def.color,transparent:true,opacity:.48,depthWrite:false,blending:T.AdditiveBlending});const halo=ring(accent,glow,radius*.56,.018,[0,.62,0]);halo.rotation.x=Math.PI/2;
  const geometry=effectId==='burn'?new T.ConeGeometry(.07,.24,6):effectId==='slow'||effectId==='freeze'?new T.OctahedronGeometry(.075):new T.SphereGeometry(.05,7,5);
  for(let i=0;i<3;i++){const mote=new T.Mesh(geometry,glow);const a=i*Math.PI*2/3;mote.position.set(Math.sin(a)*radius*.58,.28+i*.18,Math.cos(a)*radius*.58);accent.add(mote);}
  root.userData.statusEffect=true;this.scene.add(root);return {root,accent,ground,glow,phase:Math.random()*Math.PI*2,effectId};
 }
 private syncStatuses(monsters:Monster[],self?:Actor){
  const actors:{actor:Actor;radius:number}[]=[];for(const m of monsters)actors.push({actor:m,radius:Math.max(.42,Math.min(1.25,(MONSTERS[m.defId]?.combatRadius??.7)*.78))});if(self)actors.push({actor:self,radius:.58});
  const active=new Set<string>();for(const {actor,radius} of actors){for(const effect of actor.effects??[]){if(!WORLD_STATUS_EFFECTS.has(effect.id)||!EFFECTS[effect.id])continue;const key=`${actor.id}:${effect.id}`;active.add(key);let visual=this.statusVisuals.get(key);if(!visual){visual=this.createStatusVisual(actor,effect.id,radius);this.statusVisuals.set(key,visual);}visual.root.position.set(actor.x,heightAt(actor.x,actor.z)+.035,actor.z);visual.root.visible=this.quality!=='off';visual.accent.visible=this.quality==='full';}}
  for(const [key,visual] of this.statusVisuals)if(!active.has(key)){disposeTree(visual.root);this.statusVisuals.delete(key);}
 }
 sync(drops:Drop[],monsters:Monster[],self?:Actor){
  const ids=new Set(drops.map(d=>d.id));for(const [id,g] of this.drops)if(!ids.has(id)){disposeTree(g);this.drops.delete(id);}
  for(const d of drops)if(!this.drops.has(d.id)){
   const g=new T.Group(),rarity=RARITIES[d.item.rarity],base=ITEMS[d.item.baseId],a=APPEARANCES[base.appearanceId??''];g.position.set(d.x,heightAt(d.x,d.z)+.08,d.z);g.userData.dropId=d.id;
   const item=a?(base.slot==='mainhand'?weaponModel(a):armorModel(a)):mesh(new T.Group(),new T.OctahedronGeometry(.3),material(rarity.color,.6,.3));item.scale.setScalar(base.slot==='mainhand'?.5:.4);item.rotation.z=base.slot==='mainhand'?-1.3:.2;item.position.y=.16;g.add(item);
   const circle=ring(g,new T.MeshBasicMaterial({color:rarity.color,transparent:true,opacity:.75,depthWrite:false}),.38,.024,[0,.025,0]);circle.rotation.x=-Math.PI/2;
   const beam=new T.Mesh(new T.CylinderGeometry(.06,.24,rarity.beam,10,1,true),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{color:{value:new T.Color(rarity.color)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 color;void main(){float a=pow(1.-vUv.y,1.5)*.32;gl_FragColor=vec4(color,a);}'}));beam.position.y=rarity.beam/2;beam.userData.optionalVfx=true;beam.visible=this.quality!=='off';g.add(beam);this.scene.add(g);this.drops.set(d.id,g);
  }
  const active=new Set<string>();for(const m of monsters)if(m.attack&&!m.attack.resolved&&m.hp>0){const a=m.attack,key=`${m.id}:${a.id}`;active.add(key);if(!this.telegraphs.has(key))this.telegraphs.set(key,this.createTelegraph(m));}
  for(const [key,visual] of this.telegraphs)if(!active.has(key)){disposeTree(visual.root);this.telegraphs.delete(key);}
  this.syncStatuses(monsters,self);
 }
 setQuality(quality:'off'|'reduced'|'full'){this.quality=quality;this.skillFx.setQuality(quality);this.openVfx.setEnabled(quality==='full');this.points.visible=quality!=='off';if(quality!=='full'){const pos=this.points.geometry.attributes.position as T.BufferAttribute;for(let i=256;i<768;i++)pos.setXYZ(i,0,-100,0);pos.needsUpdate=true;}for(const g of this.drops.values())g.traverse(o=>{if(o.userData.optionalVfx)o.visible=quality!=='off';});for(const visual of this.statusVisuals.values()){visual.root.visible=quality!=='off';visual.accent.visible=quality==='full';}}
 update(dt:number,time:number){this.skillFx.update(dt,time);this.openVfx.update(dt);
  if(this.quality!=='off'){const pos=this.points.geometry.attributes.position as T.BufferAttribute,col=this.points.geometry.attributes.color as T.BufferAttribute,limit=this.quality==='reduced'?256:768;for(let i=0;i<limit;i++){const p=this.particles[i];if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*2.2;pos.setXYZ(i,p.x,p.y,p.z);const alpha=Math.max(0,p.life);col.setXYZ(i,p.color.r*alpha,p.color.g*alpha,p.color.b*alpha);}else pos.setXYZ(i,0,-100,0);}pos.needsUpdate=true;col.needsUpdate=true;}
  for(const visual of this.telegraphs.values()){const a=visual.attack;if(!a)continue;const span=Math.max(.001,a.hitAt-a.started),f=Math.max(0,Math.min(1,(time-a.started)/span)),pulse=.82+.18*Math.sin(time*14);visual.fill.opacity=(.07+f*.27)*pulse;visual.border.opacity=.52+f*.42;for(const guide of visual.guides)guide.opacity=Math.min(.52,guide.opacity*(.985)+(.11+f*.22)*.015);}
  for(const visual of this.statusVisuals.values()){visual.phase+=dt;const pulse=.78+.22*Math.sin(visual.phase*4.6);visual.ground.opacity=.24+.15*pulse;visual.glow.opacity=this.quality==='full'?.34+.24*pulse:0;visual.accent.rotation.y+=dt*(visual.effectId==='shock'?3.8:1.4);visual.accent.position.y=.04+Math.sin(visual.phase*2.4)*.045;}
  this.age+=dt;if(this.quality!=='off'&&this.age>(this.quality==='reduced'?.32:.15)){this.age=0;for(const g of this.drops.values()){const y=g.children.find(o=>o instanceof T.Mesh&&o.geometry.type==='CylinderGeometry')?.position.y??1;if(y>1)this.burst(g.position.x+Math.random()*.5-.25,g.position.y+.1,g.position.z+Math.random()*.5-.25,'#d1c2eb',1,.3);}}
 }
}
