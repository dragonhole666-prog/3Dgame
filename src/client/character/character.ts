import * as T from 'three';
import type { ItemInstance, PublicPlayer, Rarity, Slot, WeaponProfile } from '../../shared/types';
import { BUILD_RELEASE } from '../../shared/build-info';
import { APPEARANCES,ITEMS } from '../../shared/data/equipment';
import { CHARACTERS,type CharacterDefinition } from '../../shared/data/content';
import { weaponModel } from './appearance';
import { CharacterCompositionRuntime } from './character-composition-runtime';
import { getAvatarCandidate, type AvatarCandidateId } from './avatar-candidates';
import type { CharacterCustomization } from './customization';
import { disposeTree } from '../rendering/primitives';

/**
 * P0.24.3 character facade.
 *
 * The old procedural humanoid used to be constructed for every player/NPC and then kept hidden.
 * Runtime characters are now VRM-only. A lightweight failure marker is created lazily only when
 * no validated VRM is available, so there is no second skeleton/mixer/equipment tree to maintain.
 */
export class Character {
 root=new T.Group();
 profile:WeaponProfile='sword';
 private avatarCandidate:AvatarCandidateId;
 private flightRig=new T.Group();
 private flightAura:T.Mesh;
 private rigged?:CharacterCompositionRuntime;
 private transitionRigged?:CharacterCompositionRuntime;
 private equipmentVisible=true;
 private disposed=false;
 private readonly npcMode:boolean;
 private currentEquipment:Partial<Record<Slot,ItemInstance>>={};
 private equipmentSignature='';
 private customizationSignature='';
 private customizationSource?:CharacterCustomization;
 private currentCustomization?:CharacterCustomization;

 constructor(def:CharacterDefinition=CHARACTERS[0],mode:'player'|'npc'='player',candidate?:AvatarCandidateId){
  this.npcMode=mode==='npc';this.avatarCandidate=candidate??getAvatarCandidate();
  this.root.scale.set(def.build,def.height,def.build);
  const flightAppearance=APPEARANCES[ITEMS['cloud-sword']?.appearanceId??''];
  if(flightAppearance){const board=weaponModel(flightAppearance);board.rotation.x=Math.PI/2;board.rotation.z=Math.PI;board.scale.setScalar(.86);board.position.set(0,.02,.12);this.flightRig.add(board);}
  this.flightAura=new T.Mesh(new T.RingGeometry(.36,.55,48),new T.MeshBasicMaterial({color:'#8be9e1',transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
  this.flightAura.rotation.x=-Math.PI/2;this.flightAura.position.y=.03;this.flightRig.add(this.flightAura);
  const trail=new T.Mesh(new T.ConeGeometry(.12,1.7,16,1,true),new T.MeshBasicMaterial({color:'#79d6e2',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
  trail.rotation.x=Math.PI/2;trail.position.set(0,.02,.95);this.flightRig.add(trail);this.flightRig.visible=false;this.root.add(this.flightRig);
  this.installRiggedAvatar(this.avatarCandidate);
 }

 private installRiggedAvatar(candidate:AvatarCandidateId){
  // Keep the last validated VRM alive while a newly selected avatar is parsed.
  const previous=this.rigged;
  if(previous?.ready){this.transitionRigged?.dispose();this.transitionRigged=previous;previous.root.visible=true;}
  else if(previous){previous.dispose();}
  const rigged=new CharacterCompositionRuntime(candidate);this.rigged=rigged;rigged.root.visible=false;this.root.add(rigged.root);
  rigged.setEquipment(this.currentEquipment);rigged.setEquipmentVisible(this.equipmentVisible);if(this.currentCustomization)rigged.setCustomization(this.currentCustomization);
  rigged.loaded.then(ok=>{
   if(this.disposed||this.rigged!==rigged){rigged.dispose();return;}
   if(!ok){
    console.error(`[${BUILD_RELEASE}] ${this.npcMode?'NPC':'player'} VRM candidate failed to load.`);
    const fallback=this.transitionRigged;
    if(fallback?.ready){this.rigged=fallback;this.transitionRigged=undefined;fallback.root.visible=true;rigged.dispose();return;}
    this.showVrmFailureMarker();return;
   }
   rigged.root.visible=true;this.hideVrmFailureMarker();
   const old=this.transitionRigged;this.transitionRigged=undefined;if(old&&old!==rigged){old.root.visible=false;old.dispose();}
   rigged.setEquipment(this.currentEquipment);rigged.setEquipmentVisible(this.equipmentVisible);if(this.currentCustomization)rigged.setCustomization(this.currentCustomization);this.profile=rigged.profile;
  });
 }

 private liveRigged(){return this.rigged?.ready?this.rigged:this.transitionRigged?.ready?this.transitionRigged:undefined;}
 private equipmentProfile(equipment:Partial<Record<Slot,ItemInstance>>):WeaponProfile{
  const primary=equipment.mainhand??equipment.offhand;if(!primary)return 'sword';
  return APPEARANCES[ITEMS[primary.baseId]?.appearanceId??'']?.animationProfile??'sword';
 }
 setAvatarCandidate(candidate:AvatarCandidateId,_def:CharacterDefinition=CHARACTERS[0]){if(this.avatarCandidate===candidate&&this.rigged)return;this.avatarCandidate=candidate;this.installRiggedAvatar(candidate);}
 setCustomization(profile:CharacterCustomization){if(profile===this.customizationSource)return;const sig=JSON.stringify(profile);if(sig===this.customizationSignature){this.customizationSource=profile;return;}this.customizationSource=profile;this.customizationSignature=sig;this.currentCustomization={...profile};this.rigged?.setCustomization(profile);this.transitionRigged?.setCustomization(profile);}
 setEquipmentVisible(visible:boolean){this.equipmentVisible=visible;this.rigged?.setEquipmentVisible(visible);this.transitionRigged?.setEquipmentVisible(visible);}
 previewAnimation(name:string){return this.liveRigged()?.previewAnimation(name)??false;}
 predictAttack(skill:string,now:number){return this.liveRigged()?.predictAttack(skill,now)??false;}
 setEquipment(equipment:Partial<Record<Slot,ItemInstance>>){
  const sig=Object.entries(equipment).map(([slot,item])=>`${slot}:${item?.baseId??''}:${item?.enhancementLevel??0}`).sort().join('|');
  if(sig===this.equipmentSignature)return;this.equipmentSignature=sig;this.currentEquipment={...equipment};this.profile=this.equipmentProfile(equipment);
  this.rigged?.setEquipment(this.currentEquipment);this.transitionRigged?.setEquipment(this.currentEquipment);
 }
 private showVrmFailureMarker(){let marker=this.root.getObjectByName('VRM_LOAD_FAILED');if(!marker){const g=new T.Group();g.name='VRM_LOAD_FAILED';const m=new T.Mesh(new T.BoxGeometry(.65,1.8,.65),new T.MeshStandardMaterial({color:'#9B4A46',emissive:'#672A28',emissiveIntensity:.38,roughness:.68,metalness:.04,wireframe:true,dithering:true}));m.position.y=.9;g.add(m);this.root.add(g);marker=g;}marker.visible=true;}
 private hideVrmFailureMarker(){const marker=this.root.getObjectByName('VRM_LOAD_FAILED');if(marker)marker.visible=false;}
 playPickup(itemId:string,rarity:Rarity,now:number){
  const base=ITEMS[itemId],mode=base?.type==='material'&&['rare','epic','legendary','immortal','mythic'].includes(rarity)?'spirit':base?.type==='equipment'?'heavy':'ground';
  this.liveRigged()?.playPickup(itemId,rarity,now,mode);
 }
 update(dt:number,time:number,actor?:PublicPlayer,speed=0){
  this.flightRig.visible=!!actor?.flight;if(this.flightRig.visible){this.flightRig.position.y=Math.sin(time*3.3)*.045;this.flightAura.rotation.z=time*.72;const m=this.flightAura.material as T.MeshBasicMaterial;m.opacity=.3+Math.sin(time*4.8)*.12;}
  const live=this.liveRigged();if(live){this.profile=live.profile;live.update(dt,time,actor,speed);return;}
  if(this.rigged?.failed&&!this.transitionRigged)this.showVrmFailureMarker();
 }
 dispose(){this.disposed=true;this.rigged?.dispose();if(this.transitionRigged&&this.transitionRigged!==this.rigged)this.transitionRigged.dispose();this.transitionRigged=undefined;disposeTree(this.root);}
}
