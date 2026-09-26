export interface Hf27VisualProfile {
  version: 1;
  name: string;
  environment: {background:string;fogColor:string;fogDensity:number;environmentIntensity:number;exposure:number};
  lighting: {
    sunColor:string;sunIntensity:number;hemisphereSky:string;hemisphereGround:string;hemisphereIntensity:number;
    coolFillColor:string;coolFillIntensity:number;warmRimColor:string;warmRimIntensity:number;bounceColor:string;bounceIntensity:number;
  };
  post: {
    bloomStrength:number;bloomRadius:number;bloomThreshold:number;gradeStrength:number;sharpen:number;grain:number;vignette:number;
    density:number;chroma:number;coral:number;teal:number;greenSuppress:number;
  };
}

export const HF27_VISUAL_PROFILE_STORAGE_KEY='qinglan.hf27.visual-profile.v1';

export const HF27_DEFAULT_VISUAL_PROFILE:Hf27VisualProfile={
  version:1,name:'HF27 Reference Match',
  environment:{background:'#CFE6F1',fogColor:'#92B5C5',fogDensity:.00135,environmentIntensity:1.08,exposure:1.00},
  lighting:{
    sunColor:'#F5C7A1',sunIntensity:4.4,hemisphereSky:'#D3E7F1',hemisphereGround:'#32434D',hemisphereIntensity:.34,
    coolFillColor:'#7FA9C0',coolFillIntensity:.30,warmRimColor:'#D99678',warmRimIntensity:.38,bounceColor:'#D59A7D',bounceIntensity:.18,
  },
  post:{bloomStrength:.14,bloomRadius:.30,bloomThreshold:.89,gradeStrength:1.0,sharpen:.025,grain:.0018,vignette:.035,density:1.0,chroma:.94,coral:1.03,teal:1.04,greenSuppress:.58},
};

const finite=(value:unknown,fallback:number,min:number,max:number)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;

export function normalizeHf27VisualProfile(input:unknown):Hf27VisualProfile{
  const d=HF27_DEFAULT_VISUAL_PROFILE,p=(input&&typeof input==='object'?input:{} as any) as any,e=p.environment??{},l=p.lighting??{},post=p.post??{};
  return {
    version:1,name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,80):d.name,
    environment:{
      background:color(e.background,d.environment.background),fogColor:color(e.fogColor,d.environment.fogColor),
      fogDensity:finite(e.fogDensity,d.environment.fogDensity,0,.01),environmentIntensity:finite(e.environmentIntensity,d.environment.environmentIntensity,0,3),
      exposure:finite(e.exposure,d.environment.exposure,.45,2.2),
    },
    lighting:{
      sunColor:color(l.sunColor,d.lighting.sunColor),sunIntensity:finite(l.sunIntensity,d.lighting.sunIntensity,0,12),
      hemisphereSky:color(l.hemisphereSky,d.lighting.hemisphereSky),hemisphereGround:color(l.hemisphereGround,d.lighting.hemisphereGround),
      hemisphereIntensity:finite(l.hemisphereIntensity,d.lighting.hemisphereIntensity,0,3),
      coolFillColor:color(l.coolFillColor,d.lighting.coolFillColor),coolFillIntensity:finite(l.coolFillIntensity,d.lighting.coolFillIntensity,0,4),
      warmRimColor:color(l.warmRimColor,d.lighting.warmRimColor),warmRimIntensity:finite(l.warmRimIntensity,d.lighting.warmRimIntensity,0,4),
      bounceColor:color(l.bounceColor,d.lighting.bounceColor),bounceIntensity:finite(l.bounceIntensity,d.lighting.bounceIntensity,0,4),
    },
    post:{
      bloomStrength:finite(post.bloomStrength,d.post.bloomStrength,0,1.5),bloomRadius:finite(post.bloomRadius,d.post.bloomRadius,0,1),
      bloomThreshold:finite(post.bloomThreshold,d.post.bloomThreshold,0,1.5),gradeStrength:finite(post.gradeStrength,d.post.gradeStrength,0,1.5),
      sharpen:finite(post.sharpen,d.post.sharpen,0,.25),grain:finite(post.grain,d.post.grain,0,.03),vignette:finite(post.vignette,d.post.vignette,0,.8),
      density:finite(post.density,d.post.density,0,1.5),chroma:finite(post.chroma,d.post.chroma,0,1.5),coral:finite(post.coral,d.post.coral,0,1.5),
      teal:finite(post.teal,d.post.teal,0,1.5),greenSuppress:finite(post.greenSuppress,d.post.greenSuppress,0,1.5),
    },
  };
}

export function loadHf27VisualProfile():Hf27VisualProfile{
  if(typeof localStorage==='undefined')return structuredClone(HF27_DEFAULT_VISUAL_PROFILE);
  try{return normalizeHf27VisualProfile(JSON.parse(localStorage.getItem(HF27_VISUAL_PROFILE_STORAGE_KEY)??'null'));}catch{return structuredClone(HF27_DEFAULT_VISUAL_PROFILE);}
}
export function saveHf27VisualProfile(profile:Hf27VisualProfile){if(typeof localStorage!=='undefined')localStorage.setItem(HF27_VISUAL_PROFILE_STORAGE_KEY,JSON.stringify(normalizeHf27VisualProfile(profile)));}
export function resetHf27VisualProfile(){if(typeof localStorage!=='undefined')localStorage.removeItem(HF27_VISUAL_PROFILE_STORAGE_KEY);return structuredClone(HF27_DEFAULT_VISUAL_PROFILE);}
export function serializeHf27VisualProfile(profile:Hf27VisualProfile){return JSON.stringify(normalizeHf27VisualProfile(profile),null,2);}
