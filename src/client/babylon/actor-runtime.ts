import {
  AbstractMesh,
  AnimationGroup,
  AssetContainer,
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SceneLoader,
  ShadowGenerator,
  TransformNode,
  Vector3
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { MonsterDef } from '../../shared/types';
import { avatarCandidate,type AvatarCandidateId } from '../character/avatar-candidates';
import { canonicalBoneName } from '../character/bone-names';

export type ActorKind='player'|'npc'|'monster';

export interface BabylonActorInstance{
 root:TransformNode;
 visualRoot:TransformNode;
 meshes:AbstractMesh[];
 animations:AnimationGroup[];
 boneNodes:Map<string,TransformNode>;
 assetUrl?:string;
 fallback:boolean;
 targetY:number;
 update(dt:number,time:number):void;
 dispose():void;
}

const ORIGINAL_QINGLAN_AVATAR='/assets/open/p022/characters/qinglan-main.vrm';

function makeFallbackMaterial(scene:Scene,name:string,hex:string){
 const material=new PBRMaterial(name,scene);
 material.albedoColor=Color3.FromHexString(hex);
 material.roughness=.76;
 material.metallic=0;
 return material;
}

function meshBounds(meshes:AbstractMesh[]){
 let min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),found=false;
 for(const mesh of meshes){
  if(!(mesh instanceof Mesh)||mesh.getTotalVertices()<=0)continue;
  mesh.computeWorldMatrix(true);
  const box=mesh.getBoundingInfo().boundingBox;
  min=Vector3.Minimize(min,box.minimumWorld);
  max=Vector3.Maximize(max,box.maximumWorld);
  found=true;
 }
 return found?{min,max,height:Math.max(.01,max.y-min.y)}:undefined;
}

function chooseLoop(groups:AnimationGroup[]){
 const preferred=['idle','stand','breath','walk'];
 for(const token of preferred){
  const hit=groups.find(g=>g.name.toLowerCase().includes(token));
  if(hit)return hit;
 }
 return groups[0];
}

export class BabylonActorFactory{
 private containers=new Map<string,Promise<AssetContainer>>();
 constructor(private readonly scene:Scene,private readonly shadow?:ShadowGenerator){}

 private loadContainer(url:string){
  const existing=this.containers.get(url);if(existing)return existing;
  const promise=SceneLoader.LoadAssetContainerAsync('',url,this.scene,undefined,'.glb');
  this.containers.set(url,promise);
  promise.catch(()=>this.containers.delete(url));
  return promise;
 }

 private tag(meshes:AbstractMesh[],kind:ActorKind,id:string){
  const key=kind==='monster'?'monsterId':kind==='npc'?'npcId':'playerId';
  for(const mesh of meshes){
   mesh.isPickable=true;
   mesh.metadata={...(mesh.metadata??{}),[key]:id,qinglanActor:true};
   if(mesh instanceof Mesh){
    mesh.receiveShadows=true;
    try{this.shadow?.addShadowCaster(mesh,false);}catch{}
   }
  }
 }

 private procedural(kind:ActorKind,id:string,color:string,height=1.92){
  const root=new TransformNode(`HF35_${kind}_${id}`,this.scene);
  const visualRoot=new TransformNode(`HF35_${kind}_visual_${id}`,this.scene);visualRoot.parent=root;
  const material=makeFallbackMaterial(this.scene,`HF35_${kind}_mat_${id}`,color);
  const meshes:AbstractMesh[]=[];
  if(kind==='monster'){
   const body=MeshBuilder.CreateIcoSphere(`HF35_monster_body_${id}`,{radius:.58,subdivisions:2},this.scene);
   body.scaling.set(1.25,.72,1.45);body.position.y=height*.45;body.material=material;body.parent=visualRoot;meshes.push(body);
   const head=MeshBuilder.CreateIcoSphere(`HF35_monster_head_${id}`,{radius:.34,subdivisions:2},this.scene);
   head.position.set(0,height*.56,.72);head.material=material;head.parent=visualRoot;meshes.push(head);
  }else{
   const skin=makeFallbackMaterial(this.scene,`HF35_skin_${id}`,'#E7C1AE');
   const torso=MeshBuilder.CreateCapsule(`HF35_torso_${id}`,{height:height*.64,radius:height*.145},this.scene);
   torso.position.y=height*.55;torso.material=material;torso.parent=visualRoot;meshes.push(torso);
   const head=MeshBuilder.CreateSphere(`HF35_head_${id}`,{diameter:height*.22,segments:16},this.scene);
   head.position.y=height*.92;head.material=skin;head.parent=visualRoot;meshes.push(head);
  }
  const boneNodes=new Map<string,TransformNode>();
  const socket=(name:string,x:number,y:number,z:number)=>{
   const node=new TransformNode('HF35_'+id+'_'+name,this.scene);node.parent=visualRoot;node.position.set(x,y,z);boneNodes.set(name,node);return node;
  };
  socket('Head',0,height*.92,0);socket('Chest',0,height*.64,0);socket('Hips',0,height*.46,0);
  socket('LeftHand',-height*.30,height*.64,0);socket('RightHand',height*.30,height*.64,0);socket('Back',0,height*.68,height*.08);
  this.tag(meshes,kind,id);
  return this.instance(root,visualRoot,meshes,[],boneNodes,undefined,true);
 }

 private instance(root:TransformNode,visualRoot:TransformNode,meshes:AbstractMesh[],animations:AnimationGroup[],boneNodes:Map<string,TransformNode>,assetUrl:string|undefined,fallback:boolean):BabylonActorInstance{
  const active=chooseLoop(animations);
  if(active){try{active.start(true,1,active.from,active.to,false);}catch{}}
  return {
   root,visualRoot,meshes,animations,boneNodes,assetUrl,fallback,targetY:0,
   update(_dt:number,_time:number){},
   dispose(){
    for(const group of animations)try{group.dispose();}catch{}
    try{root.dispose(false,true);}catch{}
   }
  };
 }

 private async imported(kind:ActorKind,id:string,url:string,targetHeight:number,color:string){
  try{
   const container=await this.loadContainer(url);
   const entries=container.instantiateModelsToScene(name=>`HF35_${id}_${name}`,true,{doNotInstantiate:false});
   const root=new TransformNode(`HF35_${kind}_${id}`,this.scene);
   const visualRoot=new TransformNode(`HF35_${kind}_visual_${id}`,this.scene);visualRoot.parent=root;
   for(const node of entries.rootNodes??[])node.parent=visualRoot;
   const meshes:AbstractMesh[]=[];
   const nodes:TransformNode[]=[];
   for(const node of entries.rootNodes??[]){
    if(node instanceof TransformNode)nodes.push(node);
    if(node instanceof AbstractMesh)meshes.push(node);
    if('getChildMeshes' in node)meshes.push(...(node as any).getChildMeshes(false));
    if('getChildTransformNodes' in node)nodes.push(...(node as any).getChildTransformNodes(false));
   }
   const unique=[...new Set(meshes)];
   const boneNodes=new Map<string,TransformNode>();
   for(const node of [...new Set(nodes)]){
    const canonical=canonicalBoneName(node.name);
    if(canonical&&!boneNodes.has(canonical))boneNodes.set(canonical,node);
   }
   // Some glTF/VRM exporters expose joints only through Skeleton bones. Prefer linked transform nodes.
   for(const mesh of unique){
    const skeleton=(mesh as Mesh).skeleton;
    if(!skeleton)continue;
    for(const bone of skeleton.bones){
      const canonical=canonicalBoneName(bone.name);if(!canonical||boneNodes.has(canonical))continue;
      const linked=(bone as any).getTransformNode?.() as TransformNode|undefined;
      if(linked)boneNodes.set(canonical,linked);
    }
   }
   const fallbackSocket=(name:string,x:number,y:number,z:number)=>{
    if(boneNodes.has(name))return;
    const node=new TransformNode('HF35_'+id+'_socket_'+name,this.scene);node.parent=visualRoot;node.position.set(x,y,z);boneNodes.set(name,node);
   };
   fallbackSocket('Head',0,targetHeight*.92,0);fallbackSocket('Chest',0,targetHeight*.64,0);fallbackSocket('Hips',0,targetHeight*.46,0);
   fallbackSocket('LeftHand',-targetHeight*.30,targetHeight*.64,0);fallbackSocket('RightHand',targetHeight*.30,targetHeight*.64,0);fallbackSocket('Back',0,targetHeight*.68,targetHeight*.08);
   this.tag(unique,kind,id);
   const bounds=meshBounds(unique);
   if(bounds){
    const scale=targetHeight/bounds.height;
    visualRoot.scaling.setAll(scale);
    visualRoot.position.y=-bounds.min.y*scale;
   }
   for(const mesh of unique){
    const mat=(mesh as Mesh).material as PBRMaterial|undefined;
    if(mat&&'roughness' in mat){
     mat.roughness=Math.max(.32,Math.min(.9,mat.roughness??.7));
     mat.environmentIntensity=1.0;
     if(kind==='monster'&&!mat.albedoTexture)mat.albedoColor=Color3.Lerp(mat.albedoColor??Color3.White(),Color3.FromHexString(color),.16);
    }
   }
   return this.instance(root,visualRoot,unique,entries.animationGroups??[],boneNodes,url,false);
  }catch(error){
   console.warn('[HF35 Actor] asset unavailable, procedural fallback:',kind,id,url,error);
   return this.procedural(kind,id,color,targetHeight);
  }
 }

 createPlayer(id:string,candidate:AvatarCandidateId,targetHeight=1.92){
  // Preserve the user's authored avatar selection. The historical default remains qinglan-main.
  const url=avatarCandidate(candidate).url||ORIGINAL_QINGLAN_AVATAR;
  return this.imported('player',id,url,targetHeight,'#405B68');
 }

 createNpc(id:string,targetHeight=1.92){
  return this.imported('npc',id,ORIGINAL_QINGLAN_AVATAR,targetHeight,'#556B61');
 }

 createMonster(id:string,def:MonsterDef){
  const targetHeight=1.92*(def.visualHeightRatio??Math.max(.7,def.scale??1));
  const url=def.assetLocal||def.assetUrl;
  return url?this.imported('monster',id,url,targetHeight,def.color):Promise.resolve(this.procedural('monster',id,def.color,targetHeight));
 }
}
