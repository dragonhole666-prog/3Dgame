import type { Scene } from '@babylonjs/core/scene';
import type { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import type { BabylonXianxiaWorld } from './world/xianxia-world';

export interface BabylonLookDevProfile{
  exposure:number;contrast:number;fogDensity:number;
  sunIntensity:number;hemisphereIntensity:number;
  bloomWeight:number;bloomThreshold:number;
}

const KEY='qinglan.babylon.lookdev.p0';
const DEFAULTS:BabylonLookDevProfile={
  exposure:1.02,contrast:1.16,fogDensity:.003,
  sunIntensity:4.25,hemisphereIntensity:.54,
  bloomWeight:.115,bloomThreshold:.86,
};

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n));}
function normalize(v:Partial<BabylonLookDevProfile>):BabylonLookDevProfile{
  return {
    exposure:clamp(Number(v.exposure??DEFAULTS.exposure),.55,1.8),
    contrast:clamp(Number(v.contrast??DEFAULTS.contrast),.7,1.6),
    fogDensity:clamp(Number(v.fogDensity??DEFAULTS.fogDensity),0,.015),
    sunIntensity:clamp(Number(v.sunIntensity??DEFAULTS.sunIntensity),0,9),
    hemisphereIntensity:clamp(Number(v.hemisphereIntensity??DEFAULTS.hemisphereIntensity),0,2),
    bloomWeight:clamp(Number(v.bloomWeight??DEFAULTS.bloomWeight),0,.7),
    bloomThreshold:clamp(Number(v.bloomThreshold??DEFAULTS.bloomThreshold),0,1.5),
  };
}

export function loadBabylonLookDevProfile(){
  try{return normalize(JSON.parse(localStorage.getItem(KEY)??'{}'));}catch{return {...DEFAULTS};}
}

export function mountBabylonLookDev(scene:Scene,world:BabylonXianxiaWorld,pipeline:DefaultRenderingPipeline){
  if(new URLSearchParams(location.search).get('lookdev')!=='1')return ()=>{};
  let profile=loadBabylonLookDevProfile();
  const apply=()=>{
    scene.imageProcessingConfiguration.exposure=profile.exposure;
    scene.imageProcessingConfiguration.contrast=profile.contrast;
    scene.fogDensity=profile.fogDensity;
    world.sun.intensity=profile.sunIntensity;
    world.hemisphere.intensity=profile.hemisphereIntensity;
    pipeline.bloomWeight=profile.bloomWeight;
    pipeline.bloomThreshold=profile.bloomThreshold;
    localStorage.setItem(KEY,JSON.stringify(profile));
  };
  apply();

  const root=document.createElement('aside');
  root.id='babylon-p0-lookdev';
  const css=document.createElement('style');
  css.textContent=`#babylon-p0-lookdev{position:fixed;z-index:99999;right:14px;top:14px;width:min(360px,calc(100vw - 28px));background:rgba(12,27,36,.92);color:#eaf6fb;border:1px solid rgba(190,220,232,.28);border-radius:12px;backdrop-filter:blur(14px);box-shadow:0 20px 70px rgba(0,0,0,.38);font:12px system-ui,sans-serif}#babylon-p0-lookdev header,#babylon-p0-lookdev footer{display:flex;align-items:center;gap:8px;padding:10px}#babylon-p0-lookdev header{justify-content:space-between;border-bottom:1px solid #35505c}#babylon-p0-lookdev footer{justify-content:flex-end;border-top:1px solid #35505c}#babylon-p0-lookdev main{padding:8px 10px}#babylon-p0-lookdev label{display:grid;grid-template-columns:118px 1fr 52px;gap:8px;align-items:center;margin:9px 0}#babylon-p0-lookdev input{width:100%}#babylon-p0-lookdev output{text-align:right;color:#b9d4df;font-variant-numeric:tabular-nums}#babylon-p0-lookdev button{border:1px solid #55717d;background:#213b46;color:#eef8fb;border-radius:6px;padding:5px 8px;cursor:pointer}`;
  document.head.appendChild(css);
  root.innerHTML='<header><strong>Babylon P0 LookDev</strong><button data-close>×</button></header><main></main><footer><button data-reset>Reset</button><button data-copy>Copy JSON</button></footer>';
  document.body.appendChild(root);
  const main=root.querySelector('main')!;
  const rows:[keyof BabylonLookDevProfile,string,number,number,number][]=[
    ['exposure','Exposure',.55,1.8,.01],['contrast','Contrast',.7,1.6,.01],['fogDensity','Fog',0,.015,.0001],
    ['sunIntensity','Sun',0,9,.05],['hemisphereIntensity','Sky Fill',0,2,.01],
    ['bloomWeight','Bloom',0,.7,.005],['bloomThreshold','Bloom Threshold',0,1.5,.01],
  ];
  const render=()=>{main.replaceChildren();for(const [key,label,min,max,step] of rows){const row=document.createElement('label'),value=profile[key];row.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${value.toFixed(step<.001?4:2)}</output>`;const input=row.querySelector('input')!,out=row.querySelector('output')!;input.addEventListener('input',()=>{profile={...profile,[key]:Number(input.value)};out.textContent=Number(input.value).toFixed(step<.001?4:2);apply();});main.appendChild(row);}};
  render();
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{profile={...DEFAULTS};apply();render();});
  root.querySelector('[data-copy]')?.addEventListener('click',()=>navigator.clipboard.writeText(JSON.stringify(profile,null,2)));
  const dispose=()=>{root.remove();css.remove();};
  root.querySelector('[data-close]')?.addEventListener('click',dispose);
  return dispose;
}
