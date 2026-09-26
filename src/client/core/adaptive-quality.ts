import type { GraphicsPreset } from './graphics-settings';

const ORDER:Exclude<GraphicsPreset,'custom'>[]=['verylow','low','balanced','high'];
export class AdaptiveQualityController {
 private slow=0; private fast=0; private cooldown=20; private sample=0; private avg=60;
 update(dt:number,fps:number,preset:GraphicsPreset){
  if(preset==='custom')return undefined;
  this.sample+=dt;this.avg=this.avg*.94+fps*.06;this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.sample<1)return undefined;this.sample=0;
  const target=preset==='verylow'||preset==='low'?30:55;
  if(this.avg<target-9){this.slow+=1;this.fast=0;}else if(this.avg>target+7){this.fast+=1;this.slow=Math.max(0,this.slow-1);}else{this.slow=Math.max(0,this.slow-.75);this.fast=Math.max(0,this.fast-.5);}
  if(this.cooldown>0)return undefined;
  const i=ORDER.indexOf(preset as Exclude<GraphicsPreset,'custom'>);
  // Whole-preset changes are intentionally rare. Dynamic resolution handles short frame-time spikes first.
  if(this.slow>=18&&i>0){this.slow=0;this.fast=0;this.cooldown=35;return {preset:ORDER[i-1],reason:`sustained ${Math.round(this.avg)} FPS`};}
  if(this.fast>=60&&i>=0&&i<ORDER.length-1){this.slow=0;this.fast=0;this.cooldown=75;return {preset:ORDER[i+1],reason:`stable ${Math.round(this.avg)} FPS`};}
  return undefined;
 }
 get averageFps(){return Math.round(this.avg);}
}
