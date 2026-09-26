import type { Stat } from '../types';
export const AFFIXES: Record<string,{name:string;stat:Stat;min:number;max:number}> = {
 keen:{name:'鋒銳',stat:'attack',min:3,max:14}, fortified:{name:'守嶽',stat:'defense',min:2,max:10}, vital:{name:'長生',stat:'hp',min:18,max:80},
 precise:{name:'會心',stat:'crit',min:2,max:7}, ruthless:{name:'破軍',stat:'critDamage',min:8,max:25}, swift:{name:'疾風',stat:'haste',min:2,max:9},
 thunder:{name:'鳴雷',stat:'lightning',min:5,max:26}, leech:{name:'飲血',stat:'lifesteal',min:1,max:4}
};
