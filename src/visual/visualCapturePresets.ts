import { ArcRotateCamera, Vector3 } from '@babylonjs/core';

type Preset={alpha:number;beta:number;radius:number;target:[number,number,number]};

const PRESETS:Record<string,Preset>={
  spawn:{alpha:-1.43,beta:1.40,radius:30.5,target:[0,2.25,7.0]},
  bridge:{alpha:-1.39,beta:1.39,radius:23.0,target:[0,1.55,3.6]},
  pavilion:{alpha:-1.15,beta:1.37,radius:20.5,target:[-8.6,2.35,8.4]},
  forest:{alpha:-1.48,beta:1.36,radius:21.5,target:[9.8,2.75,7.5]},
  'character-front':{alpha:-1.57,beta:1.39,radius:12.5,target:[0,2.0,1.5]},
  'character-back':{alpha:1.57,beta:1.39,radius:12.5,target:[0,2.0,1.5]},
  'equipment-closeup':{alpha:-1.57,beta:1.42,radius:7.2,target:[0,2.4,1.0]},
  combat:{alpha:-1.28,beta:1.38,radius:17.0,target:[2.0,1.9,4.8]}
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
