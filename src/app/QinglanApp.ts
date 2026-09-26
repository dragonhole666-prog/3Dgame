import {
  ArcRotateCamera,
  Color4,
  ColorCurves,
  DefaultRenderingPipeline,
  DirectionalLight,
  HemisphericLight,
  ImageProcessingConfiguration,
  Scene,
  Vector3
} from '@babylonjs/core';
import { createQinglanEngine, type QinglanBackend } from '../rendering/createEngine';
import { cloneReferenceProfile, color3, type ReferenceLookProfile } from '../rendering/referenceProfile';
import { createP0ReferenceWorld, type P0WorldRuntime } from '../world/createP0ReferenceWorld';
import { mountP0LookDevPanel } from '../ui/P0LookDevPanel';
import { applyVisualCapturePreset } from '../visual/visualCapturePresets';

const toColor4=(hex:string)=>{
  const c=color3(hex);
  return new Color4(c.r,c.g,c.b,1);
};

export class QinglanApp {
  private readonly canvas:HTMLCanvasElement;
  private backend:QinglanBackend='webgl2';
  private scene?:Scene;
  private camera?:ArcRotateCamera;
  private pipeline?:DefaultRenderingPipeline;
  private world?:P0WorldRuntime;
  private profile=cloneReferenceProfile();

  constructor(private readonly host:HTMLElement){
    this.canvas=document.createElement('canvas');
    this.canvas.id='qinglan-canvas';
    this.canvas.setAttribute('aria-label','青嵐志 3D 遊戲畫面');
    this.host.replaceChildren(this.canvas);
  }

  async start(){
    const {engine,backend}=await createQinglanEngine(this.canvas);
    this.backend=backend;

    const scene=new Scene(engine);
    scene.clearColor=toColor4(this.profile.environment.clearColor);
    scene.fogMode=Scene.FOGMODE_EXP2;
    scene.fogColor=color3(this.profile.environment.fogColor);
    scene.fogDensity=this.profile.environment.fogDensity;
    scene.environmentIntensity=this.profile.environment.environmentIntensity;
    scene.imageProcessingConfiguration.toneMappingEnabled=true;
    scene.imageProcessingConfiguration.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure=this.profile.environment.exposure;
    scene.imageProcessingConfiguration.contrast=this.profile.environment.contrast;

    const curves=new ColorCurves();
    curves.globalSaturation=24;
    curves.highlightsHue=28;
    curves.highlightsDensity=8;
    curves.highlightsSaturation=8;
    curves.shadowsHue=205;
    curves.shadowsDensity=9;
    curves.shadowsSaturation=10;
    scene.imageProcessingConfiguration.colorCurves=curves;
    scene.imageProcessingConfiguration.colorCurvesEnabled=true;

    const camera=new ArcRotateCamera('QinglanHeroCamera',-1.43,1.50,30.5,new Vector3(0,1.85,7.0),scene);
    camera.lowerRadiusLimit=12;
    camera.upperRadiusLimit=56;
    camera.lowerBetaLimit=0.72;
    camera.upperBetaLimit=1.55;
    camera.wheelDeltaPercentage=0.01;
    camera.panningSensibility=0;
    camera.attachControl(this.canvas,true);

    const hemi=new HemisphericLight('P0_Hemisphere',new Vector3(0,1,0),scene);
    hemi.diffuse=color3(this.profile.lighting.skyColor);
    hemi.groundColor=color3(this.profile.lighting.groundColor);
    hemi.intensity=this.profile.lighting.hemisphereIntensity;

    const sun=new DirectionalLight('P0_Sun',new Vector3(-0.65,-1,0.45),scene);
    sun.diffuse=color3(this.profile.lighting.sunColor);
    sun.intensity=this.profile.lighting.sunIntensity;

    const coolFill=new DirectionalLight('P0_CoolFill',new Vector3(0.65,-0.35,-0.35),scene);
    coolFill.diffuse=color3(this.profile.lighting.coolFillColor);
    coolFill.intensity=this.profile.lighting.coolFillIntensity;

    const warmRim=new DirectionalLight('P0_WarmRim',new Vector3(-0.3,-0.25,-0.95),scene);
    warmRim.diffuse=color3(this.profile.lighting.warmRimColor);
    warmRim.intensity=this.profile.lighting.warmRimIntensity;

    const pipeline=new DefaultRenderingPipeline('P0_CinematicPipeline',true,scene,[camera]);
    pipeline.samples=4;
    pipeline.fxaaEnabled=true;
    pipeline.bloomEnabled=true;
    pipeline.bloomWeight=this.profile.post.bloomWeight;
    pipeline.bloomThreshold=this.profile.post.bloomThreshold;
    pipeline.bloomKernel=this.profile.post.bloomKernel;
    scene.imageProcessingConfiguration.vignetteEnabled=true;
    scene.imageProcessingConfiguration.vignetteWeight=this.profile.post.vignetteWeight;

    const world=createP0ReferenceWorld(scene,sun,this.profile);

    this.scene=scene;
    this.camera=camera;
    this.pipeline=pipeline;
    this.world=world;

    applyVisualCapturePreset(camera,new URLSearchParams(location.search).get('visualCapture'));

    if(new URLSearchParams(location.search).get('lookdev')==='1'){
      mountP0LookDevPanel({
        profile:this.profile,
        backend:this.backend,
        apply:(next)=>this.applyLook(next)
      });
    }

    document.documentElement.dataset.qinglanReady='1';
    console.info('[P0 Babylon] backend=',this.backend);
    engine.runRenderLoop(()=>scene.render());
    window.addEventListener('resize',()=>engine.resize(),{passive:true});
  }

  setVisualCapturePreset(id:string){
    if(!this.camera) return;
    applyVisualCapturePreset(this.camera,id);
  }

  private applyLook(next:ReferenceLookProfile){
    this.profile=cloneReferenceProfile(next);
    const scene=this.scene;
    if(!scene||!this.pipeline||!this.world) return;

    scene.clearColor=toColor4(next.environment.clearColor);
    scene.fogColor=color3(next.environment.fogColor);
    scene.fogDensity=next.environment.fogDensity;
    scene.environmentIntensity=next.environment.environmentIntensity;
    scene.imageProcessingConfiguration.exposure=next.environment.exposure;
    scene.imageProcessingConfiguration.contrast=next.environment.contrast;
    scene.imageProcessingConfiguration.vignetteWeight=next.post.vignetteWeight;

    const hemi=scene.getLightByName('P0_Hemisphere') as HemisphericLight|null;
    if(hemi){
      hemi.diffuse=color3(next.lighting.skyColor);
      hemi.groundColor=color3(next.lighting.groundColor);
      hemi.intensity=next.lighting.hemisphereIntensity;
    }

    const sun=scene.getLightByName('P0_Sun') as DirectionalLight|null;
    if(sun){sun.diffuse=color3(next.lighting.sunColor);sun.intensity=next.lighting.sunIntensity;}

    const fill=scene.getLightByName('P0_CoolFill') as DirectionalLight|null;
    if(fill){fill.diffuse=color3(next.lighting.coolFillColor);fill.intensity=next.lighting.coolFillIntensity;}

    const rim=scene.getLightByName('P0_WarmRim') as DirectionalLight|null;
    if(rim){rim.diffuse=color3(next.lighting.warmRimColor);rim.intensity=next.lighting.warmRimIntensity;}

    this.pipeline.bloomWeight=next.post.bloomWeight;
    this.pipeline.bloomThreshold=next.post.bloomThreshold;
    this.pipeline.bloomKernel=next.post.bloomKernel;

    this.world.applyProfile(next);
  }
}
