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
  name:'P0 Reference Match v2.6 · Warm Canopy Spatial Recovery',
  environment:{
    clearColor:'#A9D3E3',
    fogColor:'#91B4C2',
    fogStart:42,
    fogEnd:105,
    exposure:0.79,
    contrast:1.30,
    environmentIntensity:0.80
  },
  lighting:{
    sunColor:'#F5CDB6',
    sunIntensity:2.42,
    sunAzimuth:36,
    sunElevation:46,
    skyColor:'#B8D7E2',
    groundColor:'#24383D',
    hemisphereIntensity:0.31,
    coolFillColor:'#557A8C',
    coolFillIntensity:0.12,
    warmRimColor:'#E39B79',
    warmRimIntensity:0.24
  },
  foliage:{
    mapleShadow:'#6B2425',
    mapleBase:'#B74434',
    mapleLit:'#E76A49',
    mapleHighlight:'#F7B08A',
    grassShadow:'#203229',
    grassBase:'#3D573F',
    grassLit:'#71845B'
  },
  water:{
    deep:'#082A40',
    shallow:'#1C5873',
    reflection:0.47,
    roughness:0.29,
    alpha:0.88,
    normalStrength:0.23
  },
  architecture:{
    woodDeep:'#2E1A15',
    woodBase:'#70402F',
    woodLit:'#A96849',
    roofDeep:'#263942',
    roofLit:'#526A75',
    stoneDeep:'#515756',
    stoneLit:'#AAA79B'
  },
  post:{
    bloomWeight:0.055,
    bloomThreshold:0.92,
    bloomKernel:34,
    vignetteWeight:0.42,
    vignetteStretch:0.16,
    saturation:23,
    highlightsHue:28,
    highlightsDensity:10,
    highlightsSaturation:10,
    shadowsHue:205,
    shadowsDensity:8,
    shadowsSaturation:9,
    sharpenEdgeAmount:0.18,
    sharpenColorAmount:0.95
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

