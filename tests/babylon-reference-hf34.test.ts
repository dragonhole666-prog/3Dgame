import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
import { XIANXIA_REFERENCE_20260926 as REF } from '../src/client/babylon/reference-style';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const main=read('src/main.ts');
const pipeline=read('src/client/babylon/rendering/reference-pipeline.ts');
const world=read('src/client/babylon/world/xianxia-world.ts');
const runtime=read('src/client/babylon/runtime.ts');

describe('HF34 Babylon reference rendering lock',()=>{
  it('keeps Babylon as the primary runtime and Three as explicit fallback only',()=>{
    expect(main).toMatch(/\?\?'babylon'/);
    expect(main).toMatch(/requested==='three'/);
    expect(main).toMatch(/client\/babylon\/runtime/);
  });

  it('locks the supplied xianxia reference palette and measured image targets',()=>{
    expect(REF.palette.lake).toBe('#3D7896');
    expect(REF.palette.mapleBright).toBe('#D97A5E');
    expect(REF.palette.skyLight).toBe('#D8EDF3');
    expect(REF.target.medianSaturation).toBeCloseTo(.4091,4);
    expect(REF.target.p90Value).toBeCloseTo(.9020,4);
  });

  it('uses ACES with selective grading and restrained bloom',()=>{
    expect(pipeline).toMatch(/TONEMAPPING_ACES/);
    expect(pipeline).toMatch(/globalSaturation=-3/);
    expect(pipeline).toMatch(/bloomWeight=REF\.render\.bloomWeight/);
    expect(pipeline).toMatch(/grainEnabled=false/);
  });

  it('uses Quaternius nature as the preferred Babylon hero-garden geometry',()=>{
    expect(world).toMatch(/SceneLoader\.ImportMeshAsync/);
    expect(world).toMatch(/QUATERNIUS_ROOT/);
    expect(world).toMatch(/natureMode:'quaternius'\|'procedural-fallback'/);
  });

  it('keeps water reflection, normal detail and atmospheric layers inside Babylon',()=>{
    expect(world).toMatch(/MirrorTexture/);
    expect(world).toMatch(/water_normal\.png/);
    expect(world).toMatch(/HF34_Karst_Horizon/);
    expect(world).toMatch(/HF34_LakeMist/);
    expect(runtime).toMatch(/await createBabylonXianxiaWorld/);
  });
});
