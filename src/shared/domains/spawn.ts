import type { Vec2 } from '../types';
import { MONSTERS } from '../data/monsters';
import { REGIONS,walkable } from '../data/world';
import { seededRandom } from './item';
export interface SpawnZone extends Vec2 {id:string;monsterId:string;radius:number;maxCount:number;respawn:number;patrolRadius:number;eliteChance:number;activationDistance:number}
export const SPAWN_ZONES:SpawnZone[]=[];
export function spawnPositions(zone:SpawnZone){const random=seededRandom(zone.id.split('').reduce((n,c)=>n*31+c.charCodeAt(0),23));const result:Vec2[]=[];for(let i=0;i<zone.maxCount;i++){for(let tries=0;tries<25;tries++){const angle=random()*6.28,r=Math.sqrt(random())*zone.radius,p={x:zone.x+Math.cos(angle)*r,z:zone.z+Math.sin(angle)*r};if(walkable(p,1)){result.push(p);break;}}}return result;}
