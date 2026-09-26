import type { Vec2 } from '../types';

export type HF265NatureAsset='common-tree-1'|'common-tree-3'|'twisted-tree-1'|'pine-2'|'rock-medium-1'|'rock-medium-3'|'bush-flowers'|'flower-3'|'grass-short';
export type HF265ColliderKind='tree'|'rock'|'pavilion'|'bridge-post'|'decor';

export interface HF265Placement{
 id:string;asset:HF265NatureAsset;x:number;z:number;rotationY:number;height:number;
 collision?:{kind:HF265ColliderKind;radius:number};
 tint?:'coral'|'peach'|'sage'|'cool'|'stone';
}

export interface HF265Collider{ id:string;kind:HF265ColliderKind;x:number;z:number;r:number; }

export const HF265_WORLD_HALF=246;
export const HF265_SPAWN={x:-34,z:48} as const;
export const HF265_POND={x:HF265_SPAWN.x,z:HF265_SPAWN.z-9.5,rx:12.4,rz:8.8} as const;

const S=HF265_SPAWN;
export const HF265_NATURE_PLACEMENTS:readonly HF265Placement[]=[
 {id:'maple-hero-a',asset:'common-tree-3',x:S.x+13.8,z:S.z-11.8,rotationY:.45,height:11.8,collision:{kind:'tree',radius:.8},tint:'coral'},
 {id:'maple-hero-b',asset:'twisted-tree-1',x:S.x-17.6,z:S.z-5.4,rotationY:-.72,height:10.8,collision:{kind:'tree',radius:.78},tint:'coral'},
 {id:'maple-hero-c',asset:'common-tree-1',x:S.x-22.8,z:S.z-17.1,rotationY:.92,height:9.8,collision:{kind:'tree',radius:.7},tint:'peach'},
 {id:'maple-hero-d',asset:'common-tree-3',x:S.x+22.3,z:S.z-18.4,rotationY:-.34,height:10.2,collision:{kind:'tree',radius:.74},tint:'coral'},
 {id:'maple-hero-e',asset:'twisted-tree-1',x:S.x+28.6,z:S.z-4.8,rotationY:1.28,height:8.9,collision:{kind:'tree',radius:.66},tint:'peach'},
 {id:'tree-west-a',asset:'common-tree-1',x:S.x-31.5,z:S.z-3.1,rotationY:.12,height:8.2,collision:{kind:'tree',radius:.62},tint:'sage'},
 {id:'tree-west-b',asset:'common-tree-3',x:S.x-34.2,z:S.z-18.8,rotationY:-.42,height:9.1,collision:{kind:'tree',radius:.68},tint:'coral'},
 {id:'tree-east-a',asset:'common-tree-1',x:S.x+35.2,z:S.z-8.2,rotationY:.72,height:8.6,collision:{kind:'tree',radius:.64},tint:'sage'},
 {id:'tree-east-b',asset:'common-tree-3',x:S.x+32.4,z:S.z-24.5,rotationY:-1.0,height:9.4,collision:{kind:'tree',radius:.68},tint:'peach'},
 {id:'pine-far-a',asset:'pine-2',x:S.x-41,z:S.z-42,rotationY:.2,height:11.4,collision:{kind:'tree',radius:.74},tint:'cool'},
 {id:'pine-far-b',asset:'pine-2',x:S.x+45,z:S.z-45,rotationY:-.6,height:12.0,collision:{kind:'tree',radius:.78},tint:'cool'},
 {id:'pine-far-c',asset:'pine-2',x:S.x+9,z:S.z-61,rotationY:1.1,height:10.8,collision:{kind:'tree',radius:.7},tint:'cool'},
 {id:'rock-bank-a',asset:'rock-medium-1',x:S.x-13.6,z:S.z-3.0,rotationY:.2,height:2.1,collision:{kind:'rock',radius:1.05},tint:'stone'},
 {id:'rock-bank-b',asset:'rock-medium-3',x:S.x-7.1,z:S.z-4.1,rotationY:-.5,height:1.55,collision:{kind:'rock',radius:.8},tint:'stone'},
 {id:'rock-bank-c',asset:'rock-medium-1',x:S.x+17.4,z:S.z-7.1,rotationY:.68,height:2.0,collision:{kind:'rock',radius:.95},tint:'stone'},
 {id:'rock-bank-d',asset:'rock-medium-3',x:S.x+13.9,z:S.z-17.6,rotationY:-.2,height:1.7,collision:{kind:'rock',radius:.82},tint:'stone'},
 {id:'bush-a',asset:'bush-flowers',x:S.x-9.5,z:S.z-15.2,rotationY:.4,height:1.05,tint:'peach'},
 {id:'bush-b',asset:'bush-flowers',x:S.x+8.4,z:S.z-17.9,rotationY:-.7,height:1.12,tint:'peach'},
 {id:'bush-c',asset:'bush-flowers',x:S.x+18.8,z:S.z-2.2,rotationY:.2,height:.98,tint:'sage'},
 {id:'bush-d',asset:'bush-flowers',x:S.x-21.0,z:S.z-1.0,rotationY:1.0,height:1.05,tint:'sage'},
 {id:'flower-a',asset:'flower-3',x:S.x-5.4,z:S.z-16.2,rotationY:.1,height:.55,tint:'peach'},
 {id:'flower-b',asset:'flower-3',x:S.x+4.7,z:S.z-18.0,rotationY:1.2,height:.58,tint:'peach'},
 {id:'flower-c',asset:'flower-3',x:S.x+20.2,z:S.z-12.0,rotationY:.4,height:.54,tint:'peach'},
 {id:'grass-a',asset:'grass-short',x:S.x-12.0,z:S.z+3.4,rotationY:0,height:.62,tint:'sage'},
 {id:'grass-b',asset:'grass-short',x:S.x+10.4,z:S.z+1.9,rotationY:.8,height:.58,tint:'sage'},
] as const;

const authored:HF265Collider[]=[
 {id:'pavilion-west',kind:'pavilion',x:S.x-18.2,z:S.z-15.0,r:3.1},
 {id:'pavilion-east',kind:'pavilion',x:S.x+19.0,z:S.z-5.0,r:2.7},
 {id:'bridge-post-nw',kind:'bridge-post',x:S.x-6.8,z:S.z-9.4,r:.55},
 {id:'bridge-post-ne',kind:'bridge-post',x:S.x+6.8,z:S.z-9.4,r:.55},
];
export const HF265_COLLIDERS:readonly HF265Collider[]=[
 ...HF265_NATURE_PLACEMENTS.filter(p=>p.collision).map(p=>({id:p.id,kind:p.collision!.kind,x:p.x,z:p.z,r:p.collision!.radius})),
 ...authored,
];

function smoothstep(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
export function hf265TerrainHeight(x:number,z:number){
 const d=Math.hypot(x-S.x,z-S.z);
 const broad=Math.sin(x*.024)*1.15+Math.cos(z*.021)*.95+Math.sin((x+z)*.014)*.72;
 const detail=Math.sin(x*.071+z*.037)*.28+Math.cos(z*.062-x*.019)*.22;
 const centerBlend=smoothstep(28,92,d);
 const edge=smoothstep(150,235,Math.hypot(x,z));
 const ridges=(Math.sin(x*.011+1.8)+Math.cos(z*.013-.6))*1.05*edge;
 return broad*(.18+.82*centerBlend)+detail*(.15+.85*centerBlend)+Math.max(0,ridges);
}

function inPond(p:Vec2,margin=.45){
 const nx=(p.x-HF265_POND.x)/(HF265_POND.rx+margin),nz=(p.z-HF265_POND.z)/(HF265_POND.rz+margin);
 if(nx*nx+nz*nz>=1)return false;
 // East-west arched stone bridge remains walkable.
 const bridge=Math.abs(p.z-HF265_POND.z)<1.18&&Math.abs(p.x-HF265_POND.x)<10.9;
 return !bridge;
}
export function hf265Walkable(p:Vec2,margin=.55){
 if(Math.abs(p.x)>=HF265_WORLD_HALF-margin||Math.abs(p.z)>=HF265_WORLD_HALF-margin)return false;
 if(inPond(p,margin))return false;
 for(const c of HF265_COLLIDERS){const rr=c.r+margin;if((p.x-c.x)*(p.x-c.x)+(p.z-c.z)*(p.z-c.z)<rr*rr)return false;}
 return true;
}
export function hf265AreaClear(minX:number,maxX:number,minZ:number,maxZ:number,margin=.55){
 const center={x:(minX+maxX)/2,z:(minZ+maxZ)/2};
 const samples=[{x:minX,z:minZ},{x:maxX,z:minZ},{x:minX,z:maxZ},{x:maxX,z:maxZ},center];
 if(!samples.every(p=>hf265Walkable(p,margin)))return false;
 for(const c of HF265_COLLIDERS){const x=Math.max(minX,Math.min(c.x,maxX)),z=Math.max(minZ,Math.min(c.z,maxZ)),rr=c.r+margin;if((x-c.x)*(x-c.x)+(z-c.z)*(z-c.z)<rr*rr)return false;}
 return true;
}
