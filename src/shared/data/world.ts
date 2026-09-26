import type { Vec2 } from '../types';
import { HF265_COLLIDERS,HF265_SPAWN,HF265_WORLD_HALF,hf265TerrainHeight,hf265Walkable } from './hf265-world-layout';

export const WORLD = {
 name:'青嵐仙境',
 subtitle:'雲居映水 · HF26.5 Visual Reboot',
 half:HF265_WORLD_HALF,
 chunk:32,
 spawn:{...HF265_SPAWN},
 seed:98137,
 mapAsset:'hf265-procedural-quaternius-cc0',
};

export const REGIONS = [
 {id:'town',name:'青嵐仙門',level:'安全宗門',x:-34,z:48,radius:22,color:'#bba67b',description:'臨水仙門與楓庭相接，是旅者進入青嵐境的起點。'},
 {id:'bamboo',name:'蒼梧靈林',level:'建議 Lv. 1–6',x:-14,z:13,radius:25,color:'#73846b',description:'低飽和竹林與古木交錯，林間靈獸活動頻繁。'},
 {id:'marsh',name:'煙水澤',level:'建議 Lv. 4–10',x:-52,z:-9,radius:23,color:'#7c8f7e',description:'水霧貼地的濕澤，石徑與淺水區交錯。'},
 {id:'lake',name:'玄陰寒潭',level:'建議 Lv. 7–14',x:23,z:40,radius:23,color:'#6f9fb6',description:'青藍潭水倒映遠山，夜間寒氣最盛。'},
 {id:'fox',name:'霜骨天原',level:'地圖王 · 建議 Lv. 14+',x:-54,z:-48,radius:25,color:'#b9c2d0',description:'霧白高地與冷杉相接，霜尾天狐盤踞於此。'},
 {id:'zheng',name:'赤碑獸塚',level:'建議 Lv. 12–22',x:31,z:-25,radius:25,color:'#a68a73',description:'楓紅與古碑交錯的荒庭，五尾猙出沒其間。'},
 {id:'bird',name:'天裂神崖',level:'地圖王 · 建議 Lv. 18+',x:69,z:4,radius:21,color:'#8fa8b4',description:'高崖穿霧，蠱雕王巡弋上空。'},
 {id:'boss',name:'雷澤神墟',level:'地圖王 · 建議 Lv. 22+',x:35,z:-76,radius:25,color:'#8d84a8',description:'遠離仙門的古神墟，雷澤夔尊守著荒古兵器。'},
 {id:'queen',name:'金曜王庭',level:'地圖王 · 建議 Lv. 20+',x:8,z:140,radius:22,color:'#c8ad75',description:'北境王庭演武場，金髮女王持劍巡守。'}
];

export const NPCS = [
 {id:'guide',name:'沈聽風',role:'行山客 · 異獸情報',x:-28,z:49,angle:2.9,intel:['wolf','snake','turtle','mutant-boar','bog-angler','chlorine-bat','fox','zheng','gudiao','golden-queen','kui'],dialog:'青嵐境的異獸會掉成套護具；越深入遠山，地圖王掉落越珍稀。'},
 {id:'smith',name:'陸千錘',role:'仙門鑄器師 · 修理裝備',x:-45,z:46,angle:1.5,intel:['zheng','gudiao','golden-queen','kui'],dialog:'靈獸材與神獸核心都能煉器。歸來先整一整衣甲，再走下一程。'},
 {id:'broker',name:'蘇望月',role:'雲水行商 · 玩家市集',x:-21,z:46,angle:3,intel:['fox','golden-queen','kui'],dialog:'真正值錢的是能組成流派的那一件。'}
];

export const OBSTACLES = HF265_COLLIDERS.map(c=>({x:c.x,z:c.z,r:c.r,type:(c.kind==='rock'?'rock':c.kind==='pavilion'?'pavilion':'rock') as 'rock'|'pavilion'}));
export function heightAt(x:number,z:number){return hf265TerrainHeight(x,z);}
export function walkable(p:Vec2,margin=.55){return hf265Walkable(p,margin);}
export function groundStepAllowed(from:Vec2,to:Vec2){if(!walkable(to))return false;const planar=Math.max(.001,Math.hypot(to.x-from.x,to.z-from.z));return Math.abs(heightAt(to.x,to.z)-heightAt(from.x,from.z))<=.86+planar*.34;}
export function regionAt(p:Vec2){return [...REGIONS].sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];}
