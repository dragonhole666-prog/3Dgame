import type { Actor,Stats } from '../types';
import { EFFECTS } from '../data/effects';
export class EffectSystem {
 static apply(actor:Actor,id:string,source:string,time:number){const def=EFFECTS[id];if(!def)return;actor.effects??=[];const old=actor.effects.find(e=>e.id===id);if(old){old.expires=time+def.duration;old.stacks=Math.min(def.maxStacks,old.stacks+1);old.source=source;}else actor.effects.push({id,source,started:time,expires:time+def.duration,nextTick:time+def.interval,stacks:1});if(def.interrupt){actor.attack=undefined;actor.staggerUntil=Math.max(actor.staggerUntil,time+def.duration);}}
 static stats(actor:Actor,base:Stats):Stats{const result={...base};for(const e of actor.effects??[])for(const [stat,v] of Object.entries(EFFECTS[e.id]?.stats??{}))result[stat as keyof Stats]+=v*e.stacks;return result;}
 static movement(actor:Actor){return (actor.effects??[]).reduce((v,e)=>Math.min(v,EFFECTS[e.id]?.moveScale??1),1);}
 static tick(actor:Actor,time:number){const pulses:{source:string;value:number;effect:string}[]=[];actor.effects=(actor.effects??[]).filter(e=>e.expires>time);for(const e of actor.effects){const d=EFFECTS[e.id];if(!d||!d.interval||e.nextTick>time)continue;e.nextTick=time+d.interval;pulses.push({source:e.source,value:d.power*e.stacks*(d.kind==='heal'?-1:1),effect:e.id});}return pulses;}
}
