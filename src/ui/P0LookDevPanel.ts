import { cloneReferenceProfile, type ReferenceLookProfile } from '../rendering/referenceProfile';

type LookDevContext={
  profile:ReferenceLookProfile;
  backend:string;
  apply(profile:ReferenceLookProfile):void;
};

const storageKey='qinglan.p0.babylon-lookdev.v1';

export function mountP0LookDevPanel(context:LookDevContext){
  let profile=cloneReferenceProfile(context.profile);
  try{
    const raw=localStorage.getItem(storageKey);
    if(raw) profile=JSON.parse(raw) as ReferenceLookProfile;
  }catch{}
  context.apply(profile);

  const root=document.createElement('aside');
  root.className='p0-lookdev';
  root.innerHTML='<header><div><strong>P0 Babylon LookDev</strong><small></small></div><button data-close>×</button></header><div data-content></div><footer><button data-reset>Reset</button><button data-copy>Copy JSON</button></footer>';
  root.querySelector('small')!.textContent=`Renderer: ${context.backend}`;
  document.body.appendChild(root);

  const content=root.querySelector<HTMLElement>('[data-content]')!;

  const persist=()=>{localStorage.setItem(storageKey,JSON.stringify(profile));context.apply(profile);};

  const range=(label:string,get:()=>number,set:(v:number)=>void,min:number,max:number,step:number)=>{
    const row=document.createElement('label');
    const value=get();
    row.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output>${value.toFixed(step<.001?4:2)}</output>`;
    const input=row.querySelector<HTMLInputElement>('input')!;
    const out=row.querySelector('output')!;
    input.addEventListener('input',()=>{const v=Number(input.value);set(v);out.textContent=v.toFixed(step<.001?4:2);persist();});
    return row;
  };

  const color=(label:string,get:()=>string,set:(v:string)=>void)=>{
    const row=document.createElement('label');
    row.innerHTML=`<span>${label}</span><input type="color" value="${get()}"><output>${get()}</output>`;
    const input=row.querySelector<HTMLInputElement>('input')!;
    const out=row.querySelector('output')!;
    input.addEventListener('input',()=>{set(input.value);out.textContent=input.value;persist();});
    return row;
  };

  const render=()=>{
    content.replaceChildren();

    const environment=document.createElement('fieldset');
    environment.innerHTML='<legend>Environment / Post</legend>';
    environment.append(
      range('Exposure',()=>profile.environment.exposure,v=>profile.environment.exposure=v,.55,1.7,.01),
      range('Contrast',()=>profile.environment.contrast,v=>profile.environment.contrast=v,.8,1.5,.01),
      range('Fog Density',()=>profile.environment.fogDensity,v=>profile.environment.fogDensity=v,0,.02,.0001),
      range('Bloom',()=>profile.post.bloomWeight,v=>profile.post.bloomWeight=v,0,.65,.01),
      range('Bloom Threshold',()=>profile.post.bloomThreshold,v=>profile.post.bloomThreshold=v,.55,1.3,.01),
      color('Sky',()=>profile.environment.clearColor,v=>profile.environment.clearColor=v),
      color('Fog',()=>profile.environment.fogColor,v=>profile.environment.fogColor=v)
    );

    const light=document.createElement('fieldset');
    light.innerHTML='<legend>Lighting</legend>';
    light.append(
      range('Sun',()=>profile.lighting.sunIntensity,v=>profile.lighting.sunIntensity=v,0,8,.02),
      range('Hemisphere',()=>profile.lighting.hemisphereIntensity,v=>profile.lighting.hemisphereIntensity=v,0,1.5,.01),
      range('Cool Fill',()=>profile.lighting.coolFillIntensity,v=>profile.lighting.coolFillIntensity=v,0,2,.01),
      range('Warm Rim',()=>profile.lighting.warmRimIntensity,v=>profile.lighting.warmRimIntensity=v,0,2,.01),
      color('Sun Color',()=>profile.lighting.sunColor,v=>profile.lighting.sunColor=v),
      color('Sky Light',()=>profile.lighting.skyColor,v=>profile.lighting.skyColor=v),
      color('Ground Light',()=>profile.lighting.groundColor,v=>profile.lighting.groundColor=v)
    );

    const materials=document.createElement('fieldset');
    materials.innerHTML='<legend>Reference Palette</legend>';
    materials.append(
      color('Maple Shadow',()=>profile.foliage.mapleShadow,v=>profile.foliage.mapleShadow=v),
      color('Maple Base',()=>profile.foliage.mapleBase,v=>profile.foliage.mapleBase=v),
      color('Maple Lit',()=>profile.foliage.mapleLit,v=>profile.foliage.mapleLit=v),
      color('Maple Highlight',()=>profile.foliage.mapleHighlight,v=>profile.foliage.mapleHighlight=v),
      color('Grass',()=>profile.foliage.grassBase,v=>profile.foliage.grassBase=v),
      color('Water',()=>profile.water.shallow,v=>profile.water.shallow=v),
      range('Water Reflection',()=>profile.water.reflection,v=>profile.water.reflection=v,0,1.4,.01),
      range('Water Roughness',()=>profile.water.roughness,v=>profile.water.roughness=v,.02,.8,.01),
      color('Wood',()=>profile.architecture.woodBase,v=>profile.architecture.woodBase=v),
      color('Roof',()=>profile.architecture.roofDeep,v=>profile.architecture.roofDeep=v),
      color('Stone',()=>profile.architecture.stoneLit,v=>profile.architecture.stoneLit=v)
    );

    content.append(environment,light,materials);
  };

  render();

  root.querySelector('[data-close]')?.addEventListener('click',()=>root.remove());
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{
    localStorage.removeItem(storageKey);
    location.reload();
  });
  root.querySelector('[data-copy]')?.addEventListener('click',async()=>{
    await navigator.clipboard.writeText(JSON.stringify(profile,null,2));
  });
}
