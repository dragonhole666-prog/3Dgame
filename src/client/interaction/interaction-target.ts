import type { Snapshot } from '../../shared/types';
import { distance } from '../../shared/types';
import { NPCS } from '../../shared/data/world';

export type InteractionTarget =
  | { type:'npc'; id:string; name:string; distance:number }
  | { type:'drop'; id:string; distance:number };

/**
 * Resolve the same contextual F target for both gameplay input and HUD hints.
 * NPCs get a small tie-break bias so a nearby conversation is not stolen by
 * loot sitting at roughly the same distance.
 */
export function resolveInteractionTarget(snapshot:Snapshot):InteractionTarget|undefined {
  const self=snapshot.self;
  const npc=NPCS
    .map(n=>({type:'npc' as const,id:n.id,name:n.name,distance:distance(n,self)}))
    .filter(n=>n.distance<6.2)
    .sort((a,b)=>a.distance-b.distance)[0];
  const drop=snapshot.drops
    .map(d=>({type:'drop' as const,id:d.id,distance:distance(d,self)}))
    .filter(d=>d.distance<4.8)
    .sort((a,b)=>a.distance-b.distance)[0];

  if(npc&&drop)return npc.distance<=drop.distance+0.65?npc:drop;
  return npc??drop;
}
