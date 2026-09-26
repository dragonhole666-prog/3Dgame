import { ITEMS } from '../data/equipment';
import type { ItemInstance, Rarity } from '../types';

const RARITY_YIELD:Readonly<Record<Rarity,number>>={
 broken:1,common:1,fine:2,rare:4,epic:7,legendary:12,immortal:16,mythic:24
};

/** Deterministic salvage yield shared by UI preview and authoritative server logic. */
export function salvageYield(item:ItemInstance){
 const base=ITEMS[item.baseId];
 if(!base||base.type!=='equipment')return 0;
 const qualityBonus=Math.floor(Math.max(0,item.quality-50)/20);
 const enhancementBonus=Math.max(0,item.enhancementLevel)*2;
 return Math.max(1,RARITY_YIELD[item.rarity]+qualityBonus+enhancementBonus);
}
