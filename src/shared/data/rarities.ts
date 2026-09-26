import type { Rarity } from '../types';
export const RARITIES: Record<Rarity,{name:string;color:string;rank:number;affixes:number;beam:number}> = {
 broken:{name:'破損',color:'#8b9198',rank:0,affixes:0,beam:0.5}, common:{name:'普通',color:'#e3e1d4',rank:1,affixes:0,beam:0.8},
 fine:{name:'精良',color:'#80c790',rank:2,affixes:1,beam:1.4}, rare:{name:'稀有',color:'#6ab6ed',rank:3,affixes:2,beam:2.8},
 epic:{name:'史詩',color:'#bf8dff',rank:4,affixes:3,beam:4.5}, legendary:{name:'傳說',color:'#ffbd62',rank:5,affixes:4,beam:6},
 immortal:{name:'仙器',color:'#ff647a',rank:6,affixes:5,beam:8}, mythic:{name:'神話',color:'#ffe397',rank:7,affixes:6,beam:10}
};
export const SLOTS = { head:'頭冠', shoulders:'肩甲', chest:'衣甲', wrists:'護腕', hands:'手套', waist:'腰帶', legs:'下裝', feet:'靴履', mainhand:'主武器', offhand:'副武器', cape:'披風', neck:'項鍊', ring:'戒指', charm:'護符', artifact:'法寶', back:'背飾', fashion:'時裝' } as const;
export const STAT_NAMES = {str:'力道',agi:'身法',vit:'根骨',int:'靈識',attack:'攻擊',defense:'防禦',hp:'氣血',accuracy:'命中',evasion:'閃避',crit:'暴擊率',critDamage:'暴擊傷害',haste:'攻擊速度',penetration:'穿透',fire:'火傷',frost:'冰傷',lightning:'雷傷',fireResist:'火抗',frostResist:'冰抗',lightningResist:'雷抗',lifesteal:'吸血'} as const;
export const PERCENT_STATS = new Set(['accuracy','evasion','crit','critDamage','haste','lifesteal','penetration','fireResist','frostResist','lightningResist']);
