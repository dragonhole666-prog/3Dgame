import type { QinglanBackend } from '../rendering/createEngine';
import {
  cloneReferenceProfile,
  coerceReferenceProfile,
  type ReferenceLookProfile
} from '../rendering/referenceProfile';

interface LookDevContext {
  profile:ReferenceLookProfile;
  backend:QinglanBackend;
  apply(profile:ReferenceLookProfile):void;
}

const storageKey='qinglan.p0.babylon.look.v2';
const legacyStorageKey='qinglan.hf27.visualProfile';

export function mountP0LookDevPanel(context:LookDevContext){
  let profile=cloneReferenceProfile(context.profile);

  try{
    const raw=localStorage.getItem(storageKey)??localStorage.getItem(legacyStorageKey);
    if(raw) profile=coerceReferenceProfile(JSON.parse(raw));
  }catch{
    profile=cloneReferenceProfile(context.profile);
  }

  context.apply(profile);

  const root=document.createElement('aside');
  root.className='p0-lookdev';
  root.innerHTML='<header><div><strong>P0 Babylon LookDev v2</strong><small></small></div><button data-close aria-label="Close">×</button></header><div data-content></div><footer><button data-reset>Reset</button><button data-copy>Copy JSON</button></footer>';
  root.querySelector('small')!.textContent=`Renderer: Babylon.js / ${context.backend}`;
  document.body.appendChild(root);

  const content=root.querySelector<HTMLElement>('[data-content]')!;
  const persist=()=>{
    localStorage.setItem(storageKey,JSON.stringify(profile));
    context.apply(profile);
  };

  const range=(
    label:string,
    get:()=>number,
    set:(value:number)=>void,
    min:number,
    max:number,
    step:number
  )=>{
    const row=document.createElement('label');
    const value=get();
    const digits=step<.001?4:step<.01?3:step<.1?2:1;
    row.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${value.toFixed(digits)}</output>`;
    const input=row.querySelector<HTMLInputElement>('input')!;
    const out=row.querySelector('output')!;
    input.addEventListener('input',()=>{
      const next=Number(input.value);
      set(next);
      out.textContent=next.toFixed(digits);
      persist();
    });
    return row;
  };

  const color=(label:string,get:()=>string,set:(value:string)=>void)=>{
    const row=document.createElement('label');
    row.innerHTML=`<span>${label}</span><input type="color" value="${get()}"><output>${get()}</output>`;
    const input=row.querySelector<HTMLInputElement>('input')!;
    const out=row.querySelector('output')!;
    input.addEventListener('input',()=>{
      set(input.value);
      out.textContent=input.value;
      persist();
    });
    return row;
  };

  const group=(title:string,...controls:HTMLElement[])=>{
    const fieldset=document.createElement('fieldset');
    fieldset.innerHTML=`<legend>${title}</legend>`;
    fieldset.append(...controls);
    return fieldset;
  };

  content.append(
    group(
      'Environment / Tonal',
      range('Exposure',()=>profile.environment.exposure,v=>profile.environment.exposure=v,.65,1.45,.01),
      range('Contrast',()=>profile.environment.contrast,v=>profile.environment.contrast=v,.85,1.45,.01),
      range('Fog Start',()=>profile.environment.fogStart,v=>profile.environment.fogStart=v,5,60,.5),
      range('Fog End',()=>profile.environment.fogEnd,v=>profile.environment.fogEnd=v,25,120,.5),
      color('Sky',()=>profile.environment.clearColor,v=>profile.environment.clearColor=v),
      color('Fog',()=>profile.environment.fogColor,v=>profile.environment.fogColor=v)
    ),
    group(
      'Lighting',
      range('Sun',()=>profile.lighting.sunIntensity,v=>profile.lighting.sunIntensity=v,0,6,.02),
      range('Sun Azimuth',()=>profile.lighting.sunAzimuth,v=>profile.lighting.sunAzimuth=v,-180,180,1),
      range('Sun Elevation',()=>profile.lighting.sunElevation,v=>profile.lighting.sunElevation=v,5,85,1),
      range('Hemisphere',()=>profile.lighting.hemisphereIntensity,v=>profile.lighting.hemisphereIntensity=v,0,1.5,.01),
      range('Cool Fill',()=>profile.lighting.coolFillIntensity,v=>profile.lighting.coolFillIntensity=v,0,1.5,.01),
      range('Warm Rim',()=>profile.lighting.warmRimIntensity,v=>profile.lighting.warmRimIntensity=v,0,1.5,.01),
      color('Sun Color',()=>profile.lighting.sunColor,v=>profile.lighting.sunColor=v),
      color('Sky Light',()=>profile.lighting.skyColor,v=>profile.lighting.skyColor=v),
      color('Ground Light',()=>profile.lighting.groundColor,v=>profile.lighting.groundColor=v)
    ),
    group(
      'Maple / Ground',
      color('Maple Shadow',()=>profile.foliage.mapleShadow,v=>profile.foliage.mapleShadow=v),
      color('Maple Base',()=>profile.foliage.mapleBase,v=>profile.foliage.mapleBase=v),
      color('Maple Lit',()=>profile.foliage.mapleLit,v=>profile.foliage.mapleLit=v),
      color('Maple Highlight',()=>profile.foliage.mapleHighlight,v=>profile.foliage.mapleHighlight=v),
      color('Grass Shadow',()=>profile.foliage.grassShadow,v=>profile.foliage.grassShadow=v),
      color('Grass Base',()=>profile.foliage.grassBase,v=>profile.foliage.grassBase=v),
      color('Grass Lit',()=>profile.foliage.grassLit,v=>profile.foliage.grassLit=v)
    ),
    group(
      'Water',
      color('Water Deep',()=>profile.water.deep,v=>profile.water.deep=v),
      color('Water Shallow',()=>profile.water.shallow,v=>profile.water.shallow=v),
      range('Reflection',()=>profile.water.reflection,v=>profile.water.reflection=v,0,1.4,.01),
      range('Roughness',()=>profile.water.roughness,v=>profile.water.roughness=v,.02,.65,.01),
      range('Normal Strength',()=>profile.water.normalStrength,v=>profile.water.normalStrength=v,0,.9,.01),
      range('Alpha',()=>profile.water.alpha,v=>profile.water.alpha=v,.55,1,.01)
    ),
    group(
      'Architecture',
      color('Wood Deep',()=>profile.architecture.woodDeep,v=>profile.architecture.woodDeep=v),
      color('Wood Base',()=>profile.architecture.woodBase,v=>profile.architecture.woodBase=v),
      color('Wood Lit',()=>profile.architecture.woodLit,v=>profile.architecture.woodLit=v),
      color('Roof Deep',()=>profile.architecture.roofDeep,v=>profile.architecture.roofDeep=v),
      color('Roof Lit',()=>profile.architecture.roofLit,v=>profile.architecture.roofLit=v),
      color('Stone Deep',()=>profile.architecture.stoneDeep,v=>profile.architecture.stoneDeep=v),
      color('Stone Lit',()=>profile.architecture.stoneLit,v=>profile.architecture.stoneLit=v)
    ),
    group(
      'Post / Reference Match',
      range('Bloom',()=>profile.post.bloomWeight,v=>profile.post.bloomWeight=v,0,.35,.005),
      range('Bloom Threshold',()=>profile.post.bloomThreshold,v=>profile.post.bloomThreshold=v,.55,1.25,.01),
      range('Vignette',()=>profile.post.vignetteWeight,v=>profile.post.vignetteWeight=v,0,2,.01),
      range('Saturation',()=>profile.post.saturation,v=>profile.post.saturation=v,-30,40,1),
      range('Highlight Warmth',()=>profile.post.highlightsDensity,v=>profile.post.highlightsDensity=v,-20,20,1),
      range('Shadow Coolness',()=>profile.post.shadowsDensity,v=>profile.post.shadowsDensity=v,-20,20,1),
      range('Sharpen Edge',()=>profile.post.sharpenEdgeAmount,v=>profile.post.sharpenEdgeAmount=v,0,.7,.01)
    )
  );

  root.querySelector('[data-close]')?.addEventListener('click',()=>root.remove());
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
    location.reload();
  });
  root.querySelector('[data-copy]')?.addEventListener('click',async()=>{
    await navigator.clipboard.writeText(JSON.stringify(profile,null,2));
  });
}
