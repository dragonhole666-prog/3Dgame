import * as T from 'three';
import type { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { loadHf27VisualProfile,normalizeHf27VisualProfile,saveHf27VisualProfile,type Hf27VisualProfile } from './hf27-visual-profile';

type RuntimeGame={renderer:T.WebGLRenderer;scene:T.Scene;sun:T.DirectionalLight;bloomPass:UnrealBloomPass;cinematicGrade:ShaderPass};
const firstLight=<TLight extends T.Light>(scene:T.Scene,ctor:new(...args:any[])=>TLight)=>scene.children.find((child:T.Object3D)=>child instanceof ctor) as TLight|undefined;
const directionalBySide=(scene:T.Scene,sun:T.DirectionalLight|undefined,side:'front'|'back')=>scene.children.find((child:T.Object3D)=>child instanceof T.DirectionalLight&&child!==sun&&(side==='front'?child.position.z>=0:child.position.z<0)) as T.DirectionalLight|undefined;

export class Hf27LookDevController{
 private profile=loadHf27VisualProfile();private keepAlive?:number;
 constructor(private readonly game:unknown){this.apply(this.profile,false);}
 get value(){return structuredClone(this.profile);}
 apply(next:Hf27VisualProfile,persist=true){
  this.profile=normalizeHf27VisualProfile(next);const game=this.game as RuntimeGame;
  game.renderer.toneMappingExposure=this.profile.environment.exposure;game.scene.background=new T.Color(this.profile.environment.background);
  game.scene.fog=new T.FogExp2(this.profile.environment.fogColor,this.profile.environment.fogDensity);game.scene.environmentIntensity=this.profile.environment.environmentIntensity;
  if(game.sun){game.sun.color.set(this.profile.lighting.sunColor);game.sun.intensity=this.profile.lighting.sunIntensity;}
  const hemi=(game.scene.getObjectByName('HF27_Hemisphere') as T.HemisphereLight|undefined) ?? firstLight(game.scene,T.HemisphereLight);if(hemi){hemi.color.set(this.profile.lighting.hemisphereSky);hemi.groundColor.set(this.profile.lighting.hemisphereGround);hemi.intensity=this.profile.lighting.hemisphereIntensity;}
  const fill=(game.scene.getObjectByName('HF27_CoolFill') as T.DirectionalLight|undefined) ?? directionalBySide(game.scene,game.sun,'front');if(fill){fill.color.set(this.profile.lighting.coolFillColor);fill.intensity=this.profile.lighting.coolFillIntensity;}
  const rim=(game.scene.getObjectByName('HF27_WarmRim') as T.DirectionalLight|undefined) ?? directionalBySide(game.scene,game.sun,'back');if(rim){rim.color.set(this.profile.lighting.warmRimColor);rim.intensity=this.profile.lighting.warmRimIntensity;}
  const bounce=(game.scene.getObjectByName('HF27_WarmBounce') as T.PointLight|undefined) ?? firstLight(game.scene,T.PointLight);if(bounce){bounce.color.set(this.profile.lighting.bounceColor);bounce.intensity=this.profile.lighting.bounceIntensity;}
  if(game.bloomPass){game.bloomPass.strength=this.profile.post.bloomStrength;game.bloomPass.radius=this.profile.post.bloomRadius;game.bloomPass.threshold=this.profile.post.bloomThreshold;}
  const uniforms=(game.cinematicGrade?.uniforms??{}) as Record<string,{value:any}>;const set=(key:string,value:number)=>{if(uniforms[key])uniforms[key].value=value;};
  set('uStrength',this.profile.post.gradeStrength);set('uSharpen',this.profile.post.sharpen);set('uGrain',this.profile.post.grain);set('uVignette',this.profile.post.vignette);set('uDensity',this.profile.post.density);set('uChroma',this.profile.post.chroma);set('uCoral',this.profile.post.coral);set('uTeal',this.profile.post.teal);set('uGreenSuppress',this.profile.post.greenSuppress);
  if(persist)saveHf27VisualProfile(this.profile);
 }
 startKeepAlive(){if(this.keepAlive!==undefined)return;this.keepAlive=window.setInterval(()=>this.apply(this.profile,false),1200);}
 dispose(){if(this.keepAlive!==undefined)clearInterval(this.keepAlive);this.keepAlive=undefined;}
}
