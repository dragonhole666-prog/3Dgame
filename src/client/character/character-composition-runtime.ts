import * as T from 'three';
import type { ItemInstance,PublicPlayer,Rarity,Slot,WeaponProfile } from '../../shared/types';
import type { CharacterCustomization } from './customization';
import type { AvatarCandidateId } from './avatar-candidates';
import { CHARACTER_RUNTIME_ARCHITECTURE } from './character-runtime-architecture';
import { VrmCharacterRuntime } from './vrm-character-runtime';

/**
 * Stable composition boundary used by Character/Game/UI.
 * Higher layers no longer depend on the implementation details of VRM loading, GLB equipment,
 * animation source format, face sculpting or expression state.
 */
export class CharacterCompositionRuntime{
  readonly root=new T.Group();readonly loaded:Promise<boolean>;
  private readonly avatar:VrmCharacterRuntime;
  readonly architecture=CHARACTER_RUNTIME_ARCHITECTURE;
  constructor(candidate:AvatarCandidateId){this.root.name=`CharacterComposition_${candidate}`;this.avatar=new VrmCharacterRuntime(candidate);this.root.add(this.avatar.root);this.loaded=this.avatar.loaded;}
  get ready(){return this.avatar.ready;}get failed(){return this.avatar.failed;}get profile():WeaponProfile{return this.avatar.profile;}
  set rootVisible(v:boolean){this.root.visible=v;}get rootVisible(){return this.root.visible;}
  setEquipment(e:Partial<Record<Slot,ItemInstance>>){this.avatar.setEquipment(e);}
  setEquipmentVisible(v:boolean){this.avatar.setEquipmentVisible(v);}
  setCustomization(p:CharacterCustomization){this.avatar.setCustomization(p);}
  setClassAnimationSet(id:string){this.avatar.setClassAnimationSet(id);}
  previewAnimation(name:string){return this.avatar.previewAnimation(name);}
  predictAttack(skill:string,now:number){return this.avatar.predictAttack(skill,now);}
  playPickup(id:string,rarity:Rarity,now:number,kind:'ground'|'spirit'|'heavy'){this.avatar.playPickup(id,rarity,now,kind);}
  update(dt:number,time:number,actor?:PublicPlayer,speed=0){this.avatar.update(dt,time,actor,speed);}
  dispose(){this.avatar.dispose();this.root.removeFromParent();}
}
