import { Engine, WebGPUEngine } from '@babylonjs/core';

export type QinglanBackend='webgpu'|'webgl2';

export interface QinglanEngineResult {
  engine: Engine | WebGPUEngine;
  backend: QinglanBackend;
}

export async function createQinglanEngine(canvas:HTMLCanvasElement):Promise<QinglanEngineResult>{
  const nav=navigator as Navigator & { gpu?: unknown };

  if(window.isSecureContext && nav.gpu){
    try{
      const engine=new WebGPUEngine(canvas,{
        antialias:true,
        adaptToDeviceRatio:true,
        enableAllFeatures:false
      });
      await engine.initAsync();
      return {engine,backend:'webgpu'};
    }catch(error){
      console.warn('[P0] WebGPU init failed, falling back to WebGL2',error);
    }
  }

  const engine=new Engine(canvas,true,{
    preserveDrawingBuffer:true,
    stencil:true,
    premultipliedAlpha:false,
    powerPreference:'high-performance'
  },true);
  return {engine,backend:'webgl2'};
}
