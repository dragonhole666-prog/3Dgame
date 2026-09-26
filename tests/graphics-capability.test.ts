import { describe,expect,it } from 'vitest';
import { classifyGraphicsHardware,clampGraphicsSettingsToCap } from '../src/client/core/graphics-capability';
import { GRAPHICS_PRESETS } from '../src/client/core/graphics-settings';

const base={memoryGB:16,cores:12,dpr:1,width:1920,height:1080,mobile:false,maxTextureSize:16384,maxRenderbufferSize:16384,maxSamples:8};

describe('hardware graphics capability',()=>{
 it('only opens cinematic on a recognized high-performance GPU with headroom',()=>{
  const high=classifyGraphicsHardware({...base,gpuRenderer:'ANGLE (NVIDIA GeForce RTX 4070 Direct3D11)'});
  const unknown=classifyGraphicsHardware({...base,gpuRenderer:'ANGLE Generic Renderer'});
  expect(high.maxPreset).toBe('high');
  expect(unknown.maxPreset).toBe('balanced');
 });
 it('caps integrated, old integrated, software GPU and mobile hardware conservatively',()=>{
  expect(classifyGraphicsHardware({...base,gpuRenderer:'Intel(R) Iris(R) Xe Graphics'}).maxPreset).toBe('balanced');
  expect(classifyGraphicsHardware({...base,gpuRenderer:'Intel(R) UHD Graphics 620'}).maxPreset).toBe('low');
  expect(classifyGraphicsHardware({...base,gpuRenderer:'Google SwiftShader'}).maxPreset).toBe('verylow');
  expect(classifyGraphicsHardware({...base,gpuRenderer:'NVIDIA GeForce RTX 4090',mobile:true}).maxPreset).toBe('balanced');
 });
 it('caps insufficient render targets and extreme pixel load',()=>{
  expect(classifyGraphicsHardware({...base,gpuRenderer:'NVIDIA GeForce RTX 4070',maxRenderbufferSize:2048}).maxPreset).toBe('verylow');
  expect(classifyGraphicsHardware({...base,gpuRenderer:'NVIDIA GeForce RTX 4070',width:5120,height:2880,dpr:1}).maxPreset).toBe('low');
 });
 it('clamps every expensive custom field to the runtime ceiling',()=>{
  const custom={...GRAPHICS_PRESETS.high,preset:'custom' as const,pixelRatio:1.5 as const};
  const clamped=clampGraphicsSettingsToCap(custom,'low');
  expect(clamped.pixelRatio).toBe(.85);
  expect(clamped.shadows).toBe(false);
  expect(clamped.modelDetail).toBe('low');
  expect(clamped.animationDetail).toBe('low');
  expect(clamped.vegetation).toBe('low');
  expect(clamped.vfx).toBe('reduced');
  expect(clamped.postProcessing).toBe('off');
  expect(clamped.previews).toBe(false);
  expect(clamped.viewDistance).toBe('near');
 });
 it('downgrades a stale preset that exceeds the allowed maximum',()=>{
  expect(clampGraphicsSettingsToCap({...GRAPHICS_PRESETS.high},'balanced').preset).toBe('balanced');
 });
});
