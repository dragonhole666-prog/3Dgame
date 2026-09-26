import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Color3,Color4 } from '@babylonjs/core/Maths/math.color';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';

export interface BabylonReferencePipeline{
  pipeline:DefaultRenderingPipeline;
  ssao?:SSAO2RenderingPipeline;
  dispose():void;
}

export function createBabylonReferencePipeline(scene:Scene,camera:Camera):BabylonReferencePipeline{
  const image=scene.imageProcessingConfiguration;
  image.isEnabled=true;
  image.toneMappingEnabled=true;
  image.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure=1.02;
  image.contrast=1.16;
  image.ditheringEnabled=true;
  image.vignetteEnabled=true;
  image.vignetteWeight=1.05;
  image.vignetteStretch=.05;
  image.vignetteColor=new Color4(.035,.055,.075,.22);

  const curves=new ColorCurves();
  curves.globalSaturation=8;
  curves.globalDensity=4;
  curves.highlightsHue=24;
  curves.highlightsDensity=8;
  curves.highlightsSaturation=5;
  curves.shadowsHue=205;
  curves.shadowsDensity=9;
  curves.shadowsSaturation=5;
  image.colorCurves=curves;
  image.colorCurvesEnabled=true;

  const pipeline=new DefaultRenderingPipeline('HF27_Babylon_Reference',true,scene,[camera]);
  pipeline.samples=4;
  pipeline.fxaaEnabled=true;
  pipeline.bloomEnabled=true;
  pipeline.bloomWeight=.115;
  pipeline.bloomThreshold=.86;
  pipeline.bloomKernel=48;
  pipeline.sharpenEnabled=true;
  pipeline.sharpen.edgeAmount=.12;
  pipeline.sharpen.colorAmount=.035;
  pipeline.grainEnabled=true;
  pipeline.grain.intensity=2.1;
  pipeline.grain.animated=false;
  pipeline.imageProcessingEnabled=true;

  let ssao:SSAO2RenderingPipeline|undefined;
  try{
    if(SSAO2RenderingPipeline.IsSupported){
      ssao=new SSAO2RenderingPipeline('HF27_SSAO2',scene,{ssaoRatio:.75,blurRatio:.5,combineRatio:1});
      ssao.radius=1.8;
      ssao.totalStrength=.72;
      ssao.base=.28;
      ssao.samples=16;
      ssao.maxZ=180;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('HF27_SSAO2',camera);
      const gbuffer=scene.enableGeometryBufferRenderer();
      if(gbuffer)gbuffer.renderTransparentMeshes=false;
      const prepass=scene.enablePrePassRenderer();
      if(prepass)prepass.disableGammaTransform=true;
    }
  }catch(error){
    console.warn('[Babylon P0] SSAO2 disabled',error);
  }

  scene.ambientColor=Color3.FromHexString('#32434D').scale(.16);
  return {pipeline,ssao,dispose(){ssao?.dispose();pipeline.dispose();}};
}
