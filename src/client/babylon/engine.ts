import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';

export type BabylonBackend='webgpu'|'webgl2';

export interface BabylonEngineResult{
  engine:AbstractEngine;
  backend:BabylonBackend;
  fallbackReason?:string;
}

export async function createQinglanBabylonEngine(canvas:HTMLCanvasElement):Promise<BabylonEngineResult>{
  const preferWebGPU=new URLSearchParams(location.search).get('webgpu')!=='0';
  if(preferWebGPU){
    try{
      if(await WebGPUEngine.IsSupportedAsync){
        const engine=new WebGPUEngine(canvas,{antialias:true,adaptToDeviceRatio:true});
        await engine.initAsync();
        return {engine,backend:'webgpu'};
      }
    }catch(error){
      const fallbackReason=error instanceof Error?error.message:String(error);
      const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,premultipliedAlpha:false,powerPreference:'high-performance'},true);
      return {engine,backend:'webgl2',fallbackReason};
    }
  }
  const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,premultipliedAlpha:false,powerPreference:'high-performance'},true);
  return {engine,backend:'webgl2',fallbackReason:preferWebGPU?'WebGPU unavailable':'WebGPU disabled by query'};
}
