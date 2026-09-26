export interface AvatarCandidate {
 id: string;
 label: string;
 url: string;
 preview?: string;
 subtitle: string;
 category: 'original'|'base'|'hero'|'sample';
}

export const AVATAR_CANDIDATES = [
 {id:'qinglan-main',label:'青嵐志主角',url:'/assets/open/p022/characters/qinglan-main.vrm',preview:undefined,subtitle:'原始主角 · Humanoid 全身骨架',category:'original'},
 {id:'base-female',label:'Base Female',url:'/assets/open/p0238/characters/01_Base_Female.vrm',preview:'/assets/open/p0238/previews/01_Base_Female_full.png',subtitle:'女性基底 · 輕量 · 適合後續換裝',category:'base'},
 {id:'base-male',label:'Base Male',url:'/assets/open/p0238/characters/02_Base_Male.vrm',preview:'/assets/open/p0238/previews/02_Base_Male_full.png',subtitle:'男性基底 · 輕量 · 適合後續換裝',category:'base'},
 {id:'darkness-shibu',label:'Darkness Shibu',url:'/assets/open/p0238/characters/03_Darkness_Shibu.vrm',preview:'/assets/open/p0238/previews/03_Darkness_Shibu_full.png',subtitle:'暗色幻想系 · 主角候選',category:'hero'},
 {id:'vivi',label:'Vivi',url:'/assets/open/p0238/characters/04_Vivi.vrm',preview:'/assets/open/p0238/previews/04_Vivi_full.png',subtitle:'輕幻想系 · 完整 VRM',category:'hero'},
 {id:'vita',label:'Vita',url:'/assets/open/p0238/characters/05_Vita.vrm',preview:'/assets/open/p0238/previews/05_Vita_full.png',subtitle:'高辨識度 · 科幻幻想系主角候選',category:'hero'},
 {id:'victoria-rubin',label:'Victoria Rubin',url:'/assets/open/p0238/characters/06_Victoria_Rubin.vrm',preview:'/assets/open/p0238/previews/06_Victoria_Rubin_full.png',subtitle:'公主／偶像系 · 完整 VRM',category:'hero'},
 {id:'hair-female',label:'HairSample Female',url:'/assets/open/p0238/characters/07_HairSample_Female.vrm',preview:'/assets/open/p0238/previews/07_HairSample_Female_full.png',subtitle:'女性髮型樣板 · 測試／素材用途',category:'sample'},
 {id:'hair-male',label:'HairSample Male',url:'/assets/open/p0238/characters/08_HairSample_Male.vrm',preview:'/assets/open/p0238/previews/08_HairSample_Male_full.png',subtitle:'男性髮型樣板 · 測試／素材用途',category:'sample'},
 {id:'sakurada-fumiriya',label:'Sakurada Fumiriya',url:'/assets/open/p0238/characters/09_Sakurada_Fumiriya.vrm',preview:'/assets/open/p0238/previews/09_Sakurada_Fumiriya_full.png',subtitle:'男性完整角色 · 主角候選',category:'hero'},
 {id:'sendagaya-shino',label:'Sendagaya Shino',url:'/assets/open/p0238/characters/10_Sendagaya_Shino.vrm',preview:'/assets/open/p0238/previews/10_Sendagaya_Shino_full.png',subtitle:'日系女性角色 · 主角候選',category:'hero'},
] as const satisfies readonly AvatarCandidate[];

export type AvatarCandidateId=(typeof AVATAR_CANDIDATES)[number]['id'];
const DEFAULT_ID:AvatarCandidateId='qinglan-main';
const KEY='qinglan.avatarCandidate.p0238';
const LEGACY_KEY='qinglan.avatarCandidate.p0228';
const IDS=new Set<string>(AVATAR_CANDIDATES.map(x=>x.id));

export function normalizeAvatarCandidate(value:string|undefined|null):AvatarCandidateId{
 return value&&IDS.has(value)?value as AvatarCandidateId:DEFAULT_ID;
}
export function getAvatarCandidate():AvatarCandidateId{
 try{return normalizeAvatarCandidate(localStorage.getItem(KEY)??localStorage.getItem(LEGACY_KEY));}catch{return DEFAULT_ID;}
}
export function setAvatarCandidate(id:AvatarCandidateId){
 const normalized=normalizeAvatarCandidate(id);
 try{localStorage.setItem(KEY,normalized);localStorage.setItem(LEGACY_KEY,normalized);}catch{}
}
export function avatarCandidate(id:string|undefined|null){
 const normalized=normalizeAvatarCandidate(id);
 return AVATAR_CANDIDATES.find(x=>x.id===normalized)??AVATAR_CANDIDATES[0];
}
export function saveAvatarCandidate(id:AvatarCandidateId){setAvatarCandidate(id);}
// NPCs stay on the authored Qinglan avatar; player selection must not silently restyle all NPCs.
export function npcAvatarCandidate(_index:number):AvatarCandidateId{return 'qinglan-main';}
