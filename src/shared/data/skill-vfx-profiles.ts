export type SpellProjectileShape='orb'|'shard';
export type SpellImpactKind='fire-burst'|'ice-spikes'|'blizzard';

export interface SpellProjectileVfx {
 shape:SpellProjectileShape;
 color:string;
 coreColor:string;
 size:number;
 arcHeight:number;
 trailRate:number;
}

export interface SpellImpactVfx {
 kind:SpellImpactKind;
 color:string;
 secondaryColor:string;
 radius:number;
 life:number;
}

export interface SpellFieldVfx {
 kind:'blizzard';
 color:string;
 secondaryColor:string;
 radius:number;
 life:number;
 particleRate:number;
 strikeRate:number;
}

export interface SpellTelegraphVfx {
 color:string;
 secondaryColor:string;
 radius:number;
 style:'circle'|'rune';
}

export interface SkillVfxProfile {
 id:string;
 chargeColor:string;
 chargeScale:number;
 projectile?:SpellProjectileVfx;
 impact?:SpellImpactVfx;
 field?:SpellFieldVfx;
 telegraph?:SpellTelegraphVfx;
}

/**
 * HF12 spell VFX contract. Runtime behavior is authored here instead of through
 * skill-specific render branches. More spell GLBs/skills can reuse one of these
 * archetypes without adding another long `if(vfx===...)` chain.
 */
export const SKILL_VFX_PROFILES:Readonly<Record<string,SkillVfxProfile>>={
 'fire-orb':{
  id:'fire-orb',chargeColor:'#ff9b4b',chargeScale:1.15,
  projectile:{shape:'orb',color:'#ff6b32',coreColor:'#ffd27a',size:.48,arcHeight:1.0,trailRate:64},
  impact:{kind:'fire-burst',color:'#ff5d2e',secondaryColor:'#ffd06a',radius:3.15,life:1.05},
  telegraph:{color:'#ff7a3d',secondaryColor:'#ffd780',radius:3.15,style:'circle'},
 },
 'ice-spike':{
  id:'ice-spike',chargeColor:'#aeefff',chargeScale:.95,
  projectile:{shape:'shard',color:'#8fe7ff',coreColor:'#e6fbff',size:.38,arcHeight:.45,trailRate:44},
  impact:{kind:'ice-spikes',color:'#8ddfff',secondaryColor:'#d9f8ff',radius:3.4,life:1.15},
  telegraph:{color:'#8fdfff',secondaryColor:'#e7fbff',radius:3.4,style:'circle'},
 },
 'frost-seal':{
  id:'frost-seal',chargeColor:'#b9f2ff',chargeScale:1.10,
  impact:{kind:'ice-spikes',color:'#99e7ff',secondaryColor:'#e5fbff',radius:4.2,life:1.15},
   telegraph:{color:'#a5ecff',secondaryColor:'#eefcff',radius:4.2,style:'rune'},
 },
 blizzard:{
  id:'blizzard',chargeColor:'#c8f5ff',chargeScale:1.28,
  impact:{kind:'blizzard',color:'#bcefff',secondaryColor:'#f2fdff',radius:5.5,life:1.05},
  field:{kind:'blizzard',color:'#b8edff',secondaryColor:'#f3fdff',radius:5.5,life:4.2,particleRate:90,strikeRate:5.4},
  telegraph:{color:'#b6edff',secondaryColor:'#f5fdff',radius:5.5,style:'rune'},
 },
};

export function skillVfxProfile(vfxId:string|undefined){return vfxId?SKILL_VFX_PROFILES[vfxId]:undefined;}
