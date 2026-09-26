import {
  CascadedShadowGenerator,
  Color3,
  DirectionalLight,
  Material,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial,
  Plane,
  Scene,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';
import { color3, type ReferenceLookProfile } from '../rendering/referenceProfile';

export interface P0WorldRuntime {
  applyProfile(profile:ReferenceLookProfile):void;
}

type P0Materials={
  ground:PBRMaterial;
  grass:PBRMaterial;
  lakeDeep:PBRMaterial;
  water:PBRMaterial;
  wood:PBRMaterial;
  roof:PBRMaterial;
  stone:PBRMaterial;
  mapleShadow:PBRMaterial;
  mapleBase:PBRMaterial;
  mapleLit:PBRMaterial;
  mapleHighlight:PBRMaterial;
  mountain:PBRMaterial;
};

function pbr(name:string,scene:Scene,color:string,roughness:number,metallic=0){
  const material=new PBRMaterial(name,scene);
  material.albedoColor=color3(color);
  material.roughness=roughness;
  material.metallic=metallic;
  material.environmentIntensity=0.9;
  return material;
}

function makeMaterials(scene:Scene,profile:ReferenceLookProfile):P0Materials{
  const water=pbr('P0_WaterMaterial',scene,profile.water.shallow,profile.water.roughness,0.02);
  water.alpha=profile.water.alpha;
  water.transparencyMode=Material.MATERIAL_ALPHABLEND;
  water.indexOfRefraction=1.333;
  water.microSurface=0.96;

  const mountain=pbr('P0_MountainMaterial',scene,'#607F91',0.96,0);
  mountain.environmentIntensity=0.42;

  return {
    ground:pbr('P0_GroundMaterial',scene,'#65765A',0.96),
    grass:pbr('P0_GrassMaterial',scene,profile.foliage.grassBase,0.92),
    lakeDeep:pbr('P0_LakeDeepMaterial',scene,profile.water.deep,0.98),
    water,
    wood:pbr('P0_WoodMaterial',scene,profile.architecture.woodBase,0.72),
    roof:pbr('P0_RoofMaterial',scene,profile.architecture.roofDeep,0.62),
    stone:pbr('P0_StoneMaterial',scene,profile.architecture.stoneLit,0.9),
    mapleShadow:pbr('P0_MapleShadow',scene,profile.foliage.mapleShadow,0.9),
    mapleBase:pbr('P0_MapleBase',scene,profile.foliage.mapleBase,0.88),
    mapleLit:pbr('P0_MapleLit',scene,profile.foliage.mapleLit,0.86),
    mapleHighlight:pbr('P0_MapleHighlight',scene,profile.foliage.mapleHighlight,0.84),
    mountain
  };
}

function createMountain(scene:Scene,material:PBRMaterial,x:number,z:number,width:number,height:number,depth:number){
  const mountain=MeshBuilder.CreateCylinder('P0_Mountain',{
    height,
    diameterTop:width*0.08,
    diameterBottom:width,
    tessellation:7,
    subdivisions:3
  },scene);
  mountain.position.set(x,height*0.5-0.2,z);
  mountain.scaling.z=depth/width;
  mountain.rotation.y=0.18+x*0.01;
  mountain.material=material;
  mountain.receiveShadows=true;
  return mountain;
}

function createMaple(
  scene:Scene,
  materials:P0Materials,
  shadow:CascadedShadowGenerator,
  x:number,
  z:number,
  scale:number,
  variant:number
){
  const trunk=MeshBuilder.CreateCylinder('P0_MapleTrunk',{height:4.8*scale,diameterTop:.22*scale,diameterBottom:.58*scale,tessellation:8},scene);
  trunk.position.set(x,2.4*scale,z);
  trunk.rotation.z=(variant%2?-.08:.08);
  trunk.material=materials.wood;
  shadow.addShadowCaster(trunk);

  const crownSource=MeshBuilder.CreateIcoSphere('P0_MapleCrown',{radius:1.35*scale,subdivisions:2},scene);
  crownSource.position.set(x,4.6*scale,z);
  crownSource.scaling.set(1.55,0.55,1.2);
  crownSource.material=variant%4===0?materials.mapleHighlight:variant%4===1?materials.mapleLit:variant%4===2?materials.mapleBase:materials.mapleShadow;
  shadow.addShadowCaster(crownSource);

  const offsets=[
    [-1.0,.25,.10,.80],
    [.95,.18,.15,.75],
    [-.25,.32,-.72,.72],
    [.30,.48,.74,.64],
    [0,.78,.05,.62]
  ] as const;

  offsets.forEach(([ox,oy,oz,s],index)=>{
    const crown=crownSource.createInstance('P0_MapleCrownInstance');
    crown.position.set(x+ox*scale,4.6*scale+oy*scale,z+oz*scale);
    crown.scaling.set(1.55*s,0.55*s,1.2*s);
    crown.rotation.y=index*.71+variant*.23;
    shadow.addShadowCaster(crown);
  });

  return trunk;
}

function createPavilion(scene:Scene,materials:P0Materials,shadow:CascadedShadowGenerator,x:number,z:number,scale=1){
  const root=new Mesh('P0_PavilionRoot',scene);
  root.position.set(x,0,z);
  root.scaling.setAll(scale);

  const base=MeshBuilder.CreateCylinder('P0_PavilionBase',{height:.45,diameter:7,tessellation:8},scene);
  base.parent=root;
  base.position.y=.3;
  base.material=materials.stone;
  base.receiveShadows=true;

  const columnPositions=[[-2.1,-1.55],[2.1,-1.55],[-2.1,1.55],[2.1,1.55]] as const;
  for(const [cx,cz] of columnPositions){
    const column=MeshBuilder.CreateCylinder('P0_PavilionColumn',{height:4.2,diameter:.38,tessellation:10},scene);
    column.parent=root;
    column.position.set(cx,2.55,cz);
    column.material=materials.wood;
    shadow.addShadowCaster(column);
  }

  const beam=MeshBuilder.CreateBox('P0_PavilionBeam',{width:5.3,height:.38,depth:.42},scene);
  beam.parent=root;
  beam.position.set(0,4.35,-1.7);
  beam.material=materials.wood;
  shadow.addShadowCaster(beam);
  const beam2=beam.clone('P0_PavilionBeamBack')!;
  beam2.position.z=1.7;

  const roof=MeshBuilder.CreateCylinder('P0_PavilionRoof',{height:1.15,diameterTop:.35,diameterBottom:8.5,tessellation:4},scene);
  roof.parent=root;
  roof.position.y=5.25;
  roof.rotation.y=Math.PI*.25;
  roof.scaling.y=.62;
  roof.material=materials.roof;
  shadow.addShadowCaster(roof);

  const upper=MeshBuilder.CreateCylinder('P0_PavilionRoofCap',{height:.6,diameterTop:.1,diameterBottom:4.2,tessellation:4},scene);
  upper.parent=root;
  upper.position.y=5.85;
  upper.rotation.y=Math.PI*.25;
  upper.scaling.y=.55;
  upper.material=materials.roof;
  shadow.addShadowCaster(upper);

  return root;
}

function createBridge(scene:Scene,materials:P0Materials,shadow:CascadedShadowGenerator){
  const segments=21;
  for(let i=0;i<segments;i++){
    const t=i/(segments-1);
    const x=-5.4+t*10.8;
    const y=.42+1.52*(1-Math.pow((t-.5)*2,2));
    const nextT=Math.min(1,t+1/(segments-1));
    const nextY=.42+1.52*(1-Math.pow((nextT-.5)*2,2));
    const deck=MeshBuilder.CreateBox('P0_BridgeDeck',{width:.62,height:.34,depth:2.15},scene);
    deck.position.set(x,y,2.2);
    deck.rotation.z=Math.atan2(nextY-y,.54);
    deck.material=materials.stone;
    deck.receiveShadows=true;
    shadow.addShadowCaster(deck);

    if(i%2===0){
      for(const side of [-1,1]){
        const post=MeshBuilder.CreateCylinder('P0_BridgePost',{height:1.18,diameter:.16,tessellation:8},scene);
        post.position.set(x,y+.66,2.2+side*1.12);
        post.material=materials.stone;
        shadow.addShadowCaster(post);
      }
    }
  }
}

function createFlowerBand(scene:Scene,x:number,z:number,width:number,count:number){
  const material=new StandardMaterial('P0_FlowerBandMaterial',scene);
  material.diffuseColor=Color3.FromHexString('#D98DA4');
  material.emissiveColor=Color3.FromHexString('#5C1F31');
  material.alpha=.9;
  const source=MeshBuilder.CreateSphere('P0_Flower',{diameter:.13,segments:4},scene);
  source.material=material;
  source.position.set(x,.18,z);
  for(let i=1;i<count;i++){
    const t=i/(count-1);
    const flower=source.createInstance('P0_FlowerInstance');
    const wave=Math.sin(i*1.7)*.26;
    flower.position.set(x+(t-.5)*width,.18+((i%3)*.025),z+wave);
    flower.scaling.setAll(.75+(i%5)*.08);
  }
}

export function createP0ReferenceWorld(scene:Scene,sun:DirectionalLight,profile:ReferenceLookProfile):P0WorldRuntime{
  const materials=makeMaterials(scene,profile);

  sun.shadowMinZ=1;
  sun.shadowMaxZ=90;
  const shadow=new CascadedShadowGenerator(2048,sun);
  shadow.numCascades=4;
  shadow.lambda=.72;
  shadow.bias=.0007;
  shadow.normalBias=.035;
  shadow.darkness=.22;
  shadow.autoCalcDepthBounds=true;

  const ground=MeshBuilder.CreateGround('P0_Ground',{width:54,height:50,subdivisions:2},scene);
  ground.position.y=-.06;
  ground.position.z=5;
  ground.material=materials.ground;
  ground.receiveShadows=true;

  const leftBank=MeshBuilder.CreateGround('P0_LeftBank',{width:11,height:28,subdivisions:2},scene);
  leftBank.position.set(-15,.03,1);
  leftBank.material=materials.grass;
  leftBank.receiveShadows=true;

  const rightBank=leftBank.clone('P0_RightBank')!;
  rightBank.position.x=15;

  const backBank=MeshBuilder.CreateGround('P0_BackBank',{width:38,height:10,subdivisions:2},scene);
  backBank.position.set(0,.04,16);
  backBank.material=materials.grass;
  backBank.receiveShadows=true;

  createMountain(scene,materials.mountain,-13,29,10,18,8);
  createMountain(scene,materials.mountain,-4,32,8,14,7);
  createMountain(scene,materials.mountain,7,31,11,20,8);
  createMountain(scene,materials.mountain,17,34,9,16,6);
  createMountain(scene,materials.mountain,24,39,7,12,6);

  createBridge(scene,materials,shadow);
  createPavilion(scene,materials,shadow,-9.4,7.2,1.0);
  createPavilion(scene,materials,shadow,7.7,12.0,.72);

  const maples=[
    [-11,4.6,1.35,0],[-7,9.5,1.05,1],[-14,12.5,1.15,2],
    [8.7,5.2,1.45,3],[13,7.8,1.05,4],[10.5,12.5,.9,5],
    [-4,14.2,.85,6],[3.5,14.4,.9,7]
  ] as const;
  maples.forEach(([x,z,s,v])=>createMaple(scene,materials,shadow,x,z,s,v));

  createFlowerBand(scene,-8.5,1.2,8,44);
  createFlowerBand(scene,9.6,1.0,7,40);
  createFlowerBand(scene,0,13.0,12,52);

  const lakeBed=MeshBuilder.CreateGround('P0_LakeBed',{width:30,height:27,subdivisions:2},scene);
  lakeBed.position.set(0,.015,2.4);
  lakeBed.material=materials.lakeDeep;
  lakeBed.receiveShadows=true;

  const mistMaterial=new StandardMaterial('P0_MistMaterial',scene);
  mistMaterial.diffuseColor=color3('#B7D4DE');
  mistMaterial.emissiveColor=color3('#9EC7D5');
  mistMaterial.alpha=.075;
  mistMaterial.disableLighting=true;
  mistMaterial.backFaceCulling=false;
  [
    [-3.8,1.05,8.2,4.8,1.25],
    [2.2,.9,9.6,3.9,1.0],
    [6.8,1.2,11.8,4.2,1.15],
    [-8.0,.8,12.2,3.2,.9]
  ].forEach(([x,y,z,sx,sz],index)=>{
    const mist=MeshBuilder.CreateSphere('P0_Mist',{diameter:2,segments:12},scene);
    mist.position.set(x,y,z);
    mist.scaling.set(sx,.22,sz);
    mist.material=mistMaterial;
    mist.visibility=.82-index*.08;
  });

  const water=MeshBuilder.CreateGround('P0_Lake',{width:30,height:27,subdivisions:32},scene);
  water.position.set(0,.08,2.4);
  water.material=materials.water;
  water.receiveShadows=true;

  const mirror=new MirrorTexture('P0_WaterMirror',1024,scene,true);
  mirror.mirrorPlane=new Plane(0,-1,0,.09);
  mirror.level=profile.water.reflection;
  mirror.adaptiveBlurKernel=18;
  materials.water.reflectionTexture=mirror;
  mirror.renderList=scene.meshes.filter(mesh=>mesh!==water && !mesh.name.includes('Ground'));

  const applyProfile=(next:ReferenceLookProfile)=>{
    materials.grass.albedoColor=color3(next.foliage.grassBase);
    materials.mapleShadow.albedoColor=color3(next.foliage.mapleShadow);
    materials.mapleBase.albedoColor=color3(next.foliage.mapleBase);
    materials.mapleLit.albedoColor=color3(next.foliage.mapleLit);
    materials.mapleHighlight.albedoColor=color3(next.foliage.mapleHighlight);
    materials.lakeDeep.albedoColor=color3(next.water.deep);
    materials.water.albedoColor=color3(next.water.shallow);
    materials.water.roughness=next.water.roughness;
    materials.water.alpha=next.water.alpha;
    mirror.level=next.water.reflection;
    materials.wood.albedoColor=color3(next.architecture.woodBase);
    materials.roof.albedoColor=color3(next.architecture.roofDeep);
    materials.stone.albedoColor=color3(next.architecture.stoneLit);
  };

  return {applyProfile};
}
