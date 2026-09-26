export type MonsterTelegraphGuide='none'|'path'|'cone';
export interface MonsterTelegraphProfile{
 guide:MonsterTelegraphGuide;
 color:string;
 guideOpacity:number;
 widthScale:number;
 coneAngle:number;
}

const PATH_SKILLS=new Set(['charge','pounce','dive','queen-dash']);
const CONE_SKILLS=new Set(['venom','feather','bite','claw']);

/**
 * HF13 combat-readability contract. The endpoint circle remains the authoritative
 * damage radius; directional guides only explain how the monster is about to travel/aim.
 */
export function monsterTelegraphProfile(skill:string):MonsterTelegraphProfile{
 const guide:MonsterTelegraphGuide=PATH_SKILLS.has(skill)?'path':CONE_SKILLS.has(skill)?'cone':'none';
 const color=skill==='storm'||skill==='stomp'?'#c79bff':skill==='frost'?'#a7e8ff':skill==='venom'?'#a7d56c':skill.startsWith('queen-')?'#f1b37e':'#ed8f78';
 return {guide,color,guideOpacity:guide==='none'?0:guide==='path'?.18:.14,widthScale:guide==='path'?.7:1,coneAngle:skill==='feather'?.48:skill==='venom'?.62:.42};
}
