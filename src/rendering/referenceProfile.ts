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
  name:'P0 Reference Match v2.2 · Coral/Water Balance',
  environment:{
    clearColor:'#A8D9EB',
    fogColor:'#8EB9C9',
    fogStart:32,
    fogEnd:95,
    exposure:0.90,
    contrast:1.34,
    environmentIntensity:0.78
  },
  lighting:{
    sunColor:'#F6CDB5',
    sunIntensity:3.20,
    sunAzimuth:38,
    sunElevation:48,
    skyColor:'#B8D9E7',
    groundColor:'#18313B',
    hemisphereIntensity:0.27,
    coolFillColor:'#557E92',
    coolFillIntensity:0.14,
    warmRimColor:'#E29B7A',
    warmRimIntensity:0.25
  },
  foliage:{
    mapleShadow:'#4A1416',
    mapleBase:'#A12B22',
    mapleLit:'#E55A3B',
    mapleHighlight:'#FFAD82',
    grassShadow:'#1F3329',
    grassBase:'#38523C',
    grassLit:'#6B8056'
  },
  water:{
    deep:'#061F35',
    shallow:'#0E405D',
    reflection:0.82,
    roughness:0.14,
    alpha:0.88,
    normalStrength:0.28
  },
  architecture:{
    woodDeep:'#2A1712',
    woodBase:'#653326',
    woodLit:'#A66A4A',
    roofDeep:'#253A44',
    roofLit:'#526B78',
    stoneDeep:'#50585A',
    stoneLit:'#AAA69A'
  },
  post:{
    bloomWeight:0.070,
    bloomThreshold:0.91,
    bloomKernel:36,
    vignetteWeight:0.55,
    vignetteStretch:0.18,
    saturation:18,
    highlightsHue:28,
    highlightsDensity:12,
    highlightsSaturation:10,
    shadowsHue:205,
    shadowsDensity:9,
    shadowsSaturation:10,
    sharpenEdgeAmount:0.16,
    sharpenColorAmount:0.92
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

