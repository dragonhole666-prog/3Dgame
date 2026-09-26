import { mkdirSync,existsSync,readFileSync,writeFileSync,renameSync,copyFileSync,rmSync } from 'node:fs';
import { writeFile,rename,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { GameWorld } from './world';
import type { Listing,Player } from '../src/shared/types';
import { ITEMS } from '../src/shared/data/equipment';
import { refreshStats, repairIllegalHandLoadout } from '../src/shared/domains/equipment';
import { walkable } from '../src/shared/data/world';
import { migrateSave,SAVE_VERSION,type WorldSave } from './migrations';
interface PositionCheckpoint { savedAt:number; players:Array<{id:string;x:number;z:number;angle:number}> }

const RETRYABLE_FILE_CODES=new Set(['EPERM','EBUSY','EACCES']);
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const syncSleep=(ms:number)=>{const gate=new Int32Array(new SharedArrayBuffer(4));Atomics.wait(gate,0,0,ms);};
const errorCode=(error:unknown)=>typeof error==='object'&&error!==null&&'code' in error?String((error as {code?:unknown}).code??''):'';

async function renameWithRetry(source:string,destination:string){
 let lastError:unknown;
 for(let attempt=0;attempt<7;attempt++){
  try{await rename(source,destination);return;}
  catch(error){lastError=error;if(!RETRYABLE_FILE_CODES.has(errorCode(error)))throw error;await sleep(30*(attempt+1));}
 }
 throw lastError;
}
function renameSyncWithRetry(source:string,destination:string){
 let lastError:unknown;
 for(let attempt=0;attempt<7;attempt++){
  try{renameSync(source,destination);return;}
  catch(error){lastError=error;if(!RETRYABLE_FILE_CODES.has(errorCode(error)))throw error;syncSleep(30*(attempt+1));}
 }
 throw lastError;
}

export class Persistence {
 directory=resolve(process.env.GAME_DATA_DIR??'.data');tokens:Record<string,string>={};
 private positionPending?:string;private positionWrite?:Promise<void>;private tempSerial=0;
 constructor(){mkdirSync(this.directory,{recursive:true});}
 read<T>(name:string):T|undefined{const path=resolve(this.directory,name+'.json');if(!existsSync(path))return;try{return JSON.parse(readFileSync(path,'utf8')) as T;}catch(error){if(name==='positions'){console.error('[PersistenceRead] ignored invalid positions.json',error);return;}throw error;}}
 write(name:string,data:unknown){const path=resolve(this.directory,name+'.json'),temp=`${path}.${process.pid}.${++this.tempSerial}.tmp`;try{writeFileSync(temp,JSON.stringify(data),'utf8');renameSyncWithRetry(temp,path);}finally{try{rmSync(temp,{force:true});}catch{}}}
 restore(world:GameWorld){
  const raw=this.read<WorldSave>('world');if(!raw)return;const saved=migrateSave(raw);
  this.tokens=saved.tokens;
  for(const p of saved.players){p.inventory=p.inventory.filter(i=>ITEMS[i.baseId]);for(const [slot,i] of Object.entries(p.equipment))if(i&&!ITEMS[i.baseId])delete p.equipment[slot as keyof typeof p.equipment];p.online=false;p.flight=false;p.input={x:0,z:0,sprint:false};p.path=[];p.attack=undefined;p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.cooldowns={};p.hitAt=0;p.staggerUntil=0;p.jumpAt=-10;p.state=p.hp>0?'Idle':'Dead';repairIllegalHandLoadout(p);refreshStats(p);world.players.set(p.id,p);}
  // P0.23.9: recover the newest lightweight position checkpoint after the heavier world save.
  // This bounds crash/restart movement rollback without forcing a full synchronous JSON save every second.
  const positions=this.read<PositionCheckpoint>('positions');
  if(positions?.players)for(const savedPosition of positions.players){
   const p=world.players.get(savedPosition.id);if(!p)continue;
   const point={x:savedPosition.x,z:savedPosition.z};
   if(Number.isFinite(point.x)&&Number.isFinite(point.z)&&Number.isFinite(savedPosition.angle)&&walkable(point)){p.x=point.x;p.z=point.z;p.angle=savedPosition.angle;}
  }
  world.economy.listings=saved.listings.filter(l=>ITEMS[l.item.baseId]&&world.players.has(l.seller));
 }
 save(world:GameWorld){this.write('world',{saveVersion:SAVE_VERSION,tokens:this.tokens,players:[...world.players.values()],listings:world.economy.listings});}
 checkpointPositions(world:GameWorld){
  const payload:PositionCheckpoint={savedAt:Date.now(),players:[...world.players.values()].filter(p=>p.online).map(p=>({id:p.id,x:p.x,z:p.z,angle:p.angle}))};
  this.positionPending=JSON.stringify(payload);if(this.positionWrite)return;
  const path=resolve(this.directory,'positions.json');
  const flush=async()=>{while(this.positionPending!==undefined){
   const next=this.positionPending;this.positionPending=undefined;
   const temp=`${path}.${process.pid}.${++this.tempSerial}.tmp`;
   try{await writeFile(temp,next,'utf8');await renameWithRetry(temp,path);}finally{await rm(temp,{force:true}).catch(()=>{});}
  }};
  this.positionWrite=flush().catch(error=>console.error('[PositionCheckpoint]',error)).finally(()=>{this.positionWrite=undefined;if(this.positionPending!==undefined)this.checkpointPositions(world);});
 }
 backup(name:string){const path=resolve(this.directory,name+'.json');if(existsSync(path))copyFileSync(path,resolve(this.directory,name+'.previous.json'));}
}
