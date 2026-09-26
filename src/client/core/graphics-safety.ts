import type { PostProcessingQuality } from './graphics-settings';

export interface RenderSafetyInput {
 requested:number;
 width:number;
 height:number;
 maxDimension:number;
 postProcessing:PostProcessingQuality;
 mobile:boolean;
}

/**
 * Bounds full-screen render targets before they reach the GPU. Bloom/composer
 * uses several off-screen buffers, so its pixel budget is intentionally lower
 * than direct rendering. This protects integrated GPUs and ultra-wide/4K displays
 * from oversized framebuffer allocation and WebGL context loss.
 */
export function clampRenderScale(input:RenderSafetyInput){
 const width=Math.max(1,input.width),height=Math.max(1,input.height),requested=Math.max(.5,input.requested);
 const dimensionCap=Math.min(1,input.maxDimension/width,input.maxDimension/height);
 const pixelBudget=input.postProcessing==='cinematic'?(input.mobile?2_600_000:5_000_000):input.postProcessing==='light'?(input.mobile?3_400_000:6_000_000):(input.mobile?5_500_000:10_000_000);
 const pixelCap=Math.sqrt(pixelBudget/(width*height));
 return Math.max(.5,Math.min(requested,dimensionCap,pixelCap));
}

export function chooseRuntimePostProcessing(requested:PostProcessingQuality,mobile:boolean,width:number,height:number,maxDimension:number):PostProcessingQuality{
 let quality=requested;
 if(mobile&&quality==='cinematic')quality='light';
 else if(mobile&&quality==='light')quality='off';
 if(maxDimension<4096)return 'off';
 const pixels=Math.max(1,width*height);
 if(quality==='cinematic'&&pixels>7_000_000)quality='light';
 if(quality==='light'&&pixels>12_000_000)quality='off';
 return quality;
}
