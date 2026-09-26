export type CustomGroup='face'|'eyes'|'brows'|'nose'|'mouth'|'ears'|'body'|'style';
export type NumericCustomizationKey=
 |'faceWidth'|'faceHeight'|'faceDepth'|'foreheadWidth'|'foreheadHeight'|'templeWidth'|'cheekWidth'|'cheekHeight'|'cheekFullness'|'jawWidth'|'jawHeight'|'chinWidth'|'chinLength'|'chinForward'
 |'eyeSize'|'eyeWidth'|'eyeRoundness'|'eyeSpacing'|'eyeHeight'|'eyeDepth'|'eyeTilt'|'eyelidHeight'|'upperLid'|'lowerLid'|'irisSize'|'pupilSize'
 |'browHeight'|'browSpacing'|'browAngle'|'browThickness'|'browLength'
 |'noseWidth'|'bridgeWidth'|'bridgeHeight'|'noseHeight'|'noseLength'|'noseTipSize'|'noseTipHeight'|'nostrilWidth'|'noseForward'
 |'mouthWidth'|'mouthHeight'|'upperLip'|'lowerLip'|'mouthCorner'|'philtrum'|'mouthForward'
 |'earSize'|'earHeight'|'earWidth'|'earAngle'
 |'height'|'headSize'|'neckLength'|'neckThickness'|'shoulderWidth'|'shoulderSlope'|'torsoLength'|'chestWidth'|'chestDepth'|'waistWidth'|'waistDepth'|'hipWidth'|'hipDepth'|'pelvisHeight'
 |'armLength'|'upperArmThickness'|'forearmThickness'|'handSize'|'handLength'|'legLength'|'thighThickness'|'calfThickness'|'footSize'|'footLength'|'muscle'|'bodyMass'
 |'hairLength'|'hairVolume'|'voicePitch';

export interface CharacterCustomization extends Record<NumericCustomizationKey,number>{
 skinColor:string;hairColor:string;leftEyeColor:string;rightEyeColor:string;lipColor:string;underwearColor:string;tattooColor:string;makeupColor:string;
 hairStyle:number;facePreset:number;bodyPreset:number;adornmentStyle:number;tattooStyle:number;makeupStyle:number;eyelashStyle:number;browStyle:number;voiceStyle:number;
}
export interface CustomControl{key:NumericCustomizationKey;label:string;group:CustomGroup;min?:number;max?:number;hint?:string}
const F=(key:NumericCustomizationKey,label:string,group:CustomGroup,hint=''):CustomControl=>({key,label,group,min:0,max:100,hint});
export const CUSTOM_CONTROLS:CustomControl[]=[
 F('faceWidth','臉部寬度','face'),F('faceHeight','臉部長度','face'),F('faceDepth','臉部深度','face'),F('foreheadWidth','額頭寬度','face'),F('foreheadHeight','額頭高度','face'),F('templeWidth','太陽穴寬度','face'),F('cheekWidth','顴骨寬度','face'),F('cheekHeight','顴骨高度','face'),F('cheekFullness','臉頰飽滿','face'),F('jawWidth','下顎寬度','face'),F('jawHeight','下顎高度','face'),F('chinWidth','下巴寬度','face'),F('chinLength','下巴長度','face'),F('chinForward','下巴前突','face'),
 F('eyeSize','眼睛大小','eyes'),F('eyeWidth','眼睛寬度','eyes'),F('eyeRoundness','眼睛圓潤度','eyes'),F('eyeSpacing','眼距','eyes'),F('eyeHeight','眼睛高度','eyes'),F('eyeDepth','眼睛深度','eyes'),F('eyeTilt','眼角角度','eyes'),F('eyelidHeight','眼皮開合','eyes'),F('upperLid','上眼皮厚度','eyes'),F('lowerLid','下眼皮厚度','eyes'),F('irisSize','虹膜大小','eyes'),F('pupilSize','瞳孔大小','eyes'),
 F('browHeight','眉毛高度','brows'),F('browSpacing','眉間距','brows'),F('browAngle','眉型角度','brows'),F('browThickness','眉毛粗細','brows'),F('browLength','眉毛長度','brows'),
 F('noseWidth','鼻翼寬度','nose'),F('bridgeWidth','鼻樑寬度','nose'),F('bridgeHeight','鼻樑高度','nose'),F('noseHeight','鼻子高度','nose'),F('noseLength','鼻子長度','nose'),F('noseTipSize','鼻尖大小','nose'),F('noseTipHeight','鼻尖高度','nose'),F('nostrilWidth','鼻孔寬度','nose'),F('noseForward','鼻子前突','nose'),
 F('mouthWidth','嘴巴寬度','mouth'),F('mouthHeight','嘴巴高度','mouth'),F('upperLip','上唇厚度','mouth'),F('lowerLip','下唇厚度','mouth'),F('mouthCorner','嘴角高度','mouth'),F('philtrum','人中長度','mouth'),F('mouthForward','嘴唇前突','mouth'),
 F('earSize','耳朵大小','ears'),F('earHeight','耳朵高度','ears'),F('earWidth','耳朵寬度','ears'),F('earAngle','耳朵外張','ears'),
 F('height','身高','body'),F('headSize','頭部比例','body'),F('neckLength','頸部長度','body'),F('neckThickness','頸部粗細','body'),F('shoulderWidth','肩膀寬度','body'),F('shoulderSlope','肩膀斜度','body'),F('torsoLength','上身長度','body'),F('chestWidth','胸廓寬度','body'),F('chestDepth','胸廓厚度','body'),F('waistWidth','腰圍','body'),F('waistDepth','腰部厚度','body'),F('hipWidth','臀寬','body'),F('hipDepth','臀部厚度','body'),F('pelvisHeight','骨盆高度','body'),
 F('armLength','手臂長度','body'),F('upperArmThickness','上臂粗細','body'),F('forearmThickness','前臂粗細','body'),F('handSize','手掌大小','body'),F('handLength','手掌長度','body'),F('legLength','腿部長度','body'),F('thighThickness','大腿粗細','body'),F('calfThickness','小腿粗細','body'),F('footSize','腳掌大小','body'),F('footLength','腳掌長度','body'),F('muscle','肌肉感','body'),F('bodyMass','體型厚實度','body'),
 F('hairLength','頭髮長度','style'),F('hairVolume','髮量','style'),F('voicePitch','聲線高低','style')
];

const mid=Object.fromEntries(CUSTOM_CONTROLS.map(c=>[c.key,50])) as Record<NumericCustomizationKey,number>;
export const DEFAULT_CUSTOMIZATION:CharacterCustomization={
 ...mid,skinColor:'#e1b49b',hairColor:'#151a21',leftEyeColor:'#35546a',rightEyeColor:'#35546a',lipColor:'#a96770',underwearColor:'#273c48',tattooColor:'#6b3b4b',makeupColor:'#bd7d86',
 hairStyle:0,facePreset:0,bodyPreset:0,adornmentStyle:0,tattooStyle:0,makeupStyle:0,eyelashStyle:0,browStyle:0,voiceStyle:0
};

export interface CustomPreset {name:string;description:string;values:Partial<CharacterCustomization>}
export const FACE_PRESETS:CustomPreset[]=[
 {name:'均衡',description:'標準比例、適合作為細調起點',values:{}},
 {name:'俊朗',description:'輪廓俐落、眉眼較深',values:{faceWidth:46,faceHeight:55,cheekWidth:54,jawWidth:48,chinLength:56,eyeDepth:58,browAngle:58,noseHeight:58,noseLength:56}},
 {name:'英武',description:'骨相明顯、下顎較寬',values:{faceWidth:54,cheekWidth:58,jawWidth:62,jawHeight:57,chinWidth:57,browThickness:60,browAngle:62,noseWidth:54}},
 {name:'少年',description:'眼睛較大、臉部較短',values:{faceHeight:43,faceWidth:48,cheekFullness:58,jawWidth:43,chinLength:43,eyeSize:60,eyeRoundness:60,noseTipSize:45}},
 {name:'清冷',description:'細長臉、眉眼上揚',values:{faceWidth:43,faceHeight:59,cheekWidth:51,jawWidth:42,chinWidth:43,eyeWidth:58,eyeTilt:63,browAngle:64,mouthWidth:47}},
 {name:'溫潤',description:'柔和眼型與輪廓',values:{faceWidth:49,cheekFullness:61,jawWidth:46,eyeSize:57,eyeRoundness:56,browAngle:46,noseWidth:47,mouthCorner:56}},
 {name:'俠客',description:'成熟而銳利',values:{faceHeight:57,cheekWidth:59,jawWidth:58,chinForward:55,eyeDepth:62,browThickness:57,noseForward:58}},
 {name:'書生',description:'窄臉、五官較秀氣',values:{faceWidth:42,faceHeight:55,jawWidth:41,chinWidth:42,eyeSize:55,browThickness:43,noseWidth:43,mouthWidth:46}},
 {name:'仙姿',description:'較高額頭、纖細下巴',values:{foreheadHeight:59,foreheadWidth:53,faceWidth:46,chinWidth:39,chinLength:58,eyeSize:57,irisSize:57}},
 {name:'霸者',description:'寬顎、深眼、厚眉',values:{faceWidth:59,jawWidth:67,chinWidth:61,eyeDepth:65,browThickness:67,noseWidth:58,mouthWidth:57}},
 {name:'獨特',description:'高顴骨與狹長眼型',values:{cheekWidth:66,cheekHeight:62,faceWidth:47,eyeWidth:66,eyeRoundness:38,eyeTilt:60,chinLength:57}},
 {name:'幼顏',description:'短臉、圓眼、小鼻',values:{faceHeight:39,cheekFullness:65,jawWidth:40,chinLength:39,eyeSize:67,eyeRoundness:68,noseTipSize:40,mouthWidth:46}}
];
export const BODY_PRESETS:CustomPreset[]=[
 {name:'均衡',description:'平均比例',values:{}},
 {name:'修長',description:'高挑、長腿、窄腰',values:{height:64,torsoLength:55,legLength:65,waistWidth:44,hipWidth:47,shoulderWidth:50,bodyMass:42}},
 {name:'英武',description:'寬肩、厚胸、肌肉感',values:{height:58,shoulderWidth:67,chestWidth:66,chestDepth:61,waistWidth:53,upperArmThickness:61,thighThickness:58,muscle:66,bodyMass:58}},
 {name:'輕靈',description:'纖細、四肢修長',values:{height:56,shoulderWidth:45,chestWidth:44,waistWidth:40,hipWidth:43,armLength:60,legLength:63,muscle:38,bodyMass:36}},
 {name:'魁梧',description:'整體厚實與寬大',values:{height:60,headSize:47,neckThickness:65,shoulderWidth:70,chestWidth:72,chestDepth:68,waistWidth:61,hipWidth:62,upperArmThickness:68,forearmThickness:64,thighThickness:65,calfThickness:63,muscle:72,bodyMass:72}},
 {name:'少年',description:'頭身比偏年輕、體型較窄',values:{height:44,headSize:58,shoulderWidth:43,chestWidth:43,waistWidth:44,hipWidth:45,armLength:46,legLength:48,muscle:35,bodyMass:40}},
 {name:'敏捷',description:'短上身、長腿、緊實',values:{height:55,torsoLength:43,legLength:66,waistWidth:43,shoulderWidth:52,thighThickness:48,calfThickness:47,muscle:57,bodyMass:42}},
 {name:'厚重',description:'寬軀幹、低重心',values:{height:50,torsoLength:55,chestWidth:64,chestDepth:67,waistWidth:63,hipWidth:64,legLength:45,thighThickness:64,calfThickness:60,bodyMass:70}}
];

const KEY='qinglan-character-customization-v2';
const LEGACY_KEY='qinglan-character-customization-v1';
function sanitize(v:Partial<CharacterCustomization>&{eyeColor?:string}):CharacterCustomization{
 const legacyEye=v.eyeColor;const out={...DEFAULT_CUSTOMIZATION,...v} as CharacterCustomization;
 if(legacyEye&&!('leftEyeColor' in v))out.leftEyeColor=legacyEye;if(legacyEye&&!('rightEyeColor' in v))out.rightEyeColor=legacyEye;
 for(const c of CUSTOM_CONTROLS)out[c.key]=Math.max(c.min??0,Math.min(c.max??100,Number(out[c.key])||50));
 return out;
}
export function loadCustomization():CharacterCustomization{try{const raw=localStorage.getItem(KEY)??localStorage.getItem(LEGACY_KEY);return raw?sanitize(JSON.parse(raw)):sanitize({});}catch{return sanitize({});}}
export function saveCustomization(v:CharacterCustomization){try{localStorage.setItem(KEY,JSON.stringify(sanitize(v)));}catch{}}
export function randomCustomization(base:CharacterCustomization=DEFAULT_CUSTOMIZATION):CharacterCustomization{const next=sanitize(base);for(const c of CUSTOM_CONTROLS)next[c.key]=Math.round(24+Math.random()*52);next.hairStyle=Math.floor(Math.random()*3);next.adornmentStyle=Math.floor(Math.random()*5);next.tattooStyle=Math.floor(Math.random()*5);next.makeupStyle=Math.floor(Math.random()*4);next.eyelashStyle=Math.floor(Math.random()*4);next.browStyle=Math.floor(Math.random()*4);next.voiceStyle=Math.floor(Math.random()*4);return next;}
export function applyFacePreset(base:CharacterCustomization,index:number){const p=FACE_PRESETS[index]??FACE_PRESETS[0];return sanitize({...base,...p.values,facePreset:index});}
export function applyBodyPreset(base:CharacterCustomization,index:number){const p=BODY_PRESETS[index]??BODY_PRESETS[0];return sanitize({...base,...p.values,bodyPreset:index});}
export function saveCustomizationSlot(slot:number,v:CharacterCustomization){try{localStorage.setItem(`qinglan-character-slot-${slot}`,JSON.stringify(sanitize(v)));return true;}catch{return false;}}
export function loadCustomizationSlot(slot:number){try{const raw=localStorage.getItem(`qinglan-character-slot-${slot}`);return raw?sanitize(JSON.parse(raw)):undefined;}catch{return undefined;}}
export function exportCustomization(v:CharacterCustomization){return JSON.stringify({format:'QinglanCharacterAppearance',version:2,profile:sanitize(v)},null,2);}
export function importCustomization(text:string){try{const parsed=JSON.parse(text);const profile=parsed?.profile??parsed;return sanitize(profile);}catch{return undefined;}}
export const normalized=(value:number,span=.3)=>1+((value-50)/50)*span;
export const CUSTOMIZATION_COUNT=CUSTOM_CONTROLS.length;
