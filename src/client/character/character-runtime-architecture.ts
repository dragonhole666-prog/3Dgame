import { PLAYER_AUTHORED_LOCOMOTION } from '../../shared/data/locomotion';
import { combatAnimationAssetOverride } from './weapon-animation-profiles';

export type HumanoidAnimationAssetKind='vrma'|'glb-mixamo';
export interface HumanoidAnimationAsset{
  kind:HumanoidAnimationAssetKind;
  url:string;
  externalAuthority?:boolean;
}

/**
 * P0.26 Character Architecture 2.0
 *
 * Authority split:
 * - VRM: avatar, humanoid skeleton, expressions and morphable body/face surface.
 * - GLB: equipment, weapons, world props and optional humanoid animation sources. Skinned garments rebind to the avatar Skeleton and may expose body-shape Morph Targets.
 * - VRMA: native VRM humanoid animation sources.
 * - TypeScript: composition, state machines, retargeting, body/garment morph-name synchronization and fallbacks.
 * - Server/shared data: authoritative gameplay timing/range/damage.
 *
 * New actions can switch from VRMA to Mixamo-compatible GLB by changing this manifest only.
 */
export const CHARACTER_RUNTIME_ARCHITECTURE={
  avatarAuthority:'vrm',
  equipmentAuthority:'glb',
  equipmentFallback:'procedural-placeholder',
  animationAuthority:'manifest',
  runtimeAuthority:'typescript',
  gameplayAuthority:'server',
} as const;

const DEFAULT_VRMA_BASE='/assets/animations/default';
const GLB_OVERRIDES:Readonly<Record<string,HumanoidAnimationAsset>>={
  Walk:{kind:'glb-mixamo',url:PLAYER_AUTHORED_LOCOMOTION.walk.asset,externalAuthority:true},
  Run:{kind:'glb-mixamo',url:PLAYER_AUTHORED_LOCOMOTION.run.asset,externalAuthority:true},
};

export function humanoidAnimationAsset(name:string):HumanoidAnimationAsset{
  return combatAnimationAssetOverride(name)??GLB_OVERRIDES[name]??{kind:'vrma',url:`${DEFAULT_VRMA_BASE}/${name}.vrma`};
}

export function usesExternalAnimationAuthority(name:string){return !!humanoidAnimationAsset(name).externalAuthority;}
