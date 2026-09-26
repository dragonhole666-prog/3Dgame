export const CHARACTER_NAME_MIN_LENGTH=2;
export const CHARACTER_NAME_MAX_LENGTH=16;

export type CharacterNameErrorCode='CHARACTER_NAME_REQUIRED'|'CHARACTER_NAME_LENGTH'|'CHARACTER_NAME_INVALID'|'CHARACTER_NAME_RESERVED';
export type CharacterNameValidation=
 | {ok:true;name:string;key:string}
 | {ok:false;code:CharacterNameErrorCode;message:string};

const RESERVED_KEYS=new Set(['admin','administrator','gm','gamemaster','system','server','official','qinglan','青嵐志','系統','管理員','官方']);
const allowed=/^[\p{L}\p{N}·・\- ]+$/u;
const chars=(value:string)=>Array.from(value);

export function canonicalCharacterName(raw:unknown){
 if(typeof raw!=='string')return '';
 return raw.normalize('NFKC').trim().replace(/\s+/g,' ');
}

export function characterNameKey(raw:unknown){
 return canonicalCharacterName(raw).toLocaleLowerCase('en-US').replace(/\s/g,'');
}

export function validateCharacterName(raw:unknown):CharacterNameValidation{
 const name=canonicalCharacterName(raw),length=chars(name).length;
 if(!name)return {ok:false,code:'CHARACTER_NAME_REQUIRED',message:'請輸入角色名稱。'};
 if(length<CHARACTER_NAME_MIN_LENGTH||length>CHARACTER_NAME_MAX_LENGTH)return {ok:false,code:'CHARACTER_NAME_LENGTH',message:`角色名稱需為 ${CHARACTER_NAME_MIN_LENGTH}～${CHARACTER_NAME_MAX_LENGTH} 個字。`};
 if(!allowed.test(name))return {ok:false,code:'CHARACTER_NAME_INVALID',message:'角色名稱只能使用中文、英文字母、數字、空格、間隔點或連字號。'};
 const key=characterNameKey(name);
 if(RESERVED_KEYS.has(key)||name.startsWith('__'))return {ok:false,code:'CHARACTER_NAME_RESERVED',message:'這個角色名稱為系統保留名稱，請換一個名稱。'};
 return {ok:true,name,key};
}

export function uniqueMigratedCharacterName(base:string,used:Set<string>){
 const canonical=canonicalCharacterName(base)||'無名行者';
 const initialKey=characterNameKey(canonical);
 if(initialKey&&!used.has(initialKey)){used.add(initialKey);return canonical;}
 for(let n=2;n<10000;n++){
  const suffix=`·${n}`,room=CHARACTER_NAME_MAX_LENGTH-Array.from(suffix).length;
  const candidate=Array.from(canonical).slice(0,Math.max(1,room)).join('')+suffix,key=characterNameKey(candidate);
  if(!used.has(key)){used.add(key);return candidate;}
 }
 throw new Error('Unable to migrate duplicate character names.');
}
