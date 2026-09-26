import type { ItemInstance, LootEntry } from '../types';
import { LOOT_TABLES } from '../data/loot-tables';
import { createItem, type Random } from './item';
export function rollLoot(tableId:string,context:{firstKill:boolean;boss:boolean},rng:Random=Math.random):ItemInstance[]{
 const table=LOOT_TABLES[tableId];if(!table)throw new Error('未知掉落表');
 const eligible=(e:LootEntry)=>!e.conditions||(e.conditions==='firstKill'?context.firstKill:context.boss);
 const entries=table.entries.filter(eligible),total=entries.reduce((s,e)=>s+e.weight,0),items:ItemInstance[]=[];
 const instantiate=(entry:LootEntry)=>createItem(entry.itemId,rng,entry.minQuantity+Math.floor(rng()*(entry.maxQuantity-entry.minQuantity+1)),entry.rarity);
 for(let i=0;i<table.rolls;i++){if(rng()>table.chance||total<=0)continue;let roll=rng()*total;const entry=entries.find(e=>(roll-=e.weight)<0)??entries.at(-1)!;items.push(instantiate(entry));}
 for(const entry of table.guaranteed??[])if(eligible(entry))items.push(instantiate(entry));return items;
}
