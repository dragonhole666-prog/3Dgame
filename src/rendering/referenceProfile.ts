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
    clearColor:'#B7DDEB',
    fogColor:'#9FC2D1',
    fogDensity:0.0038,
    exposure:0.96,
    contrast:1.26,
    environmentIntensity:0.82
  },
  lighting:{
    sunColor:'#F8C6A0',
    sunIntensity:3.35,
    sunAzimuth:38,
    sunElevation:46,
    skyColor:'#CAE4EE',
    groundColor:'#263E49',
    hemisphereIntensity:0.38,
    coolFillColor:'#72A8BE',
    coolFillIntensity:0.27,
    warmRimColor:'#DC8968',
    warmRimIntensity:0.28
  },
  foliage:{
    mapleShadow:'#54251F',
    mapleBase:'#8F342B',
    mapleLit:'#CB5742',
    mapleHighlight:'#ED936E',
    grassShadow:'#2F4435',
    grassBase:'#536C47',
    grassLit:'#849360'
  },
  water:{
    deep:'#103E59',
    shallow:'#267590',
    reflection:0.92,
    roughness:0.11,
    alpha:0.91
  },
  architecture:{
    woodDeep:'#352018',
    woodBase:'#5D3629',
    woodLit:'#916047',
    roofDeep:'#344854',
    roofLit:'#68818D',
    stoneDeep:'#4B5A61',
    stoneLit:'#A8AAA3'
  },
  post:{
    bloomWeight:0.12,
    bloomThreshold:0.91,
    bloomKernel:44,
    vignetteWeight:1.08
  }
};

export const color3=(hex:string)=>Color3.FromHexString(hex);

export function cloneReferenceProfile(profile:ReferenceLookProfile=P0_REFERENCE_PROFILE):ReferenceLookProfile{
  return JSON.parse(JSON.stringify(profile)) as ReferenceLookProfile;
}
