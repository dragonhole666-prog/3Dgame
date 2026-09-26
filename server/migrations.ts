import type { ItemInstance,Player,Listing } from '../src/shared/types';
import { createItem } from '../src/shared/domains/item';
import { uniqueMigratedCharacterName } from '../src/shared/identity/character-name';
export const SAVE_VERSION=4;
export interface WorldSave {saveVersion:number;version?:number;tokens:Record<string,string>;players:Player[];listings:Listing[]}
export function migrateSave(raw:WorldSave):WorldSave{
 const save=structuredClone(raw);let version=save.saveVersion??save.version??1;
 if(version>SAVE_VERSION||version<1)throw new Error('Unsupported save version; original file preserved.');
 if(version===1){const upgrade=(item:ItemInstance)=>{item.enhancementLevel??=0;item.evolutionState??='base';item.sockets??=[];};for(const p of save.players){for(const item of [...p.inventory,...Object.values(p.equipment)])if(item)upgrade(item);p.effects=[];}for(const l of save.listings)upgrade(l.item);version=2;}
 if(version===2){
  // P0.24.6: existing saves also receive a visible staff so every weapon discipline can be tested.
  for(const p of save.players){
   const hasStaff=[...p.inventory,...Object.values(p.equipment)].some(i=>i?.baseId==='star-staff');
   if(!hasStaff)p.inventory.push(createItem('star-staff',Math.random));
  }
  version=3;
 }
 if(version===3){
  // HF17: old builds allowed multiple persisted characters to share the same display name.
  // Keep the oldest occurrence unchanged and suffix only collisions so the world becomes unique-name safe.
  const used=new Set<string>();
  for(const p of save.players)p.name=uniqueMigratedCharacterName(p.name,used);
  version=4;
 }
 save.saveVersion=version;delete save.version;return save;
}
