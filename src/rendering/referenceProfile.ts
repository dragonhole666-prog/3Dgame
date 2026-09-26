import { Color3 } from '@babylonjs/core';

export interface ReferenceLookProfile {
  version:2;
  name:string;
  environment:{
    clearColor:string;
    fogColor:string;
    fogStart:number;
    fogEnd:number;
    exposure:number;
    contrast:number;
    environmentIntensity:number;
  };
  lighting:{
    sunColor:string;
    sunIntensity:number;
    sunAzimuth:number;
    sunElevation:number;
    skyColor:string;
    groundColor:string;
    hemisphereIntensity:number;
    coolFillColor:string;
    coolFillIntensity:number;
    warmRimColor:string;
    warmRimIntensity:number;
  };
  foliage:{
    mapleShadow:string;
    mapleBase:string;
    mapleLit:string;
    mapleHighlight:string;
    grassShadow:string;
    grassBase:string;
    grassLit:string;
  };
  water:{
    deep:string;
    shallow:string;
    reflection:number;
    roughness:number;
    alpha:number;
    normalStrength:number;
  };
  architecture:{
    woodDeep:string;
    woodBase:string;
    woodLit:string;
    roofDeep:string;
    roofLit:string;
    stoneDeep:string;
    stoneLit:string;
  };
  post:{
    bloomWeight:number;
    bloomThreshold:number;
    bloomKernel:number;
    vignetteWeight:number;
    vignetteStretch:number;
    saturation:number;
    highlightsHue:number;
    highlightsDensity:number;
    highlightsSaturation:number;
    shadowsHue:number;
    shadowsDensity:number;
    shadowsSaturation:number;
    sharpenEdgeAmount:number;
    sharpenColorAmount:number;
  };
}

export const P0_REFERENCE_PROFILE:ReferenceLookProfile={
  version:2,
  name:'P0 Reference Match v2.3 · Airy Cinematic Garden',
  environment:{
    clearColor:'#B8DCE9',
    fogColor:'#A5C6CF',
    fogStart:25,
    fogEnd:84,
    exposure:0.96,
    contrast:1.22,
    environmentIntensity:0.88
  },
  lighting:{
    sunColor:'#F7D7C0',
    sunIntensity:2.55,
    sunAzimuth:34,
    sunElevation:45,
    skyColor:'#C7E0E8',
    groundColor:'#31484C',
    hemisphereIntensity:0.43,
    coolFillColor:'#6F98A8',
    coolFillIntensity:0.22,
    warmRimColor:'#E7A487',
    warmRimIntensity:0.16
  },
  foliage:{
    mapleShadow:'#672B2A',
    mapleBase:'#A94C3F',
    mapleLit:'#D8795D',
    mapleHighlight:'#F2B495',
    grassShadow:'#30443A',
    grassBase:'#526A50',
    grassLit:'#7F9270'
  },
  water:{
    deep:'#153F55',
    shallow:'#3C7892',
    reflection:0.67,
    roughness:0.21,
    alpha:0.84,
    normalStrength:0.18
  },
  architecture:{
    woodDeep:'#3B2720',
    woodBase:'#79503A',
    woodLit:'#AE7655',
    roofDeep:'#354952',
    roofLit:'#667D87',
    stoneDeep:'#666B68',
    stoneLit:'#B9B3A7'
  },
  post:{
    bloomWeight:0.048,
    bloomThreshold:0.93,
    bloomKernel:32,
    vignetteWeight:0.34,
    vignetteStretch:0.14,
    saturation:9,
    highlightsHue:24,
    highlightsDensity:6,
    highlightsSaturation:6,
    shadowsHue:202,
    shadowsDensity:5,
    shadowsSaturation:6,
    sharpenEdgeAmount:0.10,
    sharpenColorAmount:0.84
  }
};

export const color3=(hex:string)=>Color3.FromHexString(hex);

export function cloneReferenceProfile(profile:ReferenceLookProfile=P0_REFERENCE_PROFILE):ReferenceLookProfile{
  return JSON.parse(JSON.stringify(profile)) as ReferenceLookProfile;
}

export function coerceReferenceProfile(raw:unknown):ReferenceLookProfile{
  const base=cloneReferenceProfile();
  if(!raw || typeof raw!=='object') return base;
  const incoming=raw as Partial<ReferenceLookProfile>;
  return {
    ...base,
    ...incoming,
    version:2,
    environment:{...base.environment,...(incoming.environment??{})},
    lighting:{...base.lighting,...(incoming.lighting??{})},
    foliage:{...base.foliage,...(incoming.foliage??{})},
    water:{...base.water,...(incoming.water??{})},
    architecture:{...base.architecture,...(incoming.architecture??{})},
    post:{...base.post,...(incoming.post??{})}
  };
}

