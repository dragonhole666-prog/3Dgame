export interface LocalCharacterRecord {id:string;name:string;token:string;lastPlayedAt:number}
const STORAGE_KEY='qinglan-characters-v1';
const LEGACY_TOKEN_KEY='qinglan-token';
const ACTIVE_TOKEN_KEY='qinglan-active-character-v1';
const MAX_LOCAL_CHARACTERS=24;

function safeParse(value:string|null):LocalCharacterRecord[]{
 if(!value)return [];
 try{
  const parsed=JSON.parse(value);
  if(!Array.isArray(parsed))return [];
  return parsed.filter((x):x is LocalCharacterRecord=>!!x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.token==='string'&&x.token.length>=16&&Number.isFinite(x.lastPlayedAt));
 }catch{return [];}
}
export function localCharacters(){return safeParse(localStorage.getItem(STORAGE_KEY)).sort((a,b)=>b.lastPlayedAt-a.lastPlayedAt);}
export function activeLocalCharacterToken(){const token=localStorage.getItem(ACTIVE_TOKEN_KEY)??'';return token&&localCharacters().some(x=>x.token===token)?token:'';}
export function setActiveLocalCharacter(token:string){if(token&&localCharacters().some(x=>x.token===token))localStorage.setItem(ACTIVE_TOKEN_KEY,token);}
export function clearActiveLocalCharacter(){localStorage.removeItem(ACTIVE_TOKEN_KEY);}
export function legacyCharacterToken(){const token=localStorage.getItem(LEGACY_TOKEN_KEY);return token&&token.length>=16?token:'';}
export function rememberLocalCharacter(record:LocalCharacterRecord){
 const all=localCharacters().filter(x=>x.id!==record.id&&x.token!==record.token);all.unshift(record);localStorage.setItem(STORAGE_KEY,JSON.stringify(all.slice(0,MAX_LOCAL_CHARACTERS)));
 if(localStorage.getItem(LEGACY_TOKEN_KEY)===record.token)localStorage.removeItem(LEGACY_TOKEN_KEY);
 localStorage.setItem(ACTIVE_TOKEN_KEY,record.token);
}
export function forgetLocalCharacter(token:string){localStorage.setItem(STORAGE_KEY,JSON.stringify(localCharacters().filter(x=>x.token!==token)));if(localStorage.getItem(LEGACY_TOKEN_KEY)===token)localStorage.removeItem(LEGACY_TOKEN_KEY);if(localStorage.getItem(ACTIVE_TOKEN_KEY)===token)localStorage.removeItem(ACTIVE_TOKEN_KEY);}
