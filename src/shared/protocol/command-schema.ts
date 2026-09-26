import type { Command, Slot } from '../types';
import { SKILL_DEFINITIONS } from '../data/skills';

export interface CommandParseError {
 code: 'INVALID_COMMAND'|'INVALID_COMMAND_FIELD';
 message: string;
 field?: string;
}
export type CommandParseResult = {ok:true;command:Command}|{ok:false;error:CommandParseError};

type Obj=Record<string,unknown>;
const object=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const bool=(v:unknown):v is boolean=>typeof v==='boolean';
const text=(v:unknown,max=256):v is string=>typeof v==='string'&&v.length<=max;
const optText=(v:unknown,max=256):v is string|undefined=>v===undefined||text(v,max);
const fail=(message:string,field?:string):CommandParseResult=>({ok:false,error:{code:field?'INVALID_COMMAND_FIELD':'INVALID_COMMAND',message,field}});
const SLOT_SET:ReadonlySet<string>=new Set(['head','shoulders','chest','wrists','hands','waist','legs','feet','mainhand','offhand','cape','neck','ring','charm','artifact','back','fashion']);
const slot=(v:unknown):v is Slot=>typeof v==='string'&&SLOT_SET.has(v);

/** Runtime validation for data crossing the WebSocket trust boundary. */
export function parseCommand(value:unknown):CommandParseResult{
 if(!object(value)||typeof value.type!=='string')return fail('command must be an object with a string type');
 switch(value.type){
  case 'move':
   if(!finite(value.x)||Math.abs(value.x)>2)return fail('x must be a finite movement value','x');
   if(!finite(value.z)||Math.abs(value.z)>2)return fail('z must be a finite movement value','z');
   if(!bool(value.sprint))return fail('sprint must be boolean','sprint');
   return {ok:true,command:{type:'move',x:value.x,z:value.z,sprint:value.sprint}};
  case 'navigate':
   if(!finite(value.x))return fail('x must be finite','x');if(!finite(value.z))return fail('z must be finite','z');
   if(!optText(value.label,120))return fail('label must be a short string','label');
   return {ok:true,command:{type:'navigate',x:value.x,z:value.z,...(value.label===undefined?{}:{label:value.label})}};
  case 'target':
   if(!optText(value.id,128))return fail('id must be a short string','id');return {ok:true,command:{type:'target',...(value.id===undefined?{}:{id:value.id})}};
  case 'attack':
   if(!text(value.skill,64)||!value.skill)return fail('skill must be a non-empty string','skill');if(!SKILL_DEFINITIONS[value.skill])return fail('skill is not registered','skill');if(!optText(value.target,128))return fail('target must be a short string','target');
   return {ok:true,command:{type:'attack',skill:value.skill,...(value.target===undefined?{}:{target:value.target})}};
  case 'pickup':
   if(!optText(value.id,128))return fail('id must be a short string','id');return {ok:true,command:{type:'pickup',...(value.id===undefined?{}:{id:value.id})}};
  case 'equip': case 'identify': case 'enhance': case 'discard': case 'destroy': case 'salvage': case 'buy': case 'unlist':
   if(!text(value.id,128)||!value.id)return fail('id must be a non-empty string','id');return {ok:true,command:{type:value.type,id:value.id} as Command};
  case 'unequip':
   if(!slot(value.slot))return fail('slot is invalid','slot');return {ok:true,command:{type:'unequip',slot:value.slot}};
  case 'intel':
   if(!text(value.npc,128)||!value.npc)return fail('npc must be a non-empty string','npc');return {ok:true,command:{type:'intel',npc:value.npc}};
  case 'jump': case 'repair': case 'potion': case 'tradeCancel':
   return {ok:true,command:{type:value.type} as Command};
  case 'flight':{
   const enabled=value.enabled;if(enabled===undefined)return {ok:true,command:{type:'flight'}};if(typeof enabled!=='boolean')return fail('enabled must be boolean','enabled');return {ok:true,command:{type:'flight',enabled}};
  }
  case 'revive':
   if(!bool(value.town))return fail('town must be boolean','town');return {ok:true,command:{type:'revive',town:value.town}};
  case 'chat':
   if(!text(value.text,180))return fail('text must be at most 180 characters','text');return {ok:true,command:{type:'chat',text:value.text}};
  case 'tradeRequest':
   if(!text(value.player,128)||!value.player)return fail('player must be a non-empty string','player');return {ok:true,command:{type:'tradeRequest',player:value.player}};
  case 'tradeOffer':
   if(!Array.isArray(value.items)||value.items.length>64||!value.items.every(x=>text(x,128)))return fail('items must be an array of item ids','items');
   if(!finite(value.gold)||value.gold<0)return fail('gold must be a non-negative finite number','gold');return {ok:true,command:{type:'tradeOffer',items:[...value.items],gold:value.gold}};
  case 'tradeLock': case 'tradeConfirm':
   if(!Number.isSafeInteger(value.revision)||Number(value.revision)<0)return fail('revision must be a non-negative safe integer','revision');return {ok:true,command:{type:value.type,revision:Number(value.revision)} as Command};
  case 'list':
   if(!text(value.item,128)||!value.item)return fail('item must be a non-empty string','item');if(!finite(value.price)||value.price<0)return fail('price must be a non-negative finite number','price');return {ok:true,command:{type:'list',item:value.item,price:value.price}};
  default:return fail(`unknown command type: ${value.type}`,'type');
 }
}
