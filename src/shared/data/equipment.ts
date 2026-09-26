import type { Appearance, ItemBase, Rarity, Slot, WeaponHandedness, WeaponProfile } from '../types';
import { EDITOR_IMPORTED_APPEARANCES,EDITOR_IMPORTED_ITEMS } from './editor-equipment.generated';

// Authored silhouettes: dimensions, layer masks and ornament geometry are part of the data.
type Recipe = [string,string,Slot,Rarity,string,string,number,number,number,number,WeaponProfile?];
const recipes: Recipe[] = [
 ['iron-sword','玄鐵劍','mainhand','common','jian','#7b8890',1.05,.08,0,18,'sword'],
 ['bamboo-sword','青篁劍','mainhand','fine','leaf','#9aa995',1.2,.1,1,24,'sword'],
 ['cloud-sword','流雲劍','mainhand','rare','split','#b4d9db',1.3,.12,2,32,'sword'],
 ['thunder-sword','紫霄雷劍','mainhand','epic','thunder','#6952a2',1.55,.15,4,45,'sword'],
 ['heaven-sword','九天玄雷劍','mainhand','legendary','rune','#b4a9cf',1.8,.2,6,58,'greatsword'],
 ['sunfire-blade','離火焚天刀','mainhand','legendary','cleaver','#d55a32',1.72,.3,7,60,'greatsword'],
 ['frost-immortal-bow','玄霜仙弓','mainhand','legendary','bow','#9edcf4',1.45,.12,7,57,'bow'],
 ['mountain-blade','斷嶽長刀','mainhand','fine','dao','#647176',1.3,.25,1,28,'greatsword'],
 ['ember-blade','赤曜斬魄刀','mainhand','rare','cleaver','#7c4540',1.55,.29,3,36,'greatsword'],
 ['jade-spear','碧落長槍','mainhand','rare','spear','#7caca8',2.35,.14,2,33,'spear'],
 ['frost-bow','霜翎弓','mainhand','epic','bow','#aad5e6',1.3,.1,4,41,'bow'],
 ['star-staff','星河法杖','mainhand','rare','staff','#65828c',1.95,.1,3,34,'staff'],
 ['spirit-wand','青靈短杖','mainhand','fine','wand','#7aa69d',.88,.075,2,22,'staff'],
 ['twin-moon','雙月流光','mainhand','epic','dual','#c5cdcf',1.05,.12,3,43,'dual'],
 ['mythic-sword','太虛歸一','mainhand','mythic','orbital','#f3dca6',1.9,.21,8,76,'sword'],
 // P0.25.1 original primordial/cosmic weapon family. Names and choreography are Qinglan-original.
 ['primordial-star-sword','荒古星闕劍','mainhand','mythic','rune','#d9c993',1.95,.2,10,92,'sword'],
 ['void-sundering-blade','破界玄刀','mainhand','mythic','cleaver','#665b78',1.88,.31,9,98,'greatsword'],
 ['celestial-burial-spear','葬星神槍','mainhand','mythic','spear','#8496ae',2.65,.15,9,94,'spear'],
 ['myriad-law-staff','萬法道杖','mainhand','mythic','staff','#8d7aa9',2.2,.13,12,90,'staff'],
 ['heavenfall-bow','天墜神弓','mainhand','mythic','bow','#b8cfe0',1.62,.13,10,91,'bow'],
 ['yin-yang-dual','兩儀雙刃','mainhand','mythic','dual','#d7d2c2',1.15,.13,10,93,'dual'],
 // Mutant-beast set: farmable from normal aberrant creatures.
 ['chloroweave-hood','青蝕獵首','head','rare','helmet','#597268',.34,.25,3,8],
 ['chloroweave-vest','青蝕獵衣','chest','rare','lamellar','#526b61',.78,.43,4,19],
 ['chloroweave-bracers','青蝕獵腕','wrists','rare','scale','#668078',.31,.15,3,7],
 ['chloroweave-belt','青蝕獵帶','waist','rare','plate','#536b60',.2,.35,3,6],
 ['chloroweave-legs','青蝕獵腿','legs','rare','lamellar','#4c655d',.6,.18,3,12],
 ['chloroweave-boots','青蝕獵靴','feet','rare','boots','#4b5f58',.42,.16,3,7],
 // Godbeast set: map-boss reward family.
 ['primordial-god-crown','荒神天冠','head','immortal','horned','#9c8dbe',.5,.28,8,18],
 ['primordial-god-armor','荒神戰衣','chest','immortal','plate','#665c7f',.92,.5,10,42],
 ['primordial-god-bracers','荒神臂鎧','wrists','immortal','scale','#75688f',.37,.17,7,16],
 ['primordial-god-belt','荒神鎮界帶','waist','immortal','plate','#83729c',.23,.39,7,14],
 ['primordial-god-legs','荒神戰裙','legs','immortal','plate','#746886',.7,.21,8,26],
 ['primordial-god-boots','荒神踏虛靴','feet','immortal','spiked','#655d78',.49,.18,7,16],
 ['linen-robe','青布道袍','chest','common','robe','#728c87',1.1,.37,0,5],
 ['reed-vest','竹隱短衣','chest','fine','vest','#56685c',.63,.4,1,9],
 ['cloud-robe','流雲仙衣','chest','rare','silk','#c1cecf',1.4,.42,2,15],
 ['thunder-armor','夔雷戰甲','chest','epic','lamellar','#635a83',.9,.46,5,24],
 ['sun-armor','曜陽玄甲','chest','legendary','plate','#826c45',.82,.5,6,32],
 ['cloth-head','素玉簪','head','common','pin','#8baca4',.16,.17,1,1],
 ['jade-crown','青玉冠','head','fine','crown','#77a891',.27,.21,2,3],
 ['mist-helm','寒霧兜鍪','head','rare','helmet','#8da7b3',.33,.26,2,6],
 ['thunder-crown','紫電仙冠','head','epic','horned','#8673a4',.45,.26,4,9],
 ['reed-shoulders','竹葉披肩','shoulders','fine','leaf','#728d72',.3,.27,2,3],
 ['cloud-shoulders','流雲肩甲','shoulders','rare','wing','#9bb7bf',.4,.32,3,5],
 ['thunder-shoulders','震雷獸肩','shoulders','epic','horned','#6d608b',.53,.38,5,9],
 ['cloth-wrists','纏絲護腕','wrists','common','wrap','#728881',.22,.1,0,1],
 ['wolf-bracers','青狼護腕','wrists','fine','fang','#6c817b',.29,.13,2,3],
 ['thunder-bracers','夔雷護腕','wrists','epic','scale','#7c6d9f',.34,.16,4,8],
 ['jade-gloves','凝碧手套','hands','rare','plate','#759b90',.16,.1,2,3],
 ['woven-belt','流蘇腰帶','waist','common','sash','#536961',.17,.32,1,2],
 ['thunder-belt','御雷寶帶','waist','epic','plate','#7d6493',.21,.37,4,7],
 ['linen-legs','行雲布褲','legs','common','cloth','#3a5355',.52,.14,0,2],
 ['scale-legs','玄鱗腿甲','legs','rare','lamellar','#6a8b92',.57,.17,3,6],
 ['sun-legs','曜陽戰裙','legs','legendary','plate','#9a8257',.67,.2,4,11],
 ['linen-boots','踏青履','feet','common','shoes','#3f4e4a',.18,.13,0,2],
 ['cloud-boots','逐雲長靴','feet','rare','boots','#748f93',.38,.15,2,5],
 ['thunder-boots','奔雷戰靴','feet','epic','spiked','#6c6284',.45,.18,3,8],
 ['mist-cape','煙嵐披風','cape','rare','cloth','#466e76',1.45,.68,1,3],
 ['phoenix-cape','赤霞羽氅','cape','legendary','feather','#9d5041',1.65,.88,5,6],
 ['green-ward-shield','青嵐護盾','offhand','fine','shield','#5f7d78',.54,.32,2,8],
 ['moon-disc','映月法輪','offhand','rare','disc','#87bdc0',.48,.4,3,6],
 ['moon-dagger','月影靈刃','offhand','fine','dagger','#93a8ad',.58,.065,1,9],
 ['demon-king-shield','魔王鎮界盾','offhand','immortal','shield','#344f58',.82,.44,8,30],
 ['jade-neck','清心玉墜','neck','fine','jade','#8bddb2',.14,.07,1,2],
 ['star-ring','星紋指環','ring','rare','ring','#d9c387',.05,.03,1,3],
 ['storm-charm','敕雷符','charm','epic','talisman','#d0b279',.26,.13,2,5],
 ['kui-drum','夔雷鼓','artifact','legendary','drum','#9a728e',.38,.36,4,9],
 ['jade-gourd','白玉葫蘆','artifact','fine','gourd','#b9d7b9',.38,.17,1,3],
 ['sword-wings','玄天劍匣','back','epic','swords','#76929a',1.1,.38,5,6],
 ['snow-fashion','踏雪客','fashion','rare','silk','#d3e1df',1.5,.44,2,0]
];
const attachment: Record<Slot,string> = {head:'Head',shoulders:'Chest',chest:'Chest',wrists:'Forearms',hands:'Hands',waist:'Waist',legs:'Legs',feet:'Feet',mainhand:'RightHand',offhand:'LeftHand',cape:'Back',neck:'Chest',ring:'RightHand',charm:'Waist',artifact:'Orbit',back:'Back',fashion:'Chest'};
export const APPEARANCES: Record<string,Appearance> = {};
export const ITEMS: Record<string,ItemBase> = {};
const VFX_OVERRIDES:Readonly<Record<string,'lightning'|'flame'|'frost'|'runes'>>={'heaven-sword':'lightning'};
const PROFILE_HANDEDNESS:Readonly<Partial<Record<WeaponProfile,WeaponHandedness>>>={sword:'one',greatsword:'two',dual:'paired',spear:'two',staff:'two',bow:'two'};
const HANDEDNESS_OVERRIDES:Readonly<Record<string,WeaponHandedness>>={'spirit-wand':'one'};
for(const [id,name,slot,rarity,shape,color,length,width,ornaments,power,profile] of recipes){
 const effect = VFX_OVERRIDES[id]??(/thunder|storm|kui/.test(id)?'lightning':/sun|ember|phoenix/.test(id)?'flame':/frost/.test(id)?'frost':/mythic|sword-wings|primordial|void|celestial|myriad|yin-yang|heavenfall/.test(id)?'runes':undefined);
 const appearanceId = `equipment_${id}`;
 APPEARANCES[appearanceId] = {id:appearanceId,slot,mesh:`authored:${shape}`,material:'pbr',color,trim:['legendary','immortal','mythic'].includes(rarity)?'#e6c780':'#c6c6af',attachBone:profile==='bow'?'LeftHand':attachment[slot],shape,length,width,ornaments,hideBody:slot==='chest'||slot==='fashion'?['torso']:slot==='legs'?['thighs']:slot==='feet'?['shins']:[],hideHair:shape==='helmet',vfx:effect,animationProfile:profile,positionOffset:[0,0,0],rotationOffset:[0,0,0],scale:1};
 ITEMS[id] = {id,name,type:'equipment',subtype:profile??slot,slot,rarity,itemLevel:rarity==='common'?1:rarity==='fine'?3:rarity==='rare'?6:rarity==='epic'?9:rarity==='legendary'?14:rarity==='immortal'?18:22,requiredLevel:rarity==='epic'?3:rarity==='legendary'?5:rarity==='immortal'?12:rarity==='mythic'?16:1,baseStats:slot==='mainhand'?{attack:power}:slot==='offhand'&&shape==='dagger'?{attack:power,crit:1}:['neck','ring','charm','artifact'].includes(slot)?{attack:power,hp:power*3}:{defense:power,hp:power*4},affixPool:slot==='mainhand'||(slot==='offhand'&&shape==='dagger')?['keen','precise','ruthless','swift','thunder','leech']:['fortified','vital','precise','swift','thunder'],sellPrice:power*9+8,tradable:true,icon:shape,mesh:`authored:${shape}`,material:'pbr',vfx:effect,dropSource:[],appearanceId,handedness:slot==='mainhand'?(HANDEDNESS_OVERRIDES[id]??(profile?PROFILE_HANDEDNESS[profile]:undefined)):undefined,description:slot==='mainhand'?'山河有意，鋒芒自藏。每一道器紋，皆記一段遊歷。':'取山海靈材，以古法鍛成。形與意合，護行者於萬里。'};
}

// P0.21.1 bundled hero: the high-detail robe/boots/hair silhouette is authored into the hero mesh.
// Body slots stay stat-active but do not stack malformed foreign skins over the hero; weapons remain separate real GLBs.
const RIGGED_MESHES:Record<string,string>={
 'iron-sword':'/assets/equipment/qinglan_immortal_jian.glb','thunder-sword':'/assets/equipment/qinglan_immortal_jian.glb','heaven-sword':'/assets/equipment/qinglan_immortal_jian.glb','sunfire-blade':'/assets/equipment/qinglan_immortal_jian.glb',
 'bamboo-sword':'/assets/equipment/qinglan_immortal_jian.glb','cloud-sword':'/assets/equipment/qinglan_immortal_jian.glb','mountain-blade':'/assets/equipment/qinglan_immortal_jian.glb','ember-blade':'/assets/equipment/qinglan_immortal_jian.glb','mythic-sword':'/assets/equipment/qinglan_immortal_jian.glb','twin-moon':'/assets/equipment/qinglan_immortal_jian.glb',
 'linen-robe':'authored:integrated','cloud-robe':'authored:integrated','thunder-armor':'authored:integrated','snow-fashion':'authored:integrated',
 'jade-crown':'authored:integrated','mist-helm':'authored:integrated','thunder-crown':'authored:integrated',
 'reed-shoulders':'authored:none','cloud-shoulders':'authored:none','thunder-shoulders':'authored:none',
 'cloth-wrists':'authored:integrated','wolf-bracers':'authored:integrated','thunder-bracers':'authored:integrated','jade-gloves':'authored:integrated',
 'woven-belt':'authored:integrated','thunder-belt':'authored:integrated',
 'linen-legs':'authored:none','scale-legs':'authored:none','sun-legs':'authored:none',
 'linen-boots':'authored:integrated','cloud-boots':'authored:integrated','thunder-boots':'authored:integrated',
 'mist-cape':'authored:none','phoenix-cape':'authored:none'
};
for(const [itemId,url] of Object.entries(RIGGED_MESHES)){const item=ITEMS[itemId],appearance=item?.appearanceId?APPEARANCES[item.appearanceId]:undefined;if(item&&appearance){item.mesh=url;appearance.mesh=url;}}
// HF8: every body-silhouette item is fit-managed. Explicit .glb paths are preserved so newly added
// equipment modules enter the automatic GLB inspection/rebind/auto-rig pipeline without code changes.
const HF8_BODY_FIT_SLOTS=new Set<Slot>(['shoulders','chest','wrists','hands','waist','legs','feet','cape','fashion']);
for(const item of Object.values(ITEMS)){if(!item.slot||!HF8_BODY_FIT_SLOTS.has(item.slot))continue;const appearance=item.appearanceId?APPEARANCES[item.appearanceId]:undefined;const explicit=[item.mesh,appearance?.mesh].find(v=>typeof v==='string'&&/\.glb(?:[?#].*)?$/i.test(v));if(explicit){item.mesh=explicit;if(appearance)appearance.mesh=explicit;continue;}item.mesh='fit:hf8';if(appearance)appearance.mesh='fit:hf8';}
// HF9: equipment imported through the world editor is materialized as generated source data so dev, build and Cloudflare deployments share the same item metadata.
Object.assign(APPEARANCES,EDITOR_IMPORTED_APPEARANCES);Object.assign(ITEMS,EDITOR_IMPORTED_ITEMS);
for(const [id,name,rarity,price] of [['wolf-fang','異狼牙','common',8],['beast-hide','異獸皮','fine',14],['thunder-crystal','雷靈晶','rare',90],['kui-horn','夔尊雷角','epic',240],['red-feather','裂風羽','fine',20],['spirit-jade','凝靈玉','rare',60],['chlorinated-core','青蝕異核','rare',72],['mutant-bone','異變骨片','fine',24],['godbeast-core','神獸靈核','legendary',420],['primordial-shard','荒古器紋碎片','epic',190],['refining-dust','精鍊靈砂','fine',18]] as const){
 ITEMS[id]={id,name,type:'material',subtype:'material',rarity,itemLevel:1,requiredLevel:1,baseStats:{},affixPool:[],sellPrice:price,tradable:true,icon:'crystal',mesh:'authored:crystal',material:'pbr',dropSource:[],description:id==='refining-dust'?'拆解裝備後留下的純化器紋粉末，可作為後續精鍊、鍛造與裝備養成素材。':'山海異獸留下的靈材，可收藏或在玩家市集交易。'};
}
// P0.21.1: starter stats remain unchanged; production appearance is the bundled high-detail hero + separate weapon props.
// Lower-tier alternatives remain in the bag; this changes presentation, not the item definitions.
export const STARTER_ITEMS = ['iron-sword','green-ward-shield','cloud-robe','linen-robe','jade-crown','cloth-head','cloud-shoulders','reed-shoulders','cloth-wrists','thunder-bracers','woven-belt','scale-legs','linen-legs','cloud-boots','linen-boots','mountain-blade','jade-spear','star-staff','spirit-wand','moon-disc','moon-dagger','twin-moon','frost-bow','heaven-sword','sunfire-blade','frost-immortal-bow'];
