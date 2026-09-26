import type { AttackState, Command, Drop, GameEvent, Monster, Player, Snapshot, Vec2 } from '../src/shared/types';
import { clamp,distance } from '../src/shared/types';
import { ITEMS,STARTER_ITEMS } from '../src/shared/data/equipment';
import { MONSTERS } from '../src/shared/data/monsters';
import { NPCS,REGIONS,WORLD,walkable } from '../src/shared/data/world';
import { SKILL_DEFINITIONS, WEAPON_PROFILES, mythicChoreography } from '../src/shared/data/skills';
import { createItem,seededRandom,type Random } from '../src/shared/domains/item';
import { equip,unequip,refreshStats,calculateStats,weaponProfile } from '../src/shared/domains/equipment';
import { addItems,takeItem } from '../src/shared/domains/inventory';
import { salvageYield } from '../src/shared/domains/salvage';
import { rollLoot } from '../src/shared/domains/loot';
import { TradeDomain } from '../src/shared/domains/trade';
import { NavigationDomain } from '../src/shared/domains/navigation';
import { damage,MONSTER_SKILLS } from '../src/shared/domains/combat';
import { WORLD_OBJECTS } from '../src/shared/data/content';
import { CombatFormulaService } from '../src/shared/domains/combat-formula';
import { EffectSystem } from '../src/shared/domains/effects';
import { isSkillAllowed,weaponCombatIdentity } from '../src/shared/combat/weapon-skills';
import { SPAWN_ZONES,spawnPositions } from '../src/shared/domains/spawn';
import { resolveBoundedKnockback } from '../src/shared/domains/knockback';
import { ATTACK_FACING_TOLERANCE, PURSUIT_REPATH_DISTANCE, PURSUIT_REPATH_INTERVAL, attackHitDistance, desiredApproachPoint, isFacingTarget, monsterCombatRadius, isWithinAttackCommitRange, signedAngleDelta, targetAngle } from '../src/shared/combat/engagement';
import { PLAYER_RUN_SPEED, PLAYER_WALK_SPEED } from '../src/shared/data/locomotion';
import { ACTION_COMBAT_FLOW, bufferedChainOpenAt } from '../src/shared/combat/action-combat-flow';

export interface SnapshotScope {playerRadius:number;monsterRadius:number;dropRadius:number;eventRadius:number}
const distanceSquared=(a:Vec2,b:Vec2)=>{const dx=a.x-b.x,dz=a.z-b.z;return dx*dx+dz*dz;};

function nextMonsterSkill(def:(typeof MONSTERS)[string],m:Monster,distanceToTarget:number){
 if(def.bossBehavior!=='queen-duelist')return def.skills[m.cycle%def.skills.length];
 const hp=m.hp/Math.max(1,m.maxHp);
 if(distanceToTarget>6.25)return 'queen-dash';
 const rotation=hp>.66?['queen-slash','queen-cross','queen-dash']:
  hp>.32?['queen-slash','queen-spin','queen-cross','queen-dash','queen-burst']:
  ['queen-burst','queen-spin','queen-dash','queen-cross','queen-slash'];
 return rotation[m.cycle%rotation.length];
}

export class GameWorld {
 players=new Map<string,Player>();monsters=new Map<string,Monster>();drops=new Map<string,Drop>();events:GameEvent[]=[];
 economy=new TradeDomain(this.players);navigation=new NavigationDomain();time=0;private eventId=0;private attackId=0;private monsterZoneById=new Map<string,(typeof SPAWN_ZONES)[number]>();
 constructor(private rng:Random=Math.random){this.spawnMonsters();}
 spawnMonsters(){
  this.monsters.clear();this.monsterZoneById.clear();const random=seededRandom(539);
  const generated=SPAWN_ZONES.flatMap(zone=>spawnPositions(zone).map((p,i)=>({id:`${zone.id}-${i}`,kind:'monster',monsterId:zone.monsterId,...p,rotation:i*1.3,scale:1})));
  for(const object of [...WORLD_OBJECTS.filter(o=>o.kind==='monster'),...generated]){
   const def=MONSTERS[object.monsterId!];if(!def)continue;const pos={x:object.x,z:object.z};if(!walkable(pos))continue;const id=object.id;
   this.monsters.set(id,{id,defId:def.id,...pos,home:{...pos},hp:def.hp,maxHp:def.hp,angle:object.rotation,speed:0,state:'Idle',hitAt:0,staggerUntil:0,nextAttack:0,aiTimer:random()*5,cycle:0,contributors:{}});const zone=SPAWN_ZONES.find(candidate=>id.startsWith(candidate.id+'-'));if(zone)this.monsterZoneById.set(id,zone);
  }
 }
 createPlayer(id:string,name:string){
  const p:Player={id,name:name.trim().slice(0,16)||'無名行者',level:1,xp:0,hp:408,maxHp:408,mp:100,maxMp:100,gold:160,inventory:[],equipment:{},stats:calculateStats({level:1,equipment:{}}),...WORLD.spawn,angle:Math.PI,speed:0,state:'Idle',hitAt:0,staggerUntil:0,input:{x:0,z:0,sprint:false},inputAt:0,path:[],cooldowns:{},known:[],kills:{},online:true,revision:0,jumpAt:-10,flight:false};
  // Seed starter alternatives into the bag, but only auto-equip gear that a fresh Lv.1 player
  // can legally use. Offhand gear is added to the bag but is not auto-equipped, so adding the
  // offhand system never changes the authored default Idle silhouette. High-tier showcase pieces must never abort player creation.
  for(const baseId of STARTER_ITEMS){
   const item=createItem(baseId,this.rng),base=ITEMS[baseId];
   p.inventory.push(item);
   if(base?.slot&&base.slot!=='offhand'&&!p.equipment[base.slot]&&base.requiredLevel<=p.level&&item.identified) equip(p,item.id);
  }
  p.hp=p.maxHp;this.players.set(id,p);return p;
 }
 emit(event:Omit<GameEvent,'id'>){this.events.push({...event,id:++this.eventId});if(this.events.length>512)this.events.splice(0,256);}
 latestEventId(){return this.eventId;}
 eventsAfter(id:number){if(!this.events.length||id>=this.eventId)return [];const result:GameEvent[]=[];for(const event of this.events)if(event.id>id)result.push(event);return result;}
 notice(p:Player,text:string){this.emit({type:'notice',actor:p.id,text});}
 disconnect(id:string){const p=this.players.get(id);if(p){p.online=false;p.input={x:0,z:0,sprint:false};p.path=[];p.attack=undefined;p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.flight=false;}this.economy.cancel(id);}
 private available(p:Player,id:string){if(this.economy.reserved(p.id,id))throw new Error('物品正在交易中，請先移出提案。');}
 command(id:string,c:Command){
  const p=this.players.get(id);if(!p||!p.online)return;
  try {
   if(p.hp<=0&&!['revive','chat','target','tradeCancel'].includes(c.type))throw new Error('氣血已盡，請先回返人間。');
   switch(c.type){
    case 'move':{if(!Number.isFinite(c.x)||!Number.isFinite(c.z))return;const magnitude=Math.hypot(c.x,c.z),len=Math.max(1,magnitude);p.input={x:c.x/len,z:c.z/len,sprint:!!c.sprint};p.inputAt=this.time;if(magnitude>.01){this.cancelInterruptibleAttackForMovement(p);p.path=[];p.navLabel=undefined;p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.pursuitNextAt=undefined;}break;}
    case 'navigate':{if(!Number.isFinite(c.x)||!Number.isFinite(c.z))return;p.path=p.flight?[{x:clamp(c.x,-WORLD.half+4,WORLD.half-4),z:clamp(c.z,-WORLD.half+4,WORLD.half-4)}]:this.navigation.path(p,c);p.navLabel=typeof c.label==='string'?c.label.slice(0,60):'選定位置';p.input={x:0,z:0,sprint:false};p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.pursuitNextAt=undefined;break;}
    case 'target': p.target=c.id&&this.monsters.get(c.id)?.hp?c.id:undefined;p.autoAttack=false;p.queuedSkill=undefined;p.pursuitNextAt=undefined;break;
    case 'attack': this.startAttack(p,c.skill,c.target);break;
    case 'pickup':{if(p.flight)throw new Error('御劍時無法拾取，請按 G 收劍落地。');const list=[...this.drops.values()].filter(d=>!c.id||d.id===c.id).sort((a,b)=>distance(a,p)-distance(b,p));const d=list[0];if(!d||distance(d,p)>4.8)throw new Error('靠近地面靈物，按 F 拾取。');if(d.owner!==id&&this.time<d.publicAt)throw new Error('此物仍屬於討伐者。');addItems(p,[d.item]);this.drops.delete(d.id);p.revision++;this.emit({type:'pickup',actor:id,x:d.x,z:d.z,itemId:d.item.baseId,text:ITEMS[d.item.baseId].name,rarity:d.item.rarity});break;}
    case 'equip':this.available(p,c.id);equip(p,c.id);this.emit({type:'equip',actor:id});break;
    case 'unequip':unequip(p,c.slot);this.emit({type:'equip',actor:id});break;
    case 'identify':{this.available(p,c.id);const i=p.inventory.find(i=>i.id===c.id);if(!i)throw new Error('物品不在行囊中。');i.identified=true;p.revision++;this.notice(p,`鑑定完成：${ITEMS[i.baseId].name}，器紋已顯。`);break;}
    case 'discard':{this.available(p,c.id);const item=takeItem(p,c.id),d=1.35,x=clamp(p.x+Math.sin(p.angle)*d,-WORLD.half+3,WORLD.half-3),z=clamp(p.z+Math.cos(p.angle)*d,-WORLD.half+3,WORLD.half-3),dropId=crypto.randomUUID();this.drops.set(dropId,{id:dropId,item,x,z,owner:p.id,publicAt:this.time+8,expiresAt:this.time+300});p.revision++;this.emit({type:'drop',actor:p.id,x,z,itemId:item.baseId,text:ITEMS[item.baseId].name,rarity:item.rarity});this.notice(p,`已將 ${ITEMS[item.baseId].name} 丟到地上；五分鐘內仍可拾回。`);break;}
    case 'destroy':{this.available(p,c.id);const item=takeItem(p,c.id);p.revision++;this.notice(p,`已永久銷毀：${ITEMS[item.baseId].name}。`);break;}
    case 'salvage':{this.available(p,c.id);const source=p.inventory.find(i=>i.id===c.id);if(!source)throw new Error('物品不在行囊中。');const amount=salvageYield(source);if(amount<=0)throw new Error('只有裝備可以分解為精鍊材料。');const item=takeItem(p,c.id),dust=createItem('refining-dust',this.rng);dust.quantity=amount;addItems(p,[dust]);p.revision++;this.notice(p,`分解完成：${ITEMS[item.baseId].name} → 精鍊靈砂 ×${amount}`);break;}
    case 'intel':{if(p.flight)throw new Error('請先收劍落地，再與居民交談。');const n=NPCS.find(n=>n.id===c.npc);if(!n||distance(n,p)>6.5)throw new Error('請先走近居民，再詢問情報。');p.known=[...new Set([...p.known,...n.intel])];p.revision++;break;}
    case 'jump':if(!p.flight&&this.time-p.jumpAt>1.1){p.jumpAt=this.time;this.emit({type:'cast',actor:id,skill:'jump'});}break;
    case 'flight':{if(p.attack||p.staggerUntil>this.time)throw new Error('招式未收，暫時無法御劍。');p.flight=c.enabled??!p.flight;p.path=[];p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.input={x:0,z:0,sprint:false};p.speed=0;p.state=p.flight?'Flight':'Idle';this.emit({type:'cast',actor:id,skill:p.flight?'flight-on':'flight-off',x:p.x,z:p.z,angle:p.angle});break;}
    case 'revive':if(p.hp<=0){if(c.town)Object.assign(p,WORLD.spawn);p.hp=p.maxHp*(c.town?1:.5);p.mp=100;p.staggerUntil=this.time+2;p.deadAt=undefined;p.state='Idle';p.cooldowns.invulnerable=this.time+4;this.notice(p,'一縷靈息未散，山海仍待你前行。');}break;
    case 'repair':{if(distance(p,NPCS[1])>6.5)throw new Error('請前往鑄器師處修理。');if(p.gold<20)throw new Error('需要 20 靈石。');p.gold-=20;for(const i of Object.values(p.equipment))if(i)i.durability=100;refreshStats(p);this.notice(p,'衣甲已修復，鋒芒如初。');break;}
    case 'potion':{if((p.cooldowns.potion??0)>this.time)return;if(p.gold<12)throw new Error('需要 12 靈石購用回元散。');p.gold-=12;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.3);p.mp=Math.min(100,p.mp+30);p.cooldowns.potion=this.time+15;EffectSystem.apply(p,'regen',p.id,this.time);p.revision++;break;}
    case 'enhance':{this.available(p,c.id);if(distance(p,NPCS[1])>6.5)throw new Error('請走近鑄器師。');const item=p.inventory.find(i=>i.id===c.id)??Object.values(p.equipment).find(i=>i?.id===c.id);if(!item||!ITEMS[item.baseId].slot||!item.identified)throw new Error('需要已鑑定的裝備。');if(item.enhancementLevel>=10)throw new Error('已達強化上限。');const cost=(item.enhancementLevel+1)*60;if(p.gold<cost)throw new Error(`需要 ${cost} 靈石。`);p.gold-=cost;item.enhancementLevel++;refreshStats(p);this.notice(p,`強化成功 · ${ITEMS[item.baseId].name} +${item.enhancementLevel}`);break;}
    case 'chat':if(typeof c.text==='string'&&c.text.trim()&&(p.cooldowns.chat??0)<this.time){p.cooldowns.chat=this.time+1;this.emit({type:'chat',actor:id,text:`${p.name}：${c.text.trim().slice(0,180)}`});}break;
    case 'tradeRequest':{const other=this.players.get(c.player);if(!other||distance(p,other)>12)throw new Error('需要靠近其他在線行者。');this.economy.request(id,c.player);this.emit({type:'trade',actor:id,target:c.player,text:'交易提案已開啟，請雙方檢查內容。'});break;}
    case 'tradeOffer':if(!Array.isArray(c.items))return;this.economy.offer(id,c.items,c.gold);break;
    case 'tradeLock':this.economy.lock(id,c.revision);break;
    case 'tradeConfirm':if(this.economy.confirm(id,c.revision))this.emit({type:'trade',actor:id,text:'交易完成。物品與靈石已交付。'});break;
    case 'tradeCancel':this.economy.cancel(id);break;
    case 'list':this.economy.list(id,c.item,c.price);this.notice(p,'委託已掛入山海市集。');break;
    case 'buy':this.economy.buy(id,c.id);this.notice(p,'交易完成，物品已放入行囊。');break;
    case 'unlist':this.economy.unlist(id,c.id);break;
   }
  }catch(error){this.notice(p,error instanceof Error?error.message:'操作無法完成。');}
 }
 private nearestMonster(p:Player,maxDistance=35){
  let best:Monster|undefined,bestDistanceSq=maxDistance*maxDistance;
  for(const m of this.monsters.values()){
   if(m.hp<=0)continue;const d2=distanceSquared(p,m);
   if(d2<bestDistanceSq-1e-6||(Math.abs(d2-bestDistanceSq)<=1e-6&&best&&m.id<best.id)){best=m;bestDistanceSq=d2;}
  }
  return best;
 }
 private refreshNearestAutoTarget(p:Player){
  const nearest=this.nearestMonster(p);
  if(!nearest){p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.path=[];p.navLabel=undefined;return undefined;}
  if(p.target!==nearest.id){
   // HF14: a combat pursuit path is owned by the target that created it.  Never continue walking
   // toward an old monster after a closer target becomes the authoritative auto-lock.
   p.target=nearest.id;p.path=[];p.pursuitNextAt=this.time;
  }
  return nearest;
 }
 private bufferAttack(p:Player,skillId:string,targetId?:string){
  if(!SKILL_DEFINITIONS[skillId]||!isSkillAllowed(p.equipment,skillId)||p.hp<=0)return;
  // A single latest-input slot. Weapon legality is checked before buffering and again on execution.
  p.bufferedSkill=skillId;
  p.bufferedTarget=targetId&&this.monsters.get(targetId)?.hp?targetId:undefined;
 }
 private consumeBufferedAttack(p:Player){
  const skill=p.bufferedSkill,target=p.bufferedTarget;p.bufferedSkill=undefined;p.bufferedTarget=undefined;
  if(!skill)return false;
  try{this.startAttack(p,skill,target);}catch(error){this.notice(p,error instanceof Error?error.message:'招式無法施展。');}
  return !!p.attack;
 }
 private cancelInterruptibleAttackForMovement(p:Player){
  const a=p.attack;if(!a)return false;const skill=SKILL_DEFINITIONS[a.skill],cancelAt=a.hitWindowEnd??a.hitAt;
  if(!skill?.interruptible||this.time<cancelAt)return false;
  p.attack=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.state='Idle';return true;
 }
 private setCombatPursuit(p:Player,skillId:string,target:Monster){
  const profile=weaponProfile(p),end=desiredApproachPoint(p,target,skillId,profile,MONSTERS[target.defId]);
  p.path=this.navigation.path(p,end);p.navLabel='追擊目標';p.queuedSkill=skillId;p.pursuitNextAt=this.time+PURSUIT_REPATH_INTERVAL;
  // R27.3: combat auto-approach is an urgent pursuit, not ordinary click-to-walk navigation.
  // Mark only this server-owned path as sprint so out-of-range skills close distance at Run speed.
  p.input={x:0,z:0,sprint:true};
 }
 private commitAttack(p:Player,skillId:string,target?:Monster){
  const skill=SKILL_DEFINITIONS[skillId],combatProfile=weaponProfile(p),profile=WEAPON_PROFILES[combatProfile];if(!skill)return;
  if((p.cooldowns[skillId]??0)>this.time)return;if(p.mp<skill.cost)throw new Error('靈力不足。');
  p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.path=[];p.navLabel=undefined;p.input={x:0,z:0,sprint:false};p.mp-=skill.cost;
  const haste=1-p.stats.haste/100,windup=(skillId==='basic'?profile.windup:(skill.hitFrame||skill.windup||profile.windup))*haste,choreo=mythicChoreography(skillId),windowStart=choreo?choreo.hitWindow[0]*haste:undefined,windowEnd=choreo?choreo.hitWindow[1]*haste:undefined,recovery=(skillId==='basic'?profile.recovery:skill.recovery)*haste;
  // Basic-chain cooldown follows the same data-driven recovery-cancel gate as the authoritative
  // attack state. Without this, the buffered combo window opens visually but the old full basic
  // cooldown still rejects the next strike until the previous recovery has completely ended.
  const basicChainCooldown=(profile.windup+profile.recovery*ACTION_COMBAT_FLOW[combatProfile].combo.recoveryCancelRatio)*haste;
  p.cooldowns[skillId]=this.time+(skillId==='basic'?basicChainCooldown:skill.cooldown);
  const meleeLunge=skillId==='basic'?profile.lunge:((skill.animationProfile==='weapon'||skill.animationProfile==='heavy')?Math.min(.34,profile.lunge*.8):0);
  p.attack={id:++this.attackId,skill:skillId,started:this.time,hitAt:this.time+windup,hitWindowStart:windowStart===undefined?undefined:this.time+windowStart,hitWindowEnd:windowEnd===undefined?undefined:this.time+windowEnd,endsAt:this.time+Math.max(windup,windowEnd??windup)+recovery,resolved:false,target:target?.id,point:target?{x:target.x,z:target.z}:{x:p.x,z:p.z},lungeDistance:meleeLunge,lungeApplied:0};
  if(target)p.angle=targetAngle(p,target);p.state='Combat';
  if(skill.dashDistance){p.cooldowns.invulnerable=this.time+.55;let travel=skill.dashDistance;if(target)travel=Math.max(0,Math.min(travel,distance(p,target)-1.25));const steps=Math.ceil(travel/.55);for(let i=0;i<steps;i++)Object.assign(p,this.navigation.step(p,{x:p.x+Math.sin(p.angle)*Math.min(.55,travel-i*.55),z:p.z+Math.cos(p.angle)*Math.min(.55,travel-i*.55)}));if(skill.multiplier<=0)p.attack.resolved=true;}
  const castAngle=target?targetAngle(p,target):p.angle,atTarget=skill.impact==='target'&&target;
  const combatIdentity=weaponCombatIdentity(p.equipment);this.emit({type:'cast',actor:p.id,skill:skillId,x:atTarget?target!.x:p.x,z:atTarget?target!.z:p.z,originX:p.x,originZ:p.z,impactDelay:windup,castAt:p.attack.started,impactAt:p.attack.hitAt,angle:castAngle,weaponProfile:combatIdentity.profile,weaponElement:combatIdentity.element});
 }
 private startAttack(p:Player,skillId:string,targetId?:string){
  if(p.flight){p.flight=false;p.state='Idle';this.emit({type:'cast',actor:p.id,skill:'flight-off',x:p.x,z:p.z,angle:p.angle});}
  const skill=SKILL_DEFINITIONS[skillId];if(!skill||p.hp<=0)return;
  if(!isSkillAllowed(p.equipment,skillId))throw new Error(`目前武器無法施展「${skill.name}」。`);
  if(p.attack){this.bufferAttack(p,skillId,targetId);return;}
  if(p.staggerUntil>this.time||(p.cooldowns[skillId]??0)>this.time)return;
  if(p.mp<skill.cost)throw new Error('靈力不足。');
  // Explicit scripted/manual attacks may name a target.  Normal auto-combat commands deliberately
  // do not inherit p.target: a stale UI selection must never override nearest-monster auto-lock.
  let target=targetId?this.monsters.get(targetId):undefined;
  if(skill.targeting==='enemy'){
   if(!target||target.hp<=0)target=this.nearestMonster(p);
   if(!target)throw new Error('附近沒有可攻擊的異獸。');p.target=target.id;p.autoAttack=true;
   const profile=weaponProfile(p),def=MONSTERS[target.defId];
   if(!isWithinAttackCommitRange(p,target,skillId,profile,def)){this.setCombatPursuit(p,skillId,target);return;}
   if(!isFacingTarget(p,target,p.angle)){p.path=[];p.navLabel='調整攻擊方向';p.queuedSkill=skillId;p.pursuitNextAt=this.time;return;}
  }
  this.commitAttack(p,skillId,target);
 }

 tick(dt:number){
  this.time+=dt;
  for(const actor of [...this.players.values(),...this.monsters.values()])if(actor.hp>0){for(const pulse of EffectSystem.tick(actor,this.time)){
   if(this.monsters.has(actor.id)&&pulse.value>0){const source=this.players.get(pulse.source);if(source)this.hitMonster(source,actor as Monster,pulse.value,false,'effect');}
   else {actor.hp=clamp(actor.hp-pulse.value,actor instanceof Object?1:1,actor.maxHp);this.emit({type:'hit',actor:pulse.source,target:actor.id,value:pulse.value,x:actor.x,z:actor.z,skill:pulse.effect});}
  }}
  for(const p of this.players.values())if(p.online)this.updatePlayer(p,dt);
  for(const m of this.monsters.values())this.updateMonster(m,dt);
  for(const [id,d] of this.drops)if(this.time>d.expiresAt)this.drops.delete(id);
 }
 private move(actor:Player|Monster,direction:Vec2,speed:number,dt:number){
  const len=Math.hypot(direction.x,direction.z),wanted=len>.01?speed*EffectSystem.movement(actor):0;
  // Exponential response is frame-rate independent and removes the snap produced by linear dt gains.
  const speedResponse=wanted>actor.speed?6.8:9.4;actor.speed+=(wanted-actor.speed)*(1-Math.exp(-speedResponse*dt));
  if(len>.01){
   const dirX=direction.x/len,dirZ=direction.z/len,heading=Math.atan2(dirX,dirZ),turn=1-Math.exp(-8.6*dt);
   // HF6: facing is visual/combat orientation; authoritative translation follows the already-validated
   // navigation direction. Using the still-turning facing angle here made pursuit cut corners into
   // colliders, so NavigationDomain.step() repeatedly returned the same position and the actor stalled.
   actor.angle+=Math.atan2(Math.sin(heading-actor.angle),Math.cos(heading-actor.angle))*turn;
   if(actor.speed>.025){const before={x:actor.x,z:actor.z},stepDistance=actor.speed*dt,next=this.navigation.step(actor,{x:actor.x+dirX*stepDistance,z:actor.z+dirZ*stepDistance});Object.assign(actor,next);if(distance(before,next)<stepDistance*.08)actor.speed*=Math.exp(-10*dt);}
  }
 }
 private updatePlayer(p:Player,dt:number){
  if(p.hp<=0)return;
  p.mp=Math.min(p.maxMp,p.mp+dt*2.8);
  const inCombat=[...this.monsters.values()].some(m=>m.hp>0&&m.target===p.id);
  if(!inCombat&&!p.attack)p.hp=Math.min(p.maxHp,p.hp+dt*p.maxHp*.025);
  if(p.attack){
   p.speed=0;const a=p.attack,target=a.target?this.monsters.get(a.target):undefined;
   if(a.lungeDistance&&target&&target.hp>0&&this.time<a.hitAt){const duration=Math.max(.001,a.hitAt-a.started),phase=clamp((this.time-a.started)/duration,0,1),eased=phase*phase*(3-2*phase),wanted=a.lungeDistance*eased,delta=Math.max(0,wanted-(a.lungeApplied??0));if(delta>.0001){const def=MONSTERS[target.defId],clearance=Math.max(.42,monsterCombatRadius(def)+.38),room=Math.max(0,distance(p,target)-clearance),step=Math.min(delta,room);if(step>.0001)Object.assign(p,this.navigation.step(p,{x:p.x+Math.sin(p.angle)*step,z:p.z+Math.cos(p.angle)*step}));a.lungeApplied=(a.lungeApplied??0)+step;}}
   if(!a.resolved){const windowed=a.hitWindowEnd!==undefined,ready=windowed?this.time>=(a.hitWindowStart??a.hitAt)&&this.time<=a.hitWindowEnd!:this.time>=a.hitAt;if(ready)a.resolved=this.resolvePlayerAttack(p,a);if(windowed&&!a.resolved&&this.time>a.hitWindowEnd!)a.resolved=true;}
   // R27 flow-combat: the latest buffered action may consume part of RECOVERY only after the
   // authoritative hit window is resolved. This keeps damage timing/server authority intact while
   // removing the dead pause between authored actions.
   const currentSkill=SKILL_DEFINITIONS[a.skill],bufferedId=p.bufferedSkill,buffered=bufferedId?SKILL_DEFINITIONS[bufferedId]:undefined;
   const bufferedReady=!!bufferedId&&!!buffered&&(p.cooldowns[bufferedId]??0)<=this.time&&p.mp>=buffered.cost&&isSkillAllowed(p.equipment,bufferedId);
   if(a.resolved&&bufferedReady&&currentSkill&&this.time>=bufferedChainOpenAt(a,weaponProfile(p),currentSkill.interruptible)){
    p.attack=undefined;if(this.consumeBufferedAttack(p)||p.queuedSkill)return;
    // If the next action cannot actually start (for example its target vanished), keep the old
    // recovery alive instead of granting a free cancel with no follow-up action.
    p.attack=a;
   }
   if(this.time>=a.endsAt){p.attack=undefined;if(this.consumeBufferedAttack(p))return;}return;
  }
  if(p.staggerUntil>this.time){p.speed=0;p.state='Stagger';return;}
  let pursuitFallback:Vec2|undefined;
  if(p.queuedSkill&&p.target){const queued=p.queuedSkill,skill=SKILL_DEFINITIONS[queued],target=p.autoAttack?this.refreshNearestAutoTarget(p):this.monsters.get(p.target);if(!target||target.hp<=0||!skill||!isSkillAllowed(p.equipment,queued)){p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.path=[];p.navLabel=undefined;if(!target||target.hp<=0){p.target=undefined;p.autoAttack=false;}}else{const profile=weaponProfile(p),def=MONSTERS[target.defId];if(isWithinAttackCommitRange(p,target,queued,profile,def)){p.path=[];p.navLabel='鎖定最近目標';p.speed+=(0-p.speed)*(1-Math.exp(-14*dt));const wanted=targetAngle(p,target),turn=1-Math.exp(-18*dt);p.angle+=signedAngleDelta(p.angle,wanted)*turn;p.state='Combat';if(isFacingTarget(p,target,p.angle,ATTACK_FACING_TOLERANCE)){this.startAttack(p,queued,target.id);if(p.attack)return;}return;}const wanted=desiredApproachPoint(p,target,queued,profile,def),last=p.path.at(-1);pursuitFallback={x:wanted.x-p.x,z:wanted.z-p.z};if(this.time>=(p.pursuitNextAt??0)&&(!last||distance(last,wanted)>PURSUIT_REPATH_DISTANCE)){try{this.setCombatPursuit(p,queued,target);}catch(error){p.path=[];p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.autoAttack=false;pursuitFallback=undefined;this.notice(p,error instanceof Error?error.message:'無法接近目標。');}}}}
  let direction:Vec2={x:0,z:0};
  // P0.23.9: input is a short lease, not a single-render-frame pulse. Low-end clients can
  // miss several RAF callbacks during shader/model/chunk work; 1.25 s prevents the server from
  // falsely braking the player mid-stride. blur/keyup still sends an explicit zero move.
  if(this.time-p.inputAt<1.25)direction=p.input;
  if(p.path.length){let next=p.path[0];while(next){const finalCombatNode=p.path.length===1&&!!p.queuedSkill,reach=finalCombatNode?.18:.45;if(distance(p,next)>=reach)break;p.path.shift();next=p.path[0];}if(next)direction={x:next.x-p.x,z:next.z-p.z};else if(pursuitFallback)direction=pursuitFallback;else p.navLabel=undefined;}
  else if(pursuitFallback)direction=pursuitFallback;
  const manualInput=p.path.length===0&&this.time-p.inputAt<1.25,inputMagnitude=manualInput?Math.min(1,Math.hypot(direction.x,direction.z)):1;
  if(p.flight){
   const len=Math.hypot(direction.x,direction.z),wanted=len>.01?(p.input.sprint?15:10.5)*inputMagnitude:0;p.speed+=(wanted-p.speed)*Math.min(1,dt*(wanted?6.5:9));
   if(len>.01){const heading=Math.atan2(direction.x,direction.z);p.angle+=Math.atan2(Math.sin(heading-p.angle),Math.cos(heading-p.angle))*Math.min(1,dt*8);p.x=clamp(p.x+Math.sin(p.angle)*p.speed*dt,-WORLD.half+3,WORLD.half-3);p.z=clamp(p.z+Math.cos(p.angle)*p.speed*dt,-WORLD.half+3,WORLD.half-3);}p.state='Flight';
  }else{this.move(p,direction,(p.input.sprint?PLAYER_RUN_SPEED:PLAYER_WALK_SPEED)*inputMagnitude,dt);p.state=p.speed>.2?(p.input.sprint?'Run':'Walk'):'Idle';}
  if(!p.flight&&p.autoAttack&&!p.queuedSkill){const target=this.refreshNearestAutoTarget(p);if(target)this.startAttack(p,'basic',target.id);}
 }
 private resolvePlayerAttack(p:Player,a:AttackState){
  const skill=SKILL_DEFINITIONS[a.skill],profile=WEAPON_PROFILES[weaponProfile(p)];if(!skill)return true;
  if(skill.healRatio){const amount=Math.round(p.maxHp*skill.healRatio);p.hp=Math.min(p.maxHp,p.hp+amount);this.emit({type:'hit',actor:p.id,target:p.id,value:-amount,x:p.x,z:p.z,skill:a.skill});return true;}
  if(skill.multiplier<=0)return true;const target=this.monsters.get(a.target??'');if(!target||target.hp<=0)return false;const center=skill.impact==='self'?p:target;let didHit=false;
  for(const m of this.monsters.values()){if(m.hp<=0||(!skill.radius&&m.id!==target.id)||distance(m,center)>(skill.radius||.1)||distance(p,m)>attackHitDistance(a.skill,weaponProfile(p),MONSTERS[m.defId])+skill.radius*.3)continue;const hit=CombatFormulaService.resolve(EffectSystem.stats(p,p.stats),EffectSystem.stats(m,CombatFormulaService.monsterStats(MONSTERS[m.defId])),skill.multiplier*profile.multiplier,this.rng);this.hitMonster(p,m,hit.value,hit.critical,a.skill);didHit=true;if(hit.value>0&&m.hp>0)for(const effect of skill.effects)EffectSystem.apply(m,effect,p.id,this.time);}
  return didHit;
 }
 private hitMonster(p:Player,m:Monster,value:number,critical:boolean,skill:string){
  m.hp=Math.max(0,m.hp-value);m.hitAt=this.time;m.target=p.id;m.contributors[p.id]=(m.contributors[p.id]??0)+value;
  const boss=MONSTERS[m.defId].aiProfile==='boss';m.staggerUntil=this.time+(boss?.1:skill==='basic'?.16:.55);
  if(!boss){m.attack=undefined;const d=Math.max(.1,distance(p,m));Object.assign(m,this.navigation.step(m,{x:m.x+(m.x-p.x)/d*(skill==='basic'?.22:1.4),z:m.z+(m.z-p.z)/d*(skill==='basic'?.22:1.4)}));}
  p.hp=Math.min(p.maxHp,p.hp+value*p.stats.lifesteal/100);
  const combatIdentity=weaponCombatIdentity(p.equipment);this.emit({type:'hit',actor:p.id,target:m.id,x:m.x,z:m.z,value,critical,skill,weaponProfile:combatIdentity.profile,weaponElement:combatIdentity.element});
  if(m.hp===0)this.killMonster(m,p);
 }
 private killMonster(m:Monster,killer:Player){
  m.state='Dead';m.deadAt=this.time;m.attack=undefined;m.target=undefined;m.speed=0;
  m.effects=[];let ownerId=killer.id,bestContribution=-Infinity;for(const [id,contribution] of Object.entries(m.contributors))if(contribution>bestContribution){bestContribution=contribution;ownerId=id;}const p=this.players.get(ownerId)??killer,def=MONSTERS[m.defId];
  const loot=rollLoot(def.lootTable,{firstKill:!p.kills[m.defId],boss:def.aiProfile==='boss'},this.rng);
  p.kills[m.defId]=(p.kills[m.defId]??0)+1;p.known=[...new Set([...p.known,m.defId])];p.gold+=Math.round(def.level*3+6);p.xp+=def.aiProfile==='boss'?680:def.level*12+25;
  while(p.xp>=p.level*95){p.xp-=p.level*95;p.level++;refreshStats(p);p.hp=p.maxHp;p.mp=100;this.emit({type:'level',actor:p.id,text:`境界精進 · Lv. ${p.level}`});}
  p.revision++;
  loot.forEach((item,i)=>{const angle=i/loot.length*Math.PI*2,pos={x:m.x+Math.cos(angle)*1.4,z:m.z+Math.sin(angle)*1.4},id=crypto.randomUUID();this.drops.set(id,{id,item,...pos,owner:p.id,publicAt:this.time+30,expiresAt:this.time+300});this.emit({type:'drop',actor:p.id,x:pos.x,z:pos.z,rarity:item.rarity,text:ITEMS[item.baseId].name});});
  this.emit({type:'death',actor:m.id,x:m.x,z:m.z});
 }
 private updateMonster(m:Monster,dt:number){
  const def=MONSTERS[m.defId];
  const zone=this.monsterZoneById.get(m.id);
  if(m.hp<=0){if(this.time-(m.deadAt??0)>(zone?.respawn??def.respawn)){Object.assign(m,{...m.home,hp:def.hp,state:'Idle',deadAt:undefined,contributors:{},target:undefined,attack:undefined});}return;}
  if(!m.target){let activePlayerNearby=false;const activationDistance=zone?.activationDistance??85,activationDistanceSq=activationDistance*activationDistance;for(const p of this.players.values())if(p.online&&distanceSquared(p,m)<activationDistanceSq){activePlayerNearby=true;break;}if(!activePlayerNearby){m.speed=0;return;}}
  if(Object.keys(m.contributors).length){let threatId:string|undefined,threatValue=-Infinity;for(const [id,value] of Object.entries(m.contributors)){const p=this.players.get(id);if(!p?.online||p.hp<=0||distanceSquared(p,m)>=35*35)continue;if(value>threatValue){threatValue=value;threatId=id;}}if(threatId)m.target=threatId;}
  let target=this.players.get(m.target??'');
  if(target&&(!target.online||target.hp<=0||distance(m,m.home)>32)){m.target=undefined;m.attack=undefined;m.state='Leash';target=undefined;}
  if(m.state==='Leash'||m.state==='Return'){
   m.state='Return';this.move(m,{x:m.home.x-m.x,z:m.home.z-m.z},def.speed*1.4,dt);m.hp=Math.min(m.maxHp,m.hp+dt*m.maxHp*.14);
   if(distance(m,m.home)<1){m.state='Idle';m.contributors={};m.hp=m.maxHp;}return;
  }
  if(m.attack){m.speed=0;const a=m.attack,s=MONSTER_SKILLS[a.skill];
   if(!a.resolved&&this.time>=a.hitAt){a.resolved=true;
    if(['charge','pounce','dive','queen-dash'].includes(a.skill)){const d=distance(m,a.point),steps=Math.ceil(d/.5);for(let i=0;i<steps;i++){const len=distance(m,a.point);if(len<.5)break;Object.assign(m,this.navigation.step(m,{x:m.x+(a.point.x-m.x)/len*.5,z:m.z+(a.point.z-m.z)/len*.5}));}}
    for(const p of this.players.values())if(p.online&&p.hp>0&&distance(p,a.point)<s.radius&&(p.cooldowns.invulnerable??0)<this.time){
     const value=CombatFormulaService.resolve(EffectSystem.stats(m,CombatFormulaService.monsterStats(def)),EffectSystem.stats(p,p.stats),s.multiplier,this.rng).value;p.hp=Math.max(0,p.hp-value);p.hitAt=this.time;p.staggerUntil=this.time+(s.knockback>3?.65:.22);p.attack=undefined;
     const effect:Record<string,string>={venom:'poison',frost:'slow',claw:'bleed',storm:'shock',stomp:'knockdown','queen-burst':'shock'};if(value>0&&effect[a.skill])EffectSystem.apply(p,effect[a.skill],m.id,this.time);
     const knockback=resolveBoundedKnockback(p,m,s.knockback,m.angle,(from,to)=>this.navigation.step(from,to));p.x=knockback.x;p.z=knockback.z;
     this.emit({type:'hit',actor:m.id,target:p.id,x:p.x,z:p.z,value,skill:a.skill});
     if(p.hp<=0){p.state='Dead';p.deadAt=this.time;p.path=[];p.target=undefined;p.queuedSkill=undefined;p.pursuitNextAt=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.input={x:0,z:0,sprint:false};p.speed=0;for(const item of Object.values(p.equipment))if(item)item.durability=Math.max(0,item.durability-5);refreshStats(p);this.emit({type:'death',actor:p.id});}
    }
   }
   if(this.time>a.endsAt){m.attack=undefined;m.nextAttack=this.time+s.recovery;}return;
  }
  if(m.staggerUntil>this.time){m.speed=0;return;}
  if(!target&&def.aggroRange>0){const aggroRangeSq=def.aggroRange*def.aggroRange;for(const candidate of this.players.values())if(candidate.online&&candidate.hp>0&&distanceSquared(m,candidate)<aggroRangeSq){target=candidate;break;}if(target){m.target=target.id;m.state='Suspicious';m.aiTimer=this.time+.6;
    if(def.aiProfile==='pack')for(const ally of this.monsters.values())if(ally.defId===m.defId&&ally.hp>0&&distance(ally,m)<8)ally.target=target.id;
   }}
  if(target){
   if(m.state==='Suspicious'&&this.time<m.aiTimer){m.speed=0;return;}
   const d=distance(m,target),nextSkill=nextMonsterSkill(def,m,d),skill=MONSTER_SKILLS[nextSkill];
   if(d>Math.max(def.attackRange,skill.range)){m.state='Chase';this.move(m,{x:target.x-m.x,z:target.z-m.z},def.speed,dt);}
   else {m.state='Combat';this.move(m,{x:0,z:0},0,dt);m.angle=Math.atan2(target.x-m.x,target.z-m.z);
    if(this.time>m.nextAttack){const id=nextMonsterSkill(def,m,d);m.cycle++;const s=MONSTER_SKILLS[id],point=['stomp','roar','shell','queen-spin','queen-burst'].includes(id)?{x:m.x,z:m.z}:{x:target.x,z:target.z};m.attack={id:++this.attackId,skill:id,started:this.time,hitAt:this.time+s.windup,endsAt:this.time+s.windup+.45,resolved:false,target:target.id,point};}
   }return;
  }
  if(this.time>m.aiTimer){m.aiTimer=this.time+4+this.rng()*5;m.state=m.state==='Idle'?'Patrol':'Idle';const angle=this.rng()*Math.PI*2;m.patrol={x:m.home.x+Math.sin(angle)*5,z:m.home.z+Math.cos(angle)*5};}
  if(m.state==='Patrol'&&m.patrol&&distance(m,m.patrol)>.6)this.move(m,{x:m.patrol.x-m.x,z:m.patrol.z-m.z},def.speed*.3,dt);else this.move(m,{x:0,z:0},0,dt);
 }
 snapshot(id:string,events=this.events,scope?:SnapshotScope):Snapshot{
  const self=this.players.get(id)!;
  if(!scope)return {time:this.time,self,players:[...this.players.values()].filter(p=>p.online).map(p=>({id:p.id,name:p.name,level:p.level,hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp,x:p.x,z:p.z,angle:p.angle,speed:p.speed,state:p.state,attack:p.attack,hitAt:p.hitAt,staggerUntil:p.staggerUntil,equipment:p.equipment,jumpAt:p.jumpAt,flight:!!p.flight})),monsters:[...this.monsters.values()],drops:[...this.drops.values()],events:events.filter(e=>!['notice','pickup','level'].includes(e.type)||e.actor===id),trade:this.economy.session(id),listings:this.economy.listings};
  const players:Snapshot['players']=[],monsters:Snapshot['monsters']=[],drops:Snapshot['drops']=[],visibleEvents:Snapshot['events']=[];
  const playerRadiusSq=scope.playerRadius*scope.playerRadius,monsterRadiusSq=scope.monsterRadius*scope.monsterRadius,dropRadiusSq=scope.dropRadius*scope.dropRadius,eventRadiusSq=scope.eventRadius*scope.eventRadius;
  for(const p of this.players.values()){if(!p.online)continue;if(p.id!==id&&distanceSquared(p,self)>playerRadiusSq)continue;players.push({id:p.id,name:p.name,level:p.level,hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp,x:p.x,z:p.z,angle:p.angle,speed:p.speed,state:p.state,attack:p.attack,hitAt:p.hitAt,staggerUntil:p.staggerUntil,equipment:p.equipment,jumpAt:p.jumpAt,flight:!!p.flight});}
  for(const m of this.monsters.values()){const def=MONSTERS[m.defId],mustInclude=m.id===self.target||def?.aiProfile==='boss';if(mustInclude||distanceSquared(m,self)<=monsterRadiusSq)monsters.push(m);}
  for(const drop of this.drops.values())if(drop.owner===id||distanceSquared(drop,self)<=dropRadiusSq)drops.push(drop);
  for(const event of events){if(event.actor===id||event.target===id||event.type==='chat'){visibleEvents.push(event);continue;}if(event.x!==undefined&&event.z!==undefined){const dx=event.x-self.x,dz=event.z-self.z;if(dx*dx+dz*dz<=eventRadiusSq)visibleEvents.push(event);continue;}if(!['notice','pickup','level'].includes(event.type))visibleEvents.push(event);}
  return {time:this.time,self,players,monsters,drops,events:visibleEvents,trade:this.economy.session(id),listings:this.economy.listings};
 }}
