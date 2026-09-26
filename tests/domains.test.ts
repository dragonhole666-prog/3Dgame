import { describe,it,expect } from 'vitest';
import { ITEMS,APPEARANCES,STARTER_ITEMS } from '../src/shared/data/equipment';
import { MONSTERS } from '../src/shared/data/monsters';
import { LOOT_TABLES } from '../src/shared/data/loot-tables';
import { createItem,seededRandom,itemStats } from '../src/shared/domains/item';
import { equip,unequip,calculateStats } from '../src/shared/domains/equipment';
import { addItems } from '../src/shared/domains/inventory';
import { rollLoot } from '../src/shared/domains/loot';
import { TradeDomain } from '../src/shared/domains/trade';
import type { Player } from '../src/shared/types';
export function player(id='p'):Player {const p:Player={id,name:id,level:10,xp:0,hp:800,maxHp:800,mp:100,maxMp:100,gold:500,inventory:[],equipment:{},stats:calculateStats({level:10,equipment:{}}),x:0,z:0,angle:0,speed:0,state:'Idle',hitAt:0,staggerUntil:0,input:{x:0,z:0,sprint:false},inputAt:0,path:[],cooldowns:{},known:[],kills:{},online:true,revision:0,jumpAt:0};return p;}
describe('data integrity',()=>{
 it('all equipment has an appearance; content is not only recolors',()=>{const gear=Object.values(ITEMS).filter(i=>i.slot);expect(gear.filter(i=>i.slot==='mainhand').length).toBeGreaterThanOrEqual(10);expect(gear.filter(i=>i.slot!=='mainhand').length).toBeGreaterThanOrEqual(20);for(const i of gear)expect(APPEARANCES[i.appearanceId!]?.slot).toBe(i.slot);expect(new Set(Object.values(APPEARANCES).map(a=>a.shape)).size).toBeGreaterThan(20);});
 it('all loot references resolve and exclusive drum belongs only to boss',()=>{for(const t of Object.values(LOOT_TABLES))for(const e of [...t.entries,...t.guaranteed??[]])expect(ITEMS[e.itemId]).toBeDefined();expect(ITEMS['kui-drum'].dropSource).toEqual([MONSTERS.kui.name]);});
});
describe('loot → inventory → equipment',()=>{
 it('first boss victory yields an actual unidentified thunder sword; identify and equip preserves unique rolls',()=>{const drops=rollLoot('kui',{firstKill:true,boss:true},seededRandom(3));const sword=drops.find(i=>i.baseId==='thunder-sword')!;expect(sword).toBeDefined();expect(sword.identified).toBe(false);const p=player();addItems(p,drops);expect(()=>equip(p,sword.id)).toThrow('鑑定');sword.identified=true;const stats=itemStats(sword);equip(p,sword.id);expect(p.equipment.mainhand?.id).toBe(sword.id);expect(p.stats.attack).toBe(48+stats.attack);expect(APPEARANCES[ITEMS[sword.baseId].appearanceId!].vfx).toBe('lightning');unequip(p,'mainhand');expect(p.inventory.find(i=>i.id===sword.id)?.affixes).toEqual(sword.affixes);});
 it('rolls have independent identities and values within the declared ranges',()=>{const random=seededRandom(40),a=createItem('thunder-sword',random),b=createItem('thunder-sword',random);expect(a.id).not.toBe(b.id);expect(a.affixes).not.toEqual(b.affixes);for(const f of [...a.affixes,...b.affixes]){expect(f.value).toBeGreaterThanOrEqual(f.min);expect(f.value).toBeLessThanOrEqual(f.max);}});
 it('full inventory swap succeeds, unequip cannot destroy equipment',()=>{const p=player();p.inventory=Array.from({length:48},()=>createItem('bamboo-sword'));p.equipment.mainhand=createItem('iron-sword');equip(p,p.inventory[0].id);expect(p.inventory.length).toBe(48);expect(()=>unequip(p,'mainhand')).toThrow('已滿');expect(p.equipment.mainhand).toBeDefined();});
 it('starter bag keeps a level-one baseline while gated showcase gear remains intentionally level-gated',()=>{for(const id of STARTER_ITEMS)expect(ITEMS[id]).toBeDefined();expect(ITEMS['iron-sword'].requiredLevel).toBe(1);expect(ITEMS['linen-robe'].requiredLevel).toBe(1);expect(STARTER_ITEMS.some(id=>ITEMS[id].requiredLevel>1)).toBe(true);});
});
describe('economy invariants',()=>{
 it('changing an offer invalidates both locks and stale confirmation; exchange is atomic',()=>{const a=player('a'),b=player('b'),t=new TradeDomain(new Map([['a',a],['b',b]]));a.inventory=[createItem('bamboo-sword')];const item=a.inventory[0];t.request('a','b');t.offer('a',[item.id],0);t.lock('a',1);t.lock('b',1);t.offer('b',[],100);expect(t.session('a')?.offers.a.locked).toBe(false);expect(()=>t.confirm('a',1)).toThrow();t.lock('a',2);t.lock('b',2);expect(t.confirm('a',2)).toBe(false);expect(a.inventory.length).toBe(1);expect(t.confirm('b',2)).toBe(true);expect(a.gold).toBe(600);expect(b.gold).toBe(400);expect(b.inventory[0].id).toBe(item.id);expect(t.session('a')).toBeUndefined();});
 it('listing escrows a unique instance and prevents duplicate purchases',()=>{const a=player('a'),b=player('b'),t=new TradeDomain(new Map([['a',a],['b',b]]));a.inventory=[createItem('jade-spear')];const id=a.inventory[0].id;t.list('a',id,50);expect(a.inventory).toHaveLength(0);const listing=t.listings[0].id;t.buy('b',listing);expect(b.inventory[0].id).toBe(id);expect(a.gold).toBe(550);expect(()=>t.buy('b',listing)).toThrow('售出');});
});
