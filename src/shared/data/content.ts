import { APPEARANCES,ITEMS } from './equipment';
import { MONSTERS } from './monsters';
import { LOOT_TABLES } from './loot-tables';
import { OBSTACLES,REGIONS,WORLD } from './world';
import type { Appearance,ItemBase,LootTable,MonsterDef } from '../types';
import { SPAWN_ZONES,type SpawnZone } from '../domains/spawn';
import { SKILL_DEFINITIONS,type SkillDefinition } from './skills';
import { EFFECTS,type EffectDefinition } from './effects';
import { BALANCE } from '../domains/combat-formula';
export interface WorldObject { id:string; kind:'monster'|'rock'|'bamboo'|'tree'|'lantern'|'house'|'pavilion'|'lake'; x:number;z:number;scale:number;rotation:number;monsterId?:string; }
type LegacyObstacle = (typeof OBSTACLES)[number];
type LegacyObstacleKind = LegacyObstacle['type'];
const LEGACY_OBSTACLE_KINDS = new Set<WorldObject['kind']>(['rock','house','pavilion','lantern','lake']);
const isLegacyObstacleObject=(o:WorldObject):o is WorldObject & {kind:LegacyObstacleKind}=>LEGACY_OBSTACLE_KINDS.has(o.kind);
export interface CharacterDefinition {id:string;name:string;height:number;build:number;skin:string;hair:string;outfit:string[]}
export const CHARACTERS:CharacterDefinition[]=[{id:'wanderer',name:'行山劍客',height:1,build:1,skin:'#c5a58b',hair:'#20282c',outfit:['cloud-robe','jade-crown','cloud-shoulders','thunder-bracers','scale-legs','cloud-boots','heaven-sword']}];
export const WORLD_OBJECTS:WorldObject[]=[...OBSTACLES.map((o,i)=>({id:`landmark-${i}`,kind:o.type as WorldObject['kind'],x:o.x,z:o.z,scale:o.r,rotation:0})),...Object.values(MONSTERS).flatMap(def=>{const r=REGIONS.find(r=>r.id===def.spawnArea)!;return Array.from({length:def.spawnCount??(def.aiProfile==='boss'?1:def.id==='wolf'?6:3)},(_,i)=>({id:`${def.id}-${i}`,kind:'monster' as const,monsterId:def.id,x:r.x+(def.spawnOffset?.x??0)+(i?Math.cos(i*2.4)*10:0),z:r.z+(def.spawnOffset?.z??0)+(i?Math.sin(i*2.4)*10:0),scale:1,rotation:i*1.3}));})];
let dataVersion=1;
export interface ContentPack {version:1;dataVersion:number;items:Record<string,ItemBase>;appearances:Record<string,Appearance>;monsters:Record<string,MonsterDef>;lootTables:Record<string,LootTable>;regions:typeof REGIONS;objects:WorldObject[];characters:CharacterDefinition[];spawnZones:SpawnZone[];skills:Record<string,SkillDefinition>;effects:Record<string,EffectDefinition>;balance:typeof BALANCE;}
export function exportContent():ContentPack{return structuredClone({version:1,dataVersion,items:ITEMS,appearances:APPEARANCES,monsters:MONSTERS,lootTables:LOOT_TABLES,regions:REGIONS,objects:WORLD_OBJECTS,characters:CHARACTERS,spawnZones:SPAWN_ZONES,skills:SKILL_DEFINITIONS,effects:EFFECTS,balance:BALANCE});}
export function applyContent(c:ContentPack){
 const replace=(target:object,source:object)=>{for(const key of Object.keys(target))delete (target as Record<string,unknown>)[key];Object.assign(target,source);};
 replace(ITEMS,c.items);replace(APPEARANCES,c.appearances);replace(MONSTERS,c.monsters);replace(LOOT_TABLES,c.lootTables);
 REGIONS.splice(0,REGIONS.length,...c.regions);WORLD_OBJECTS.splice(0,WORLD_OBJECTS.length,...c.objects);CHARACTERS.splice(0,CHARACTERS.length,...c.characters);
 OBSTACLES.splice(0,OBSTACLES.length,...c.objects.filter(isLegacyObstacleObject).map(o=>({x:o.x,z:o.z,r:o.scale,type:o.kind})));
 SPAWN_ZONES.splice(0,SPAWN_ZONES.length,...c.spawnZones??[]);if(c.skills)Object.assign(SKILL_DEFINITIONS,c.skills);if(c.effects)Object.assign(EFFECTS,c.effects);if(c.balance)Object.assign(BALANCE,c.balance);dataVersion=c.dataVersion??1;
}
export function validateContent(c:ContentPack){
 if(!c||c.version!==1||!Array.isArray(c.objects)||!Array.isArray(c.regions)||!Array.isArray(c.characters)||!c.items||!c.appearances||!c.monsters||!c.lootTables)throw new Error('內容格式不符。');
 const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 const identifier=(s:string)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,70}$/.test(s);
 const unique=(list:{id:string}[])=>new Set(list.map(o=>o.id)).size===list.length;
 if(c.objects.length>800||Object.keys(c.items).length>2000||!unique(c.objects)||!unique(c.regions)||!unique(c.characters))throw new Error('數量超出上限或識別碼重複。');
 if(!c.characters.length||!c.regions.length)throw new Error('至少需要一個人物與區域。');
 for(const [id,i] of Object.entries(c.items)){if(!identifier(id)||i.id!==id||typeof i.name!=='string'||!finite(i.requiredLevel,1,999)||!finite(i.itemLevel,1,999)||!finite(i.sellPrice,0,1e9)||!Array.isArray(i.affixPool)||!Array.isArray(i.dropSource)||!i.baseStats||Object.values(i.baseStats).some(n=>!finite(n,0,1e6)))throw new Error(`物品資料無效：${id}`);if(i.slot&&!c.appearances[i.appearanceId!])throw new Error(`${i.name} 缺少外觀。`);}
 for(const [id,a] of Object.entries(c.appearances))if(!identifier(id)||!finite(a.length,.02,5)||!finite(a.width,.01,3)||!finite(a.ornaments,0,12)||!/^#[0-9a-fA-F]{6}$/.test(a.color)||!Array.isArray(a.hideBody))throw new Error(`外觀資料無效：${id}`);
 for(const [id,m] of Object.entries(c.monsters))if(!identifier(id)||!finite(m.hp,1,1e7)||!finite(m.attack,0,1e5)||!finite(m.defense,0,1e5)||!finite(m.speed,.1,15)||!finite(m.scale,.2,8)||(m.visualHeightRatio!==undefined&&!finite(m.visualHeightRatio,.5,6))||(m.combatRadius!==undefined&&!finite(m.combatRadius,.15,5))||(m.spawnCount!==undefined&&!finite(m.spawnCount,1,30))||(m.bossBehavior!==undefined&&m.bossBehavior!=='queen-duelist')||!c.lootTables[m.lootTable]||!c.regions.some(r=>r.id===m.spawnArea)||!Array.isArray(m.skills))throw new Error(`異獸資料無效：${id}`);
 for(const table of Object.values(c.lootTables)){if(!finite(table.rolls,0,12)||!finite(table.chance,0,1)||!Array.isArray(table.entries))throw new Error('掉落表格式無效。');for(const e of [...table.entries,...table.guaranteed??[]])if(!c.items[e.itemId]||!finite(e.weight,.001,1e6)||!finite(e.minQuantity,1,999)||!finite(e.maxQuantity,e.minQuantity,999))throw new Error(`掉落項目無效：${e.itemId}`);}
 for(const o of c.objects)if(!identifier(o.id)||!finite(o.x,-WORLD.half+4,WORLD.half-4)||!finite(o.z,-WORLD.half+4,WORLD.half-4)||!finite(o.scale,.1,20)||!finite(o.rotation,-100,100)||(o.kind==='monster'&&!c.monsters[o.monsterId!]))throw new Error(`場景物件無效：${o.id}`);
 for(const ch of c.characters)if(!identifier(ch.id)||!finite(ch.height,.75,1.3)||!finite(ch.build,.65,1.5)||!Array.isArray(ch.outfit)||ch.outfit.some(i=>!c.items[i]?.slot))throw new Error(`人物資料無效：${ch.id}`);
 for(const zone of c.spawnZones??[])if(!identifier(zone.id)||!c.monsters[zone.monsterId]||!finite(zone.maxCount,1,30)||!finite(zone.radius,1,35)||!finite(zone.eliteChance,0,1)||!finite(zone.respawn,5,3600)||!finite(zone.x,-WORLD.half+8,WORLD.half-8)||!finite(zone.z,-WORLD.half+8,WORLD.half-8))throw new Error(`生成區域無效：${zone.id}`);
 for(const skill of Object.values(c.skills??{}))if(!finite(skill.cooldown,.1,120)||!finite(skill.cost,0,100)||!finite(skill.multiplier,0,20)||!finite(skill.range,0,30)||!finite(skill.hitFrame,0,5)||!finite(skill.recovery,.05,5)||!Array.isArray(skill.effects)||skill.effects.some(e=>!c.effects[e]))throw new Error(`技能資料無效：${skill.id}`);
}
