import { Color3 } from '@babylonjs/core';

export interface ReferenceLookProfile {
  version:1;
  name:string;
  environment:{clearColor:string;fogColor:string;fogDensity:number;exposure:number;contrast:number;environmentIntensity:number};
  lighting:{sunColor:string;sunIntensity:number;sunAzimuth:number;sunElevation:number;skyColor:string;groundColor:string;hemisphereIntensity:number;coolFillColor:string;coolFillIntensity:number;warmRimColor:string;warmRimIntensity:number};
  foliage:{mapleShadow:string;mapleBase:string;mapleLit:string;mapleHighlight:string;grassShadow:string;grassBase:string;grassLit:string};
  water:{deep:string;shallow:string;reflection:number;roughness:number;alpha:number};
  architecture:{woodDeep:string;woodBase:string;woodLit:string;roofDeep:string;roofLit:string;stoneDeep:string;stoneLit:string};
  post:{bloomWeight:number;bloomThreshold:number;bloomKernel:number;vignetteWeight:number};
}

export const P0_REFERENCE_PROFILE:ReferenceLookProfile={
  version:1,
  name:'P0 Reference Match · Xianxia Garden',
  environment:{
    clearColor:'#9CCFE3',
    fogColor:'#87AEBF',
    fogDensity:0.0027,
    exposure:0.83,
    contrast:1.38,
    environmentIntensity:0.64
  },
  lighting:{
    sunColor:'#F4BC91',
    sunIntensity:3.05,
    sunAzimuth:38,
    sunElevation:46,
    skyColor:'#B7D7E3',
    groundColor:'#1F313A',
    hemisphereIntensity:0.24,
    coolFillColor:'#6796AA',
    coolFillIntensity:0.18,
    warmRimColor:'#D3795B',
    warmRimIntensity:0.22
  },
  foliage:{
    mapleShadow:'#461A1C',
    mapleBase:'#842925',
    mapleLit:'#C94935',
    mapleHighlight:'#EA805B',
    grassShadow:'#273B31',
    grassBase:'#425D3C',
    grassLit:'#738455'
  },
  water:{
    deep:'#0C3049',
    shallow:'#1A617F',
    reflection:1.02,
    roughness:0.09,
    alpha:0.88
  },
  architecture:{
    woodDeep:'#2E1A15',
    woodBase:'#553025',
    woodLit:'#87573F',
    roofDeep:'#2F414B',
    roofLit:'#5E7783',
    stoneDeep:'#45535A',
    stoneLit:'#8C918B'
  },
  post:{
    bloomWeight:0.095,
    bloomThreshold:0.93,
    bloomKernel:40,
    vignetteWeight:1.06
  }
};

export const color3=(hex:string)=>Color3.FromHexString(hex);

export function cloneReferenceProfile(profile:ReferenceLookProfile=P0_REFERENCE_PROFILE):ReferenceLookProfile{
  return JSON.parse(JSON.stringify(profile)) as ReferenceLookProfile;
}
