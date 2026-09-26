import * as T from 'three';
import type { CharacterCustomization,NumericCustomizationKey } from './customization';
import { HF8_CLEARANCE_MORPH } from './garment-fit-standard';

export type GarmentMorphMode='direct'|'positive'|'negative';
export interface GarmentMorphBinding { key:NumericCustomizationKey; mode:GarmentMorphMode; }
export interface GarmentMorphCoverage { label:string; meshes:number; morphTargets:number; recognized:number; unrecognized:string[]; }

type Rule={key:NumericCustomizationKey;direct:string[];positive:string[];negative:string[]};
const RULES:Rule[]=[
 {key:'bodyMass',direct:['BodyMass','bodyMass'],positive:['BodyFat','Fat','BodyHeavy','Heavy'],negative:['BodySlim','Slim','BodyThin','Thin']},
 {key:'muscle',direct:['BodyMuscle','Muscle','muscle'],positive:['BodyMuscular','Muscular','MuscleUp'],negative:['BodySoft','Soft','MuscleDown']},
 {key:'shoulderWidth',direct:['ShoulderWidth'],positive:['ShoulderWide','ShouldersWide'],negative:['ShoulderNarrow','ShouldersNarrow']},
 {key:'chestWidth',direct:['ChestWidth'],positive:['ChestWide'],negative:['ChestNarrow']},
 {key:'chestDepth',direct:['ChestDepth'],positive:['ChestDeep','ChestThick'],negative:['ChestShallow','ChestThin']},
 {key:'waistWidth',direct:['WaistWidth'],positive:['WaistWide'],negative:['WaistNarrow']},
 {key:'waistDepth',direct:['WaistDepth'],positive:['WaistDeep','WaistThick'],negative:['WaistShallow','WaistThin']},
 {key:'hipWidth',direct:['HipWidth','HipsWidth'],positive:['HipWide','HipsWide'],negative:['HipNarrow','HipsNarrow']},
 {key:'hipDepth',direct:['HipDepth','HipsDepth'],positive:['HipDeep','HipsDeep'],negative:['HipShallow','HipsShallow']},
 {key:'upperArmThickness',direct:['UpperArmThickness'],positive:['UpperArmThick','ArmThick'],negative:['UpperArmThin','ArmThin']},
 {key:'forearmThickness',direct:['ForearmThickness'],positive:['ForearmThick'],negative:['ForearmThin']},
 {key:'thighThickness',direct:['ThighThickness'],positive:['ThighThick'],negative:['ThighThin']},
 {key:'calfThickness',direct:['CalfThickness'],positive:['CalfThick'],negative:['CalfThin']},
 {key:'height',direct:['BodyHeight','Height'],positive:['BodyTall','Tall'],negative:['BodyShort','Short']},
];

const normalizeName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(morph|blendshape|shape|shapekey|key|bs)/,'');
const BINDINGS=new Map<string,GarmentMorphBinding>();
for(const r of RULES){for(const n of r.direct)BINDINGS.set(normalizeName(n),{key:r.key,mode:'direct'});for(const n of r.positive)BINDINGS.set(normalizeName(n),{key:r.key,mode:'positive'});for(const n of r.negative)BINDINGS.set(normalizeName(n),{key:r.key,mode:'negative'});}
const signed=(profile:CharacterCustomization,key:NumericCustomizationKey)=>T.MathUtils.clamp((Number(profile[key]??50)-50)/50,-1,1);

export function garmentMorphBinding(name:string){
 const n=normalizeName(name);const exact=BINDINGS.get(n);if(exact)return exact;
 // Allow exporter prefixes/suffixes while still requiring a known body-shape token.
 for(const [alias,binding] of BINDINGS)if(n.endsWith(alias)&&n.length-alias.length<=12)return binding;
 return undefined;
}
export function garmentMorphWeight(name:string,profile:CharacterCustomization){
 if(normalizeName(name)===normalizeName(HF8_CLEARANCE_MORPH))return 1;
 const binding=garmentMorphBinding(name);if(!binding)return undefined;const d=signed(profile,binding.key);
 return binding.mode==='direct'?d:binding.mode==='positive'?Math.max(0,d):Math.max(0,-d);
}

function morphMeshes(root:T.Object3D){const out:T.Mesh[]=[];root.traverse(o=>{if(!(o instanceof T.Mesh))return;if(!o.morphTargetDictionary||!o.morphTargetInfluences)return;out.push(o);});return out;}
function applyMesh(mesh:T.Mesh,profile:CharacterCustomization){
 const dict=mesh.morphTargetDictionary,weights=mesh.morphTargetInfluences;if(!dict||!weights)return {targets:0,recognized:0,unrecognized:[] as string[]};
 let recognized=0;const unrecognized:string[]=[];
 for(const [name,index] of Object.entries(dict)){const w=garmentMorphWeight(name,profile);if(w===undefined){unrecognized.push(name);continue;}weights[index]=w;recognized++;}
 return {targets:Object.keys(dict).length,recognized,unrecognized};
}

/**
 * P0.26.8 HF8 modular garment morph + clearance bus.
 *
 * - Body and garments resolve the same semantic morph weights by target name, never by array index.
 * - CharacterMorphRuntime owns avatar BodyFat/BodyMuscle; this bus applies the same semantic values to garments.
 * - Garments remain bound to the avatar Skeleton; this runtime only owns body-shape morph weights.
 * - Missing garment morph targets are reported, not faked with whole-object scale.
 */
export class GarmentMorphRuntime{
 private profile?:CharacterCustomization;
 private readonly bodyMeshes:T.Mesh[];
 private readonly garments=new Map<T.Object3D,{label:string;meshes:T.Mesh[]}>();
 constructor(private readonly bodyRoot:T.Object3D){this.bodyMeshes=morphMeshes(bodyRoot);}
 setProfile(profile:CharacterCustomization){this.profile={...profile};this.apply();}
 registerGarment(root:T.Object3D,label='garment'){
  const meshes=morphMeshes(root);this.garments.set(root,{label,meshes});const report=this.coverageFor(label,meshes);if(this.profile)for(const mesh of meshes)applyMesh(mesh,this.profile);
  if(report.recognized===0)console.info(`[HF8 garment morph] ${label}: no compatible body-shape Morph Targets; shared skeleton remains active.`);
  else console.info(`[HF8 garment morph] ${label}: ${report.recognized}/${report.morphTargets} Morph Targets bound by name.`);
  return report;
 }
 unregisterGarment(root:T.Object3D){this.garments.delete(root);}
 apply(){if(!this.profile)return;for(const {meshes} of this.garments.values())for(const mesh of meshes)applyMesh(mesh,this.profile);}
 private coverageFor(label:string,meshes:T.Mesh[]):GarmentMorphCoverage{let morphTargets=0,recognized=0;const unknown=new Set<string>();for(const mesh of meshes){const dict=mesh.morphTargetDictionary??{};morphTargets+=Object.keys(dict).length;for(const name of Object.keys(dict)){if(garmentMorphBinding(name)||normalizeName(name)===normalizeName(HF8_CLEARANCE_MORPH))recognized++;else unknown.add(name);}}return {label,meshes:meshes.length,morphTargets,recognized,unrecognized:[...unknown].sort()};}
 getCoverage(){let garmentMeshes=0,garmentTargets=0,garmentRecognized=0;for(const {label,meshes} of this.garments.values()){const c=this.coverageFor(label,meshes);garmentMeshes+=c.meshes;garmentTargets+=c.morphTargets;garmentRecognized+=c.recognized;}return {bodyMorphMeshes:this.bodyMeshes.length,garments:this.garments.size,garmentMeshes,garmentTargets,garmentRecognized};}
 dispose(){this.garments.clear();this.bodyMeshes.length=0;this.profile=undefined;}
}
