import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Character } from '../character/character';
import { MonsterModel, monsterVisualHeight } from '../character/monster-model';
import type { CharacterCustomization } from '../character/customization';
import { CHARACTERS } from '../../shared/data/content';
import { createItem } from '../../shared/domains/item';
import { ITEMS } from '../../shared/data/equipment';
import type { ItemInstance,MonsterDef,Slot } from '../../shared/types';
export class ModelPreview {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.05,150);controls:OrbitControls;character?:Character;monster?:MonsterModel;private observer:ResizeObserver;private autoFrameUntil=0;private nextAutoFrame=0;private lastFrameCenter?:T.Vector3;private lastFrameSize?:T.Vector3;
 constructor(public element:HTMLElement){
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.0));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;this.element.append(this.renderer.domElement);const pmrem=new T.PMREMGenerator(this.renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);this.scene.environment=env.texture;this.scene.environmentIntensity=.84;pmrem.dispose();
  this.scene.add(new T.HemisphereLight('#CBE7F2','#465D63',.62));this.scene.add(new T.AmbientLight('#A4C1CF',.14));const key=new T.DirectionalLight('#F4CEB8',3.25);key.position.set(-3,5,4);this.scene.add(key);const rim=new T.DirectionalLight('#7CA1B8',1.15);rim.position.set(3,2,-3);this.scene.add(rim);
  this.camera.position.set(0,1.3,4.8);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.03,0);this.controls.enablePan=false;this.controls.minDistance=2;this.controls.maxDistance=12;this.controls.enableDamping=true;this.controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(element);this.resize();
 }
 resize(){const {width,height}=this.element.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 setCharacter(equipment:Partial<Record<Slot,ItemInstance>>,def=CHARACTERS[0],customization?:CharacterCustomization){if(this.monster){this.monster.dispose();this.monster=undefined;}if(!this.character){this.character=new Character(def);this.scene.add(this.character.root);this.character.root.rotation.y=-.22;}this.character.setEquipment(equipment);if(customization)this.character.setCustomization(customization);this.requestCharacterFrame();}
 resetCharacter(def=CHARACTERS[0]){this.character?.dispose();this.character=undefined;this.lastFrameCenter=undefined;this.lastFrameSize=undefined;const equipment:Partial<Record<Slot,ItemInstance>>={};for(const id of def.outfit){if(ITEMS[id]?.slot){const item=createItem(id);item.identified=true;equipment[ITEMS[id].slot!]=item;}}this.setCharacter(equipment,def);}
 setMonster(def:MonsterDef){this.character?.dispose();this.character=undefined;this.lastFrameCenter=undefined;this.lastFrameSize=undefined;this.monster?.dispose();this.monster=new MonsterModel(def);this.scene.add(this.monster.root);const h=monsterVisualHeight(def);this.camera.position.set(h*.72,h*.64,h*1.45);this.controls.target.set(0,h*.48,0);}
 private requestCharacterFrame(){this.autoFrameUntil=performance.now()+6500;this.nextAutoFrame=0;}
 private frameCharacterIfNeeded(){
  if(!this.character)return;const now=performance.now();if(now>this.autoFrameUntil||now<this.nextAutoFrame)return;this.nextAutoFrame=now+450;
  const root=this.character.root;root.updateMatrixWorld(true);const box=new T.Box3();let meshes=0;
  root.traverseVisible(o=>{if(!(o instanceof T.Mesh))return;meshes++;try{if(o instanceof T.SkinnedMesh)o.computeBoundingBox();box.expandByObject(o);}catch{}});
  if(!meshes||box.isEmpty())return;const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
  if(!Number.isFinite(center.x+center.y+center.z+size.x+size.y+size.z)||size.y<.3||size.y>6||size.x>7||size.z>7)return;
  const changed=!this.lastFrameCenter||!this.lastFrameSize||center.distanceTo(this.lastFrameCenter)>.18||Math.abs(size.y-this.lastFrameSize.y)>.18||Math.abs(size.x-this.lastFrameSize.x)>.3;
  this.lastFrameCenter=center.clone();this.lastFrameSize=size.clone();if(!changed)return;
  const oldTarget=this.controls.target.clone(),direction=this.camera.position.clone().sub(oldTarget);if(direction.lengthSq()<1e-6)direction.set(0,.05,1);direction.normalize();
  const halfFov=T.MathUtils.degToRad(this.camera.fov*.5),fitY=size.y/(2*Math.tan(halfFov)),fitX=size.x/(2*Math.tan(halfFov)*Math.max(.3,this.camera.aspect));const distance=T.MathUtils.clamp(Math.max(fitY,fitX)*1.32,2.15,10);
  this.controls.target.copy(center);this.camera.position.copy(center).addScaledVector(direction,distance);this.camera.updateMatrixWorld();
 }
 update(dt:number,time:number){this.character?.update(dt,time);this.monster?.update(dt,time);this.frameCharacterIfNeeded();this.controls.update();this.renderer.render(this.scene,this.camera);}
 dispose(){this.observer.disconnect();this.character?.dispose();this.monster?.dispose();this.controls.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
