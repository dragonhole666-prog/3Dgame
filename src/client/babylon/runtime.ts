import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/loaders/glTF';
import { createQinglanBabylonEngine,type BabylonBackend } from './engine';
import { createBabylonReferencePipeline } from './rendering/reference-pipeline';
import { createBabylonXianxiaWorld } from './world/xianxia-world';
import { mountBabylonLookDev } from './lookdev';

type CaptureId='spawn'|'bridge'|'pavilion'|'forest'|'character-front'|'character-back'|'equipment-closeup'|'combat';

const CAPTURES:Record<CaptureId,{alpha:number;beta:number;radius:number;target:[number,number,number]}>={
  spawn:{alpha:-2.04,beta:1.02,radius:42,target:[-34,4,34]},
  bridge:{alpha:-2.10,beta:1.06,radius:31,target:[-34,3.4,38.5]},
  pavilion:{alpha:-2.48,beta:1.01,radius:29,target:[-52.2,3.8,33]},
  forest:{alpha:-1.37,beta:1.07,radius:35,target:[-12,5,31]},
  'character-front':{alpha:-Math.PI,beta:1.28,radius:7,target:[-34,1.25,48]},
  'character-back':{alpha:0,beta:1.28,radius:7,target:[-34,1.25,48]},
  'equipment-closeup':{alpha:-2.85,beta:1.24,radius:4.2,target:[-34,1.35,48]},
  combat:{alpha:-2.28,beta:1.06,radius:19,target:[-26,2.6,39]},
};

export class BabylonP0Runtime{
  readonly canvas:HTMLCanvasElement;
  readonly scene:Scene;
  readonly backend:BabylonBackend;
  private readonly cleanup:(()=>void)[]=[];

  private constructor(public readonly host:HTMLElement,canvas:HTMLCanvasElement,scene:Scene,backend:BabylonBackend){
    this.canvas=canvas;this.scene=scene;this.backend=backend;
  }

  static async mount(host:HTMLElement){
    host.replaceChildren();
    const canvas=document.createElement('canvas');
    canvas.id='qinglan-babylon-canvas';
    Object.assign(canvas.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});
    host.appendChild(canvas);

    const result=await createQinglanBabylonEngine(canvas);
    const scene=new Scene(result.engine);
    const runtime=new BabylonP0Runtime(host,canvas,scene,result.backend);
    const world=await createBabylonXianxiaWorld(scene,canvas);
    const post=createBabylonReferencePipeline(scene,world.camera);
    runtime.cleanup.push(()=>post.dispose(),()=>world.dispose());

    const capture=new URLSearchParams(location.search).get('visualCapture') as CaptureId|null;
    if(capture&&CAPTURES[capture]){
      const p=CAPTURES[capture];
      world.camera.alpha=p.alpha;world.camera.beta=p.beta;world.camera.radius=p.radius;world.camera.target=new Vector3(...p.target);
      world.camera.detachControl();
    }

    runtime.cleanup.push(mountBabylonLookDev(scene,world,post.pipeline));

    const badge=document.createElement('div');
    badge.id='babylon-p0-status';
    badge.textContent=`Babylon.js HF34 · ${result.backend.toUpperCase()} · ${world.natureMode}${result.fallbackReason?' · backend fallback':''}`;
    Object.assign(badge.style,{position:'fixed',left:'12px',bottom:'12px',zIndex:'9998',padding:'6px 9px',borderRadius:'7px',font:'11px system-ui,sans-serif',color:'#d7edf4',background:'rgba(10,29,39,.68)',border:'1px solid rgba(174,208,221,.22)',pointerEvents:'none'});
    document.body.appendChild(badge);runtime.cleanup.push(()=>badge.remove());

    result.engine.runRenderLoop(()=>scene.render());
    const resize=()=>result.engine.resize();
    window.addEventListener('resize',resize,{passive:true});runtime.cleanup.push(()=>window.removeEventListener('resize',resize));

    console.info('[Babylon HF34]',{backend:result.backend,natureMode:world.natureMode,fallbackReason:result.fallbackReason,capture});
    (window as any).__QINGLAN_BABYLON__={runtime,scene,world,post};
    return runtime;
  }

  dispose(){
    for(const fn of this.cleanup.splice(0).reverse())try{fn();}catch{}
    this.scene.getEngine().stopRenderLoop();
    this.scene.dispose();
    this.scene.getEngine().dispose();
    this.canvas.remove();
    if((window as any).__QINGLAN_BABYLON__?.runtime===this)delete (window as any).__QINGLAN_BABYLON__;
  }
}
