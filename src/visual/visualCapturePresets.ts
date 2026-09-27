import { ArcRotateCamera, Vector3 } from '@babylonjs/core';

type Preset={alpha:number;beta:number;radius:number;target:[number,number,number]};

const PRESETS:Record<string,Preset>={
  spawn:{alpha:-1.43,beta:1.49,radius:34.5,target:[0,1.72,7.8]},
  bridge:{alpha:-1.41,beta:1.49,radius:24.2,target:[0,1.42,4.4]},
  pavilion:{alpha:-1.18,beta:1.48,radius:19.2,target:[-8.5,2.0,8.5]},
  forest:{alpha:-1.48,beta:1.48,radius:20.2,target:[10.0,2.35,7.7]},
  'character-front':{alpha:-1.57,beta:1.48,radius:11.8,target:[0,1.7,1.5]},
  'character-back':{alpha:1.57,beta:1.48,radius:11.8,target:[0,1.7,1.5]},
  'equipment-closeup':{alpha:-1.57,beta:1.49,radius:7.0,target:[0,2.15,1.0]},
  combat:{alpha:-1.30,beta:1.47,radius:16.0,target:[2.0,1.7,5.0]}
};

export function applyVisualCapturePreset(camera:ArcRotateCamera,id:string|null){
  if(!id) return;
  const preset=PRESETS[id];
  if(!preset){console.warn('[P0] Unknown visualCapture preset:',id);return;}
  camera.alpha=preset.alpha;
  camera.beta=preset.beta;
  camera.radius=preset.radius;
  camera.setTarget(new Vector3(...preset.target));
  camera.inputs.clear();
}
