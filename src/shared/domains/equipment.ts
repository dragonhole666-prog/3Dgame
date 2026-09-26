import type { ItemBase, Player, Slot, Stats, WeaponProfile } from '../types';
import { ITEMS, APPEARANCES } from '../data/equipment';
import { itemStats,emptyStats } from './item';
import { addItems, canAdd, takeItem, INVENTORY_CAPACITY } from './inventory';
export function calculateStats(player:Pick<Player,'level'|'equipment'>):Stats {
 const stats:Stats={...emptyStats(),str:10+player.level*2,agi:10+player.level,int:10+player.level,vit:10+player.level*2,attack:18+player.level*3,defense:3+player.level,hp:380+player.level*28,accuracy:96,evasion:5,crit:6,critDamage:150};
 for(const item of Object.values(player.equipment)){if(!item)continue;for(const [key,value] of Object.entries(itemStats(item)))stats[key as keyof Stats]+=value;}
 const thunderPieces=Object.values(player.equipment).filter(i=>i&&/thunder-/.test(i.baseId)&&ITEMS[i.baseId].slot!=='mainhand').length;
 if(thunderPieces>=3)stats.lightningResist+=15;if(thunderPieces>=5)stats.lightning+=20;
 stats.crit=Math.min(65,stats.crit);stats.haste=Math.min(45,stats.haste);stats.lifesteal=Math.min(20,stats.lifesteal);return stats;
}
export function refreshStats(player:Player){player.stats=calculateStats(player);player.maxHp=player.stats.hp;player.hp=Math.min(player.hp,player.maxHp);player.revision++;}
const TWO_HANDED_WEAPON_PROFILES:ReadonlySet<WeaponProfile>=new Set(['greatsword','dual','spear','staff','bow']);
export function itemWeaponProfile(base:ItemBase|undefined):WeaponProfile|undefined{if(!base?.appearanceId)return undefined;return APPEARANCES[base.appearanceId]?.animationProfile;}
export function isTwoHandedWeapon(base:ItemBase|undefined){if(base?.handedness)return base.handedness!=='one';const profile=itemWeaponProfile(base);return !!profile&&TWO_HANDED_WEAPON_PROFILES.has(profile);}
export function itemUsesSecondaryHand(base:ItemBase|undefined){return isTwoHandedWeapon(base);}
export function mainhandBlocksOffhand(player:Pick<Player,'equipment'>){const main=player.equipment.mainhand;return !!main&&isTwoHandedWeapon(ITEMS[main.baseId]);}
export function repairIllegalHandLoadout(player:Pick<Player,'equipment'|'inventory'>){
 const offhand=player.equipment.offhand;if(!offhand||!mainhandBlocksOffhand(player))return false;
 // Legacy saves may already contain an illegal two-hand + offhand combination. Preserve the item
 // even when the old bag was full; one temporary overflow slot is preferable to deleting gear.
 player.inventory.push(offhand);delete player.equipment.offhand;return true;
}
export function equip(player:Player,id:string){
 const item=player.inventory.find(i=>i.id===id);if(!item)throw new Error('物品不在行囊中。');const base=ITEMS[item.baseId];
 if(!base.slot)throw new Error('此物品無法穿戴。');if(player.level<base.requiredLevel)throw new Error(`需要 Lv. ${base.requiredLevel} 才能駕馭此器。`);
 if(!item.identified)throw new Error('請先鑑定靈器。');
 if(base.slot==='offhand'&&mainhandBlocksOffhand(player))throw new Error('目前使用雙手武器，無法同時裝備盾牌或其他副手。');
 const old=player.equipment[base.slot],displaced=[] as NonNullable<typeof old>[];
 if(old)displaced.push(old);
 if(base.slot==='mainhand'&&isTwoHandedWeapon(base)&&player.equipment.offhand)displaced.push(player.equipment.offhand);
 // Validate the whole transaction before mutating inventory/equipment. Equipping a two-handed
 // weapon can displace both the previous mainhand and offhand, so one-at-a-time addItems() would
 // otherwise risk a partially-applied loadout when the bag is nearly full.
 const inventoryAfterIncoming=player.inventory.filter(i=>i.id!==id);
 if(!canAdd(inventoryAfterIncoming,displaced))throw new Error('行囊空間不足，無法卸下目前裝備。');
 takeItem(player,id);if(displaced.length)addItems(player,displaced);
 player.equipment[base.slot]=item;
 if(base.slot==='mainhand'&&isTwoHandedWeapon(base))delete player.equipment.offhand;
 refreshStats(player);return base.slot;
}
export function unequip(player:Player,slot:Slot){const item=player.equipment[slot];if(!item)return;if(player.inventory.length>=INVENTORY_CAPACITY)throw new Error('行囊已滿。');addItems(player,[item]);delete player.equipment[slot];refreshStats(player);}
export function weaponProfile(player:Pick<Player,'equipment'>){const weapon=player.equipment.mainhand;return weapon?APPEARANCES[ITEMS[weapon.baseId].appearanceId!]?.animationProfile??'sword':'sword';}
