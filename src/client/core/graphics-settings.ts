export type GraphicsPreset='verylow'|'low'|'balanced'|'high'|'custom';
export type VegetationQuality='off'|'low'|'full';
export type VfxQuality='off'|'reduced'|'full';
export type ViewDistance='near'|'balanced'|'far';
export type DetailQuality='low'|'balanced'|'high';
export type ShadowQuality='low'|'medium'|'high';
export type PostProcessingQuality='off'|'light'|'cinematic';
export type RenderScale=.7|.85|1|1.25|1.5;

export interface GraphicsSettings {
  preset:GraphicsPreset;
  pixelRatio:RenderScale;
  shadows:boolean;
  shadowQuality:ShadowQuality;
  characterShadows:boolean;
  monsterShadows:boolean;
  modelDetail:DetailQuality;
  animationDetail:DetailQuality;
  vegetation:VegetationQuality;
  vfx:VfxQuality;
  postProcessing:PostProcessingQuality;
  worldLabels:boolean;
  previews:boolean;
  minimapFps:2|5|10;
  viewDistance:ViewDistance;
  dynamicResolution:boolean;
}

export const GRAPHICS_PRESETS:Record<Exclude<GraphicsPreset,'custom'>,GraphicsSettings>={
  verylow:{dynamicResolution:true,preset:'verylow',pixelRatio:.7,shadows:false,shadowQuality:'low',characterShadows:false,monsterShadows:false,modelDetail:'low',animationDetail:'low',vegetation:'off',vfx:'reduced',postProcessing:'off',worldLabels:true,previews:false,minimapFps:2,viewDistance:'near'},
  low:{dynamicResolution:true,preset:'low',pixelRatio:.85,shadows:false,shadowQuality:'low',characterShadows:false,monsterShadows:false,modelDetail:'low',animationDetail:'low',vegetation:'low',vfx:'reduced',postProcessing:'light',worldLabels:true,previews:false,minimapFps:2,viewDistance:'near'},
  balanced:{dynamicResolution:true,preset:'balanced',pixelRatio:1,shadows:true,shadowQuality:'medium',characterShadows:true,monsterShadows:true,modelDetail:'balanced',animationDetail:'balanced',vegetation:'full',vfx:'full',postProcessing:'cinematic',worldLabels:true,previews:true,minimapFps:5,viewDistance:'balanced'},
  high:{dynamicResolution:true,preset:'high',pixelRatio:1.25,shadows:true,shadowQuality:'high',characterShadows:true,monsterShadows:true,modelDetail:'high',animationDetail:'high',vegetation:'full',vfx:'full',postProcessing:'cinematic',worldLabels:true,previews:true,minimapFps:10,viewDistance:'far'}
};
const KEY='qinglan.graphics.v8';
const LEGACY_KEYS:string[]=[];
function firstRunPreset():GraphicsSettings{
  const nav=navigator as Navigator&{deviceMemory?:number};
  const memory=nav.deviceMemory??6,cores=nav.hardwareConcurrency??4,dpr=Math.min(devicePixelRatio||1,3);
  const pixels=Math.max(1,innerWidth*innerHeight*dpr*dpr);
  let preset:Exclude<GraphicsPreset,'custom'>='balanced';
  // HF25 resets the stale low-quality preference left by older builds. Dynamic
  // resolution handles ordinary desktop load; only clearly constrained devices
  // start in low, while very-low remains an emergency runtime tier.
  if(memory<4||cores<4||pixels>14_000_000)preset='low';
  // GPU capability is unavailable until WebGL exists. Bootstrap never grants cinematic.
  return {...GRAPHICS_PRESETS[preset]};
}
export function loadGraphicsSettings():GraphicsSettings{
  try{
    const raw=localStorage.getItem(KEY)??LEGACY_KEYS.map(k=>localStorage.getItem(k)).find(Boolean);
    if(raw){
      const parsed=JSON.parse(raw) as Partial<GraphicsSettings>;
      const base=parsed.preset&&parsed.preset!=='custom'&&parsed.preset in GRAPHICS_PRESETS?GRAPHICS_PRESETS[parsed.preset as Exclude<GraphicsPreset,'custom'>]:GRAPHICS_PRESETS.balanced;
      return {...base,...parsed,preset:parsed.preset??'custom'};
    }
  }catch{}
  return firstRunPreset();
}
export function saveGraphicsSettings(settings:GraphicsSettings){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}
