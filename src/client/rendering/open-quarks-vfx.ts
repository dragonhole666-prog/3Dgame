import * as T from 'three';

// Optional MIT-licensed VFX backend. It is intentionally loaded at runtime so an
// offline build never loses combat effects: VisualEffects keeps its bundled renderer.
const QUARKS_ESM='https://esm.sh/three.quarks@0.17.1?bundle';

type QuarksModule=Record<string,any>;
export class OpenQuarksVfx{
 private q?:QuarksModule;private batch:any;private ready=false;private failed=false;private enabled=false;private initStarted=false;private texture:T.Texture;
 constructor(private scene:T.Scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.95)');g.addColorStop(.55,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);this.texture=new T.CanvasTexture(canvas);
 }
 private async init(){
  if(this.initStarted||this.failed)return;this.initStarted=true;
  try{
   const q=await import(/* @vite-ignore */ QUARKS_ESM) as QuarksModule;if(!q.BatchedRenderer||!q.ParticleSystem)throw new Error('three.quarks API unavailable');
   this.q=q;this.batch=new q.BatchedRenderer();this.batch.name='OpenThreeQuarksBatch';this.scene.add(this.batch);this.batch.visible=this.enabled;this.ready=true;console.info('[OpenVFX] three.quarks 0.17.1 enhancement backend ready.');
  }catch(error){this.failed=true;console.warn('[OpenVFX] three.quarks unavailable; bundled particle renderer remains active.',error);}
 }
 setEnabled(enabled:boolean){this.enabled=enabled;if(this.batch)this.batch.visible=enabled;if(enabled&&!this.ready&&!this.failed)void this.init();}
 burst(x:number,y:number,z:number,color:string,count:number,strength:number){
  if(!this.enabled||!this.ready||this.failed||!this.q)return false;const q=this.q;
  try{
   const c=new T.Color(color),life=Math.max(.18,.28+strength*.08),system=new q.ParticleSystem({duration:.18,looping:false,startLife:new q.IntervalValue(life*.65,life*1.25),startSpeed:new q.IntervalValue(Math.max(.3,strength*.35),Math.max(.6,strength*1.05)),startSize:new q.IntervalValue(.05,.16+strength*.025),startColor:new q.ConstantColor(new T.Vector4(c.r,c.g,c.b,.95)),maxParticle:Math.min(96,Math.max(8,count)),emissionOverTime:new q.ConstantValue(Math.max(25,count/.16)),shape:new q.PointEmitter(),material:new T.MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),renderMode:q.RenderMode.BillBoard});
   system.emitter.position.set(x,y,z);this.scene.add(system.emitter);this.batch.addSystem(system);q.QuarksUtil?.setAutoDestroy?.(system.emitter,true);q.QuarksUtil?.play?.(system.emitter);return true;
  }catch(error){console.warn('[OpenVFX] burst failed; keeping bundled effect.',error);return false;}
 }
 update(dt:number){if(this.enabled&&this.ready&&this.batch)try{this.batch.update(dt);}catch(error){this.failed=true;console.warn('[OpenVFX] disabled after update error.',error);}}
 dispose(){try{this.batch?.removeFromParent?.();}catch{}this.texture.dispose();}
}
