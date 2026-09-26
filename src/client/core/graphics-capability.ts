import { GRAPHICS_PRESETS,type DetailQuality,type GraphicsPreset,type GraphicsSettings,type PostProcessingQuality,type RenderScale,type ShadowQuality,type VegetationQuality,type VfxQuality,type ViewDistance } from './graphics-settings';

export type FixedGraphicsPreset=Exclude<GraphicsPreset,'custom'>;
export const GRAPHICS_PRESET_ORDER:readonly FixedGraphicsPreset[]=['verylow','low','balanced','high'];

export interface GraphicsHardwareInput {
 memoryGB:number;
 cores:number;
 dpr:number;
 width:number;
 height:number;
 mobile:boolean;
 gpuRenderer:string;
 maxTextureSize:number;
 maxRenderbufferSize:number;
 maxSamples:number;
}

export interface GraphicsHardwareCapability extends GraphicsHardwareInput {
 physicalPixels:number;
 softwareGpu:boolean;
 integratedGpu:boolean;
 oldIntegratedGpu:boolean;
 highPerformanceGpu:boolean;
 tier:'software'|'entry'|'mainstream'|'performance'|'cinematic';
 tierLabel:string;
 maxPreset:FixedGraphicsPreset;
 reasons:string[];
 score:number;
}

const SOFTWARE_GPU=/(swiftshader|llvmpipe|softpipe|software raster|software renderer|microsoft basic render|mesa offscreen|lavapipe)/i;
const OLD_INTEGRATED_GPU=/(intel.*(?:hd graphics\s*(?:[2345]\d{3}|[456]\d{2})|uhd graphics\s*(?:600|605|610|615|620|630))|radeon\s+(?:r[357]\b|vega\s*[38]\b)|mali[- ](?:t|4)|adreno\s*[3456]\d{2}\b)/i;
const INTEGRATED_GPU=/(intel.*(?:hd|uhd|iris)|\biris\b|radeon\s+graphics\b|\bvega\s*\d*\b|apple\s+(?:m\d|gpu)|\bmali\b|\badreno\b|powervr)/i;
const HIGH_PERFORMANCE_GPU=/(geforce\s+rtx\s*\d{4}|\brtx\s*\d{4}|geforce\s+gtx\s*(?:10[789]0|16\d{2})|radeon\s+rx\s*(?:5[7-9]\d{2}|6\d{3}|7\d{3}|9\d{3})|radeon\s+pro\s+(?:w|vii)|intel.*arc.*(?:a[5-9]\d{2}|b[5-9]\d{2}))/i;

const rank=(preset:FixedGraphicsPreset)=>GRAPHICS_PRESET_ORDER.indexOf(preset);
export function lowerPreset(a:FixedGraphicsPreset,b:FixedGraphicsPreset){return rank(a)<=rank(b)?a:b;}
export function presetAllowed(requested:FixedGraphicsPreset,maxPreset:FixedGraphicsPreset){return rank(requested)<=rank(maxPreset);}

export function classifyGraphicsHardware(input:GraphicsHardwareInput):GraphicsHardwareCapability{
 const gpuRenderer=input.gpuRenderer.trim()||'Unknown GPU';
 const physicalPixels=Math.max(1,Math.round(input.width*input.height*Math.max(1,input.dpr)*Math.max(1,input.dpr)));
 const softwareGpu=SOFTWARE_GPU.test(gpuRenderer);
 const oldIntegratedGpu=!softwareGpu&&OLD_INTEGRATED_GPU.test(gpuRenderer);
 const integratedGpu=!softwareGpu&&(oldIntegratedGpu||INTEGRATED_GPU.test(gpuRenderer));
 const highPerformanceGpu=!softwareGpu&&!integratedGpu&&HIGH_PERFORMANCE_GPU.test(gpuRenderer);
 let score=0;
 score+=input.memoryGB>=16?3:input.memoryGB>=8?2:input.memoryGB>=6?1:input.memoryGB<4?-2:0;
 score+=input.cores>=12?3:input.cores>=8?2:input.cores>=6?1:input.cores<4?-2:0;
 score+=input.maxTextureSize>=16384?2:input.maxTextureSize>=8192?1:input.maxTextureSize<4096?-4:-1;
 score+=input.maxRenderbufferSize>=16384?2:input.maxRenderbufferSize>=8192?1:input.maxRenderbufferSize<4096?-4:-1;
 score+=input.maxSamples>=8?2:input.maxSamples>=4?1:input.maxSamples>0?0:-1;
 score+=highPerformanceGpu?7:integratedGpu?-1:0;
 if(oldIntegratedGpu)score-=3;
 if(physicalPixels>12_000_000)score-=4;else if(physicalPixels>8_500_000)score-=2;else if(physicalPixels>5_500_000)score-=1;

 const reasons:string[]=[];
 let maxPreset:FixedGraphicsPreset='balanced';
 if(softwareGpu){maxPreset='verylow';reasons.push('偵測到軟體 GPU / CPU rasterizer');}
 else if(input.maxTextureSize<4096||input.maxRenderbufferSize<4096){maxPreset='verylow';reasons.push('Render Target / Texture 上限低於 4096');}
 else if(oldIntegratedGpu){maxPreset='low';reasons.push('偵測到舊型整合顯示核心');}
 else if(input.memoryGB<4||input.cores<4){maxPreset='low';reasons.push('CPU / RAM 餘裕不足');}
 else if(integratedGpu){maxPreset=(score<=1||physicalPixels>6_500_000)?'low':'balanced';reasons.push('整合型 GPU 不開放電影級');}
 else if(highPerformanceGpu&&input.memoryGB>=8&&input.cores>=6&&input.maxTextureSize>=8192&&input.maxRenderbufferSize>=8192&&input.maxSamples>=4&&physicalPixels<=10_000_000&&score>=10){maxPreset='high';reasons.push('高效能獨立 GPU 與 Render Target 能力具電影級餘裕');}
 else {maxPreset=score<=2?'low':'balanced';reasons.push(highPerformanceGpu?'整體硬體／解析度餘裕不足以安全開放電影級':'GPU 型號未確認為高效能獨立顯示核心');}

 if(input.maxTextureSize<8192||input.maxRenderbufferSize<8192||input.maxSamples<4){
  const capped=lowerPreset(maxPreset,'balanced');
  if(capped!==maxPreset||maxPreset==='balanced')reasons.push('MSAA / Render Target 能力限制最高畫質');
  maxPreset=capped;
 }
 if(physicalPixels>12_000_000){maxPreset=lowerPreset(maxPreset,'low');reasons.push('螢幕實體像素負載過高');}
 else if(physicalPixels>8_500_000){maxPreset=lowerPreset(maxPreset,'balanced');reasons.push('高解析度螢幕限制電影級後處理');}
 if(input.mobile){maxPreset=lowerPreset(maxPreset,'balanced');reasons.push('行動裝置最高限制為平衡美術');}

 const tier:GraphicsHardwareCapability['tier']=softwareGpu?'software':maxPreset==='verylow'?'entry':maxPreset==='low'?'entry':maxPreset==='high'?'cinematic':highPerformanceGpu?'performance':'mainstream';
 const tierLabel=tier==='software'?'軟體繪圖安全級':tier==='entry'?'入門效能級':tier==='mainstream'?'主流平衡級':tier==='performance'?'高效能受限級':'電影級硬體';
 return {...input,gpuRenderer,physicalPixels,softwareGpu,integratedGpu,oldIntegratedGpu,highPerformanceGpu,tier,tierLabel,maxPreset,reasons:[...new Set(reasons)],score};
}

const detailRank:Record<DetailQuality,number>={low:0,balanced:1,high:2};
const shadowRank:Record<ShadowQuality,number>={low:0,medium:1,high:2};
const vegetationRank:Record<VegetationQuality,number>={off:0,low:1,full:2};
const vfxRank:Record<VfxQuality,number>={off:0,reduced:1,full:2};
const postRank:Record<PostProcessingQuality,number>={off:0,light:1,cinematic:2};
const viewRank:Record<ViewDistance,number>={near:0,balanced:1,far:2};
const minimapRank:Record<GraphicsSettings['minimapFps'],number>={2:0,5:1,10:2};
const clampEnum=<T extends string|number>(value:T,cap:T,ranks:Record<T,number>)=>ranks[value]<=ranks[cap]?value:cap;

/** Enforces the same hardware/runtime ceiling for presets, custom settings and stale localStorage. */
export function clampGraphicsSettingsToCap(settings:GraphicsSettings,maxPreset:FixedGraphicsPreset):GraphicsSettings{
 if(settings.preset!=='custom'&&!presetAllowed(settings.preset,maxPreset))return {...GRAPHICS_PRESETS[maxPreset]};
 const cap=GRAPHICS_PRESETS[maxPreset];
 const pixelRatio=Math.min(settings.pixelRatio,cap.pixelRatio) as RenderScale;
 const shadows=settings.shadows&&cap.shadows;
 return {
  ...settings,
  pixelRatio,
  shadows,
  shadowQuality:clampEnum(settings.shadowQuality,cap.shadowQuality,shadowRank),
  characterShadows:shadows&&settings.characterShadows&&cap.characterShadows,
  monsterShadows:shadows&&settings.monsterShadows&&cap.monsterShadows,
  modelDetail:clampEnum(settings.modelDetail,cap.modelDetail,detailRank),
  animationDetail:clampEnum(settings.animationDetail,cap.animationDetail,detailRank),
  vegetation:clampEnum(settings.vegetation,cap.vegetation,vegetationRank),
  vfx:clampEnum(settings.vfx,cap.vfx,vfxRank),
  postProcessing:clampEnum(settings.postProcessing,cap.postProcessing,postRank),
  previews:settings.previews&&cap.previews,
  minimapFps:clampEnum(settings.minimapFps,cap.minimapFps,minimapRank),
  viewDistance:clampEnum(settings.viewDistance,cap.viewDistance,viewRank)
 };
}

export function effectiveGraphicsTier(settings:GraphicsSettings):FixedGraphicsPreset{
 if(settings.preset!=='custom')return settings.preset;
 if(settings.postProcessing==='cinematic'||settings.pixelRatio>=1.25||settings.shadowQuality==='high'||settings.viewDistance==='far')return 'high';
 if(settings.pixelRatio>=1||settings.modelDetail==='balanced'||settings.animationDetail==='balanced'||settings.postProcessing==='light'||settings.vegetation==='full'||settings.vfx==='full')return 'balanced';
 if(settings.pixelRatio>=.85||settings.vegetation==='low'||settings.vfx==='reduced')return 'low';
 return 'verylow';
}

export const graphicsPresetLabel=(preset:FixedGraphicsPreset)=>preset==='verylow'?'極低 · 舊內顯':preset==='low'?'效能優先':preset==='balanced'?'平衡美術':'電影級';
