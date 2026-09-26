import { ITEMS } from '../data/equipment';
import type { ItemInstance, Player } from '../types';
export const INVENTORY_CAPACITY=48;
export function canAdd(inventory:ItemInstance[],items:ItemInstance[]){
 const merged=new Set(inventory.filter(i=>ITEMS[i.baseId].type==='material').map(i=>i.baseId));let slots=inventory.length;
 for(const i of items){if(ITEMS[i.baseId].type==='material'){if(!merged.has(i.baseId)){merged.add(i.baseId);slots++;}}else slots++;}
 return slots<=INVENTORY_CAPACITY;
}
export function addItems(player:Pick<Player,'inventory'>,items:ItemInstance[]){
 if(!canAdd(player.inventory,items))throw new Error('行囊已滿，請先整理裝備。');
 for(const i of items){const stack=ITEMS[i.baseId].type==='material'?player.inventory.find(x=>x.baseId===i.baseId):undefined;if(stack)stack.quantity+=i.quantity;else player.inventory.push(i);}
}
export function takeItem(player:Pick<Player,'inventory'>,id:string){const index=player.inventory.findIndex(i=>i.id===id);if(index<0)throw new Error('物品已不在行囊中。');return player.inventory.splice(index,1)[0];}
