import {
  ArcRotateCamera,
  Scene,
  Vector3
} from '@babylonjs/core';
import { createQinglanEngine, type QinglanBackend } from '../rendering/createEngine';
import { BabylonVisualDirector } from '../rendering/BabylonVisualDirector';
import { cloneReferenceProfile, type ReferenceLookProfile } from '../rendering/referenceProfile';
import { createP0ReferenceWorld, type P0WorldRuntime } from '../world/createP0ReferenceWorld';
import { mountP0LookDevPanel } from '../ui/P0LookDevPanel';
import { applyVisualCapturePreset } from '../visual/visualCapturePresets';

export class QinglanApp {
  private readonly canvas:HTMLCanvasElement;
  private backend:QinglanBackend='webgl2';
  private scene?:Scene;
  private camera?:ArcRotateCamera;
  private visualDirector?:BabylonVisualDirector;
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
    const camera=new ArcRotateCamera(
      'QinglanHeroCamera',
      -1.43,
      1.50,
      30.5,
      new Vector3(0,1.85,7.0),
      scene
    );
    camera.minZ=.08;
    camera.maxZ=180;
    camera.lowerRadiusLimit=12;
    camera.upperRadiusLimit=56;
    camera.lowerBetaLimit=.72;
    camera.upperBetaLimit=1.55;
    camera.wheelDeltaPercentage=.01;
    camera.panningSensibility=0;
    camera.attachControl(this.canvas,true);

    const visualDirector=new BabylonVisualDirector(scene,camera,this.profile);
    const world=createP0ReferenceWorld(scene,visualDirector.sun,this.profile);

    this.scene=scene;
    this.camera=camera;
    this.visualDirector=visualDirector;
    this.world=world;

    const search=new URLSearchParams(location.search);
    const captureMode=search.has('visualCapture');
    applyVisualCapturePreset(camera,search.get('visualCapture'));

    if(search.get('lookdev')==='1'){
      mountP0LookDevPanel({
        profile:this.profile,
        backend:this.backend,
        apply:(next)=>this.applyLook(next)
      });
    }

    if(captureMode){
      // Headless CI runs on software rendering. Continuous rendering can starve
      // Playwright commands, so visualCapture mode renders deterministic frames
      // only when the camera changes.
      scene.render();
      scene.render();
    }else{
      engine.runRenderLoop(()=>scene.render());
    }

    document.documentElement.dataset.qinglanReady='1';
    document.documentElement.dataset.qinglanRenderer='babylon';
    console.info('[P0 Babylon] backend=',this.backend,'captureMode=',captureMode);
    window.addEventListener('resize',()=>engine.resize(),{passive:true});
  }

  setVisualCapturePreset(id:string){
    if(!this.camera) return;
    applyVisualCapturePreset(this.camera,id);
    if(this.scene){
      this.scene.render();
      this.scene.render();
    }
  }

  private applyLook(next:ReferenceLookProfile){
    this.profile=cloneReferenceProfile(next);
    this.visualDirector?.apply(this.profile);
    this.world?.applyProfile(this.profile);
  }
}
