export type Hf27RendererBackend='webgl2'|'webgpu-candidate';
export interface Hf27RendererCapability {backend:Hf27RendererBackend;webgpuAvailable:boolean;reason:string}

export function detectHf27RendererCapability():Hf27RendererCapability{
 const nav=navigator as Navigator&{gpu?:unknown};
 const secure=typeof isSecureContext==='boolean'?isSecureContext:true;
 if(secure&&nav.gpu)return {backend:'webgpu-candidate',webgpuAvailable:true,reason:'WebGPU API available; HF27 keeps WebGL2 active until the post stack is ported to TSL/PostProcessing.'};
 return {backend:'webgl2',webgpuAvailable:false,reason:secure?'WebGPU API unavailable in this browser/device.':'WebGPU requires a secure context.'};
}
