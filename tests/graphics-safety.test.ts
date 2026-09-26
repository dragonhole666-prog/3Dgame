import { describe,expect,it } from 'vitest';
import { clampRenderScale,chooseRuntimePostProcessing } from '../src/client/core/graphics-safety';

describe('graphics safety',()=>{
 it('keeps a normal 1080p direct render at requested scale',()=>{
  expect(clampRenderScale({requested:1,width:1920,height:1080,maxDimension:8192,postProcessing:'off',mobile:false})).toBe(1);
 });
 it('caps 4K bloom to the post-processing pixel budget',()=>{
  const scale=clampRenderScale({requested:1.25,width:3840,height:2160,maxDimension:8192,postProcessing:'light',mobile:false});
  expect(scale).toBeLessThan(1);
  expect(3840*scale).toBeLessThanOrEqual(8192);
 });
 it('never lets a render target exceed the GPU dimension limit',()=>{
  const scale=clampRenderScale({requested:1.5,width:5120,height:1440,maxDimension:4096,postProcessing:'off',mobile:false});
  expect(5120*scale).toBeLessThanOrEqual(4096.001);
 });
 it('downgrades expensive post processing on mobile and very large desktop viewports',()=>{
  expect(chooseRuntimePostProcessing('cinematic',true,2400,1080,8192)).toBe('light');
  expect(chooseRuntimePostProcessing('cinematic',false,3840,2160,8192)).toBe('light');
 });
});
