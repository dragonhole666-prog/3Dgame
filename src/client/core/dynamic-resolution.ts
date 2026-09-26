import type { GraphicsPreset } from './graphics-settings';

export class DynamicResolutionController {
 private enabled=true; private base=1; private current=1; private slow=0; private fast=0; private cooldown=0; private avgFps=60; private mobile=false;
 configure(enabled:boolean,base:number,preset:GraphicsPreset,mobile=false){this.enabled=enabled;this.base=base;this.current=base;this.slow=0;this.fast=0;this.cooldown=mobile?2.5:6;this.avgFps=60;this.preset=preset;this.mobile=mobile;return this.current;}
 private preset:GraphicsPreset='balanced';
 update(dt:number,fps:number){
  if(!this.enabled)return undefined;
  this.avgFps=this.avgFps*.94+fps*.06;this.cooldown=Math.max(0,this.cooldown-dt);
  const low=this.preset==='verylow'||this.preset==='low',target=low?29:this.mobile?50:54;
  if(this.avgFps<target-4){this.slow+=dt;this.fast=Math.max(0,this.fast-dt*1.5);}else if(this.avgFps>target+(low?8:6)){this.fast+=dt;this.slow=Math.max(0,this.slow-dt*2);}else{this.slow=Math.max(0,this.slow-dt*.8);this.fast=Math.max(0,this.fast-dt*.5);}
  if(this.cooldown>0)return undefined;
  const desktopMin=this.preset==='verylow'?.58:this.preset==='low'?.66:this.preset==='high'?.84:.74;
  const mobileMin=this.preset==='verylow'?.56:this.preset==='low'?.62:this.preset==='high'?.72:.66,min=this.mobile?mobileMin:desktopMin;
  const slowDelay=this.mobile?2.5:5,downStep=this.mobile?.04:.03,restoreDelay=this.mobile?20:16;
  if(this.slow>slowDelay&&this.current>min+.005){this.current=Math.max(min,Math.round((this.current-downStep)*100)/100);this.slow=0;this.cooldown=this.mobile?2.5:6;return this.current;}
  if(this.fast>restoreDelay&&this.current<this.base-.005){this.current=Math.min(this.base,Math.round((this.current+.02)*100)/100);this.fast=0;this.cooldown=this.mobile?7:10;return this.current;}
  return undefined;
 }
 get scale(){return this.current;}
}
