import {
  CascadedShadowGenerator,
  Color3,
  DirectionalLight,
  DynamicTexture,
  Material,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial,
  Plane,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData
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
  stoneDark:PBRMaterial;
  mapleShadow:PBRMaterial;
  mapleBase:PBRMaterial;
  mapleLit:PBRMaterial;
  mapleHighlight:PBRMaterial;
  mountainNear:PBRMaterial;
  mountainFar:PBRMaterial;
};

function pbr(name:string,scene:Scene,color:string,roughness:number,metallic=0){
  const material=new PBRMaterial(name,scene);
  material.albedoColor=color3(color);
  material.roughness=roughness;
  material.metallic=metallic;
  material.environmentIntensity=.78;
  return material;
}

function makeMaterials(scene:Scene,profile:ReferenceLookProfile):P0Materials{
  const water=pbr('P0_WaterMaterial',scene,profile.water.shallow,profile.water.roughness,.01);
  water.alpha=profile.water.alpha;
  water.transparencyMode=Material.MATERIAL_ALPHABLEND;
  water.indexOfRefraction=1.333;
  water.microSurface=.97;
  water.clearCoat.isEnabled=true;
  water.clearCoat.intensity=.48;
  water.clearCoat.roughness=.08;

  const mountainNear=pbr('P0_MountainNear',scene,'#4E6F80',.98,0);
  const mountainFar=pbr('P0_MountainFar',scene,'#7897A5',1,0);
  mountainNear.environmentIntensity=.25;
  mountainFar.environmentIntensity=.18;

  return {
    ground:pbr('P0_GroundMaterial',scene,'#596A50',.98),
    grass:pbr('P0_GrassMaterial',scene,profile.foliage.grassBase,.94),
    lakeDeep:pbr('P0_LakeDeepMaterial',scene,profile.water.deep,.99),
    water,
    wood:pbr('P0_WoodMaterial',scene,profile.architecture.woodBase,.76),
    roof:pbr('P0_RoofMaterial',scene,profile.architecture.roofDeep,.66),
    stone:pbr('P0_StoneMaterial',scene,profile.architecture.stoneLit,.92),
    stoneDark:pbr('P0_StoneDarkMaterial',scene,profile.architecture.stoneDeep,.95),
    mapleShadow:pbr('P0_MapleShadow',scene,profile.foliage.mapleShadow,.92),
    mapleBase:pbr('P0_MapleBase',scene,profile.foliage.mapleBase,.9),
    mapleLit:pbr('P0_MapleLit',scene,profile.foliage.mapleLit,.88),
    mapleHighlight:pbr('P0_MapleHighlight',scene,profile.foliage.mapleHighlight,.86),
    mountainNear,
    mountainFar
  };
}

function noise(seed:number,index:number){
  return Math.sin(seed*12.9898+index*78.233)*.5+.5;
}

function createSkyBackdrop(scene:Scene){
  const texture=new DynamicTexture('P0_SkyGradient',{width:32,height:512},scene,false);
  const ctx=texture.getContext();
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#78BFE0');
  gradient.addColorStop(.46,'#A8D3E5');
  gradient.addColorStop(1,'#D8E9EE');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,32,512);
  texture.update();

  const material=new StandardMaterial('P0_SkyBackdropMaterial',scene);
  material.diffuseTexture=texture;
  material.emissiveTexture=texture;
  material.disableLighting=true;
  material.backFaceCulling=false;

  const sky=MeshBuilder.CreatePlane('P0_SkyBackdrop',{width:150,height:78,sideOrientation:Mesh.DOUBLESIDE},scene);
  sky.position.set(0,28,64);
  sky.material=material;
  sky.applyFog=false;
  sky.isPickable=false;
  return sky;
}

function createKarstMountain(
  scene:Scene,
  material:PBRMaterial,
  x:number,
  z:number,
  width:number,
  height:number,
  depth:number,
  seed:number
){
  const segments=24;
  const ringHeights=[0,height*.22,height*.52,height*.78,height*.94];
  const ringRadius=[1,.90,.69,.47,.20];
  const positions:number[]=[];
  const indices:number[]=[];
  const normals:number[]=[];

  for(let ring=0;ring<ringHeights.length;ring++){
    const radius=(width*.5)*ringRadius[ring];
    const y=ringHeights[ring];
    for(let i=0;i<segments;i++){
      const angle=(i/segments)*Math.PI*2;
      const jitter=.82+noise(seed+ring*.37,i)*.34;
      const leanX=(ring/(ringHeights.length-1))*(noise(seed,91)-.5)*width*.24;
      const leanZ=(ring/(ringHeights.length-1))*(noise(seed,92)-.5)*depth*.20;
      positions.push(
        Math.cos(angle)*radius*jitter+leanX,
        y+(noise(seed+ring,100+i)-.5)*height*.025,
        Math.sin(angle)*(depth*.5)*ringRadius[ring]*(.86+noise(seed+7,i)*.22)+leanZ
      );
    }
  }

  for(let ring=0;ring<ringHeights.length-1;ring++){
    for(let i=0;i<segments;i++){
      const next=(i+1)%segments;
      const a=ring*segments+i;
      const b=ring*segments+next;
      const c=(ring+1)*segments+i;
      const d=(ring+1)*segments+next;
      indices.push(a,c,b,b,c,d);
    }
  }

  VertexData.ComputeNormals(positions,indices,normals);
  const mesh=new Mesh('P0_KarstMountain',scene);
  const data=new VertexData();
  data.positions=positions;
  data.indices=indices;
  data.normals=normals;
  data.applyToMesh(mesh);
  mesh.position.set(x,-.15,z);
  mesh.material=material;
  mesh.receiveShadows=true;

  for(let lobe=0;lobe<2;lobe++){
    const bulb=MeshBuilder.CreateIcoSphere('P0_KarstLobe',{radius:1,subdivisions:3},scene);
    bulb.position.set(
      x+(lobe===0?-1:1)*width*(.18+noise(seed,30+lobe)*.08),
      height*(.30+lobe*.16),
      z+(noise(seed,40+lobe)-.5)*depth*.18
    );
    bulb.scaling.set(width*(.26-lobe*.035),height*(.32-lobe*.045),depth*(.26-lobe*.035));
    bulb.material=material;
    bulb.receiveShadows=true;
  }

  const cap=MeshBuilder.CreateIcoSphere('P0_KarstCap',{radius:1,subdivisions:3},scene);
  cap.position.set(x+(noise(seed,91)-.5)*width*.18,height*.93,z+(noise(seed,92)-.5)*depth*.15);
  cap.scaling.set(width*.14,height*.11,depth*.14);
  cap.material=material;
  cap.receiveShadows=true;

  return mesh;
}

function addBranch(
  scene:Scene,
  material:PBRMaterial,
  shadow:CascadedShadowGenerator,
  start:Vector3,
  end:Vector3,
  diameter:number
){
  const direction=end.subtract(start);
  const length=direction.length();
  const branch=MeshBuilder.CreateCylinder('P0_MapleBranch',{
    height:length,
    diameterTop:diameter*.58,
    diameterBottom:diameter,
    tessellation:8
  },scene);
  branch.position=start.add(end).scale(.5);
  branch.material=material;
  branch.alignWithNormal(direction.normalize());
  shadow.addShadowCaster(branch);
  return branch;
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
  const trunk=MeshBuilder.CreateCylinder('P0_MapleTrunk',{
    height:4.7*scale,
    diameterTop:.22*scale,
    diameterBottom:.62*scale,
    tessellation:10
  },scene);
  trunk.position.set(x,2.35*scale,z);
  trunk.rotation.z=(variant%2?-.045:.05);
  trunk.material=materials.wood;
  shadow.addShadowCaster(trunk);

  const branchBase=new Vector3(x,3.55*scale,z);
  addBranch(scene,materials.wood,shadow,branchBase,new Vector3(x-1.15*scale,4.5*scale,z+.2*scale),.23*scale);
  addBranch(scene,materials.wood,shadow,branchBase,new Vector3(x+.95*scale,4.65*scale,z-.15*scale),.21*scale);
  addBranch(scene,materials.wood,shadow,new Vector3(x,3.85*scale,z),new Vector3(x+.15*scale,5.2*scale,z+.78*scale),.18*scale);

  const foliageMaterials=[
    materials.mapleShadow,
    materials.mapleBase,
    materials.mapleLit,
    materials.mapleHighlight
  ];

  const centers=[
    new Vector3(x-1.05*scale,4.62*scale,z+.15*scale),
    new Vector3(x+.95*scale,4.72*scale,z-.12*scale),
    new Vector3(x+.2*scale,5.35*scale,z+.72*scale)
  ];

  for(let i=0;i<18;i++){
    const center=centers[i%centers.length];
    const angle=(i/18)*Math.PI*2+variant*.41;
    const radius=(.32+noise(variant+2,i)*1.05)*scale;
    const yLift=(noise(variant+5,i)-.35)*1.05*scale;
    const blob=MeshBuilder.CreateIcoSphere('P0_MapleFoliage',{radius:.72*scale,subdivisions:2},scene);
    blob.position.set(
      center.x+Math.cos(angle)*radius,
      center.y+yLift,
      center.z+Math.sin(angle)*radius*.68
    );
    const size=.72+noise(variant+9,i)*.62;
    blob.scaling.set(size*1.25,size*.72,size);
    blob.rotation.set(noise(variant,80+i)*.4,angle,noise(variant,120+i)*.35);
    blob.material=foliageMaterials[(i+variant)%foliageMaterials.length];
    blob.receiveShadows=true;
    shadow.addShadowCaster(blob);
  }

  return trunk;
}

function createPavilion(
  scene:Scene,
  materials:P0Materials,
  shadow:CascadedShadowGenerator,
  x:number,
  z:number,
  scale=1
){
  const root=new Mesh('P0_PavilionRoot',scene);
  root.position.set(x,0,z);
  root.scaling.setAll(scale);

  const base=MeshBuilder.CreateCylinder('P0_PavilionBase',{height:.42,diameter:7.2,tessellation:8},scene);
  base.parent=root;
  base.position.y=.25;
  base.material=materials.stoneDark;
  base.receiveShadows=true;

  const floor=MeshBuilder.CreateCylinder('P0_PavilionFloor',{height:.18,diameter:6.7,tessellation:8},scene);
  floor.parent=root;
  floor.position.y=.53;
  floor.material=materials.stone;
  floor.receiveShadows=true;

  const columnPositions=[[-2.1,-1.55],[2.1,-1.55],[-2.1,1.55],[2.1,1.55]] as const;
  for(const [cx,cz] of columnPositions){
    const column=MeshBuilder.CreateCylinder('P0_PavilionColumn',{height:4.0,diameter:.34,tessellation:12},scene);
    column.parent=root;
    column.position.set(cx,2.55,cz);
    column.material=materials.wood;
    shadow.addShadowCaster(column);
  }

  for(const zBeam of [-1.72,1.72]){
    const beam=MeshBuilder.CreateBox('P0_PavilionBeam',{width:5.25,height:.34,depth:.38},scene);
    beam.parent=root;
    beam.position.set(0,4.36,zBeam);
    beam.material=materials.wood;
    shadow.addShadowCaster(beam);
  }

  for(const xBeam of [-2.2,2.2]){
    const beam=MeshBuilder.CreateBox('P0_PavilionSideBeam',{width:.38,height:.34,depth:3.8},scene);
    beam.parent=root;
    beam.position.set(xBeam,4.36,0);
    beam.material=materials.wood;
    shadow.addShadowCaster(beam);
  }

  const roof=MeshBuilder.CreateCylinder('P0_PavilionRoof',{
    height:1.05,
    diameterTop:5.15,
    diameterBottom:8.65,
    tessellation:4
  },scene);
  roof.parent=root;
  roof.position.y=5.0;
  roof.rotation.y=Math.PI*.25;
  roof.material=materials.roof;
  shadow.addShadowCaster(roof);

  const cap=MeshBuilder.CreateCylinder('P0_PavilionRoofCap',{
    height:.34,
    diameterTop:.5,
    diameterBottom:2.0,
    tessellation:4
  },scene);
  cap.parent=root;
  cap.position.y=5.7;
  cap.rotation.y=Math.PI*.25;
  cap.material=materials.roof;
  shadow.addShadowCaster(cap);

  for(const [cx,cz,rx,rz] of [
    [-3.15,-3.15,-.26,.26],[3.15,-3.15,-.26,-.26],
    [-3.15,3.15,.26,.26],[3.15,3.15,.26,-.26]
  ] as const){
    const eave=MeshBuilder.CreateBox('P0_PavilionEaveTip',{width:1.45,height:.18,depth:.42},scene);
    eave.parent=root;
    eave.position.set(cx,5.2,cz);
    eave.rotation.x=rx;
    eave.rotation.z=rz;
    eave.material=materials.roof;
    shadow.addShadowCaster(eave);
  }

  return root;
}

function bridgeHeight(t:number){
  return .34+1.58*(1-Math.pow((t-.5)*2,2));
}

function createBridge(scene:Scene,materials:P0Materials,shadow:CascadedShadowGenerator){
  const segments=30;
  const leftRail:Vector3[]=[];
  const rightRail:Vector3[]=[];

  for(let i=0;i<segments;i++){
    const t=i/(segments-1);
    const x=-5.65+t*11.3;
    const y=bridgeHeight(t);
    const nextT=Math.min(1,t+1/(segments-1));
    const nextY=bridgeHeight(nextT);
    const deck=MeshBuilder.CreateBox('P0_BridgeDeck',{width:.48,height:.30,depth:2.34},scene);
    deck.position.set(x,y,2.15);
    deck.rotation.z=Math.atan2(nextY-y,.4);
    deck.material=i%3===0?materials.stoneDark:materials.stone;
    deck.receiveShadows=true;
    shadow.addShadowCaster(deck);

    leftRail.push(new Vector3(x,y+.92,1.03));
    rightRail.push(new Vector3(x,y+.92,3.27));

    if(i%3===0){
      for(const z of [1.03,3.27]){
        const post=MeshBuilder.CreateCylinder('P0_BridgePost',{height:1.18,diameter:.13,tessellation:10},scene);
        post.position.set(x,y+.56,z);
        post.material=materials.stoneDark;
        shadow.addShadowCaster(post);
      }
    }
  }

  for(const [name,path] of [['P0_BridgeRailLeft',leftRail],['P0_BridgeRailRight',rightRail]] as const){
    const rail=MeshBuilder.CreateTube(name,{path,radius:.085,tessellation:10,cap:Mesh.CAP_ALL},scene);
    rail.material=materials.stoneDark;
    shadow.addShadowCaster(rail);
  }
}

function createFlowerBand(scene:Scene,x:number,z:number,width:number,count:number){
  const material=new StandardMaterial('P0_FlowerBandMaterial',scene);
  material.diffuseColor=Color3.FromHexString('#C65C7D');
  material.emissiveColor=Color3.FromHexString('#36141E');
  material.alpha=.96;
  const source=MeshBuilder.CreateSphere('P0_Flower',{diameter:.12,segments:6},scene);
  source.material=material;
  source.position.set(x,.2,z);
  for(let i=1;i<count;i++){
    const t=i/(count-1);
    const flower=source.createInstance('P0_FlowerInstance');
    const wave=Math.sin(i*1.7)*.32;
    flower.position.set(x+(t-.5)*width,.2+((i%3)*.025),z+wave);
    flower.scaling.setAll(.75+(i%5)*.08);
  }
}

export function createP0ReferenceWorld(scene:Scene,sun:DirectionalLight,profile:ReferenceLookProfile):P0WorldRuntime{
  const materials=makeMaterials(scene,profile);
  createSkyBackdrop(scene);

  sun.shadowMinZ=1;
  sun.shadowMaxZ=100;
  const shadow=new CascadedShadowGenerator(2048,sun);
  shadow.numCascades=4;
  shadow.lambda=.72;
  shadow.bias=.0008;
  shadow.normalBias=.038;
  shadow.darkness=.30;
  shadow.autoCalcDepthBounds=true;

  const ground=MeshBuilder.CreateGround('P0_Ground',{width:64,height:66,subdivisions:2},scene);
  ground.position.y=-.10;
  ground.position.z=9;
  ground.material=materials.ground;
  ground.receiveShadows=true;

  const backBank=MeshBuilder.CreateGround('P0_BackBank',{width:42,height:13,subdivisions:2},scene);
  backBank.position.set(0,.01,16.8);
  backBank.material=materials.grass;
  backBank.receiveShadows=true;

  createKarstMountain(scene,materials.mountainFar,-19,39,11,18,8,1);
  createKarstMountain(scene,materials.mountainFar,-7,42,8,14,7,2);
  createKarstMountain(scene,materials.mountainFar,8,41,12,21,9,3);
  createKarstMountain(scene,materials.mountainFar,22,44,9,17,7,4);
  createKarstMountain(scene,materials.mountainNear,-12,32,8,13,6,11);
  createKarstMountain(scene,materials.mountainNear,15,33,7,14,6,12);

  createBridge(scene,materials,shadow);
  createPavilion(scene,materials,shadow,-10.2,8.4,1.05);
  createPavilion(scene,materials,shadow,8.8,13.2,.72);

  const maples=[
    [-13.5,4.8,1.45,2],[-8.0,11.0,1.12,1],[-15.2,13.8,1.18,3],
    [10.4,4.8,1.55,0],[14.8,8.4,1.12,2],[11.8,13.6,.92,1],
    [-3.8,15.3,.86,2],[4.2,15.4,.92,0]
  ] as const;
  maples.forEach(([x,z,s,v])=>createMaple(scene,materials,shadow,x,z,s,v));

  createFlowerBand(scene,-8.4,1.2,8.5,48);
  createFlowerBand(scene,9.8,1.0,8,44);
  createFlowerBand(scene,0,14.2,13,56);

  const lakeBed=MeshBuilder.CreateDisc('P0_LakeBed',{radius:17,tessellation:72,sideOrientation:Mesh.DOUBLESIDE},scene);
  lakeBed.rotation.x=Math.PI*.5;
  lakeBed.scaling.y=.80;
  lakeBed.position.set(0,.015,4.1);
  lakeBed.material=materials.lakeDeep;
  lakeBed.receiveShadows=true;

  const mistMaterial=new StandardMaterial('P0_MistMaterial',scene);
  mistMaterial.diffuseColor=color3('#AACBD7');
  mistMaterial.emissiveColor=color3('#89B7C7');
  mistMaterial.alpha=.055;
  mistMaterial.disableLighting=true;
  mistMaterial.backFaceCulling=false;
  [
    [-4.4,.95,8.6,4.8,1.3],
    [2.0,.82,10.1,4.2,1.05],
    [7.2,1.08,12.0,4.4,1.18],
    [-8.2,.78,12.6,3.5,.95]
  ].forEach(([x,y,z,sx,sz],index)=>{
    const mist=MeshBuilder.CreateSphere('P0_Mist',{diameter:2,segments:14},scene);
    mist.position.set(x,y,z);
    mist.scaling.set(sx,.16,sz);
    mist.material=mistMaterial;
    mist.visibility=.82-index*.08;
  });

  const water=MeshBuilder.CreateDisc('P0_Lake',{radius:17,tessellation:96,sideOrientation:Mesh.DOUBLESIDE},scene);
  water.rotation.x=Math.PI*.5;
  water.scaling.y=.80;
  water.position.set(0,.09,4.1);
  water.material=materials.water;
  water.receiveShadows=true;

  const mirror=new MirrorTexture('P0_WaterMirror',1024,scene,true);
  mirror.mirrorPlane=new Plane(0,-1,0,.10);
  mirror.level=profile.water.reflection;
  mirror.adaptiveBlurKernel=18;
  materials.water.reflectionTexture=mirror;
  mirror.renderList=scene.meshes.filter(mesh=>mesh!==water && mesh!==lakeBed && !mesh.name.includes('Mist'));

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
    materials.stoneDark.albedoColor=color3(next.architecture.stoneDeep);
  };

  return {applyProfile};
}
