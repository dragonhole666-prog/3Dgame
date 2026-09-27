import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { CharacterCustomization } from '../character/customization';
import { avatarCandidate,getAvatarCandidate } from '../character/avatar-candidates';
import { MONSTERS } from '../../shared/data/monsters';
import type { ItemInstance,MonsterDef,Slot } from '../../shared/types';

function material(scene:Scene,name:string,hex:string,roughness=.72){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromHexString(hex);m.roughness=roughness;m.metallic=0;return m;
}

export class ModelPreview{
 private readonly canvas=document.createElement('canvas');
 private readonly engine:Engine;
 private readonly scene:Scene;
 private readonly camera:ArcRotateCamera;
 private readonly observer:ResizeObserver;
 private root?:TransformNode;
 private time=0;

 constructor(public element:HTMLElement){
  this.canvas.style.width='100%';this.canvas.style.height='100%';this.canvas.style.display='block';this.canvas.style.touchAction='none';element.append(this.canvas);
  this.engine=new Engine(this.canvas,true,{preserveDrawingBuffer:false,stencil:true},true);
  this.scene=new Scene(this.engine);this.scene.clearColor=new Color4(0,0,0,0);
  this.camera=new ArcRotateCamera('preview-camera',-Math.PI/2,1.30,4.8,new Vector3(0,1.05,0),this.scene);
  this.camera.lowerRadiusLimit=1.5;this.camera.upperRadiusLimit=14;this.camera.wheelPrecision=45;this.camera.attachControl(this.canvas,true);
  const hemi=new HemisphericLight('preview-hemi',new Vector3(0,1,0),this.scene);hemi.diffuse=Color3.FromHexString('#CBE7F2');hemi.groundColor=Color3.FromHexString('#465D63');hemi.intensity=.72;
  const key=new DirectionalLight('preview-key',new Vector3(-.4,-.8,-.55),this.scene);key.diffuse=Color3.FromHexString('#F4CEB8');key.intensity=2.8;
  const rim=new DirectionalLight('preview-rim',new Vector3(.6,-.3,.6),this.scene);rim.diffuse=Color3.FromHexString('#7CA1B8');rim.intensity=.8;
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(element);this.resize();
 }

 private resize(){const r=this.element.getBoundingClientRect();if(r.width<2||r.height<2)return;this.engine.setSize(Math.round(r.width),Math.round(r.height));}

 private clear(){
  this.root?.dispose(false,true);this.root=undefined;
 }

 private async load(url:string,name:string,scale=1){
  this.clear();
  const root=new TransformNode(name,this.scene);this.root=root;
  try{
   const result=await SceneLoader.ImportMeshAsync('',url,'',this.scene,undefined,'.glb');
   for(const mesh of result.meshes){
    if(!mesh.parent)mesh.parent=root;
    mesh.isPickable=false;
   }
   root.scaling.setAll(scale);
   const meshes=result.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
   if(meshes.length){
    let minY=Infinity,maxY=-Infinity;
    for(const mesh of meshes){mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox;minY=Math.min(minY,b.minimumWorld.y);maxY=Math.max(maxY,b.maximumWorld.y);}
    const h=Math.max(.4,maxY-minY);root.position.y=-minY*scale;this.camera.radius=Math.max(2.2,h*1.55*scale);this.camera.target.set(0,h*.48*scale,0);
   }
   return true;
  }catch(error){
   console.warn('[BabylonPreview] asset load fallback',url,error);root.dispose(false,true);this.root=undefined;return false;
  }
 }

 private proceduralHumanoid(){
  this.clear();const root=new TransformNode('preview-humanoid',this.scene);this.root=root;
  const skin=material(this.scene,'preview-skin','#E8C3B1',.58),cloth=material(this.scene,'preview-cloth','#405B68',.82);
  const body=MeshBuilder.CreateCapsule('body',{height:1.25,radius:.28},this.scene);body.parent=root;body.position.y=1.0;body.material=cloth;
  const head=MeshBuilder.CreateSphere('head',{diameter:.42,segments:16},this.scene);head.parent=root;head.position.y=1.78;head.material=skin;
  for(const x of [-.22,.22]){const leg=MeshBuilder.CreateCapsule('leg',{height:.82,radius:.09},this.scene);leg.parent=root;leg.position.set(x*.6,.4,0);leg.material=cloth;}
  this.camera.radius=4.1;this.camera.target.set(0,1.0,0);
 }

 private proceduralMonster(def:MonsterDef){
  this.clear();const root=new TransformNode('preview-monster',this.scene);this.root=root;
  const mat=material(this.scene,'preview-monster-mat',def.color,.78);
  const body=MeshBuilder.CreateIcoSphere('monster-body',{radius:.72,subdivisions:2},this.scene);body.parent=root;body.scaling.set(1.15,.72,1.45);body.position.y=.75;body.material=mat;
  const head=MeshBuilder.CreateIcoSphere('monster-head',{radius:.42,subdivisions:2},this.scene);head.parent=root;head.position.set(0,1.0,.9);head.material=mat;
  root.scaling.setAll(def.scale??1);this.camera.radius=Math.max(3.2,(def.scale??1)*3.2);this.camera.target.set(0,.8*(def.scale??1),0);
 }

 setCharacter(_equipment:Partial<Record<Slot,ItemInstance>>,_def?:unknown,_customization?:CharacterCustomization){
  const candidate=avatarCandidate(getAvatarCandidate());
  void this.load(candidate.url,'preview-character',1).then(ok=>{if(!ok)this.proceduralHumanoid();});
 }

 resetCharacter(){this.setCharacter({});}

 setMonster(def:MonsterDef){
  const url=def.assetLocal||def.assetUrl;
  if(url){void this.load(url,'preview-'+def.id,def.scale??1).then(ok=>{if(!ok)this.proceduralMonster(def);});}
  else this.proceduralMonster(def);
 }

 update(dt:number,_time:number){
  this.time+=dt;if(this.root)this.root.rotation.y+=dt*.22;this.scene.render();
 }

 dispose(){this.observer.disconnect();this.clear();this.scene.dispose();this.engine.dispose();this.canvas.remove();}
}
