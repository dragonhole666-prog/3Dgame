import * as T from 'three';
import { upgradeMaterialFromPolyHaven } from './external-art-assets';

/**
 * Qinglan commercial xianxia art direction.
 *
 * The palette is intentionally independent from the performance tier. Low-end
 * hardware loses expensive pixels, shadows and bloom first; it never falls
 * back to saturated RGB debug colors. This keeps the same art direction from
 * very-low through cinematic while allowing the renderer to scale cost.
 */
export const XIANXIA_GRADIENTS={
  // HF26.3: closer to the supplied 宣傳圖 — cooler blue-cyan atmosphere,
  // cleaner sage/olive ground, stronger coral-maple foliage, and warmer skin/cloth separation.
  sky:['#31586F','#5A8199','#81A7BE','#B4D2E3','#E3F0F6'] as const,
  haze:['#42687A','#6E92A7','#9AB6C7','#D8E5EC'] as const,
  water:['#153445','#224C64','#2F6887','#4B89A5','#7EB0C7','#B7D7E4'] as const,
  shadow:['#1B2531','#263542','#334551','#4A5C66'] as const,
  jade:['#506148','#657453','#788461','#8B9370','#A7AC89'] as const,
  maple:['#6A3026','#8E4233','#B95C44','#D97957','#E69B74','#F0C3A6'] as const,
  cherry:['#7A4046','#A35458','#C86E6B','#E19184','#F0B6A0'] as const,
  wood:['#3A241C','#55362A','#724837','#8B5B46','#A8755C'] as const,
  stone:['#49525A','#64707A','#838D92','#A7ADB0','#C9C7C0'] as const,
  antiqueGold:['#5C4826','#7B6133','#9C7A43','#C09A62','#DCC08A'] as const,
  highlight:['#A9C2D1','#D8E7F0','#F8F1E8'] as const,
  energy:['#214B63','#39708E','#5F96B2','#AFCFDE'] as const,
  cloth:['#4C6575','#688699','#89A7B4','#B8CBD3'] as const,
  skin:['#C69073','#D5A086','#E3BAA2','#F1D2C0'] as const,
} as const;

export type XianxiaSurfaceSemantic=
  |'terrain-ground'|'terrain-water'|'terrain-stone'|'foliage'|'wood'
  |'metal'|'cloth'|'skin'|'stone'|'generic';

const gradientCache=new Map<readonly string[],T.Color[]>();
function colors(stops:readonly string[]){
  let cached=gradientCache.get(stops);
  if(!cached){cached=stops.map(v=>new T.Color(v));gradientCache.set(stops,cached);}
  return cached;
}
export function sampleXianxiaGradient(stops:readonly string[],value:number,out=new T.Color()){
  const c=colors(stops),t=T.MathUtils.clamp(value,0,1)*(c.length-1),i=Math.min(c.length-2,Math.floor(t)),f=t-i;
  return out.copy(c[i]).lerp(c[i+1],f);
}

const fract=(v:number)=>v-Math.floor(v);
function hash2(x:number,z:number){return fract(Math.sin(x*127.1+z*311.7)*43758.5453123);}
function luminance(r:number,g:number,b:number){return r*.2126+g*.7152+b*.0722;}
function distanceSq(r:number,g:number,b:number,a:readonly [number,number,number]){const dr=r-a[0],dg=g-a[1],db=b-a[2];return dr*dr+dg*dg+db*db;}

const SOURCE_TERRAIN={
  darkGrass:[40/255,90/255,62/255] as const,
  lightGrass:[196/255,206/255,150/255] as const,
  water:[70/255,150/255,145/255] as const,
  stone:[126/255,122/255,117/255] as const,
  stoneLight:[146/255,144/255,142/255] as const,
  pale:[233/255,234/255,241/255] as const,
};
const SOURCE_FOREST={trunk:[92/255,62/255,42/255] as const,leaf:[36/255,82/255,56/255] as const};

function terrainClass(r:number,g:number,b:number){
  const rows:[number,readonly [number,number,number]][]=[
    [0,SOURCE_TERRAIN.darkGrass],[0,SOURCE_TERRAIN.lightGrass],[1,SOURCE_TERRAIN.water],
    [2,SOURCE_TERRAIN.stone],[2,SOURCE_TERRAIN.stoneLight],[2,SOURCE_TERRAIN.pale],
  ];
  let best=rows[0],bestD=Infinity;
  for(const row of rows){const d=distanceSq(r,g,b,row[1]);if(d<bestD){best=row;bestD=d;}}
  return best[0];
}
function forestIsLeaf(r:number,g:number,b:number){return distanceSq(r,g,b,SOURCE_FOREST.leaf)<=distanceSq(r,g,b,SOURCE_FOREST.trunk);}

const PROFILES:Record<XianxiaSurfaceSemantic,{metalness:number;roughness:number;envMapIntensity:number}>={
  'terrain-ground':{metalness:.0,roughness:.86,envMapIntensity:.48},
  'terrain-water':{metalness:.12,roughness:.12,envMapIntensity:1.85},
  'terrain-stone':{metalness:.02,roughness:.76,envMapIntensity:.58},
  foliage:{metalness:.0,roughness:.72,envMapIntensity:.46},
  wood:{metalness:.01,roughness:.78,envMapIntensity:.44},
  metal:{metalness:.72,roughness:.29,envMapIntensity:1.18},
  cloth:{metalness:.0,roughness:.76,envMapIntensity:.54},
  skin:{metalness:.0,roughness:.52,envMapIntensity:.66},
  stone:{metalness:.02,roughness:.72,envMapIntensity:.60},
  generic:{metalness:.06,roughness:.64,envMapIntensity:.68},
};


const worldTextureLoader=new T.TextureLoader();
function worldTexture(url:string,srgb=false){
  // Node/Vitest has no DOM. Avoid Three.js ImageLoader side effects during
  // module collection; browser runtime continues to load the real PBR asset.
  if(typeof document==='undefined'){
    const data=new Uint8Array(srgb?[128,128,128,255]:[128,128,255,255]);
    const t=new T.DataTexture(data,1,1,T.RGBAFormat,T.UnsignedByteType);
    t.wrapS=t.wrapT=T.RepeatWrapping;
    if(srgb)t.colorSpace=T.SRGBColorSpace;
    t.needsUpdate=true;
    t.name=`QL-TestFallback:${url}`;
    return t;
  }
  const t=worldTextureLoader.load(url);
  t.wrapS=t.wrapT=T.RepeatWrapping;
  t.anisotropy=8;
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  return t;
}
const WORLD_TEXTURES={
  grass:worldTexture('/assets/reference-20260925/grass_albedo.png',true),grassN:worldTexture('/assets/reference-20260925/grass_normal.png'),grassR:worldTexture('/assets/reference-20260925/grass_roughness.png'),
  stone:worldTexture('/assets/reference-20260925/stone_albedo.png',true),stoneN:worldTexture('/assets/reference-20260925/stone_normal.png'),stoneR:worldTexture('/assets/reference-20260925/stone_roughness.png'),
  wood:worldTexture('/assets/reference-20260925/wood_albedo.png',true),woodN:worldTexture('/assets/reference-20260925/wood_normal.png'),woodR:worldTexture('/assets/reference-20260925/wood_roughness.png'),
  waterN:worldTexture('/assets/reference-20260925/water_normal.png'),
};

function ensurePlanarUv(geometry:T.BufferGeometry,scale=.12){
  if(geometry.getAttribute('uv'))return;
  const position=geometry.getAttribute('position');if(!position)return;
  const uv=new Float32Array(position.count*2);
  for(let i=0;i<position.count;i++){uv[i*2]=position.getX(i)*scale;uv[i*2+1]=position.getZ(i)*scale;}
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
}

export function inferXianxiaSurfaceSemantic(name:string):XianxiaSurfaceSemantic{
  const n=name.toLowerCase();
  if(/water|lake|river|pond|pool|ocean|sea/.test(n))return 'terrain-water';
  if(/leaf|leaves|foliage|tree|grass|flower|plant|moss/.test(n))return 'foliage';
  if(/wood|trunk|branch|timber|bamboo/.test(n))return 'wood';
  if(/metal|steel|iron|gold|silver|bronze|blade|sword|spear|staff|shield|armor|armour|helm|crown|ring/.test(n))return 'metal';
  if(/stone|rock|cliff|wall|brick|tile|roof/.test(n))return 'stone';
  if(/cloth|fabric|robe|dress|shirt|pants|skirt|cape|sleeve|leather/.test(n))return 'cloth';
  if(/skin|face|body|hand|head/.test(n))return 'skin';
  return 'generic';
}

/**
 * Re-hues saturated procedural/debug-looking colors into a coherent xianxia
 * family while keeping the source value/contrast. This is recoloring, not a
 * global color-filter pass, so materials remain readable under ACES lighting.
 */
export function harmonizeXianxiaSurfaceColor(input:T.ColorRepresentation,out=new T.Color()){
  const source=new T.Color(input),hsl={h:0,s:0,l:0};source.getHSL(hsl);
  if(hsl.s<.10)return out.copy(source);
  let targetStops:readonly string[];
  const h=hsl.h;
  if(h<.05||h>.96)targetStops=XIANXIA_GRADIENTS.maple;
  else if(h<.12)targetStops=XIANXIA_GRADIENTS.antiqueGold;
  else if(h<.42)targetStops=XIANXIA_GRADIENTS.jade;
  else if(h<.74)targetStops=XIANXIA_GRADIENTS.cloth;
  else if(h<.90)targetStops=XIANXIA_GRADIENTS.cherry;
  else targetStops=XIANXIA_GRADIENTS.maple;
  const t=T.MathUtils.clamp(.12+hsl.l*.68,0,1);sampleXianxiaGradient(targetStops,t,out);
  const targetHsl={h:0,s:0,l:0};out.getHSL(targetHsl);
  // HF26.3: aggressively cap toy-like saturation and preserve value hierarchy.
  out.setHSL(targetHsl.h,T.MathUtils.clamp(targetHsl.s*.92,.18,.58),T.MathUtils.clamp(hsl.l*.40+targetHsl.l*.54,.12,.82));
  return out;
}

function stylizeSemanticColor(source:T.Color,semantic:XianxiaSurfaceSemantic,out=new T.Color()){
  const hsl={h:0,s:0,l:0};source.getHSL(hsl);
  if(semantic==='skin'){
    sampleXianxiaGradient(XIANXIA_GRADIENTS.skin,T.MathUtils.clamp(.16+hsl.l*.62,0,1),out);
    const dst={h:0,s:0,l:0};out.getHSL(dst);
    out.setHSL(dst.h,T.MathUtils.clamp(dst.s*.70,.18,.38),T.MathUtils.clamp(hsl.l*.42+dst.l*.52,.24,.82));
    return out;
  }
  if(semantic==='cloth'){
    const blueFamily=hsl.h>.46&&hsl.h<.74;
    sampleXianxiaGradient(blueFamily?XIANXIA_GRADIENTS.cloth:XIANXIA_GRADIENTS.maple,T.MathUtils.clamp(.14+hsl.l*.70,0,1),out);
    const dst={h:0,s:0,l:0};out.getHSL(dst);
    out.setHSL(dst.h,T.MathUtils.clamp(dst.s*.82,.16,.52),T.MathUtils.clamp(hsl.l*.38+dst.l*.58,.12,.80));
    return out;
  }
  if(semantic==='metal'){
    const warm=source.r>=source.b;
    sampleXianxiaGradient(warm?XIANXIA_GRADIENTS.antiqueGold:XIANXIA_GRADIENTS.stone,T.MathUtils.clamp(.18+hsl.l*.66,0,1),out);
    return out;
  }
  return harmonizeXianxiaSurfaceColor(source,out);
}

/** Convert a visible opaque/translucent mesh surface to MeshStandardMaterial. */
export function standardizeXianxiaMaterial(source:T.Material,semantic: XianxiaSurfaceSemantic=inferXianxiaSurfaceSemantic(source.name)){
  const s=source as T.Material&Record<string,any>,profile=PROFILES[semantic];
  const m=new T.MeshStandardMaterial();
  m.name=`QL-Standard:${source.name||semantic}`;
  if(s.color instanceof T.Color){const harmonized=stylizeSemanticColor(s.color,semantic);m.color.copy(s.color).lerp(harmonized,semantic==='generic'?.72:1);}else m.color.set(semantic==='skin'?'#E3BAA2':semantic==='cloth'?'#89A7B4':'#d7d4ca');
  if(s.map)m.map=s.map;
  if(s.alphaMap)m.alphaMap=s.alphaMap;
  if(s.aoMap)m.aoMap=s.aoMap;
  if(s.lightMap)m.lightMap=s.lightMap;
  if(s.emissiveMap)m.emissiveMap=s.emissiveMap;
  if(s.normalMap)m.normalMap=s.normalMap;
  if(s.bumpMap)m.bumpMap=s.bumpMap;
  if(s.displacementMap)m.displacementMap=s.displacementMap;
  if(s.roughnessMap)m.roughnessMap=s.roughnessMap;
  if(s.metalnessMap)m.metalnessMap=s.metalnessMap;
  if(s.normalScale instanceof T.Vector2)m.normalScale.copy(s.normalScale);
  if(typeof s.bumpScale==='number')m.bumpScale=s.bumpScale;
  if(typeof s.displacementScale==='number')m.displacementScale=s.displacementScale;
  if(typeof s.displacementBias==='number')m.displacementBias=s.displacementBias;
  if(typeof s.aoMapIntensity==='number')m.aoMapIntensity=s.aoMapIntensity;
  if(typeof s.lightMapIntensity==='number')m.lightMapIntensity=s.lightMapIntensity;
  if(s.emissive instanceof T.Color)m.emissive.copy(s.emissive);
  if(typeof s.emissiveIntensity==='number')m.emissiveIntensity=s.emissiveIntensity;
  m.metalness=semantic==='generic'&&typeof s.metalness==='number'?T.MathUtils.clamp(s.metalness,0,.78):profile.metalness;
  m.roughness=semantic==='generic'&&typeof s.roughness==='number'?T.MathUtils.clamp(s.roughness,.28,.88):profile.roughness;
  m.envMapIntensity=profile.envMapIntensity;
  if(semantic==='cloth'){m.roughness=.84;m.envMapIntensity=.46;}
  if(semantic==='skin'){m.roughness=.58;m.envMapIntensity=.52;m.emissive.copy(m.color).multiplyScalar(.012);m.emissiveIntensity=.22;}
  if(semantic==='metal'){m.envMapIntensity=Math.max(m.envMapIntensity,1.02);} 
  m.vertexColors=!!s.vertexColors;
  m.flatShading=!!s.flatShading;
  m.wireframe=!!s.wireframe;
  m.transparent=source.transparent;
  m.opacity=source.opacity;
  m.alphaTest=source.alphaTest;
  m.side=source.side;
  m.depthTest=source.depthTest;
  m.depthWrite=source.depthWrite;
  m.colorWrite=source.colorWrite;
  m.blending=source.blending;
  m.blendSrc=source.blendSrc;m.blendDst=source.blendDst;m.blendEquation=source.blendEquation;
  m.premultipliedAlpha=source.premultipliedAlpha;
  m.dithering=true;
  if(typeof s.fog==='boolean')m.fog=s.fog;
  m.toneMapped=source.toneMapped;
  m.visible=source.visible;
  m.userData={...source.userData,qinglanStandardized:true,qinglanSemantic:semantic};
  return m;
}

export function standardizeXianxiaMeshMaterials(mesh:T.Mesh,semantic?:XianxiaSurfaceSemantic){
  const convert=(m:T.Material)=>standardizeXianxiaMaterial(m,semantic??inferXianxiaSurfaceSemantic(`${mesh.name} ${m.name}`));
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
  return mesh;
}

function materialForWorld(semantic:XianxiaSurfaceSemantic){
  const profile=PROFILES[semantic];
  const m=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,metalness:profile.metalness,roughness:profile.roughness});
  m.name=`QL-World:${semantic}`;m.envMapIntensity=profile.envMapIntensity;m.dithering=true;
  if(semantic==='terrain-ground'){m.map=WORLD_TEXTURES.grass;m.normalMap=WORLD_TEXTURES.grassN;m.roughnessMap=WORLD_TEXTURES.grassR;m.normalScale.set(.34,.34);m.color.set('#A7AC89');m.envMapIntensity=.34;m.roughness=.92;upgradeMaterialFromPolyHaven(m,'grass',1,1);}
  else if(semantic==='terrain-stone'||semantic==='stone'){m.map=WORLD_TEXTURES.stone;m.normalMap=WORLD_TEXTURES.stoneN;m.roughnessMap=WORLD_TEXTURES.stoneR;m.normalScale.set(.42,.42);m.color.set('#C9C7C0');m.envMapIntensity=.48;m.roughness=.84;upgradeMaterialFromPolyHaven(m,'stone',1,1);}
  else if(semantic==='wood'){m.map=WORLD_TEXTURES.wood;m.normalMap=WORLD_TEXTURES.woodN;m.roughnessMap=WORLD_TEXTURES.woodR;m.normalScale.set(.32,.32);m.color.set('#A8755C');m.envMapIntensity=.38;m.roughness=.82;upgradeMaterialFromPolyHaven(m,'bark',1,1);}
  else if(semantic==='terrain-water'){m.normalMap=WORLD_TEXTURES.waterN;m.normalScale.set(.30,.30);m.color.set('#7EB0C7');m.emissive.set('#102C3C');m.emissiveIntensity=.028;m.envMapIntensity=2.35;m.roughness=.08;}
  return m;
}

function regroupTriangles(geometry:T.BufferGeometry,vertexClasses:Uint8Array,classCount:number){
  const position=geometry.getAttribute('position');if(!position)return;
  const oldIndex=geometry.getIndex();const source=oldIndex?Array.from(oldIndex.array as ArrayLike<number>):Array.from({length:position.count},(_,i)=>i);
  const buckets:number[][]=Array.from({length:classCount},()=>[]);
  for(let i=0;i+2<source.length;i+=3){
    const a=source[i],b=source[i+1],c=source[i+2],ca=vertexClasses[a]??0,cb=vertexClasses[b]??0,cc=vertexClasses[c]??0;
    const cls=ca===cb||ca===cc?ca:cb===cc?cb:ca;
    buckets[Math.min(classCount-1,cls)].push(a,b,c);
  }
  const merged:number[]=[];geometry.clearGroups();let start=0;
  for(let i=0;i<classCount;i++){const bucket=buckets[i];if(bucket.length){merged.push(...bucket);geometry.addGroup(start,bucket.length,i);start+=bucket.length;}}
  geometry.setIndex(merged);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
}

function styleTerrain(mesh:T.Mesh){
  const geometry=mesh.geometry=mesh.geometry.clone(),position=geometry.getAttribute('position'),sourceColor=geometry.getAttribute('color');ensurePlanarUv(geometry,.10);geometry.computeVertexNormals();
  if(!position||!sourceColor){mesh.material=materialForWorld('terrain-ground');return;}
  const count=position.count,classes=new Uint8Array(count),rgb=new Float32Array(count*3),out=new T.Color();
  let minY=Infinity,maxY=-Infinity;for(let i=0;i<count;i++){const y=position.getY(i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}const invH=1/Math.max(.001,maxY-minY);
  for(let i=0;i<count;i++){
    const r=sourceColor.getX(i),g=sourceColor.getY(i),b=sourceColor.getZ(i),cls=terrainClass(r,g,b),height=(position.getY(i)-minY)*invH,lum=luminance(r,g,b);
    classes[i]=cls;
    if(cls===1){sampleXianxiaGradient(XIANXIA_GRADIENTS.water,.18+lum*.62+height*.12,out);}
    else if(cls===2){sampleXianxiaGradient(XIANXIA_GRADIENTS.stone,.2+lum*.58+height*.18,out);}
    else {const coolLow=height<.12&&lum<.46;const stops=coolLow?XIANXIA_GRADIENTS.shadow:XIANXIA_GRADIENTS.jade;sampleXianxiaGradient(stops,.32+lum*.28+height*.34,out);if(!coolLow){out.lerp(new T.Color('#A7AC89'),.18+height*.10);}}
    rgb[i*3]=out.r;rgb[i*3+1]=out.g;rgb[i*3+2]=out.b;
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));regroupTriangles(geometry,classes,3);
  mesh.material=[materialForWorld('terrain-ground'),materialForWorld('terrain-water'),materialForWorld('terrain-stone')];
  mesh.receiveShadow=true;
}

function styleForest(mesh:T.Mesh){
  const geometry=mesh.geometry=mesh.geometry.clone(),position=geometry.getAttribute('position'),sourceColor=geometry.getAttribute('color');ensurePlanarUv(geometry,.18);geometry.computeVertexNormals();
  if(!position||!sourceColor){mesh.material=materialForWorld('foliage');return;}
  const count=position.count,classes=new Uint8Array(count),rgb=new Float32Array(count*3),out=new T.Color();
  let minY=Infinity,maxY=-Infinity;for(let i=0;i<count;i++){const y=position.getY(i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}const invH=1/Math.max(.001,maxY-minY);
  for(let i=0;i<count;i++){
    const r=sourceColor.getX(i),g=sourceColor.getY(i),b=sourceColor.getZ(i),leaf=forestIsLeaf(r,g,b),height=(position.getY(i)-minY)*invH;
    classes[i]=leaf?1:0;
    const gx=Math.floor(position.getX(i)/5.5),gz=Math.floor(position.getZ(i)/5.5),variant=hash2(gx,gz);
    if(leaf){
      // Most crowns use the maple/coral family from the reference image, with
      // a restrained cherry/jade minority to avoid a flat one-color forest.
      const stops=variant<.06?XIANXIA_GRADIENTS.jade:variant>.82?XIANXIA_GRADIENTS.cherry:variant>.58?XIANXIA_GRADIENTS.maple:XIANXIA_GRADIENTS.maple;
      sampleXianxiaGradient(stops,.38+variant*.30+height*.18,out);
      out.lerp(new T.Color('#F0C3A6'),Math.max(0,height-.52)*.18);
    }else sampleXianxiaGradient(XIANXIA_GRADIENTS.wood,.22+variant*.3+height*.28,out);
    rgb[i*3]=out.r;rgb[i*3+1]=out.g;rgb[i*3+2]=out.b;
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));regroupTriangles(geometry,classes,2);
  mesh.material=[materialForWorld('wood'),materialForWorld('foliage')];
  mesh.receiveShadow=true;
}

/** Applies semantic recoloring plus PBR material separation to the bundled world GLB. */
export function applyXianxiaWorldArtDirection(mesh:T.Mesh){
  const name=`${mesh.name} ${mesh.parent?.name??''}`.toLowerCase();
  if(name.includes('terrain'))styleTerrain(mesh);
  else if(name.includes('forest'))styleForest(mesh);
  else standardizeXianxiaMeshMaterials(mesh);
  return mesh;
}

/** Commercial palette sky that still uses MeshStandardMaterial. */
export function createXianxiaGradientSky(){
  const geometry=new T.SphereGeometry(900,32,16),position=geometry.getAttribute('position'),rgb=new Float32Array(position.count*3),out=new T.Color();
  for(let i=0;i<position.count;i++){
    const y=T.MathUtils.clamp(position.getY(i)/900,-1,1),t=y>=0?.28+y*.72:.28+y*.18;
    sampleXianxiaGradient(XIANXIA_GRADIENTS.sky,T.MathUtils.clamp(t,0,1),out);
    rgb[i*3]=out.r;rgb[i*3+1]=out.g;rgb[i*3+2]=out.b;
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.BackSide,roughness:1,metalness:0,depthWrite:false,fog:false});
  material.name='QL-Standard:GradientSky';material.envMapIntensity=0;material.emissive.set('#33586D');material.emissiveIntensity=.22;material.dithering=true;
  const sky=new T.Mesh(geometry,material);sky.name='Qinglan_Commercial_Gradient_Sky';sky.frustumCulled=false;return sky;
}
