import { Engine, WebGPUEngine } from '@babylonjs/core';

export type QinglanBackend='webgpu'|'webgl2';

export interface QinglanEngineResult {
  engine:Engine|WebGPUEngine;
  backend:QinglanBackend;
}

/**
 * Babylon-only engine bootstrap.
 *
 * WebGPU and WebGL2 are both Babylon.js backends. This function contains no
 * Three.js renderer, adapter, bridge, compatibility layer or legacy fallback.
 */
export async function createQinglanEngine(canvas:HTMLCanvasElement):Promise<QinglanEngineResult>{
  const nav=navigator as Navigator&{gpu?:unknown};
  const params=new URLSearchParams(location.search);
  const deterministicCapture=params.has('visualCapture');
  const forceWebGL2=params.get('renderer')==='webgl2'||deterministicCapture;

  if(!forceWebGL2&&window.isSecureContext&&nav.gpu){
    try{
      const engine=new WebGPUEngine(canvas,{
        antialias:true,
        adaptToDeviceRatio:true,
        enableAllFeatures:false
      });
      await engine.initAsync();
      return {engine,backend:'webgpu'};
    }catch(error){
      console.warn('[P0 Babylon] WebGPU unavailable; using Babylon WebGL2 backend.',error);
    }
  }

  const engine=new Engine(canvas,true,{
    preserveDrawingBuffer:deterministicCapture,
    stencil:true,
    premultipliedAlpha:false,
    powerPreference:'high-performance'
  },true);

  if(forceWebGL2){
    console.info('[P0 Babylon] Babylon WebGL2 backend selected for deterministic capture.');
  }

  return {engine,backend:'webgl2'};
}
