import {describe,expect,it} from 'vitest';
import {analyzeEquipmentGlb,createImportedEquipmentRecords} from '../server/equipment-import';
import {exportContent,validateContent} from '../src/shared/data/content';

function glb(doc:unknown){let json=Buffer.from(JSON.stringify(doc),'utf8'),pad=(4-json.length%4)%4;if(pad)json=Buffer.concat([json,Buffer.alloc(pad,0x20)]);const out=Buffer.alloc(20+json.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);return out;}
const base=(skinned=false)=>({asset:{version:'2.0'},nodes:[{name:'Mesh',mesh:0,...skinned?{skin:0}:{}}],skins:skinned?[{joints:[]}]:undefined,meshes:[{name:'Equipment',primitives:[{attributes:{POSITION:0}}]}],accessors:[{min:[-.4,0,-.2],max:[.4,1.2,.2]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.3,.5,.6,1]}}]});

describe('HF9 editor one-click GLB import contract',()=>{
 it('routes skinned armor into the automatic body-fit rebind pipeline',()=>{const a=analyzeEquipmentGlb(glb(base(true)),'new_armor.glb');expect(a.slot).toBe('chest');expect(a.strategy).toBe('skinned-rebind');expect(a.bodyFit).toBe(true);});
 it('routes rigid boots into body-worn auto-rig instead of a rigid attachment',()=>{const a=analyzeEquipmentGlb(glb(base(false)),'wandering-boots.glb');expect(a.slot).toBe('feet');expect(a.strategy).toBe('rigid-auto-rig');});
 it('keeps weapons outside body-fit and infers a weapon animation profile',()=>{const a=analyzeEquipmentGlb(glb({...base(false),accessors:[{min:[0,0,0],max:[.08,1.8,.08]}]}),'dragon-sword.glb');expect(a.slot).toBe('mainhand');expect(a.strategy).toBe('rigid-attachment');expect(a.weaponProfile).toBe('sword');});
 it('creates complete item + appearance metadata without manual metadata entry',()=>{const content=exportContent(),a=analyzeEquipmentGlb(glb(base(false)),'wanderer-cape.glb'),created=createImportedEquipmentRecords(content,a);content.items[created.id]=created.item;content.appearances[created.appearance.id]=created.appearance;expect(created.url).toMatch(/^\/assets\/equipment\/modules\/.*\.glb$/);expect(created.item.appearanceId).toBe(created.appearance.id);expect(()=>validateContent(content)).not.toThrow();});
});
