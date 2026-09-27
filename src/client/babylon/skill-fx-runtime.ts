import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  TransformNode,
  Vector3
} from '@babylonjs/core';
import type { GameEvent,Snapshot } from '../../shared/types';
import { SKILL_DEFINITIONS } from '../../shared/data/skills';
import { heightAt } from '../../shared/data/world';

function colorFor(skillId?:string){
  const element=skillId?SKILL_DEFINITIONS[skillId]?.element:undefined;
  if(element==='fire')return Color3.FromHexString('#F07848');
  if(element==='frost')return Color3.FromHexString('#87D8F2');
  if(element==='lightning')return Color3.FromHexString('#B68CFF');
  if(element==='wind')return Color3.FromHexString('#86D5B2');
  if(element==='arcane')return Color3.FromHexString('#D88BE8');
  return Color3.FromHexString('#F0C77A');
}

function material(scene:Scene,name:string,color:Color3,alpha=1){
  const mat=new PBRMaterial(name,scene);
  mat.albedoColor=color;
  mat.emissiveColor=color.scale(.92);
  mat.roughness=.22;
  mat.metallic=.04;
  mat.alpha=alpha;
  mat.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;
  return mat;
}

function disposeLater(scene:Scene,root:TransformNode|Mesh,mat:PBRMaterial,light:PointLight|undefined,durationMs:number,animate:(t:number)=>void){
  const born=performance.now();
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const t=Math.min(1,(performance.now()-born)/durationMs);
    animate(t);
    if(t>=1){
      scene.onBeforeRenderObservable.remove(observer);
      try{root.dispose(false,true);}catch{}
      try{mat.dispose();}catch{}
      try{light?.dispose();}catch{}
    }
  });
}

export class BabylonSkillFx{
  constructor(private readonly scene:Scene){}

  impact(x:number,z:number,skillId?:string){
    const color=colorFor(skillId),y=heightAt(x,z)+.08;
    const ring=MeshBuilder.CreateTorus('HF35_SkillImpact',{diameter:1.35,thickness:.055,tessellation:48},this.scene);
    ring.rotation.x=Math.PI/2;
    ring.position.set(x,y,z);
    ring.scaling.setAll(.18);
    const mat=material(this.scene,'HF35_SkillImpactMat',color);
    ring.material=mat;
    const light=new PointLight('HF35_SkillImpactLight',new Vector3(x,y+.72,z),this.scene);
    light.diffuse=color;light.intensity=4;light.range=8;
    disposeLater(this.scene,ring,mat,light,420,t=>{
      ring.scaling.setAll(.18+t*1.75);
      mat.alpha=1-t;
      light.intensity=4*(1-t);
    });
  }

  cast(event:GameEvent,snapshot:Snapshot){
    const skillId=event.skill;
    const def=skillId?SKILL_DEFINITIONS[skillId]:undefined;
    const actor=snapshot.players.find(p=>p.id===event.actor)??(event.actor===snapshot.self.id?snapshot.self:undefined);
    const monster=snapshot.monsters.find(m=>m.id===event.actor);
    const x=event.originX??actor?.x??monster?.x??event.x??snapshot.self.x;
    const z=event.originZ??actor?.z??monster?.z??event.z??snapshot.self.z;
    const targetMonster=event.target?snapshot.monsters.find(m=>m.id===event.target):undefined;
    const tx=event.x??targetMonster?.x??x+Math.sin(event.angle??actor?.angle??monster?.angle??0)*(def?.range??4);
    const tz=event.z??targetMonster?.z??z+Math.cos(event.angle??actor?.angle??monster?.angle??0)*(def?.range??4);
    const y=heightAt(x,z)+1.05;
    const ty=heightAt(tx,tz)+.55;
    const color=colorFor(skillId);
    const vfx=String(def?.vfx??'').toLowerCase();

    if(vfx.includes('thunder')||def?.element==='lightning'){
      this.lightning(new Vector3(tx,ty+6.5,tz),new Vector3(tx,ty,tz),color);
      return;
    }
    if(vfx.includes('arrow')||def?.animationProfile==='ranged'){
      this.projectile(new Vector3(x,y,z),new Vector3(tx,ty,z+(tz-z)),color,'arrow');
      return;
    }
    if(vfx.includes('slash')||vfx.includes('sweep')||vfx.includes('blade')||def?.animationProfile==='heavy'||def?.animationProfile==='weapon'){
      this.slash(new Vector3(x,y,z),event.angle??actor?.angle??monster?.angle??0,color,Math.max(1.4,Math.min(4.5,def?.radius??2.2)));
      return;
    }
    if(vfx.includes('fire')||vfx.includes('orb')||def?.element==='fire'){
      this.projectile(new Vector3(x,y,z),new Vector3(tx,ty,tz),color,'orb');
      return;
    }
    if(vfx.includes('frost')||vfx.includes('ice')||def?.element==='frost'){
      this.frostBurst(new Vector3(tx,ty-.35,tz),color,Math.max(1.6,Math.min(5.5,def?.radius??2.5)));
      return;
    }

    this.aura(new Vector3(x,heightAt(x,z)+.12,z),color,Math.max(1.2,Math.min(4.8,def?.radius??2)));
  }

  private projectile(from:Vector3,to:Vector3,color:Color3,shape:'orb'|'arrow'){
    const root=new TransformNode('HF35_SkillProjectile',this.scene);
    root.position.copyFrom(from);
    let mesh:Mesh;
    if(shape==='arrow'){
      mesh=MeshBuilder.CreateCylinder('HF35_SkillArrow',{height:.95,diameterTop:.025,diameterBottom:.055,tessellation:8},this.scene);
      mesh.rotation.x=Math.PI/2;
    }else{
      mesh=MeshBuilder.CreateSphere('HF35_SkillOrb',{diameter:.34,segments:16},this.scene);
    }
    mesh.parent=root;
    const mat=material(this.scene,'HF35_SkillProjectileMat',color);
    mesh.material=mat;
    const light=new PointLight('HF35_SkillProjectileLight',from.clone(),this.scene);
    light.diffuse=color;light.intensity=2.6;light.range=6;
    const distance=Vector3.Distance(from,to),duration=Math.max(220,Math.min(700,distance*42));
    disposeLater(this.scene,root,mat,light,duration,t=>{
      root.position.copyFrom(Vector3.Lerp(from,to,t));
      light.position.copyFrom(root.position);
      root.scaling.setAll(.82+Math.sin(t*Math.PI)*.38);
      mat.alpha=Math.min(1,(1-t)*1.5);
    });
  }

  private slash(origin:Vector3,angle:number,color:Color3,radius:number){
    const ring=MeshBuilder.CreateTorus('HF35_SkillSlash',{diameter:radius*1.6,thickness:.07,tessellation:64},this.scene);
    ring.position.copyFrom(origin);
    ring.rotation.x=Math.PI/2;
    ring.rotation.z=-angle;
    ring.scaling.set(.25,.25,.25);
    const mat=material(this.scene,'HF35_SkillSlashMat',color);
    ring.material=mat;
    disposeLater(this.scene,ring,mat,undefined,320,t=>{
      ring.scaling.setAll(.25+t*.95);
      ring.rotation.z=-angle+t*1.5;
      mat.alpha=1-t;
    });
  }

  private lightning(from:Vector3,to:Vector3,color:Color3){
    const points:Vector3[]=[];
    for(let i=0;i<=12;i++){
      const t=i/12;
      const p=Vector3.Lerp(from,to,t);
      if(i>0&&i<12){p.x+=(Math.sin(i*12.73)*.5);p.z+=(Math.cos(i*9.17)*.5);}
      points.push(p);
    }
    const bolt=MeshBuilder.CreateTube('HF35_SkillLightning',{path:points,radius:.045,tessellation:8},this.scene);
    const mat=material(this.scene,'HF35_SkillLightningMat',color);
    bolt.material=mat;
    const light=new PointLight('HF35_SkillLightningLight',to.clone(),this.scene);
    light.diffuse=color;light.intensity=5;light.range=9;
    disposeLater(this.scene,bolt,mat,light,260,t=>{mat.alpha=1-t;light.intensity=5*(1-t);});
  }

  private frostBurst(center:Vector3,color:Color3,radius:number){
    const root=new TransformNode('HF35_FrostBurst',this.scene);
    root.position.copyFrom(center);
    const mat=material(this.scene,'HF35_FrostBurstMat',color);
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2;
      const spike=MeshBuilder.CreateCylinder('HF35_FrostSpike',{height:.8+(i%3)*.18,diameterTop:0,diameterBottom:.18,tessellation:6},this.scene);
      spike.parent=root;spike.material=mat;
      spike.position.set(Math.cos(a)*radius*.42,.34,Math.sin(a)*radius*.42);
      spike.rotation.z=(i%2?-.18:.18);
    }
    disposeLater(this.scene,root,mat,undefined,520,t=>{
      root.scaling.setAll(.35+t*.9);
      mat.alpha=Math.min(1,(1-t)*1.5);
    });
  }

  private aura(center:Vector3,color:Color3,radius:number){
    const ring=MeshBuilder.CreateTorus('HF35_SkillAura',{diameter:radius*1.5,thickness:.045,tessellation:56},this.scene);
    ring.rotation.x=Math.PI/2;ring.position.copyFrom(center);
    const mat=material(this.scene,'HF35_SkillAuraMat',color);ring.material=mat;
    disposeLater(this.scene,ring,mat,undefined,460,t=>{
      ring.scaling.setAll(.35+t*.85);
      ring.position.y=center.y+Math.sin(t*Math.PI)*.28;
      mat.alpha=1-t;
    });
  }
}
