import { clamp,type Stats } from '../types';
import { emptyStats,type Random } from './item';
import type { MonsterDef } from '../types';
export const BALANCE={armorFactor:2.2,minimumHit:65,maximumHit:99,variance:.08,attributeScale:.15,resistanceCap:75};
export class CombatFormulaService {
 static monsterStats(def:MonsterDef):Stats{return {...emptyStats(),str:def.level*2,agi:def.level,vit:def.level*2,int:def.level,attack:def.attack,defense:def.defense,hp:def.hp,accuracy:96,evasion:3,crit:5,critDamage:140};}
 static resolve(attacker:Stats,defender:Stats,multiplier:number,rng:Random=Math.random){
  const chance=clamp(attacker.accuracy+attacker.agi*.06-defender.evasion,BALANCE.minimumHit,BALANCE.maximumHit);
  if(rng()*100>chance)return {value:0,critical:false,missed:true};
  const critical=rng()*100<attacker.crit;
  const armor=Math.max(0,defender.defense)*(1-clamp(attacker.penetration,0,90)/100);
  const physical=(attacker.attack+attacker.str*BALANCE.attributeScale)*multiplier*(100/(100+armor*BALANCE.armorFactor));
  const elemental=(['fire','frost','lightning'] as const).reduce((sum,el)=>sum+(attacker[el]+(attacker[el]>0?attacker.int*.1:0))*(1-clamp(defender[`${el}Resist`],-50,BALANCE.resistanceCap)/100),0);
  const raw=(physical+elemental)*(1-BALANCE.variance+rng()*BALANCE.variance*2);
  return {value:Math.max(1,Math.round(raw*(critical?attacker.critDamage/100:1))),critical,missed:false};
 }
}
