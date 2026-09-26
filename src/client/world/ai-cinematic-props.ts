import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WORLD,heightAt} from '../../shared/data/world';

type PropEntry={id:string;asset:string;position:[number,number,number];scale?:number;rotationY?:number;relativeToSpawn?:boolean;groundOffset?:number};
type Manifest={version:number;props:PropEntry[]};

const loader=new GLTFLoader();
function polishGeneratedModel(root:T.Object3D,castShadow:boolean){
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;o.castShadow=castShadow;o.receiveShadow=true;
  const wasArray=Array.isArray(o.material),materials=wasArray?o.material:[o.material];
  const next=materials.map((source:T.Material)=>{
   if(source instanceof T.MeshStandardMaterial){
    const m=source.clone();if(m.map)m.map.colorSpace=T.SRGBColorSpace;
    m.roughness=T.MathUtils.clamp(m.roughness,.2,.9);m.metalness=T.MathUtils.clamp(m.metalness,0,.72);m.envMapIntensity=1.0;m.dithering=true;return m;
   }
   const any=source as T.Material&{color?:T.Color;map?:T.Texture};
   return new T.MeshStandardMaterial({color:any.color?.clone()??new T.Color('#ffffff'),map:any.map??null,roughness:.62,metalness:.04});
  });
  o.material=wasArray?next:next[0];
 });
}

export class AiCinematicPropLayer{
  readonly root=new T.Group();
  private disposed=false;
  private detail:'low'|'balanced'|'high';
  constructor(parent:T.Object3D,detail:'low'|'balanced'|'high'='balanced'){
    this.detail=detail;this.root.name='HF25_AI_Cinematic_API_Props';parent.add(this.root);void this.loadManifest();
  }
  private async loadManifest(){
    try{
      const response=await fetch('/assets/ai-models/manifest.json',{cache:'no-store'});if(!response.ok)return;
      const manifest=await response.json() as Manifest;
      for(const entry of manifest.props??[]){if(this.disposed)break;await this.loadProp(entry);}
    }catch(error){console.warn('[HF25] AI prop manifest skipped.',error);}
  }
  private async loadProp(entry:PropEntry){
    try{
      const gltf=await loader.loadAsync(entry.asset);if(this.disposed)return;
      const model=gltf.scene.clone(true);model.name=`AIProp:${entry.id}`;
      const [px,py,pz]=entry.position??[0,0,0],x=entry.relativeToSpawn?WORLD.spawn.x+px:px,z=entry.relativeToSpawn?WORLD.spawn.z+pz:pz;
      const y=entry.relativeToSpawn?heightAt(x,z)+py+Number(entry.groundOffset||0):py;
      model.position.set(x,y,z);model.rotation.y=Number(entry.rotationY||0);model.scale.setScalar(Number(entry.scale||1));
      polishGeneratedModel(model,this.detail!=='low');this.root.add(model);
    }catch(error){console.warn(`[HF25] AI prop failed: ${entry.id}`,error);}
  }
  setDetail(detail:'low'|'balanced'|'high'){this.detail=detail;this.root.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=detail!=='low';});}
  dispose(){this.disposed=true;this.root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});this.root.removeFromParent();}
}
