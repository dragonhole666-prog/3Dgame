import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename,extname,resolve} from 'node:path';
import type {Appearance,ItemBase,Slot,WeaponHandedness,WeaponProfile} from '../src/shared/types';
import type {ContentPack} from '../src/shared/data/content';

export const EDITOR_EQUIPMENT_MODULE_DIR='public/assets/equipment/modules';
export const BODY_FIT_SLOTS=new Set<Slot>(['shoulders','chest','wrists','hands','waist','legs','feet','cape','fashion']);
const SLOT_ATTACH:Record<Slot,string>={head:'Head',shoulders:'Chest',chest:'Chest',wrists:'Forearms',hands:'Hands',waist:'Waist',legs:'Legs',feet:'Feet',mainhand:'RightHand',offhand:'LeftHand',cape:'Back',neck:'Chest',ring:'RightHand',charm:'Waist',artifact:'Orbit',back:'Back',fashion:'Chest'};
const SLOT_SHAPE:Record<Slot,string>={head:'helmet',shoulders:'pauldron',chest:'armor',wrists:'bracer',hands:'gloves',waist:'belt',legs:'pants',feet:'boots',mainhand:'sword',offhand:'shield',cape:'cape',neck:'pendant',ring:'ring',charm:'talisman',artifact:'artifact',back:'back',fashion:'outfit'};
const SLOT_SIZE:Record<Slot,[number,number]>={head:[.42,.28],shoulders:[.42,.32],chest:[1.05,.44],wrists:[.3,.15],hands:[.22,.13],waist:[.22,.36],legs:[.68,.2],feet:[.42,.17],mainhand:[1.3,.13],offhand:[.72,.4],cape:[1.5,.72],neck:[.18,.08],ring:[.05,.03],charm:[.28,.14],artifact:[.4,.3],back:[1.1,.42],fashion:[1.5,.46]};
const SLOT_TOKENS:Record<Slot,string[]>= {
 head:['helmet','helm','crown','hood','hat','headgear','mask','tiara','頭','冠','盔','帽','面具'],
 shoulders:['shoulder','shoulders','pauldron','pauldrons','epaulet','肩甲','肩','披肩'],
 chest:['chest','armor','armour','robe','shirt','vest','jacket','coat','torso','breastplate','cuirass','上衣','胸甲','戰衣','衣甲','道袍','袍'],
 wrists:['wrist','wrists','bracer','bracers','cuff','vambrace','護腕','臂鎧','腕'],
 hands:['glove','gloves','gauntlet','gauntlets','handwear','手套','手甲'],
 waist:['belt','sash','waist','girdle','腰帶','腰封','腰'],
 legs:['pants','trouser','trousers','skirt','leggings','legarmor','greave','下裝','褲','裙','腿甲','戰裙'],
 feet:['boot','boots','shoe','shoes','footwear','sandal','greaves','靴','鞋','履'],
 cape:['cape','cloak','mantle','shawl','披風','斗篷','羽氅','氅'],
 fashion:['fashion','dress','outfit','costume','garment','clothes','clothing','時裝','服裝','禮服'],
 mainhand:['sword','blade','katana','saber','axe','hammer','spear','lance','staff','wand','bow','weapon','jian','劍','刀','槍','矛','杖','弓','斧','錘'],
 offhand:['shield','buckler','disc','offhand','盾','法輪','護盾'],
 neck:['necklace','pendant','amulet','neck','項鍊','項鏈','玉墜','墜'],
 ring:['ring','finger','戒指','指環'],
 charm:['charm','talisman','sigil','符','護符'],
 artifact:['artifact','gourd','drum','relic','法寶','葫蘆','鼓','神器'],
 back:['back','wing','wings','quiver','scabbard','劍匣','背飾','翼'],
};

type GlbDoc={asset?:{version?:string};nodes?:Array<{name?:string;mesh?:number;skin?:number}>;meshes?:Array<{name?:string;primitives?:Array<{attributes?:Record<string,number>;targets?:Array<Record<string,number>>;material?:number}>}>;materials?:Array<{name?:string;pbrMetallicRoughness?:{baseColorFactor?:number[]}}> ;accessors?:Array<{min?:number[];max?:number[]}>;skins?:unknown[]};
export interface EquipmentGlbAnalysis {fileName:string;displayName:string;sha256:string;slot:Slot;confidence:number;strategy:'skinned-rebind'|'rigid-auto-rig'|'rigid-attachment';bodyFit:boolean;meshCount:number;skinnedNodes:number;morphTargetBindings:number;hasSkin:boolean;bounds?:{x:number;y:number;z:number};color:string;shape:string;weaponProfile?:WeaponProfile;handedness?:WeaponHandedness;signals:string[];}

function parseGlb(buffer:Buffer):GlbDoc{
 if(buffer.length<20||buffer.readUInt32LE(0)!==0x46546c67)throw new Error('檔案不是有效的 GLB。');
 if(buffer.readUInt32LE(4)!==2)throw new Error('只支援 glTF/GLB 2.0。');
 if(buffer.readUInt32LE(8)!==buffer.length)throw new Error('GLB 長度標頭與實際檔案不一致。');
 const jsonLength=buffer.readUInt32LE(12),jsonType=buffer.readUInt32LE(16);if(jsonType!==0x4e4f534a||jsonLength<=0||20+jsonLength>buffer.length)throw new Error('GLB 缺少有效 JSON chunk。');
 const doc=JSON.parse(buffer.subarray(20,20+jsonLength).toString('utf8').replace(/\0+$/,'')) as GlbDoc;
 if(doc.asset?.version!=='2.0')throw new Error('GLB asset.version 必須是 2.0。');
 if(!(doc.meshes?.length))throw new Error('GLB 沒有可渲染 Mesh。');
 return doc;
}
function displayName(fileName:string){const stem=basename(fileName,extname(fileName)).trim();return stem||'新匯入裝備';}
function labelText(fileName:string,doc:GlbDoc){return [displayName(fileName),...(doc.nodes??[]).map(x=>x.name??''),...(doc.meshes??[]).map(x=>x.name??''),...(doc.materials??[]).map(x=>x.name??'')].join(' ').toLowerCase();}
function boundsOf(doc:GlbDoc){let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],found=false;for(const mesh of doc.meshes??[])for(const p of mesh.primitives??[]){const pos=p.attributes?.POSITION,a=Number.isInteger(pos)?doc.accessors?.[pos!]:undefined;if(!a?.min||!a.max||a.min.length<3||a.max.length<3)continue;for(let i=0;i<3;i++){min[i]=Math.min(min[i],a.min[i]);max[i]=Math.max(max[i],a.max[i]);}found=true;}return found?{x:Math.max(0,max[0]-min[0]),y:Math.max(0,max[1]-min[1]),z:Math.max(0,max[2]-min[2])}:undefined;}
function dominantColor(doc:GlbDoc){const factor=doc.materials?.map(m=>m.pbrMetallicRoughness?.baseColorFactor).find(v=>v&&v.length>=3);if(!factor)return '#879c92';return '#'+factor.slice(0,3).map(v=>Math.max(0,Math.min(255,Math.round((v??.55)*255))).toString(16).padStart(2,'0')).join('');}
function weaponProfile(text:string):WeaponProfile|undefined{if(/bow|archer|弓/.test(text))return 'bow';if(/spear|lance|槍|矛/.test(text))return 'spear';if(/staff|wand|杖/.test(text))return 'staff';if(/dual|twin|雙/.test(text))return 'dual';if(/greatsword|claymore|大劍|巨劍/.test(text))return 'greatsword';if(/sword|blade|katana|saber|jian|劍|刀/.test(text))return 'sword';return undefined;}
function weaponHandedness(text:string,profile:WeaponProfile|undefined):WeaponHandedness|undefined{if(!profile)return undefined;if(profile==='dual')return 'paired';if(profile==='sword')return 'one';if(profile==='staff'&&/wand|rod|short.?staff|短杖|權杖|法器/.test(text))return 'one';return 'two';}
function inferSlot(fileName:string,doc:GlbDoc){const text=labelText(fileName,doc),scores=new Map<Slot,number>(),stem=displayName(fileName).toLowerCase();for(const [slot,tokens] of Object.entries(SLOT_TOKENS) as [Slot,string[]][])for(const token of tokens){if(stem.includes(token))scores.set(slot,(scores.get(slot)??0)+8);else if(text.includes(token))scores.set(slot,(scores.get(slot)??0)+3);}
 const b=boundsOf(doc),meshNodes=(doc.nodes??[]).filter(n=>Number.isInteger(n.mesh)),hasSkin=meshNodes.some(n=>Number.isInteger(n.skin));
 if(!scores.size&&b){const dims=[b.x,b.y,b.z].sort((a,b)=>b-a),ratio=dims[0]/Math.max(.0001,dims[1]);if(!hasSkin&&ratio>3.1)scores.set('mainhand',4);else if(hasSkin)scores.set('fashion',3);}
 if(!scores.size)scores.set(hasSkin?'fashion':'fashion',1);
 const sorted=[...scores].sort((a,b)=>b[1]-a[1]),best=sorted[0],second=sorted[1]?.[1]??0;return {slot:best[0],confidence:Math.max(.25,Math.min(.99,(best[1]-second+3)/(best[1]+3))),signals:[...scores].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([s,n])=>`${s}:${n}`),bounds:b,text,hasSkin};}
function inferShape(slot:Slot,text:string){if(slot==='mainhand')return weaponProfile(text)??'sword';if(slot==='offhand')return /disc|輪/.test(text)?'disc':'shield';if(slot==='chest'||slot==='fashion')return /robe|袍/.test(text)?'robe':/plate|armor|armour|甲/.test(text)?'plate':slot==='fashion'?'silk':'vest';if(slot==='legs')return /skirt|裙/.test(text)?'skirt':'pants';return SLOT_SHAPE[slot];}
export function analyzeEquipmentGlb(buffer:Buffer,fileName:string):EquipmentGlbAnalysis{const doc=parseGlb(buffer),inf=inferSlot(fileName,doc),meshNodes=(doc.nodes??[]).filter(n=>Number.isInteger(n.mesh)),skinnedNodes=meshNodes.filter(n=>Number.isInteger(n.skin)).length,morphTargetBindings=(doc.meshes??[]).reduce((sum,m)=>sum+(m.primitives??[]).reduce((s,p)=>s+(p.targets?.length??0),0),0),bodyFit=BODY_FIT_SLOTS.has(inf.slot);return {fileName,displayName:displayName(fileName),sha256:createHash('sha256').update(buffer).digest('hex'),slot:inf.slot,confidence:inf.confidence,strategy:bodyFit?(skinnedNodes?'skinned-rebind':'rigid-auto-rig'):'rigid-attachment',bodyFit,meshCount:doc.meshes?.length??0,skinnedNodes,morphTargetBindings,hasSkin:inf.hasSkin,bounds:inf.bounds,color:dominantColor(doc),shape:inferShape(inf.slot,inf.text),weaponProfile:inf.slot==='mainhand'?weaponProfile(inf.text)??'sword':undefined,handedness:inf.slot==='mainhand'?weaponHandedness(inf.text,weaponProfile(inf.text)??'sword'):undefined,signals:inf.signals};}
function slug(stem:string){return stem.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);}
function uniqueId(content:ContentPack,analysis:EquipmentGlbAnalysis){const base=slug(displayName(analysis.fileName))||`imported-${analysis.sha256.slice(0,8)}`;let id=base,n=2;while(content.items[id])id=`${base.slice(0,55)}-${n++}`;return id;}
function hideBody(slot:Slot){if(slot==='chest'||slot==='fashion')return ['torso'];if(slot==='legs')return ['thighs'];if(slot==='feet')return ['shins'];return [];}
function defaultStats(slot:Slot){if(slot==='mainhand')return {attack:12};if(['neck','ring','charm','artifact'].includes(slot))return {attack:2,hp:8};if(slot==='offhand')return {defense:4,hp:14};return {defense:3,hp:12};}
export function createImportedEquipmentRecords(content:ContentPack,analysis:EquipmentGlbAnalysis){const id=uniqueId(content,analysis),appearanceId=`equipment_${id}`,url=`/assets/equipment/modules/${id}.glb`,[length,width]=SLOT_SIZE[analysis.slot],profile=analysis.weaponProfile;const appearance:Appearance={id:appearanceId,slot:analysis.slot,mesh:url,material:'pbr',color:analysis.color,trim:'#c6c6af',attachBone:profile==='bow'?'LeftHand':SLOT_ATTACH[analysis.slot],shape:analysis.shape,length,width,ornaments:0,hideBody:hideBody(analysis.slot),hideHair:analysis.slot==='head',animationProfile:profile,positionOffset:[0,0,0],rotationOffset:[0,0,0],scale:1};const item:ItemBase={id,name:analysis.displayName,type:'equipment',subtype:profile??analysis.slot,slot:analysis.slot,rarity:'fine',itemLevel:1,requiredLevel:1,baseStats:defaultStats(analysis.slot),affixPool:analysis.slot==='mainhand'?['keen','precise','swift']:['fortified','vital','swift'],sellPrice:18,tradable:true,icon:analysis.shape,mesh:url,material:'pbr',dropSource:[],appearanceId,handedness:analysis.handedness,description:`由世界工坊一鍵匯入；HF16 自動判定 ${analysis.slot}${analysis.handedness?` / ${analysis.handedness}-hand`:''}，套用 ${analysis.strategy}。`};return {id,url,item,appearance};}
export function syncEditorEquipmentRegistry(content:ContentPack,root=process.cwd()){
 const items=Object.values(content.items).filter(i=>i.type==='equipment'&&typeof i.mesh==='string'&&i.mesh.startsWith('/assets/equipment/modules/'));
 const appearances:Record<string,Appearance>={},itemMap:Record<string,ItemBase>={};for(const item of items){itemMap[item.id]=item;if(item.appearanceId&&content.appearances[item.appearanceId])appearances[item.appearanceId]=content.appearances[item.appearanceId];}
 const dir=resolve(root,EDITOR_EQUIPMENT_MODULE_DIR);mkdirSync(dir,{recursive:true});const registry={fitVersion:'HF9',updatedAt:new Date().toISOString(),items:itemMap,appearances};writeFileSync(resolve(dir,'editor-equipment-registry.json'),JSON.stringify(registry,null,2)+'\n');return items.length;
}
export function persistImportedEquipmentAsset(buffer:Buffer,id:string,analysis:EquipmentGlbAnalysis,root=process.cwd()){
 const rel=`assets/equipment/modules/${id}.glb`,publicDir=resolve(root,EDITOR_EQUIPMENT_MODULE_DIR);mkdirSync(publicDir,{recursive:true});writeFileSync(resolve(publicDir,`${id}.glb`),buffer);
 const sidecar={fitVersion:'HF9',itemId:id,importedAt:new Date().toISOString(),sourceFileName:analysis.fileName,...analysis,fileName:`${id}.glb`};writeFileSync(resolve(publicDir,`${id}.fit.json`),JSON.stringify(sidecar,null,2)+'\n');
 const dist=resolve(root,'dist',rel);if(existsSync(resolve(root,'dist'))){mkdirSync(resolve(root,'dist/assets/equipment/modules'),{recursive:true});writeFileSync(dist,buffer);writeFileSync(resolve(root,`dist/assets/equipment/modules/${id}.fit.json`),JSON.stringify(sidecar,null,2)+'\n');}
 return {publicUrl:`/${rel}`,sidecar};
}
export function readFitSidecar(id:string,root=process.cwd()){const file=resolve(root,EDITOR_EQUIPMENT_MODULE_DIR,`${id}.fit.json`);return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):undefined;}
