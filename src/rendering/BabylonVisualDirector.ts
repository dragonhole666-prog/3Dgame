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
import { color3, type ReferenceLookProfile } from './referenceProfile';

function toColor4(hex:string){
  const c=color3(hex).toLinearSpace();
  return new Color4(c.r,c.g,c.b,1);
}

function directionFromAngles(azimuthDeg:number,elevationDeg:number){
  const azimuth=azimuthDeg*Math.PI/180;
  const elevation=elevationDeg*Math.PI/180;
  const horizontal=Math.cos(elevation);
  return new Vector3(
    -Math.sin(azimuth)*horizontal,
    -Math.sin(elevation),
    -Math.cos(azimuth)*horizontal
  ).normalize();
}

export class BabylonVisualDirector {
  readonly sun:DirectionalLight;
  readonly hemisphere:HemisphericLight;
  readonly coolFill:DirectionalLight;
  readonly warmRim:DirectionalLight;
  readonly pipeline:DefaultRenderingPipeline;
  private readonly curves:ColorCurves;

  constructor(
    private readonly scene:Scene,
    camera:ArcRotateCamera,
    profile:ReferenceLookProfile
  ){
    scene.fogMode=Scene.FOGMODE_LINEAR;

    this.curves=new ColorCurves();
    scene.imageProcessingConfiguration.colorCurves=this.curves;
    scene.imageProcessingConfiguration.colorCurvesEnabled=true;
    scene.imageProcessingConfiguration.toneMappingEnabled=true;
    scene.imageProcessingConfiguration.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.vignetteEnabled=true;
    scene.imageProcessingConfiguration.vignetteBlendMode=ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

    this.hemisphere=new HemisphericLight('P0_Hemisphere',new Vector3(0,1,0),scene);
    this.sun=new DirectionalLight('P0_Sun',new Vector3(-.55,-.72,.38),scene);
    this.coolFill=new DirectionalLight('P0_CoolFill',new Vector3(.64,-.30,-.38),scene);
    this.warmRim=new DirectionalLight('P0_WarmRim',new Vector3(-.28,-.34,-.90),scene);

    this.pipeline=new DefaultRenderingPipeline('P0_CinematicPipeline',true,scene,[camera]);
    this.pipeline.samples=4;
    this.pipeline.fxaaEnabled=true;
    this.pipeline.bloomEnabled=true;
    this.pipeline.sharpenEnabled=true;

    this.apply(profile);
  }

  apply(profile:ReferenceLookProfile){
    const image=this.scene.imageProcessingConfiguration;

    this.scene.clearColor=toColor4(profile.environment.clearColor);
    this.scene.fogColor=color3(profile.environment.fogColor);
    this.scene.fogStart=profile.environment.fogStart;
    this.scene.fogEnd=profile.environment.fogEnd;
    this.scene.environmentIntensity=profile.environment.environmentIntensity;

    image.exposure=profile.environment.exposure;
    image.contrast=profile.environment.contrast;
    image.vignetteWeight=profile.post.vignetteWeight;
    image.vignetteStretch=profile.post.vignetteStretch;

    this.curves.globalSaturation=profile.post.saturation;
    this.curves.highlightsHue=profile.post.highlightsHue;
    this.curves.highlightsDensity=profile.post.highlightsDensity;
    this.curves.highlightsSaturation=profile.post.highlightsSaturation;
    this.curves.shadowsHue=profile.post.shadowsHue;
    this.curves.shadowsDensity=profile.post.shadowsDensity;
    this.curves.shadowsSaturation=profile.post.shadowsSaturation;

    this.hemisphere.diffuse=color3(profile.lighting.skyColor);
    this.hemisphere.groundColor=color3(profile.lighting.groundColor);
    this.hemisphere.intensity=profile.lighting.hemisphereIntensity;

    this.sun.direction=directionFromAngles(profile.lighting.sunAzimuth,profile.lighting.sunElevation);
    this.sun.diffuse=color3(profile.lighting.sunColor);
    this.sun.intensity=profile.lighting.sunIntensity;

    this.coolFill.diffuse=color3(profile.lighting.coolFillColor);
    this.coolFill.intensity=profile.lighting.coolFillIntensity;

    this.warmRim.diffuse=color3(profile.lighting.warmRimColor);
    this.warmRim.intensity=profile.lighting.warmRimIntensity;

    this.pipeline.bloomWeight=profile.post.bloomWeight;
    this.pipeline.bloomThreshold=profile.post.bloomThreshold;
    this.pipeline.bloomKernel=profile.post.bloomKernel;
    this.pipeline.sharpen.edgeAmount=profile.post.sharpenEdgeAmount;
    this.pipeline.sharpen.colorAmount=profile.post.sharpenColorAmount;
  }
}
