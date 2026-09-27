import {
  AbstractMesh,
  AssetContainer,
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { ItemInstance,Slot } from '../../shared/types';
import { ITEMS,APPEARANCES } from '../../shared/data/equipment';
import type { BabylonActorInstance } from './actor-runtime';

type Socket='Head'|'Chest'|'Hips'|'LeftHand'|'RightHand'|'Back';

type EquipmentVisualSpec={
  url:string;
  socket:Socket;
  targetSize?:number;
  targetLength?:number;
  rotation?:[number,number,number];
  offset?:[number,number,number];
};

const CURATED:Record<string,EquipmentVisualSpec>={
  'cloth-head':{url:'/assets/equipment/cloth_head.glb',socket:'Head',targetSize:.42},
  'jade-crown':{url:'/assets/equipment/jade_crown.glb',socket:'Head',targetSize:.44},
  'primordial-god-crown':{url:'/assets/user-equipment/divine_helmet.glb',socket:'Head',targetSize:.46,rotation:[0,Math.PI,0],offset:[0,.08,0]},
  'iron-sword':{url:'/assets/equipment/iron_sword.glb',socket:'RightHand',targetLength:1.05,rotation:[0,0,Math.PI]},
  'thunder-sword':{url:'/assets/equipment/thunder_sword.glb',socket:'RightHand',targetLength:1.45,rotation:[0,0,Math.PI]},
  'heaven-sword':{url:'/assets/equipment/heaven_sword.glb',socket:'RightHand',targetLength:1.65,rotation:[0,0,Math.PI]},
  'bamboo-sword':{url:'/assets/equipment/qinglan_immortal_jian.glb',socket:'RightHand',targetLength:1.18,rotation:[0,0,Math.PI]},
  'cloud-sword':{url:'/assets/equipment/qinglan_immortal_jian.glb',socket:'RightHand',targetLength:1.32,rotation:[0,0,Math.PI]},
  'mythic-sword':{url:'/assets/user-equipment/ice-mythic-sword.glb',socket:'RightHand',targetLength:1.72},
  'heavenfall-bow':{url:'/assets/user-equipment/mythic_demon_bow.glb',socket:'LeftHand',targetLength:1.58},
  'celestial-burial-spear':{url:'/assets/user-equipment/mythic_demon_spear.glb',socket:'RightHand',targetLength:2.35},
  'demon-king-shield':{url:'/assets/user-equipment/demon_king_shield.glb',socket:'LeftHand',targetSize:.78,rotation:[0,Math.PI/2,0],offset:[0,0,.1]},
};

const SOCKET_BY_SLOT:Partial<Record<Slot,Socket>>={
  head:'Head',chest:'Chest',fashion:'Chest',cape:'Back',back:'Back',
  waist:'Hips',charm:'Hips',neck:'Chest',
  mainhand:'RightHand',offhand:'LeftHand'
};

const BODY_ASSET:Record<string,string>={
  'linen-robe':'/assets/equipment/linen_robe.glb',
  'cloud-robe':'/assets/equipment/cloud_robe.glb',
  'thunder-armor':'/assets/equipment/thunder_armor.glb',
  'snow-fashion':'/assets/equipment/snow_fashion.glb',
  'linen-legs':'/assets/equipment/linen_legs.glb',
  'scale-legs':'/assets/equipment/scale_legs.glb',
  'linen-boots':'/assets/equipment/linen_boots.glb',
  'cloud-boots':'/assets/equipment/cloud_boots.glb',
  'thunder-boots':'/assets/equipment/thunder_boots.glb',
  'cloth-wrists':'/assets/equipment/cloth_wrists.glb',
  'thunder-bracers':'/assets/equipment/thunder_bracers.glb',
  'woven-belt':'/assets/equipment/woven_belt.glb',
  'thunder-belt':'/assets/equipment/thunder_belt.glb',
};

function bounds(meshes:AbstractMesh[]){
  let min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),found=false;
  for(const mesh of meshes){
    if(!(mesh instanceof Mesh)||mesh.getTotalVertices()<=0)continue;
    mesh.computeWorldMatrix(true);
    const box=mesh.getBoundingInfo().boundingBox;
    min=Vector3.Minimize(min,box.minimumWorld);max=Vector3.Maximize(max,box.maximumWorld);found=true;
  }
  return found?{min,max,size:max.subtract(min)}:undefined;
}

function resolveSpec(itemId:string,slot:Slot):EquipmentVisualSpec|undefined{
  const curated=CURATED[itemId];if(curated)return curated;
  const base=ITEMS[itemId],appearance=base?.appearanceId?APPEARANCES[base.appearanceId]:undefined;
  const explicit=[BODY_ASSET[itemId],base?.mesh,appearance?.mesh].find(v=>typeof v==='string'&&v.startsWith('/assets/')&&/\.(?:glb|gltf)$/i.test(v));
  if(!explicit)return undefined;
  const socket=SOCKET_BY_SLOT[slot];if(!socket)return undefined;
  return {url:explicit,socket,targetSize:slot==='head'?.45:undefined,targetLength:slot==='mainhand'?appearance?.length:undefined};
}

function proceduralFallback(scene:Scene,itemId:string,slot:Slot,parent:TransformNode){
  const mat=new PBRMaterial('HF35_EquipmentFallbackMat_'+itemId,scene);
  const base=ITEMS[itemId],appearance=base?.appearanceId?APPEARANCES[base.appearanceId]:undefined;
  mat.albedoColor=Color3.FromHexString(appearance?.color??'#8AA0A5');mat.roughness=.62;mat.metallic=.08;
  let mesh:Mesh;
  if(slot==='mainhand'){
    mesh=MeshBuilder.CreateBox('HF35_WeaponFallback_'+itemId,{width:.07,height:appearance?.length??1.2,depth:.045},scene);
    mesh.position.y=(appearance?.length??1.2)*.42;
  }else if(slot==='offhand'){
    mesh=MeshBuilder.CreateCylinder('HF35_OffhandFallback_'+itemId,{height:.08,diameter:.72,tessellation:24},scene);mesh.rotation.x=Math.PI/2;
  }else{
    mesh=MeshBuilder.CreateBox('HF35_EquipmentFallback_'+itemId,{size:.28},scene);
  }
  mesh.material=mat;mesh.parent=parent;mesh.isPickable=false;return [mesh];
}

export class BabylonEquipmentLayer{
  private readonly containers=new Map<string,Promise<AssetContainer>>();
  private readonly equipped=new Map<Slot,{itemId:string;root:TransformNode;meshes:AbstractMesh[]}>();
  private disposed=false;

  constructor(private readonly scene:Scene,private readonly actor:BabylonActorInstance){}

  private container(url:string){
    const cached=this.containers.get(url);if(cached)return cached;
    const promise=SceneLoader.LoadAssetContainerAsync('',url,this.scene,undefined,'.glb');
    this.containers.set(url,promise);promise.catch(()=>this.containers.delete(url));return promise;
  }

  private clearSlot(slot:Slot){
    const old=this.equipped.get(slot);if(!old)return;
    try{old.root.dispose(false,true);}catch{}
    this.equipped.delete(slot);
  }

  private async equip(slot:Slot,item:ItemInstance){
    const itemId=item.baseId,existing=this.equipped.get(slot);
    if(existing?.itemId===itemId)return;
    this.clearSlot(slot);
    const spec=resolveSpec(itemId,slot);
    if(!spec)return;
    const socket=this.actor.boneNodes.get(spec.socket)??this.actor.visualRoot;
    const root=new TransformNode('HF35_Equipment_'+slot+'_'+itemId,this.scene);root.parent=socket;
    const [ox,oy,oz]=spec.offset??[0,0,0];root.position.set(ox,oy,oz);
    const [rx,ry,rz]=spec.rotation??[0,0,0];root.rotation.set(rx,ry,rz);
    const record={itemId,root,meshes:[] as AbstractMesh[]};this.equipped.set(slot,record);

    try{
      const container=await this.container(spec.url);
      if(this.disposed||this.equipped.get(slot)!==record)return;
      const entries=container.instantiateModelsToScene(n=>'HF35_EQ_'+itemId+'_'+n,true,{doNotInstantiate:false});
      for(const node of entries.rootNodes??[])node.parent=root;
      const meshes:AbstractMesh[]=[];
      for(const node of entries.rootNodes??[]){
        if(node instanceof AbstractMesh)meshes.push(node);
        if('getChildMeshes' in node)meshes.push(...(node as any).getChildMeshes(false));
      }
      record.meshes=[...new Set(meshes)];
      const b=bounds(record.meshes);
      if(b){
        const longest=Math.max(b.size.x,b.size.y,b.size.z,.001);
        const target=spec.targetLength??spec.targetSize;
        if(target){const scale=target/longest;root.scaling.setAll(scale);}
      }
      for(const mesh of record.meshes){mesh.isPickable=false;mesh.receiveShadows=true;}
    }catch(error){
      console.warn('[HF35 Equipment] asset unavailable; fallback retained',itemId,spec.url,error);
      if(this.equipped.get(slot)===record)record.meshes=proceduralFallback(this.scene,itemId,slot,root);
    }
  }

  sync(equipment:Partial<Record<Slot,ItemInstance>>){
    const desired=new Set<Slot>();
    for(const [slot,item] of Object.entries(equipment) as [Slot,ItemInstance][]){
      if(!item)continue;desired.add(slot);void this.equip(slot,item);
    }
    for(const slot of [...this.equipped.keys()])if(!desired.has(slot))this.clearSlot(slot);
  }

  dispose(){
    this.disposed=true;
    for(const slot of [...this.equipped.keys()])this.clearSlot(slot);
    this.containers.clear();
  }
}
