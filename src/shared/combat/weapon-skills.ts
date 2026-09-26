import type { ItemInstance, Slot, WeaponProfile } from '../types';
import { APPEARANCES, ITEMS } from '../data/equipment';
import { SKILL_DEFINITIONS } from '../data/skills';

export type WeaponElement='none'|'lightning'|'fire'|'frost'|'arcane';
export interface HotbarSkill {key:string;skillId:string;legendary?:boolean;label?:string}
export interface WeaponCombatIdentity {baseId?:string;profile:WeaponProfile;element:WeaponElement;legendarySkillId?:string}

export const WEAPON_SKILL_SETS:Readonly<Record<WeaponProfile,readonly string[]>>={
 sword:['basic','sword-wave','sword-step','sword-array','dash'],
 greatsword:['basic','mountain-cleave','earth-break','sky-sunder','dash'],
 dual:['basic','moon-cross','shadow-dance','thousand-flash','dash'],
 spear:['basic','dragon-thrust','spear-sweep','sky-pierce','dash'],
 staff:['basic','fire-orb','ice-spike','blizzard','dash'],
 bow:['basic','piercing-arrow','frost-arrow','arrow-rain','dash']
};

export const WEAPON_BASIC_NAMES:Readonly<Record<WeaponProfile,string>>={sword:'流雲起劍',greatsword:'鎮嶽起勢',dual:'雙月連斬',spear:'游龍點槍',staff:'引靈法訣',bow:'引弦破風'};

export const LEGENDARY_WEAPON_SKILLS:Readonly<Record<string,string>>={
 'heaven-sword':'nine-heavens-thunder-prison',
 'sunfire-blade':'burning-heaven-dragon',
 'frost-immortal-bow':'frost-domain-thousand-arrows',
 'mythic-sword':'taixu-return-one',
 'primordial-star-sword':'primordial-star-collapse',
 'void-sundering-blade':'void-rift-sunder',
 'celestial-burial-spear':'celestial-pillar-pierce',
 'myriad-law-staff':'myriad-law-heaven-wheel',
 'heavenfall-bow':'heavenfall-nine-stars',
 'yin-yang-dual':'yin-yang-reversal'
};

const VFX_ELEMENT:Readonly<Record<string,WeaponElement>>={lightning:'lightning',flame:'fire',frost:'frost',runes:'arcane',aura:'arcane'};

export function weaponCombatIdentity(equipment:Partial<Record<Slot,ItemInstance>>):WeaponCombatIdentity{
 const weapon=equipment.mainhand??equipment.offhand;if(!weapon)return {profile:'sword',element:'none'};
 const base=ITEMS[weapon.baseId],appearance=base?.appearanceId?APPEARANCES[base.appearanceId]:undefined;
 return {baseId:weapon.baseId,profile:appearance?.animationProfile??'sword',element:VFX_ELEMENT[base?.vfx??'']??'none',legendarySkillId:LEGENDARY_WEAPON_SKILLS[weapon.baseId]};
}

export function resolveSkillHotbar(equipment:Partial<Record<Slot,ItemInstance>>):HotbarSkill[]{
 const identity=weaponCombatIdentity(equipment),skills=WEAPON_SKILL_SETS[identity.profile];
 const out:HotbarSkill[]=skills.map((skillId,index)=>({key:String(index+1),skillId,label:skillId==='basic'?WEAPON_BASIC_NAMES[identity.profile]:undefined}));
 if(identity.legendarySkillId)out.push({key:'7',skillId:identity.legendarySkillId,legendary:true});
 return out;
}

export function skillForHotkey(equipment:Partial<Record<Slot,ItemInstance>>,key:string){return resolveSkillHotbar(equipment).find(s=>s.key===key)?.skillId;}
export function isSkillAllowed(equipment:Partial<Record<Slot,ItemInstance>>,skillId:string){return resolveSkillHotbar(equipment).some(s=>s.skillId===skillId)&&!!SKILL_DEFINITIONS[skillId];}
