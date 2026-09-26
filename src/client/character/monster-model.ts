import * as T from 'three';
import { openMonsterAsset } from '../assets/open-monster-assets';
import type { Monster,MonsterDef } from '../../shared/types';
import { box,cylinder,disposeTree,ellipsoid,joint,material,ring,shadowEllipsoid,tube } from '../rendering/primitives';
import { GoldenQueenAnimator } from './golden-queen-animator';
const PLAYER_REFERENCE_HEIGHT=1.92;
const BOSS_MIN_HEIGHT_RATIO=2;
const BOSS_MAX_HEIGHT_RATIO=3;
export function monsterVisualHeight(def:MonsterDef){
 const fallback=1.85*def.scale;if(def.visualHeightRatio===undefined)return fallback;
 const ratio=def.aiProfile==='boss'?T.MathUtils.clamp(def.visualHeightRatio,BOSS_MIN_HEIGHT_RATIO,BOSS_MAX_HEIGHT_RATIO):def.visualHeightRatio;
 return PLAYER_REFERENCE_HEIGHT*ratio;
}
export interface HumanoidSkeletonFrame {height:number;groundY:number;centerX:number;centerZ:number}
/**
 * Measure a Mixamo humanoid from its skeleton instead of the imported mesh bounds.
 * Skinned GLBs can carry centimetre Armature scale, axis-conversion rotations, weapons and
 * stale mesh bounds; using Box3 height on those assets can amplify a tiny wrong axis into a giant.
 */
export function measureHumanoidSkeletonFrame(root:T.Object3D):HumanoidSkeletonFrame|undefined{
 root.updateMatrixWorld(true);
 const point=(...names:string[])=>{for(const name of names){const o=root.getObjectByName(name);if(o)return o.getWorldPosition(new T.Vector3());}return undefined;};
 const top=point('mixamorig:HeadTop_End','HeadTop_End','mixamorig:Head','Head');
 const leftGround=point('mixamorig:LeftToeBase','LeftToeBase','mixamorig:LeftFoot','LeftFoot');
 const rightGround=point('mixamorig:RightToeBase','RightToeBase','mixamorig:RightFoot','RightFoot');
 const center=point('mixamorig:Hips','Hips');
 if(!top||(!leftGround&&!rightGround)||!center)return undefined;
 const grounds=[leftGround,rightGround].filter((v):v is T.Vector3=>!!v),groundY=Math.min(...grounds.map(v=>v.y));
 const height=top.y-groundY;if(!Number.isFinite(height)||height<.25)return undefined;
 return {height,groundY,centerX:center.x,centerZ:center.z};
}
export class MonsterModel {
 root=new T.Group();body=new T.Group();head=new T.Group();legs:T.Group[]=[];wings:T.Group[]=[];tails:T.Object3D[]=[];segments:T.Group[]=[];private phase=0;private assetRoot=new T.Group();private assetMotion=new T.Group();private assetMixer?:T.AnimationMixer;private assetClip?:T.AnimationClip;private queenAnimator?:GoldenQueenAnimator;private disposed=false;
 constructor(public def:MonsterDef){
  this.root.scale.setScalar(def.scale);this.assetRoot.add(this.assetMotion);this.root.add(this.body,this.assetRoot);const skin=material(def.color,.12,.78),dark=material('#303f40',.1,.8),bone=material('#c4baa2',.2,.55),glow=material(def.vfx?'#c1a4ef':'#d9c39b',.25,.35,def.vfx?2.2:.45);
  const leg=(x:number,z:number,long=.7)=>{const l=joint(this.body,'leg'+this.legs.length,x,long,z);ellipsoid(l,skin,[0,-long*.25,0],[.14,long*.38,.14]);const lower=joint(l,'lower',0,-long*.55,.02);ellipsoid(lower,skin,[0,-long*.2,.05],[.09,long*.3,.09]);ellipsoid(lower,dark,[0,-long*.42,.1],[.12,.09,.19]);this.legs.push(l);};
  if(def.model==='snake'){
   for(let i=0;i<14;i++){const s=joint(this.body,'segment'+i,0,.22,-i*.19);ellipsoid(s,skin,[0,0,0],[.2-i*.008,.2-i*.008,.17]);for(const sign of [-1,1]){const feather=ellipsoid(s,i%2?bone:skin,[sign*.23,.08,0],[.19,.025,.07]);feather.rotation.z=sign*.4;feather.rotation.y=sign*.6;}this.segments.push(s);}
   this.head=joint(this.body,'Head',0,.4,.22);ellipsoid(this.head,skin,[0,0,0],[.27,.2,.36]);for(const sign of [-1,1]){tube(this.head,bone,[[sign*.1,0,.21],[sign*.13,-.14,.29],[sign*.1,-.21,.28]],.025);ellipsoid(this.head,glow,[sign*.18,.08,.2],[.043,.034,.06]);}
  } else if(def.model==='turtle'){
   const shell=ellipsoid(this.body,skin,[0,.62,0],[.8,.52,1]);for(let r=0;r<3;r++)for(let i=0;i<8;i++){const a=i*Math.PI/4,rad=.23+r*.2;const plate=ellipsoid(this.body,material(r%2?'#7b857a':'#536b69',.3,.74),[Math.sin(a)*rad,1.03-r*.12,Math.cos(a)*rad*1.25],[.2,.06,.24]);plate.rotation.z=-Math.sin(a)*r*.14;}
   for(const s of [-1,1])for(const z of [-.5,.5])leg(s*.63,z,.38);
   this.head=joint(this.body,'Head',0,.6,.85);ellipsoid(this.head,skin,[0,0,.12],[.21,.22,.3]);const beak=cylinder(this.head,bone,[0,-.02,.48],0,.13,.33,8);beak.rotation.x=Math.PI/2;
   const tail=tube(this.body,skin,[[0,.5,-.85],[.1,.3,-1.3],[-.25,.2,-1.7],[0,.38,-1.9]],.07);this.tails.push(tail);
  } else if(def.model==='gudiao'){
   ellipsoid(this.body,skin,[0,1.08,0],[.42,.56,.64]);this.head=joint(this.body,'Head',0,1.57,.3);ellipsoid(this.head,skin,[0,0,0],[.25,.3,.28]);const beak=cylinder(this.head,bone,[0,-.06,.34],0,.13,.4,8);beak.rotation.x=Math.PI/2;
   for(const sign of [-1,1]){
    const wing=joint(this.body,'Wing',sign*.3,1.27,0);this.wings.push(wing);
    for(let i=0;i<10;i++){const feather=ellipsoid(wing,i%2?skin:dark,[sign*(.25+i*.12),-.03,i*.055-.1],[.35,.042,.12]);feather.rotation.y=-sign*(.2+i*.08);}
    leg(sign*.2,.1,.69);tube(this.head,bone,[[sign*.15,.16,0],[sign*.18,.4,-.06],[sign*.13,.61,-.12]],.028);
   }
   for(let i=0;i<5;i++){const feather=ellipsoid(this.body,dark,[(i-2)*.11,.9,-.85],[.1,.055,.55]);feather.rotation.y=(i-2)*-.1;}
  }else{
   const boss=def.model==='kui',fox=def.model==='fox',zheng=def.model==='zheng';
   ellipsoid(this.body,skin,[0,boss?1.1:.76,0],[boss?.7:.34,boss?.65:.37,boss?.9:.72]);
   ellipsoid(this.body,skin,[0,boss?1.42:.89,.42],[boss?.64:.37,boss?.66:.4,boss?.6:.43]);
   this.head=joint(this.body,'Head',0,boss?1.52:1.03,boss?.85:.66);ellipsoid(this.head,skin,[0,0,.05],[boss?.46:.23,boss?.44:.25,boss?.48:.29]);ellipsoid(this.head,dark,[0,boss?-.15:-.08,boss?.37:.32],[boss?.34:.13,boss?.23:.1,boss?.21:.19]);
   for(const sign of [-1,1]){
    ellipsoid(this.head,glow,[sign*(boss?.34:.16),.06,boss?.34:.18],[boss?.06:.03,boss?.045:.027,boss?.025:.02]);
    const ear=cylinder(this.head,skin,[sign*(boss?.42:.2),boss?.12:.24,0],0,boss?.19:.12,boss?.38:.32,6);ear.rotation.z=-sign*.5;
    if(boss)tube(this.head,bone,[[sign*.33,.21,.02],[sign*.68,.39,.04],[sign*.73,.79,.22],[sign*.46,.95,.36]],.1,18);
    else if(!fox)for(let i=0;i<5;i++){const mane=cylinder(this.body,i%2?skin:bone,[sign*.24,.9+i*.05,.45-i*.12],0,.1,.22,6);mane.rotation.z=sign*.9;}
   }
   if(boss){leg(0,.05,1);const hoof=ellipsoid(this.body,dark,[0,.12,.14],[.48,.16,.47]);for(let i=0;i<6;i++)tube(this.body,glow,[[.58,1.27-i*.08,.3],[.7,1.24-i*.08,.05],[.59,1.22-i*.08,-.18]],.009);}
   else for(const sign of [-1,1])for(const z of [-.44,.44])leg(sign*.27,z,.66);
   if(zheng)tube(this.head,bone,[[0,.2,0],[0,.53,.06],[0,.7,.23]],.06);
   const count=fox?9:zheng?5:1;
   for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.35;const tail=tube(this.body,fox?material('#e2e0d4',.05,.88):skin,[[0,.7,-.6],[Math.sin(a)*.55,fox?.9:.65,-1.1],[Math.sin(a)*1.15,fox?1.6:.5,-1.45],[Math.sin(a)*1.38,fox?1.8:.8,-1.2]],fox?.13:boss?.085:.07,18);this.tails.push(tail);}
  }
  for(const sign of [-1,1])if(['turtle','gudiao'].includes(def.model))ellipsoid(this.head,glow,[sign*.2,.06,.15],[.032,.034,.033]);
  // Simplified animated shadow silhouette; detailed feathers/horns/tails stay out of the shadow pass.
  const boss=def.model==='kui';shadowEllipsoid(this.body,[0,boss?1.15:.8,0],[boss?.75:.42,boss?.72:.5,boss?.95:.75]);shadowEllipsoid(this.head,[0,0,.08],[boss?.48:.27,boss?.46:.28,boss?.52:.34]);
  void this.installOpenAsset();
 }
 private async installOpenAsset(){
  const loaded=await openMonsterAsset(this.def);if(!loaded||this.disposed)return;
  const object=loaded.object;object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(object),size=new T.Vector3();box.getSize(size);
  const humanoid=this.def.model==='golden-queen'?measureHumanoidSkeletonFrame(object):undefined,sourceHeight=humanoid?.height??size.y;if(sourceHeight<.001)return;
  // P0.26.8 HF2: fit humanoid bosses by feet-to-head skeleton height. The supplied Queen GLB carries
  // a 0.01 Armature scale + axis conversion + sword mesh, so a raw mesh Box3 can report the wrong
  // axis as "height" and multiply the entire actor into a giant. Skeleton height is invariant to that.
  const targetWorldHeight=monsterVisualHeight(this.def),targetLocalHeight=targetWorldHeight/Math.max(.001,this.def.scale);
  object.scale.multiplyScalar(targetLocalHeight/sourceHeight);object.updateMatrixWorld(true);
  const fittedHumanoid=this.def.model==='golden-queen'?measureHumanoidSkeletonFrame(object):undefined;
  if(fittedHumanoid){object.position.x-=fittedHumanoid.centerX;object.position.y-=fittedHumanoid.groundY;object.position.z-=fittedHumanoid.centerZ;}
  else{const fitted=new T.Box3().setFromObject(object),center=new T.Vector3();fitted.getCenter(center);object.position.set(-center.x,-fitted.min.y,-center.z);}
  object.updateMatrixWorld(true);this.assetMotion.add(object);this.body.visible=false;
  if(this.def.model==='golden-queen'){
   // The supplied Queen GLB declares a clip but contains only two near-identical frames (~0.067 s).
   // Ignore that unusable pseudo-animation and drive the Mixamo skeleton with verified locomotion + attack overlays.
   this.queenAnimator=new GoldenQueenAnimator(object);this.queenAnimator.update(0,0,undefined,0);await this.queenAnimator.init();
  }else if(loaded.clip){this.assetClip=loaded.clip;this.assetMixer=new T.AnimationMixer(object);const action=this.assetMixer.clipAction(loaded.clip);action.setLoop(T.LoopRepeat,Infinity);action.play();}
  console.info(`[P0.25.9R15] monster asset active: ${this.def.id} <- ${loaded.source} (${loaded.license}) · animation=${this.def.model==='golden-queen'?'queen-mixamo+procedural':loaded.clip?'embedded':'static-fallback'}`);
 }
 private updateAssetAnimation(dt:number,time:number,actor?:Monster,speed=0){
  if(this.queenAnimator){this.queenAnimator.update(dt,time,actor,speed);return;}
  if(!this.assetMixer||!this.assetClip)return;const q=Math.max(.001,this.assetClip.duration/4);let segment=0,local=(time*(speed>.15?1.35:.7))%q;
  if(actor?.hp!==undefined&&actor.hp<=0){segment=2;local=Math.min(q-.001,Math.max(0,time-(actor.deadAt??time))*.75);}else if(actor?.attack){segment=1;local=Math.min(q-.001,Math.max(0,(time-actor.attack.started)/Math.max(.001,actor.attack.endsAt-actor.attack.started))*q);}else if(speed>.15)segment=3;
  this.assetMixer.setTime(Math.min(this.assetClip.duration-.001,segment*q+local));
 }
 update(dt:number,time:number,actor?:Monster,speed=0){
  this.updateAssetAnimation(dt,time,actor,speed);this.phase+=dt*Math.max(.5,speed/this.def.scale*2.4);const move=Math.min(1,speed/1.5),attack=actor?.attack,p=attack?Math.max(0,Math.min(1,(time-attack.started)/Math.max(.001,attack.endsAt-attack.started))):0;
  this.legs.forEach((l,i)=>{l.rotation.x=Math.sin(this.phase+(i===0||i===3?0:Math.PI))*.6*move;});
  this.body.position.y=this.def.model==='gudiao'?Math.sin(time*2)*.13+.16:this.def.model==='kui'?Math.abs(Math.sin(this.phase))*.1*move:Math.sin(this.phase*2)*.035*move;
  this.body.rotation.x=attack?Math.sin(p*Math.PI*2)*.19:0;
  this.head.rotation.x=Math.sin(time*.9)*.025-(attack?Math.sin(p*Math.PI)*.22:0);
  this.tails.forEach((t,i)=>t.rotation.z=Math.sin(time*1.7+i*.6)*.08);
  this.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.2+Math.sin(time*(attack?12:4))*.3));
  this.segments.forEach((s,i)=>{s.position.x=Math.sin(time*2-i*.6)*(.07+i*.012);s.rotation.y=Math.cos(time*2-i*.6)*.2;});
  if(this.assetMotion.children.length){
   if(!this.assetMixer&&!this.queenAnimator){
    // Generic fallback is retained only for ordinary third-party static monster meshes.
    // Map bosses are procedural and animated by body/head/legs/wings/tails above.
    this.assetMotion.position.set(0,Math.abs(Math.sin(this.phase*1.15))*.026*move,0);this.assetMotion.rotation.set(attack?-Math.sin(p*Math.PI)*.1:0,attack?Math.sin(p*Math.PI)*.08:Math.sin(time*.7)*.012,0);this.assetMotion.scale.setScalar(1);
   }else{this.assetMotion.position.set(0,0,0);this.assetMotion.rotation.set(0,0,0);this.assetMotion.scale.setScalar(1);}
  }
  if(actor){const hit=Math.max(0,1-(time-actor.hitAt)/.3);this.body.rotation.z=hit*.16;this.body.position.z=-hit*.12;this.assetRoot.position.z=-hit*.12;
   if(actor.hp<=0){this.body.rotation.z=Math.PI*.43;this.body.position.y=-.2;this.assetRoot.rotation.z=Math.PI*.43;this.assetRoot.position.y=-.2;this.root.scale.setScalar(this.def.scale*(time-(actor.deadAt??time)>8?0:1));}else{this.assetRoot.rotation.z=hit*.1;this.assetRoot.position.y=0;this.root.scale.setScalar(this.def.scale);}
  }
 }
 dispose(){this.disposed=true;this.queenAnimator?.dispose();this.queenAnimator=undefined;this.assetMixer?.stopAllAction();this.assetRoot.clear();disposeTree(this.root);}
}
