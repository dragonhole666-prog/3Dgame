import { describe,expect,it } from 'vitest';
import { createCinematicGradePass,configureCinematicGrade } from '../src/client/rendering/cinematic-rendering-pipeline';

describe('HF22 cinematic rendering pipeline',()=>{
 it('keeps the cinematic grade enabled for light/cinematic tiers',()=>{
  const pass=createCinematicGradePass();
  configureCinematicGrade(pass,'light',1280,720);
  expect(pass.enabled).toBe(true);
  expect(pass.uniforms.uStrength.value).toBeGreaterThan(.5);
  configureCinematicGrade(pass,'cinematic',1920,1080);
  expect(pass.uniforms.uStrength.value).toBe(1);
  expect(pass.uniforms.uSharpen.value).toBeGreaterThan(.05);
  expect(pass.uniforms.uSharpen.value).toBeLessThan(.15);
 });
 it('can be bypassed cleanly for the lowest tier',()=>{
  const pass=createCinematicGradePass();
  configureCinematicGrade(pass,'off',800,600);
  expect(pass.enabled).toBe(false);
 });
});
