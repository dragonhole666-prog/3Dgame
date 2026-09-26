import { ArcRotateCamera, Vector3 } from '@babylonjs/core';

type Preset={alpha:number;beta:number;radius:number;target:[number,number,number]};

const PRESETS:Record<string,Preset>={
  spawn:{alpha:-1.24,beta:1.16,radius:34,target:[0,2.8,4.4]},
  bridge:{alpha:-1.28,beta:1.12,radius:24,target:[0,1.9,3.2]},
  pavilion:{alpha:-1.05,beta:1.14,radius:22,target:[-7.4,2.6,7.2]},
  forest:{alpha:-1.46,beta:1.08,radius:23,target:[9.2,3.2,7.2]},
  'character-front':{alpha:-1.57,beta:1.20,radius:14,target:[0,2.2,0]},
  'character-back':{alpha:1.57,beta:1.20,radius:14,target:[0,2.2,0]},
  'equipment-closeup':{alpha:-1.57,beta:1.22,radius:8,target:[0,2.6,0]},
  combat:{alpha:-1.12,beta:1.18,radius:18,target:[2,2.2,4]}
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
