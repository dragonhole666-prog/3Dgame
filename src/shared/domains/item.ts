import type { ItemInstance, Rarity, Stats } from '../types';
import { ITEMS } from '../data/equipment';
import { AFFIXES } from '../data/affixes';
import { RARITIES } from '../data/rarities';
export type Random = () => number;
export function seededRandom(seed:number):Random {return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function createItem(baseId:string,rng:Random=Math.random,quantity=1,rarity?:Rarity):ItemInstance {
 const base=ITEMS[baseId];if(!base)throw new Error('未知物品');
 const rank=rarity??base.rarity;
 const pool=[...base.affixPool], affixes:ItemInstance['affixes']=[];
 const factor=1+base.itemLevel*.045;
 for(let n=0;n<Math.min(RARITIES[rank].affixes,base.affixPool.length);n++){
  const id=pool.splice(Math.floor(rng()*pool.length),1)[0],a=AFFIXES[id];
  const min=Math.round(a.min*factor),max=Math.round(a.max*factor);
  affixes.push({id,stat:a.stat,min,max,value:min+Math.floor(rng()*(max-min+1))});
 }
 return {id:crypto.randomUUID(),baseId,rarity:rank,itemLevel:base.itemLevel,quality:85+Math.floor(rng()*31),affixes,quantity:Math.max(1,Math.floor(quantity)),durability:100,identified:RARITIES[rank].rank<4,enhancementLevel:0,evolutionState:'base',sockets:[]};
}
export const emptyStats=():Stats=>({str:0,agi:0,vit:0,int:0,attack:0,defense:0,hp:0,accuracy:0,evasion:0,crit:0,critDamage:0,haste:0,penetration:0,fire:0,frost:0,lightning:0,fireResist:0,frostResist:0,lightningResist:0,lifesteal:0});
export function itemStats(item:ItemInstance):Stats {
 const s=emptyStats(),base=ITEMS[item.baseId],wear=item.durability===0?.5:1;
 for(const [key,value] of Object.entries(base.baseStats)) s[key as keyof Stats]=Math.round(value*item.quality/100*wear*(1+(item.enhancementLevel??0)*.06));
 if(item.identified)for(const a of item.affixes)s[a.stat]+=a.value*wear;
 return s;
}
export function itemValue(item:ItemInstance){return Math.round(ITEMS[item.baseId].sellPrice*(item.quality/100)*(1+item.affixes.reduce((s,a)=>s+a.value/Math.max(1,a.max),0)))*item.quantity;}
