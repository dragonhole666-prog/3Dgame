import { describe,expect,it } from 'vitest';
import { createCinematicGradePass,configureCinematicGrade } from '../src/client/rendering/cinematic-rendering-pipeline';

describe('HF23 reference-matched cinematic grade',()=>{
 it('uses dense reference-matched cinematic settings',()=>{
  const pass=createCinematicGradePass();
  configureCinematicGrade(pass,'cinematic',1920,1080);
  expect(pass.enabled).toBe(true);
  expect(pass.uniforms.uDensity.value).toBeGreaterThan(.9);
  expect(pass.uniforms.uChroma.value).toBeGreaterThan(.9);
  expect(pass.uniforms.uCoral.value).toBeGreaterThanOrEqual(.9);
  expect(pass.uniforms.uTeal.value).toBeGreaterThanOrEqual(.9);
 });
 it('keeps a reduced but coherent grade for the light tier',()=>{
  const pass=createCinematicGradePass();
  configureCinematicGrade(pass,'light',1280,720);
  expect(pass.enabled).toBe(true);
  expect(pass.uniforms.uDensity.value).toBeGreaterThan(.5);
  expect(pass.uniforms.uChroma.value).toBeGreaterThan(.3);
 });
});
