import type { WeaponProfile } from '../types';

export type SkillElement='physical'|'wind'|'lightning'|'fire'|'frost'|'arcane';
export type SkillTargeting='enemy'|'self';
export type SkillImpact='target'|'self';
export type SkillAnimationProfile='weapon'|'heavy'|'cast'|'ranged'|'dash'|'heal';

export interface SkillDefinition {
 id:string;name:string;icon:string;description:string;
 cooldown:number;cost:number;range:number;radius:number;windup:number;hitFrame:number;recovery:number;
 interruptible:boolean;vfx:string;animationProfile:SkillAnimationProfile;effects:string[];multiplier:number;
 element:SkillElement;targeting:SkillTargeting;impact:SkillImpact;
 healRatio?:number;dashDistance?:number;
}

export type MythicSkillId='primordial-star-collapse'|'void-rift-sunder'|'celestial-pillar-pierce'|'myriad-law-heaven-wheel'|'heavenfall-nine-stars'|'yin-yang-reversal';
export type MythicMotionClip='PrimordialStarCollapse'|'VoidRiftSunder'|'CelestialPillarPierce'|'MyriadLawHeavenWheel'|'HeavenfallNineStars'|'YinYangReversal';
export type MythicVfxCue='charge'|'manifest'|'release'|'impact'|'aftershock';
export interface MythicSkillChoreography {
 clip:MythicMotionClip;
 /** Absolute seconds from cast start before haste scaling. Damage may resolve only inside this interval. */
 hitWindow:readonly [number,number];
 /** Normalized authored animation phase where the weapon trail is emitted. */
 trailWindow:readonly [number,number];
 trailMount:'right'|'left';trailLength:number;trailBase:number;
 vfxTimeline:readonly {at:number;cue:MythicVfxCue}[];
}

/** P0.25.2 single source of truth for the six divine-weapon choreographies.
 * Body motion, hit window, weapon-trail phase and VFX cue timing are intentionally different per skill. */
export const MYTHIC_SKILL_CHOREOGRAPHY:Readonly<Record<MythicSkillId,MythicSkillChoreography>>={
 'primordial-star-collapse':{clip:'PrimordialStarCollapse',hitWindow:[1.08,1.24],trailWindow:[.38,.64],trailMount:'right',trailLength:1.34,trailBase:.13,vfxTimeline:[{at:.08,cue:'charge'},{at:.43,cue:'manifest'},{at:.86,cue:'release'},{at:1.08,cue:'impact'},{at:1.25,cue:'aftershock'}]},
 'void-rift-sunder':{clip:'VoidRiftSunder',hitWindow:[1.04,1.31],trailWindow:[.31,.70],trailMount:'right',trailLength:1.68,trailBase:.08,vfxTimeline:[{at:.05,cue:'charge'},{at:.34,cue:'manifest'},{at:.79,cue:'release'},{at:1.04,cue:'impact'},{at:1.32,cue:'aftershock'}]},
 'celestial-pillar-pierce':{clip:'CelestialPillarPierce',hitWindow:[.94,1.03],trailWindow:[.43,.61],trailMount:'right',trailLength:2.10,trailBase:.24,vfxTimeline:[{at:.04,cue:'charge'},{at:.25,cue:'manifest'},{at:.71,cue:'release'},{at:.94,cue:'impact'},{at:1.05,cue:'aftershock'}]},
 'myriad-law-heaven-wheel':{clip:'MyriadLawHeavenWheel',hitWindow:[1.16,1.39],trailWindow:[.16,.59],trailMount:'right',trailLength:1.92,trailBase:.16,vfxTimeline:[{at:.06,cue:'charge'},{at:.30,cue:'manifest'},{at:.73,cue:'release'},{at:1.16,cue:'impact'},{at:1.40,cue:'aftershock'}]},
 'heavenfall-nine-stars':{clip:'HeavenfallNineStars',hitWindow:[1.08,1.26],trailWindow:[.12,.56],trailMount:'left',trailLength:1.48,trailBase:.10,vfxTimeline:[{at:.03,cue:'charge'},{at:.22,cue:'manifest'},{at:.66,cue:'release'},{at:1.08,cue:'impact'},{at:1.27,cue:'aftershock'}]},
 'yin-yang-reversal':{clip:'YinYangReversal',hitWindow:[.82,.96],trailWindow:[.22,.79],trailMount:'right',trailLength:1.08,trailBase:.10,vfxTimeline:[{at:.02,cue:'charge'},{at:.16,cue:'manifest'},{at:.49,cue:'release'},{at:.82,cue:'impact'},{at:.97,cue:'aftershock'}]},
};
export function mythicChoreography(skillId:string){return (MYTHIC_SKILL_CHOREOGRAPHY as Readonly<Record<string,MythicSkillChoreography>>)[skillId];}

export const WEAPON_PROFILES:Record<WeaponProfile,{windup:number;recovery:number;range:number;multiplier:number;verb:string;lunge:number}>= {
 sword:{windup:.24,recovery:.43,range:2.8,multiplier:1,verb:'斬',lunge:.34},greatsword:{windup:.52,recovery:.62,range:3.5,multiplier:1.55,verb:'破',lunge:.26},
 dual:{windup:.16,recovery:.3,range:2.5,multiplier:.78,verb:'連',lunge:.42},spear:{windup:.3,recovery:.48,range:4.5,multiplier:1.1,verb:'刺',lunge:.46},
 staff:{windup:.5,recovery:.5,range:12,multiplier:1.25,verb:'咒',lunge:0},bow:{windup:.4,recovery:.55,range:16,multiplier:1.15,verb:'射',lunge:0}
};

const skill=(x:SkillDefinition)=>x;
export const SKILL_DEFINITIONS:Record<string,SkillDefinition>={
 basic:skill({id:'basic',name:'本門起式',icon:'sword',description:'依目前武器施展基礎攻擊。',cooldown:.8,cost:0,multiplier:1,range:0,windup:0,radius:0,hitFrame:.24,recovery:.42,interruptible:true,vfx:'weapon-basic',animationProfile:'weapon',effects:[],element:'physical',targeting:'enemy',impact:'target'}),
 dash:skill({id:'dash',name:'踏雲',icon:'wing',description:'向前疾掠，短暫免疫傷害。',cooldown:5,cost:8,multiplier:0,range:0,windup:0,radius:0,hitFrame:.06,recovery:.32,interruptible:false,vfx:'wind-dash',animationProfile:'dash',effects:[],element:'wind',targeting:'self',impact:'self',dashDistance:6}),
 mend:skill({id:'mend',name:'回春訣',icon:'leaf',description:'調息回復部分氣血。',cooldown:14,cost:20,multiplier:0,range:0,windup:.4,radius:0,hitFrame:.4,recovery:.58,interruptible:true,vfx:'heal',animationProfile:'heal',effects:['regen'],element:'wind',targeting:'self',impact:'self',healRatio:.38}),
 // Compatibility definitions retained for old saves/content packs. They are no longer part of the normal weapon hotbar.
 cleave:skill({id:'cleave',name:'斷嶽',icon:'cleaver',description:'舊版重斬相容招式。',cooldown:5,cost:14,multiplier:2.1,range:4.5,windup:.55,radius:3.6,hitFrame:.55,recovery:.72,interruptible:true,vfx:'mountain-cleave',animationProfile:'heavy',effects:['armorBreak'],element:'physical',targeting:'enemy',impact:'target'}),
 thunder:skill({id:'thunder',name:'引雷訣',icon:'thunder',description:'舊版雷法相容招式。',cooldown:9,cost:23,multiplier:2.7,range:14,windup:.7,radius:4,hitFrame:.7,recovery:.68,interruptible:true,vfx:'thunder-mantra',animationProfile:'cast',effects:['shock'],element:'lightning',targeting:'enemy',impact:'target'}),

 'sword-wave':skill({id:'sword-wave',name:'青鋒斷空',icon:'sword',description:'側身藏鋒後橫斬出一道壓縮劍罡；劍氣貼地延伸，命中線清楚。',cooldown:3.2,cost:9,multiplier:1.55,range:10,radius:1.25,windup:.31,hitFrame:.34,recovery:.44,interruptible:true,vfx:'sword-wave',animationProfile:'weapon',effects:[],element:'wind',targeting:'enemy',impact:'target'}),
 'sword-step':skill({id:'sword-step',name:'踏虛流光',icon:'wing',description:'先收劍壓低重心，再踏虛掠身穿過目標，於身後完成回鋒斬。',cooldown:6,cost:14,multiplier:1.85,range:7,radius:1.4,windup:.22,hitFrame:.28,recovery:.38,interruptible:false,vfx:'sword-step',animationProfile:'dash',effects:[],element:'wind',targeting:'enemy',impact:'target',dashDistance:4.8}),
 'sword-array':skill({id:'sword-array',name:'星河御劍陣',icon:'rune',description:'左手捏訣、右劍指天，分化數柄飛劍繞敵成陣後同時墜斬。',cooldown:10,cost:24,multiplier:2.45,range:9,radius:4.2,windup:.62,hitFrame:.66,recovery:.66,interruptible:true,vfx:'sword-array',animationProfile:'cast',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),

 'mountain-cleave':skill({id:'mountain-cleave',name:'鎮嶽沉鋒',icon:'cleaver',description:'雙手壓住重刃後自肩後大幅蓄力，以全身重量斜劈落地。',cooldown:4.6,cost:13,multiplier:2.15,range:4.4,radius:3.4,windup:.58,hitFrame:.6,recovery:.72,interruptible:true,vfx:'mountain-cleave',animationProfile:'heavy',effects:['armorBreak'],element:'physical',targeting:'enemy',impact:'target'}),
 'earth-break':skill({id:'earth-break',name:'坤脈崩山',icon:'rune',description:'重刃高舉後垂直砸地，腳下地脈向外炸裂成環形震波。',cooldown:7.2,cost:18,multiplier:2.4,range:4.8,radius:4.8,windup:.7,hitFrame:.72,recovery:.78,interruptible:true,vfx:'earth-break',animationProfile:'heavy',effects:['armorBreak'],element:'physical',targeting:'enemy',impact:'target'}),
 'sky-sunder':skill({id:'sky-sunder',name:'開天斷岳',icon:'cleaver',description:'低位拖刃蓄勢後逆勢上挑，厚重刀罡沿垂直軸撕開前方。',cooldown:9,cost:22,multiplier:3,range:7,radius:2.6,windup:.82,hitFrame:.84,recovery:.84,interruptible:true,vfx:'sky-sunder',animationProfile:'heavy',effects:[],element:'wind',targeting:'enemy',impact:'target'}),

 'moon-cross':skill({id:'moon-cross',name:'雙月錯星',icon:'dual',description:'雙刃向兩側展開，再同時向中心收束，形成清楚的十字交錯斬。',cooldown:3,cost:8,multiplier:1.7,range:3.5,radius:2.6,windup:.2,hitFrame:.23,recovery:.32,interruptible:true,vfx:'moon-cross',animationProfile:'weapon',effects:[],element:'physical',targeting:'enemy',impact:'target'}),
 'shadow-dance':skill({id:'shadow-dance',name:'流影七返',icon:'wing',description:'壓低身形繞敵換位，以連續側閃留下殘影，最後從背側回斬。',cooldown:6.4,cost:15,multiplier:2.05,range:6,radius:2.8,windup:.26,hitFrame:.34,recovery:.4,interruptible:false,vfx:'shadow-dance',animationProfile:'dash',effects:[],element:'wind',targeting:'enemy',impact:'target',dashDistance:4}),
 'thousand-flash':skill({id:'thousand-flash',name:'千刃花葬',icon:'dual',description:'左右雙刃交替高速連斬，最後雙手反向拉開形成花瓣狀刃光。',cooldown:9.5,cost:24,multiplier:2.8,range:4,radius:3.4,windup:.42,hitFrame:.46,recovery:.62,interruptible:true,vfx:'thousand-flash',animationProfile:'weapon',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),

 'dragon-thrust':skill({id:'dragon-thrust',name:'蒼龍破岳',icon:'spear',description:'槍尾後收蓄力，前手定軸，踏步將槍尖沿中心線一口氣貫出。',cooldown:3.5,cost:10,multiplier:1.8,range:7.5,radius:1.5,windup:.3,hitFrame:.34,recovery:.42,interruptible:true,vfx:'dragon-thrust',animationProfile:'weapon',effects:[],element:'wind',targeting:'enemy',impact:'target'}),
 'spear-sweep':skill({id:'spear-sweep',name:'回槍鎖月',icon:'spear',description:'前刺收槍後轉腰橫掃一周，以長兵器距離控制近身群敵。',cooldown:6,cost:15,multiplier:2.15,range:4.8,radius:4.1,windup:.42,hitFrame:.45,recovery:.55,interruptible:true,vfx:'spear-sweep',animationProfile:'heavy',effects:[],element:'physical',targeting:'enemy',impact:'target'}),
 'sky-pierce':skill({id:'sky-pierce',name:'貫星天槍',icon:'spear',description:'槍尖壓低聚勢後向前上方貫刺，槍罡化成筆直星芒穿過戰線。',cooldown:9,cost:22,multiplier:2.9,range:10,radius:2.1,windup:.6,hitFrame:.63,recovery:.66,interruptible:true,vfx:'sky-pierce',animationProfile:'heavy',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),

 'fire-orb':skill({id:'fire-orb',name:'離火星墜',icon:'rune',description:'法杖畫圓聚火，空出的手托起火種後推出，火丸落點爆成二重焰環。',cooldown:3.8,cost:12,multiplier:1.8,range:15,radius:3,windup:.48,hitFrame:.52,recovery:.5,interruptible:true,vfx:'fire-orb',animationProfile:'cast',effects:[],element:'fire',targeting:'enemy',impact:'target'}),
 'ice-spike':skill({id:'ice-spike',name:'玄冰錐',icon:'crystal',description:'法杖前端凝出高密度冰晶，冰錐沿鎖定方向高速射出；命中後冰刺由地面向外爆生。',cooldown:4.6,cost:14,multiplier:1.95,range:16,radius:3.4,windup:.44,hitFrame:.5,recovery:.5,interruptible:true,vfx:'ice-spike',animationProfile:'cast',effects:['slow'],element:'frost',targeting:'enemy',impact:'target'}),
 'frost-seal':skill({id:'frost-seal',name:'玄冰六合法印',icon:'crystal',description:'法杖點地定陣，左手沿地面畫印，六向寒紋展開後冰晶同時拔起。',cooldown:7.5,cost:19,multiplier:2.2,range:14,radius:4.2,windup:.58,hitFrame:.62,recovery:.62,interruptible:true,vfx:'frost-seal',animationProfile:'cast',effects:['slow'],element:'frost',targeting:'enemy',impact:'target'}),
 'blizzard':skill({id:'blizzard',name:'玄霜暴雪',icon:'crystal',description:'寒氣在鎖定區域快速聚成暴雪場，冰霧、雪粒與冰柱持續墜落，範圍內敵人受到寒霜壓制。',cooldown:10.5,cost:28,multiplier:2.85,range:15,radius:5.5,windup:.72,hitFrame:.78,recovery:.72,interruptible:true,vfx:'blizzard',animationProfile:'cast',effects:['slow'],element:'frost',targeting:'enemy',impact:'target'}),
 'thunder-mantra':skill({id:'thunder-mantra',name:'紫府召雷印',icon:'thunder',description:'法杖高舉指天，另一手結雷印鎖定目標，雷柱由上而下連續落擊。',cooldown:9,cost:24,multiplier:2.75,range:16,radius:4.5,windup:.7,hitFrame:.73,recovery:.68,interruptible:true,vfx:'thunder-mantra',animationProfile:'cast',effects:['shock'],element:'lightning',targeting:'enemy',impact:'target'}),

 'piercing-arrow':skill({id:'piercing-arrow',name:'破罡穿雲',icon:'bow',description:'左手持弓完全伸展，右手拉弦至頰側後短暫定弓，再射出高速貫穿靈矢。',cooldown:3.2,cost:9,multiplier:1.7,range:20,radius:1.2,windup:.38,hitFrame:.42,recovery:.46,interruptible:true,vfx:'piercing-arrow',animationProfile:'ranged',effects:[],element:'wind',targeting:'enemy',impact:'target'}),
 'frost-arrow':skill({id:'frost-arrow',name:'寒魄鎖脈',icon:'crystal',description:'半蹲穩身、拉弦蓄寒，箭尖凝出霜晶；命中後寒紋沿地面蔓延減速。',cooldown:6,cost:15,multiplier:2,range:19,radius:2.8,windup:.44,hitFrame:.48,recovery:.5,interruptible:true,vfx:'frost-arrow',animationProfile:'ranged',effects:['slow'],element:'frost',targeting:'enemy',impact:'target'}),
 'arrow-rain':skill({id:'arrow-rain',name:'天河墜矢',icon:'bow',description:'弓臂高舉仰射，靈矢升空後在高處分裂成箭幕，自天幕分批墜落。',cooldown:10,cost:25,multiplier:2.65,range:18,radius:5.2,windup:.66,hitFrame:.72,recovery:.7,interruptible:true,vfx:'arrow-rain',animationProfile:'ranged',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),

 'nine-heavens-thunder-prison':skill({id:'nine-heavens-thunder-prison',name:'九霄雷獄',icon:'thunder',description:'九天玄雷劍專屬。劍陣鎖界，數道天雷沿陣紋連續墜下。',cooldown:18,cost:38,multiplier:4.8,range:15,radius:6.2,windup:.9,hitFrame:.96,recovery:.92,interruptible:false,vfx:'legendary-thunder-prison',animationProfile:'cast',effects:['shock'],element:'lightning',targeting:'enemy',impact:'target'}),
 'burning-heaven-dragon':skill({id:'burning-heaven-dragon',name:'焚天炎龍斬',icon:'cleaver',description:'離火焚天刀專屬。刀勢化作炎龍盤旋俯衝，在目標處爆開火輪。',cooldown:18,cost:38,multiplier:4.7,range:12,radius:5.8,windup:.82,hitFrame:.9,recovery:.9,interruptible:false,vfx:'legendary-fire-dragon',animationProfile:'heavy',effects:[],element:'fire',targeting:'enemy',impact:'target'}),
 'frost-domain-thousand-arrows':skill({id:'frost-domain-thousand-arrows',name:'霜天萬箭',icon:'bow',description:'玄霜仙弓專屬。展開寒霜法域，冰矢如暴雪自天幕齊落。',cooldown:19,cost:40,multiplier:4.65,range:20,radius:6.5,windup:.9,hitFrame:.98,recovery:.9,interruptible:false,vfx:'legendary-frost-volley',animationProfile:'ranged',effects:['slow'],element:'frost',targeting:'enemy',impact:'target'}),
 'taixu-return-one':skill({id:'taixu-return-one',name:'太虛歸一',icon:'orbital',description:'太虛歸一專屬。萬千劍意收束於一線，再於敵陣中心驟然綻開。',cooldown:22,cost:45,multiplier:5.2,range:16,radius:6.8,windup:1,hitFrame:1.05,recovery:1,interruptible:false,vfx:'mythic-taixu',animationProfile:'cast',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),
 'primordial-star-collapse':skill({id:'primordial-star-collapse',name:'星闕墜界',icon:'sword',description:'荒古星闕劍專屬。起手收劍聚勢，劍光升空分化星軌，最後萬芒向中心坍縮斬落。',cooldown:23,cost:46,multiplier:5.45,range:17,radius:7,windup:1.02,hitFrame:1.08,recovery:1.0,interruptible:false,vfx:'mythic-star-collapse',animationProfile:'cast',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),
 'void-rift-sunder':skill({id:'void-rift-sunder',name:'破界天裂',icon:'cleaver',description:'破界玄刀專屬。雙手拖刀蓄勢後斜斬，第一刀撕出黑紫裂隙，第二段由裂隙反向爆斬。',cooldown:24,cost:47,multiplier:5.6,range:13,radius:6.4,windup:.98,hitFrame:1.04,recovery:1.05,interruptible:false,vfx:'mythic-void-rift',animationProfile:'heavy',effects:['armorBreak'],element:'arcane',targeting:'enemy',impact:'target'}),
 'celestial-pillar-pierce':skill({id:'celestial-pillar-pierce',name:'葬星天槍',icon:'spear',description:'葬星神槍專屬。槍尾落地定軸，旋身蓄力後一線貫出，星柱沿槍勢連續穿透戰線。',cooldown:21,cost:43,multiplier:5.25,range:20,radius:3.3,windup:.88,hitFrame:.94,recovery:.88,interruptible:false,vfx:'mythic-star-pierce',animationProfile:'heavy',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),
 'myriad-law-heaven-wheel':skill({id:'myriad-law-heaven-wheel',name:'萬法天輪',icon:'rune',description:'萬法道杖專屬。法杖立於身前，三重法環錯向旋轉，雷、火、霜三相於中心同時落下。',cooldown:25,cost:50,multiplier:5.75,range:18,radius:7.2,windup:1.1,hitFrame:1.16,recovery:1.08,interruptible:false,vfx:'mythic-law-wheel',animationProfile:'cast',effects:['shock','slow'],element:'arcane',targeting:'enemy',impact:'target'}),
 'heavenfall-nine-stars':skill({id:'heavenfall-nine-stars',name:'九曜墜天',icon:'bow',description:'天墜神弓專屬。弓臂高舉連續引弦，九枚星矢先升空定點，再化為密集墜星箭幕。',cooldown:23,cost:46,multiplier:5.35,range:22,radius:7.4,windup:1.0,hitFrame:1.08,recovery:.96,interruptible:false,vfx:'mythic-nine-stars',animationProfile:'ranged',effects:[],element:'arcane',targeting:'enemy',impact:'target'}),
 'yin-yang-reversal':skill({id:'yin-yang-reversal',name:'兩儀逆轉',icon:'dual',description:'兩儀雙刃專屬。雙刃一黑一白分走兩側，角色交錯換位後反向合斬，中心形成逆轉刃輪。',cooldown:22,cost:44,multiplier:5.3,range:9,radius:6.2,windup:.72,hitFrame:.82,recovery:.82,interruptible:false,vfx:'mythic-yinyang',animationProfile:'dash',effects:[],element:'arcane',targeting:'enemy',impact:'target',dashDistance:5.2})
};

// Legacy card shape is kept for editor/content compatibility. Runtime hotkeys are resolved from the equipped weapon.
export const SKILLS:Record<string,{name:string;key:string;icon:string;cooldown:number;mp:number;multiplier:number;range:number;windup:number;radius:number;description:string}>=Object.fromEntries(
 Object.values(SKILL_DEFINITIONS).map(s=>[s.id,{name:s.name,key:'',icon:s.icon,cooldown:s.cooldown,mp:s.cost,multiplier:s.multiplier,range:s.range,windup:s.hitFrame,radius:s.radius,description:s.description}])
);
