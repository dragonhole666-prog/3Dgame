import {
  AbstractEngine,
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  TransformNode,
  Vector3
} from '@babylonjs/core';
import type { Snapshot,Command,GameEvent,PublicPlayer,Monster } from '../../shared/types';
import { distance } from '../../shared/types';
import { MONSTERS } from '../../shared/data/monsters';
import { NPCS,WORLD,heightAt } from '../../shared/data/world';
import { SKILL_DEFINITIONS } from '../../shared/data/skills';
import { skillForHotkey } from '../../shared/combat/weapon-skills';
import { Connection } from '../networking/connection';
import { GameUI } from '../ui/game-ui';
import { GameAudio } from '../audio/audio';
import { GameInputController } from '../input/game-input-controller';
import { resolveInteractionTarget } from '../interaction/interaction-target';
import {
  GRAPHICS_PRESETS,loadGraphicsSettings,saveGraphicsSettings,
  type GraphicsPreset,type GraphicsSettings
} from './graphics-settings';
import {
  classifyGraphicsHardware,clampGraphicsSettingsToCap,graphicsPresetLabel,presetAllowed,
  type FixedGraphicsPreset,type GraphicsHardwareCapability
} from './graphics-capability';
import {
  DEFAULT_CUSTOMIZATION,applyBodyPreset,applyFacePreset,exportCustomization,importCustomization,
  loadCustomization,loadCustomizationSlot,randomCustomization,saveCustomization,saveCustomizationSlot,
  type CharacterCustomization,type NumericCustomizationKey
} from '../character/customization';
import {
  getAvatarCandidate,saveAvatarCandidate,type AvatarCandidateId
} from '../character/avatar-candidates';
import { panelForHotkey } from '../ui/panel-registry';
import { createQinglanBabylonEngine,type BabylonBackend } from '../babylon/engine';
import { createBabylonReferencePipeline,type BabylonReferencePipeline } from '../babylon/rendering/reference-pipeline';
import { createBabylonXianxiaWorld,type BabylonXianxiaWorld } from '../babylon/world/xianxia-world';
import { BabylonActorFactory,type BabylonActorInstance } from '../babylon/actor-runtime';
import { BabylonEquipmentLayer } from '../babylon/equipment-runtime';

type ActorEntry={
 instance?:BabylonActorInstance;
 loading:boolean;
 kind:'player'|'npc'|'monster';
 id:string;
 targetY:number;
 targetX:number;
 targetZ:number;
 targetAngle:number;
 equipment?:BabylonEquipmentLayer;
 equipmentSig?:string;
};

type DropEntry={mesh:Mesh;id:string};

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const angleLerp=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

function equipmentSignature(equipment:PublicPlayer['equipment']){
 return Object.entries(equipment)
  .filter(([,item])=>!!item)
  .map(([slot,item])=>slot+':'+item!.baseId+':'+item!.id)
  .sort().join('|');
}

function elementColor(skillId:string|undefined){
 const element=skillId?SKILL_DEFINITIONS[skillId]?.element:undefined;
 if(element==='fire')return '#F07848';
 if(element==='frost')return '#87D8F2';
 if(element==='lightning')return '#B68CFF';
 if(element==='wind')return '#86D5B2';
 if(element==='arcane')return '#D88BE8';
 return '#F0C77A';
}

/**
 * HF35 full-game Babylon runtime.
 *
 * Gameplay authority remains in shared/server modules. This class only owns browser
 * presentation, input and network snapshot projection. No Three.js compatibility
 * renderer is used or selectable.
 */
export class BabylonGame{
 readonly canvas:HTMLCanvasElement;
 readonly engine:AbstractEngine;
 readonly backend:BabylonBackend;
 readonly scene:Scene;
 readonly world:BabylonXianxiaWorld&{loadedChunks:number};
 readonly post:BabylonReferencePipeline;
 readonly audio=new GameAudio();
 readonly connection=new Connection();
 readonly ui:GameUI;
 readonly renderer:{domElement:HTMLCanvasElement;info:{render:{calls:number;triangles:number};memory:{geometries:number}}};

 graphics:GraphicsSettings=loadGraphicsSettings();
 runtimeRenderScale=1;
 fps=60;
 snapshot?:Snapshot;
 characterCustomization:CharacterCustomization=loadCustomization();

 private readonly factory:BabylonActorFactory;
 private readonly actors=new Map<string,ActorEntry>();
 private readonly monsters=new Map<string,ActorEntry>();
 private readonly npcs=new Map<string,ActorEntry>();
 private readonly drops=new Map<string,DropEntry>();
 private readonly loadingActors=new Set<string>();
 private readonly labels=new Map<string,{el:HTMLElement;seen:number}>();
 private readonly overlay:HTMLElement;
 private readonly selected:Mesh;
 private readonly marker:Mesh;
 private input!:GameInputController;
 private started=false;
 private lastFrame=performance.now();
 private time=0;
 private lastInput='';
 private movementHeartbeat=0;
 private latestSnapshotTime=-Infinity;
 private serverSession='';
 private lastEventId=0;
 private markerUntil=0;
 private pendingNpc?:string;
 private pendingPickup?:string;
 private viewportWidth=1;
 private viewportHeight=1;
 private viewportLeft=0;
 private viewportTop=0;
 private labelPass=0;
 private labelTime=0;
 private uiTime=0;
 private frameErrors=0;
 private lastFrameError='';
 private creatorView:'none'|'face'|'body'|'full'='none';
 private creatorRestore?:{radius:number;beta:number};
 private hardwareCapability:GraphicsHardwareCapability;
 private runtimeMaxPreset:FixedGraphicsPreset='balanced';
 private gpuRenderer='Babylon.js';
 private maxTextureSize=4096;
 private maxSamples=0;

 static async create(host:HTMLElement){
  host.replaceChildren();
  const canvas=document.createElement('canvas');
  canvas.id='game-canvas';
  canvas.setAttribute('aria-label','青嵐志 Babylon.js 3D 世界');
  Object.assign(canvas.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});
  host.append(canvas);

  const {engine,backend}=await createQinglanBabylonEngine(canvas);
  const scene=new Scene(engine);
  const world=await createBabylonXianxiaWorld(scene,canvas) as BabylonXianxiaWorld&{loadedChunks:number};
  world.loadedChunks=1;
  world.camera.detachControl();
  world.camera.inputs.clear();
  const post=createBabylonReferencePipeline(scene,world.camera);
  const game=new BabylonGame(host,canvas,engine,backend,scene,world,post);
  await game.start();
  return game;
 }

 private constructor(
  public readonly host:HTMLElement,
  canvas:HTMLCanvasElement,
  engine:AbstractEngine,
  backend:BabylonBackend,
  scene:Scene,
  world:BabylonXianxiaWorld&{loadedChunks:number},
  post:BabylonReferencePipeline
 ){
  this.canvas=canvas;this.engine=engine;this.backend=backend;this.scene=scene;this.world=world;this.post=post;
  this.renderer={domElement:canvas,info:{render:{calls:0,triangles:0},memory:{geometries:0}}};
  const caps=(engine as any).getCaps?.()??{};
  this.maxTextureSize=Math.max(1024,Number(caps.maxTextureSize)||4096);
  this.maxSamples=Math.max(0,Number(caps.maxMSAASamples)||0);
  try{this.gpuRenderer=String((engine as any).getGlInfo?.().renderer??backend.toUpperCase());}catch{this.gpuRenderer=backend.toUpperCase();}
  const rect=host.getBoundingClientRect();
  this.viewportWidth=Math.max(1,Math.round(rect.width||innerWidth));
  this.viewportHeight=Math.max(1,Math.round(rect.height||innerHeight));
  this.viewportLeft=rect.left;this.viewportTop=rect.top;
  const nav=navigator as Navigator&{deviceMemory?:number};
  this.hardwareCapability=classifyGraphicsHardware({
   memoryGB:nav.deviceMemory??6,cores:nav.hardwareConcurrency??4,dpr:Math.min(devicePixelRatio||1,3),
   width:this.viewportWidth,height:this.viewportHeight,
   mobile:matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0,
   gpuRenderer:this.gpuRenderer,maxTextureSize:this.maxTextureSize,maxRenderbufferSize:this.maxTextureSize,maxSamples:this.maxSamples
  });
  this.runtimeMaxPreset=this.hardwareCapability.maxPreset;
  this.graphics=clampGraphicsSettingsToCap(this.graphics,this.runtimeMaxPreset);saveGraphicsSettings(this.graphics);
  this.factory=new BabylonActorFactory(scene,world.shadow);

  const selectMat=new PBRMaterial('HF35_SelectMaterial',scene);
  selectMat.albedoColor=Color3.FromHexString('#E9C36E');selectMat.emissiveColor=Color3.FromHexString('#8B6822');selectMat.roughness=.45;
  this.selected=MeshBuilder.CreateTorus('HF35_Selected',{diameter:1.6,thickness:.055,tessellation:48},scene);
  this.selected.material=selectMat;this.selected.rotation.x=Math.PI/2;this.selected.isVisible=false;this.selected.isPickable=false;

  const markerMat=new PBRMaterial('HF35_MarkerMaterial',scene);
  markerMat.albedoColor=Color3.FromHexString('#A9DCC7');markerMat.emissiveColor=Color3.FromHexString('#477C69');markerMat.roughness=.5;
  this.marker=MeshBuilder.CreateTorus('HF35_NavMarker',{diameter:.85,thickness:.045,tessellation:36},scene);
  this.marker.material=markerMat;this.marker.rotation.x=Math.PI/2;this.marker.isVisible=false;this.marker.isPickable=false;

  this.overlay=document.createElement('div');this.overlay.id='world-labels';host.append(this.overlay);
  this.ui=new GameUI(host,this);
 }

 private async start(){
  this.applyGraphics();
  this.bindConnection();
  this.bindInput();
  this.bootNpcs();
  this.movementHeartbeat=window.setInterval(()=>this.sendMovement(false),180);
  window.addEventListener('resize',this.resize,{passive:true});
  this.engine.runRenderLoop(()=>this.frame());
  (window as any).__QINGLAN_GAME__=this;
  (window as any).__QINGLAN_BABYLON__={game:this,scene:this.scene,world:this.world,post:this.post};
  document.documentElement.dataset.qinglanRenderer='babylon';
  document.documentElement.dataset.qinglanFullGame='1';
  console.info('[HF35 Full Game] Babylon-only runtime mounted',{backend:this.backend});
 }

 private bindConnection(){
  this.connection.onSnapshot=s=>this.receive(s);
  this.connection.onSession=(id,session,token,name)=>{
   this.serverSession=session;
   this.ui.completeCharacterLogin(id,name||'行山客',token);
   this.started=true;
  };
  this.connection.onStatus=text=>this.ui.status(text);
  this.connection.onError=text=>this.ui.runtimeError(text);
  this.connection.onLoginRejected=(text,code)=>{this.started=false;this.ui.loginError(text,code);};
  this.connection.onContent=()=>this.ui.toast('世界內容已更新，重新進入可載入最新資料。');
 }

 createCharacter(name:string){this.connection.connectCreate(name);}
 resumeCharacter(token:string){this.connection.connectCharacter(token);}
 command(command:Command){this.connection.send(command);}

 private actorMap(kind:ActorEntry['kind']){return kind==='monster'?this.monsters:kind==='npc'?this.npcs:this.actors;}

 private ensurePlayer(player:PublicPlayer,self=false){
  const map=this.actors,existing=map.get(player.id);
  if(existing){
   existing.targetX=player.x;existing.targetZ=player.z;existing.targetY=heightAt(player.x,player.z);existing.targetAngle=player.angle;
   const sig=equipmentSignature(player.equipment);
   if(existing.instance&&sig!==existing.equipmentSig){
    existing.equipment??=new BabylonEquipmentLayer(this.scene,existing.instance);
    existing.equipment.sync(player.equipment);
    existing.equipmentSig=sig;
   }
   return;
  }
  const entry:ActorEntry={loading:true,kind:'player',id:player.id,targetX:player.x,targetZ:player.z,targetY:heightAt(player.x,player.z),targetAngle:player.angle};
  map.set(player.id,entry);
  const candidate=self?getAvatarCandidate():'qinglan-main';
  void this.factory.createPlayer(player.id,candidate).then(instance=>{
   if(map.get(player.id)!==entry){instance.dispose();return;}
   entry.instance=instance;entry.loading=false;
   instance.root.position.set(entry.targetX,entry.targetY,entry.targetZ);instance.root.rotation.y=entry.targetAngle;
   entry.equipment=new BabylonEquipmentLayer(this.scene,instance);
   entry.equipment.sync(player.equipment);
   entry.equipmentSig=equipmentSignature(player.equipment);
  });
 }

 private ensureMonster(monster:Monster){
  const existing=this.monsters.get(monster.id);
  if(existing){
   existing.targetX=monster.x;existing.targetZ=monster.z;existing.targetY=heightAt(monster.x,monster.z);existing.targetAngle=monster.angle;return;
  }
  const def=MONSTERS[monster.defId];if(!def)return;
  const entry:ActorEntry={loading:true,kind:'monster',id:monster.id,targetX:monster.x,targetZ:monster.z,targetY:heightAt(monster.x,monster.z),targetAngle:monster.angle};
  this.monsters.set(monster.id,entry);
  void this.factory.createMonster(monster.id,def).then(instance=>{
   if(this.monsters.get(monster.id)!==entry){instance.dispose();return;}
   entry.instance=instance;entry.loading=false;
   instance.root.position.set(entry.targetX,entry.targetY,entry.targetZ);instance.root.rotation.y=entry.targetAngle;
  });
 }

 private bootNpcs(){
  for(const npc of NPCS){
   const entry:ActorEntry={loading:true,kind:'npc',id:npc.id,targetX:npc.x,targetZ:npc.z,targetY:heightAt(npc.x,npc.z),targetAngle:npc.angle};
   this.npcs.set(npc.id,entry);
   void this.factory.createNpc(npc.id).then(instance=>{
    if(this.npcs.get(npc.id)!==entry){instance.dispose();return;}
    entry.instance=instance;entry.loading=false;
    instance.root.position.set(entry.targetX,entry.targetY,entry.targetZ);instance.root.rotation.y=entry.targetAngle;
    for(const mesh of instance.meshes)mesh.metadata={...(mesh.metadata??{}),npcId:npc.id};
   });
  }
 }

 private syncDrops(snapshot:Snapshot){
  const live=new Set(snapshot.drops.map(d=>d.id));
  for(const d of snapshot.drops){
   let entry=this.drops.get(d.id);
   if(!entry){
    const mesh=MeshBuilder.CreatePolyhedron('HF35_Drop_'+d.id,{type:2,size:.28},this.scene);
    const mat=new PBRMaterial('HF35_DropMat_'+d.id,this.scene);mat.albedoColor=Color3.FromHexString('#D9C17D');mat.emissiveColor=Color3.FromHexString('#5A4A20');mat.roughness=.38;
    mesh.material=mat;mesh.metadata={dropId:d.id};mesh.isPickable=true;entry={mesh,id:d.id};this.drops.set(d.id,entry);
   }
   entry.mesh.position.set(d.x,heightAt(d.x,d.z)+.42,d.z);
  }
  for(const [id,entry] of this.drops)if(!live.has(id)){entry.mesh.dispose(false,true);this.drops.delete(id);}
 }

 private receive(snapshot:Snapshot){
  if(snapshot.time<this.latestSnapshotTime)return;
  this.latestSnapshotTime=snapshot.time;this.snapshot=snapshot;
  const players=snapshot.players.some(p=>p.id===snapshot.self.id)?snapshot.players:[snapshot.self,...snapshot.players];
  const livePlayers=new Set(players.map(p=>p.id));
  for(const p of players)this.ensurePlayer(p,p.id===snapshot.self.id);
  for(const [id,entry] of this.actors)if(!livePlayers.has(id)){entry.equipment?.dispose();entry.instance?.dispose();this.actors.delete(id);}

  const liveMonsters=new Set(snapshot.monsters.filter(m=>m.hp>0).map(m=>m.id));
  for(const m of snapshot.monsters)if(m.hp>0)this.ensureMonster(m);
  for(const [id,entry] of this.monsters)if(!liveMonsters.has(id)){entry.instance?.dispose();this.monsters.delete(id);}

  this.syncDrops(snapshot);
  for(const event of snapshot.events){
   if(event.id<=this.lastEventId)continue;
   this.handleEvent(event,snapshot);this.lastEventId=Math.max(this.lastEventId,event.id);
  }
  this.ui.update(snapshot);
 }

 private handleEvent(event:GameEvent,snapshot:Snapshot){
  if(event.type==='hit'){
   const mine=event.target===snapshot.self.id;
   this.audio.play(mine?'hurt':'hit');
   this.ui.damage(event);if(mine&&(event.value??0)>0)this.ui.impact();
   this.spawnImpact(event.x??snapshot.self.x,event.z??snapshot.self.z,event.skill);
  }else if(event.type==='cast'){
   if(event.actor===snapshot.self.id)this.audio.play(SKILL_DEFINITIONS[event.skill??'']?.element==='lightning'?'thunder':'swing');
   this.spawnCast(event);
  }else if(event.type==='pickup'&&event.actor===snapshot.self.id)this.audio.play('loot');
  else if(event.type==='equip'&&event.actor===snapshot.self.id)this.audio.play('equip');
 }

 private spawnImpact(x:number,z:number,skill?:string){
  if(this.graphics.vfx==='off')return;
  const color=Color3.FromHexString(elementColor(skill)),y=heightAt(x,z)+.65;
  const ring=MeshBuilder.CreateTorus('HF35_Impact',{diameter:1.2,thickness:.055,tessellation:36},this.scene);
  const mat=new PBRMaterial('HF35_ImpactMat',this.scene);mat.albedoColor=color;mat.emissiveColor=color.scale(.9);mat.roughness=.25;ring.material=mat;ring.position.set(x,y,z);ring.rotation.x=Math.PI/2;ring.scaling.setAll(.25);
  const light=new PointLight('HF35_ImpactLight',new Vector3(x,y+.3,z),this.scene);light.diffuse=color;light.intensity=3.4;light.range=7;
  const born=performance.now();
  const observer=this.scene.onBeforeRenderObservable.add(()=>{
   const t=(performance.now()-born)/360;ring.scaling.setAll(.25+t*1.4);mat.alpha=Math.max(0,1-t);light.intensity=Math.max(0,3.4*(1-t));
   if(t>=1){this.scene.onBeforeRenderObservable.remove(observer);ring.dispose(false,true);light.dispose();}
  });
 }

 private spawnCast(event:GameEvent){
  const snapshot=this.snapshot;if(!snapshot||this.graphics.vfx==='off')return;
  const actor=snapshot.players.find(p=>p.id===event.actor)??(event.actor===snapshot.self.id?snapshot.self:undefined);
  const monster=snapshot.monsters.find(m=>m.id===event.actor);
  const x=event.originX??actor?.x??monster?.x??event.x??snapshot.self.x;
  const z=event.originZ??actor?.z??monster?.z??event.z??snapshot.self.z;
  const color=Color3.FromHexString(elementColor(event.skill)),y=heightAt(x,z)+1.15;
  const orb=MeshBuilder.CreateSphere('HF35_CastOrb',{diameter:.34,segments:12},this.scene);
  const mat=new PBRMaterial('HF35_CastMat',this.scene);mat.albedoColor=color;mat.emissiveColor=color;mat.roughness=.2;orb.material=mat;orb.position.set(x,y,z);
  const born=performance.now(),duration=420;
  const observer=this.scene.onBeforeRenderObservable.add(()=>{
   const t=(performance.now()-born)/duration;orb.scaling.setAll(1+t*1.5);orb.position.y=y+Math.sin(t*Math.PI)*.55;mat.alpha=Math.max(0,1-t);
   if(t>=1){this.scene.onBeforeRenderObservable.remove(observer);orb.dispose(false,true);}
  });
 }

 pickup(id?:string){
  if(!this.snapshot)return;
  const d=this.snapshot.drops.filter(x=>!id||x.id===id).sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self))[0];
  if(!d)return;
  if(distance(d,this.snapshot.self)>4.25){this.pendingPickup=d.id;this.command({type:'navigate',x:d.x,z:d.z,label:'拾取'});return;}
  this.pendingPickup=undefined;this.command({type:'pickup',id:d.id});
 }

 interact(id?:string){
  if(!this.snapshot)return;
  const npc=id?NPCS.find(n=>n.id===id):[...NPCS].sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self))[0];
  if(!npc)return;
  if(distance(npc,this.snapshot.self)>6.2){this.pendingNpc=npc.id;this.command({type:'navigate',x:npc.x,z:npc.z+2,label:npc.name});return;}
  this.command({type:'intel',npc:npc.id});this.ui.openNpc(npc.id);
 }

 private bindInput(){
  this.input=new GameInputController(this.canvas,{
   isStarted:()=>this.started,
   onMovementEdge:()=>this.sendMovement(true),
   onLook:(dx,dy)=>{
    this.world.camera.alpha-=dx*.005;
    this.world.camera.beta=clamp(this.world.camera.beta+dy*.004,.62,1.48);
   },
   onZoom:delta=>{this.world.camera.radius=clamp(this.world.camera.radius+delta*.012,3.2,26);},
   onClick:(x,y)=>this.click(x,y),
   onDoubleClick:()=>this.command({type:'attack',skill:'basic'}),
   onKeyDown:(key,e)=>this.handleKey(key,e),
   onBlur:()=>{this.lastInput='';this.command({type:'move',x:0,z:0,sprint:false});}
  });
 }

 private handleKey(key:string,event:KeyboardEvent){
  if(key===' ')this.command({type:'jump'});
  else if(key==='g')this.command({type:'flight'});
  else if(key==='f'&&this.snapshot){
   const t=resolveInteractionTarget(this.snapshot);
   if(t?.type==='drop')this.pickup(t.id);else if(t?.type==='npc')this.interact(t.id);else this.interact();
  }else if(key==='tab'&&this.snapshot){
   const near=this.snapshot.monsters.filter(m=>m.hp>0&&distance(m,this.snapshot!.self)<35).sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self));
   const current=near.findIndex(m=>m.id===this.snapshot!.self.target),next=near[(current+1)%near.length];if(next)this.command({type:'target',id:next.id});
  }
  const skill=this.snapshot?skillForHotkey(this.snapshot.self.equipment,key):undefined;if(skill)this.command({type:'attack',skill});
  if(key==='6')this.command({type:'potion'});
  const panel=panelForHotkey(key);if(panel){if(panel==='settings'){event.preventDefault();this.ui.openSettings();}else this.ui.toggle(panel);}
  if(key==='escape')this.ui.closeAll();if(key==='enter')this.ui.focusChat();
 }

 private sendMovement(force:boolean){
  if(!this.started||!this.snapshot)return;
  const axes=this.input.movementAxes();
  const ray=this.world.camera.getForwardRay().direction;
  const len=Math.hypot(ray.x,ray.z)||1,fx=ray.x/len,fz=ray.z/len,rx=-fz,rz=fx;
  const x=rx*axes.x+fx*(-axes.z),z=rz*axes.x+fz*(-axes.z);
  const sprint=this.input.sprintRequested();
  const signature=`${x.toFixed(3)},${z.toFixed(3)},${sprint}`;
  if(!force&&signature===this.lastInput)return;
  this.lastInput=signature;this.command({type:'move',x,z,sprint});
 }

 private click(clientX:number,clientY:number){
  if(!this.snapshot)return;
  const hit=this.scene.pick(clientX-this.viewportLeft,clientY-this.viewportTop,mesh=>mesh.isPickable);
  if(!hit?.hit)return;
  let node:any=hit.pickedMesh;
  while(node){
   const md=node.metadata??{};
   if(md.monsterId){this.command({type:'target',id:md.monsterId});return;}
   if(md.npcId){this.interact(md.npcId);return;}
   if(md.dropId){this.pickup(md.dropId);return;}
   node=node.parent;
  }
  if(hit.pickedPoint){
   this.command({type:'navigate',x:hit.pickedPoint.x,z:hit.pickedPoint.z,label:'地圖標記'});
   this.marker.position.copyFrom(hit.pickedPoint);this.marker.position.y+=.08;this.markerUntil=this.time+2;
  }
 }

 project(x:number,y:number,z:number){
  const viewport=this.world.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight());
  const p=Vector3.Project(new Vector3(x,y,z),this.scene.getTransformMatrix(),this.scene.getTransformMatrix(),viewport);
  const rw=Math.max(1,this.engine.getRenderWidth()),rh=Math.max(1,this.engine.getRenderHeight());
  return {x:this.viewportLeft+p.x/rw*this.viewportWidth,y:this.viewportTop+p.y/rh*this.viewportHeight,visible:p.z>=0&&p.z<=1&&p.x>=0&&p.x<=rw&&p.y>=0&&p.y<=rh};
 }

 private label(id:string,x:number,y:number,z:number,text:string,kind:string){
  let entry=this.labels.get(id);
  if(!entry){const el=document.createElement('div');el.className='world-label '+kind;el.innerHTML='<span></span>';this.overlay.append(el);entry={el,seen:0};this.labels.set(id,entry);}
  entry.seen=this.labelPass;const p=this.project(x,y,z);entry.el.style.display=p.visible?'':'none';if(!p.visible)return;
  entry.el.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-100%)`;
  const span=entry.el.querySelector('span');if(span&&span.textContent!==text)span.textContent=text;
 }

 private updateActor(entry:ActorEntry,dt:number){
  const instance=entry.instance;if(!instance)return;
  const root=instance.root,smooth=1-Math.exp(-dt*11);
  root.position.x+=(entry.targetX-root.position.x)*smooth;
  root.position.z+=(entry.targetZ-root.position.z)*smooth;
  root.position.y+=(entry.targetY-root.position.y)*smooth;
  root.rotation.y=angleLerp(root.rotation.y,entry.targetAngle,1-Math.exp(-dt*10));
  instance.update(dt,this.time);
 }

 private frame(){
  try{
   const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;this.time+=dt;this.fps=Math.round((this.engine as any).getFps?.()||60);
   for(const entry of this.actors.values())this.updateActor(entry,dt);
   for(const entry of this.monsters.values())this.updateActor(entry,dt);
   for(const entry of this.npcs.values())this.updateActor(entry,dt);

   const self=this.snapshot?.self;
   if(self){
    const me=this.actors.get(self.id)?.instance;
    const target=me?me.root.position:new Vector3(self.x,heightAt(self.x,self.z),self.z);
    this.world.camera.setTarget(new Vector3(target.x,target.y+(this.creatorView==='face'?1.75:1.15),target.z));
    const selected=this.snapshot!.monsters.find(m=>m.id===self.target&&m.hp>0);
    this.selected.isVisible=!!selected;
    if(selected){this.selected.position.set(selected.x,heightAt(selected.x,selected.z)+.06,selected.z);const d=MONSTERS[selected.defId];this.selected.scaling.setAll(Math.max(.8,d?.combatRadius??1));}
   }else{
    this.world.camera.setTarget(new Vector3(WORLD.spawn.x,heightAt(WORLD.spawn.x,WORLD.spawn.z)+1.3,WORLD.spawn.z));
   }

   this.marker.isVisible=this.time<this.markerUntil;if(this.marker.isVisible)this.marker.rotation.y+=dt*.7;

   this.labelTime+=dt;
   if(this.graphics.worldLabels&&this.labelTime>.09){
    this.labelTime=0;this.labelPass++;
    if(this.snapshot){
     for(const p of this.snapshot.players)if(p.id!==self?.id)this.label(p.id,p.x,heightAt(p.x,p.z)+2.2,p.z,p.name,'player');
     for(const m of this.snapshot.monsters){
      if(m.hp<=0||!self||distance(m,self)>40)continue;const def=MONSTERS[m.defId];
      this.label(m.id,m.x,heightAt(m.x,m.z)+2.2,m.z,`${def?.name??'異獸'} · Lv. ${def?.level??1}`,def?.aiProfile==='boss'?'boss':'monster');
     }
     for(const n of NPCS)if(!self||distance(n,self)<30)this.label(n.id,n.x,heightAt(n.x,n.z)+2.15,n.z,n.name+' · '+n.role.split(' · ')[0],'npc');
    }
    for(const entry of this.labels.values())if(entry.seen!==this.labelPass)entry.el.style.display='none';
   }

   this.uiTime+=dt;if(this.uiTime>.035){const t=this.uiTime;this.uiTime=0;this.ui.frame(t,this.time);}
   this.renderer.info.render.calls=this.scene.getActiveMeshes().length;
   this.renderer.info.render.triangles=Math.round((this.scene.getActiveIndices?.()??0)/3);
   this.renderer.info.memory.geometries=this.scene.meshes.length;
   this.scene.render();
  }catch(error){
   this.frameErrors++;this.lastFrameError=error instanceof Error?error.message:String(error);
   if(this.frameErrors<8||this.frameErrors%120===0)console.error('[HF35 Babylon frame]',error);
  }
 }

 private applyGraphics(){
  const ratio=Math.max(.55,Math.min(1.5,this.graphics.pixelRatio||1));this.runtimeRenderScale=ratio;
  (this.engine as any).setHardwareScalingLevel?.(1/ratio);
  this.post.pipeline.bloomEnabled=this.graphics.postProcessing!=='off';
  this.post.pipeline.fxaaEnabled=true;
  this.scene.fogEnabled=true;
  saveGraphicsSettings(this.graphics);
 }

 setGraphicsPreset(preset:Exclude<GraphicsPreset,'custom'>){
  const safe=presetAllowed(preset,this.runtimeMaxPreset)?preset:this.runtimeMaxPreset;
  this.graphics={...GRAPHICS_PRESETS[safe]};this.applyGraphics();this.ui?.onGraphicsChanged();
  if(safe!==preset)this.ui?.toast(`${graphicsPresetLabel(preset)}超過硬體安全上限，已改用${graphicsPresetLabel(safe)}。`);
 }
 setGraphicsSetting<K extends keyof GraphicsSettings>(key:K,value:GraphicsSettings[K]){this.graphics=clampGraphicsSettingsToCap({...this.graphics,[key]:value,preset:'custom'},this.runtimeMaxPreset);this.applyGraphics();this.ui?.onGraphicsChanged();}
 getGraphicsCapability(){return {hardwareMaxPreset:this.hardwareCapability.maxPreset,maxPreset:this.runtimeMaxPreset,reason:this.hardwareCapability.reasons[0]??'Babylon.js 硬體能力上限'};}
 getGraphicsDiagnostics(){return {gpu:this.gpuRenderer,maxRenderTargetDimension:this.maxTextureSize,maxTextureSize:this.maxTextureSize,maxRenderbufferSize:this.maxTextureSize,maxSamples:this.maxSamples,postProcessing:this.graphics.postProcessing,renderScale:this.runtimeRenderScale,hardwareTier:this.hardwareCapability.tierLabel,hardwareMaxPreset:this.hardwareCapability.maxPreset,maxPreset:this.runtimeMaxPreset,maxPresetLabel:graphicsPresetLabel(this.runtimeMaxPreset),runtimeReason:this.hardwareCapability.reasons[0]??'Babylon.js',memoryGB:this.hardwareCapability.memoryGB,memoryGBEstimated:false,cores:this.hardwareCapability.cores,physicalPixels:this.hardwareCapability.physicalPixels,mobile:this.hardwareCapability.mobile,reasons:this.hardwareCapability.reasons};}

 getCharacterCustomization(){return this.characterCustomization;}
 getAvatarCandidate(){return getAvatarCandidate();}
 setAvatarCandidate(id:AvatarCandidateId){saveAvatarCandidate(id);const self=this.snapshot?.self;if(self){const old=this.actors.get(self.id);old?.equipment?.dispose();old?.instance?.dispose();this.actors.delete(self.id);this.ensurePlayer(self,true);}}
 setSelfEquipmentPreview(_enabled:boolean){}
 setCharacterCreatorView(view:'none'|'face'|'body'|'full'){
  if(view!=='none'&&this.creatorView==='none')this.creatorRestore={radius:this.world.camera.radius,beta:this.world.camera.beta};
  this.creatorView=view;
  if(view==='face'){this.world.camera.radius=3.1;this.world.camera.beta=1.30;}
  else if(view==='body'){this.world.camera.radius=5.0;this.world.camera.beta=1.30;}
  else if(view==='full'){this.world.camera.radius=6.4;this.world.camera.beta=1.30;}
  else if(this.creatorRestore){this.world.camera.radius=this.creatorRestore.radius;this.world.camera.beta=this.creatorRestore.beta;this.creatorRestore=undefined;}
 }
 private saveCustomization(){saveCustomization(this.characterCustomization);}
 setCharacterCustomizationKey(key:NumericCustomizationKey,value:number){this.characterCustomization={...this.characterCustomization,[key]:value};this.saveCustomization();}
 setCharacterStyleColor(key:'skinColor'|'hairColor'|'leftEyeColor'|'rightEyeColor'|'lipColor'|'underwearColor'|'tattooColor'|'makeupColor',value:string){this.characterCustomization={...this.characterCustomization,[key]:value};this.saveCustomization();}
 setCharacterOption(key:keyof CharacterCustomization,value:any){this.characterCustomization={...this.characterCustomization,[key]:value};this.saveCustomization();}
 applyCharacterFacePreset(index:number){this.characterCustomization=applyFacePreset(this.characterCustomization,index);this.saveCustomization();}
 applyCharacterBodyPreset(index:number){this.characterCustomization=applyBodyPreset(this.characterCustomization,index);this.saveCustomization();}
 randomizeCharacterCustomization(){this.characterCustomization=randomCustomization(this.characterCustomization);this.saveCustomization();}
 resetCharacterCustomization(){this.characterCustomization={...DEFAULT_CUSTOMIZATION};this.saveCustomization();}
 saveCharacterCustomizationSlot(slot:number){return saveCustomizationSlot(slot,this.characterCustomization);}
 loadCharacterCustomizationSlot(slot:number){const v=loadCustomizationSlot(slot);if(v){this.characterCustomization=v;this.saveCustomization();}return v;}
 exportCharacterCustomization(){return exportCustomization(this.characterCustomization);}
 importCharacterCustomization(text:string){const v=importCustomization(text);if(!v)return false;this.characterCustomization=v;this.saveCustomization();return true;}
 previewCharacterAnimation(_name:string){this.ui?.toast('Babylon 動作預覽正在轉換 AnimationGroup。');return false;}
 previewCharacterVoice(){this.audio.play('swing');}

 setMobileMovement(x:number,z:number,sprint=false){this.input.setVirtualMovement(x,z,sprint);}
 stopMobileMovement(){this.input.clearVirtualMovement();}
 mobileBasicAttack(){this.command({type:'attack',skill:'basic'});}
 mobileFlight(){this.command({type:'flight'});}
 mobileInteract(){if(!this.snapshot)return;const t=resolveInteractionTarget(this.snapshot);if(t?.type==='drop')this.pickup(t.id);else if(t?.type==='npc')this.interact(t.id);else this.interact();}
 mobileJump(){this.command({type:'jump'});}

 private resize=()=>{
  const rect=this.host.getBoundingClientRect();this.viewportWidth=Math.max(1,Math.round(rect.width||innerWidth));this.viewportHeight=Math.max(1,Math.round(rect.height||innerHeight));this.viewportLeft=rect.left;this.viewportTop=rect.top;this.engine.resize();
 };

 dispose(){
  clearInterval(this.movementHeartbeat);window.removeEventListener('resize',this.resize);this.input?.dispose();this.connection.close();
  for(const entry of [...this.actors.values(),...this.monsters.values(),...this.npcs.values()]){entry.equipment?.dispose();entry.instance?.dispose();}
  for(const d of this.drops.values())d.mesh.dispose(false,true);
  this.post.dispose();this.world.dispose();this.scene.dispose();this.engine.dispose();this.canvas.remove();this.overlay.remove();
 }
}
