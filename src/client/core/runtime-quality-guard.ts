import { presetAllowed,type FixedGraphicsPreset } from './graphics-capability';

export interface RuntimeQualityGuardResult { cap:FixedGraphicsPreset; threshold:number; reason:string; }

/** Pure sustained-FPS guard. Short spikes, boot loading and background tab throttling are ignored. */
export class RuntimeQualityGuard {
 private lowSeconds=0;
 reset(){this.lowSeconds=0;}
 update(dt:number,fps:number,tier:FixedGraphicsPreset,maxPreset:FixedGraphicsPreset,gameplaySeconds:number,visible:boolean):RuntimeQualityGuardResult|undefined{
  if(gameplaySeconds<15||!visible){this.lowSeconds=0;return undefined;}
  let threshold=0,cap:FixedGraphicsPreset|undefined;
  if(tier==='high'&&presetAllowed('high',maxPreset)){threshold=34;cap='balanced';}
  else if((tier==='balanced'||tier==='high')&&presetAllowed('balanced',maxPreset)){threshold=27;cap='low';}
  if(!cap||fps>=threshold){this.lowSeconds=0;return undefined;}
  this.lowSeconds+=Math.max(0,dt);
  if(this.lowSeconds<8)return undefined;
  this.lowSeconds=0;
  return {cap,threshold,reason:`持續低於 ${threshold} FPS`};
 }
 get sustainedLowSeconds(){return this.lowSeconds;}
}
