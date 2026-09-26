import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Color3,Color4 } from '@babylonjs/core/Maths/math.color';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';
import { XIANXIA_REFERENCE_20260926 as REF } from '../reference-style';

export interface BabylonReferencePipeline{
  pipeline:DefaultRenderingPipeline;
  ssao?:SSAO2RenderingPipeline;
  dispose():void;
}

/**
 * HF34 LookDev:
 * selective warm highlights + cool shadows, ACES highlight rolloff and
 * restrained bloom. Saturation is not globally boosted; the reference image
 * gets its color separation from materials and lighting rather than a filter.
 */
export function createBabylonReferencePipeline(scene:Scene,camera:Camera):BabylonReferencePipeline{
  const image=scene.imageProcessingConfiguration;
  image.isEnabled=true;
  image.toneMappingEnabled=true;
  image.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure=REF.render.exposure;
  image.contrast=REF.render.contrast;
  image.ditheringEnabled=true;
  image.vignetteEnabled=true;
  image.vignetteWeight=.82;
  image.vignetteStretch=.02;
  image.vignetteColor=new Color4(.025,.038,.045,.16);

  const curves=new ColorCurves();
  curves.globalSaturation=-3;
  curves.globalDensity=-1;
  curves.highlightsHue=28;
  curves.highlightsDensity=9;
  curves.highlightsSaturation=-3;
  curves.midtonesHue=194;
  curves.midtonesDensity=2;
  curves.midtonesSaturation=1;
  curves.shadowsHue=205;
  curves.shadowsDensity=12;
  curves.shadowsSaturation=-8;
  image.colorCurves=curves;
  image.colorCurvesEnabled=true;

  const pipeline=new DefaultRenderingPipeline('HF34_Babylon_Reference',true,scene,[camera]);
  pipeline.samples=4;
  pipeline.fxaaEnabled=true;
  pipeline.bloomEnabled=true;
  pipeline.bloomWeight=REF.render.bloomWeight;
  pipeline.bloomThreshold=REF.render.bloomThreshold;
  pipeline.bloomKernel=REF.render.bloomKernel;
  pipeline.sharpenEnabled=true;
  pipeline.sharpen.edgeAmount=REF.render.sharpenEdge;
  pipeline.sharpen.colorAmount=REF.render.sharpenColor;
  pipeline.grainEnabled=false;
  pipeline.imageProcessingEnabled=true;

  let ssao:SSAO2RenderingPipeline|undefined;
  try{
    if(SSAO2RenderingPipeline.IsSupported){
      ssao=new SSAO2RenderingPipeline('HF34_SSAO2',scene,{ssaoRatio:.75,blurRatio:.5,combineRatio:1});
      ssao.radius=REF.render.ssaoRadius;
      ssao.totalStrength=REF.render.ssaoStrength;
      ssao.base=REF.render.ssaoBase;
      ssao.samples=16;
      ssao.maxZ=160;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('HF34_SSAO2',camera);
      const gbuffer=scene.enableGeometryBufferRenderer();
      if(gbuffer)gbuffer.renderTransparentMeshes=false;
      const prepass=scene.enablePrePassRenderer();
      if(prepass)prepass.disableGammaTransform=true;
    }
  }catch(error){
    console.warn('[HF34 Babylon] SSAO2 disabled',error);
  }

  scene.ambientColor=Color3.FromHexString(REF.palette.hazeBlue).scale(.13);
  return {pipeline,ssao,dispose(){ssao?.dispose();pipeline.dispose();}};
}
