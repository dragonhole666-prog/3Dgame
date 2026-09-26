import {
  CascadedShadowGenerator,
  DirectionalLight,
  DynamicTexture,
  Material,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial,
  Plane,
  Scene,
  ShadowGenerator,
  Texture,
  Vector3,
  VertexData
} from '@babylonjs/core';
import { color3, type ReferenceLookProfile } from '../rendering/referenceProfile';

export interface P0WorldRuntime {
  applyProfile(profile:ReferenceLookProfile):void;
}

type P0Materials={
  ground:PBRMaterial;
  grassShadow:PBRMaterial;
  grass:PBRMaterial;
  grassLit:PBRMaterial;
  lakeDeep:PBRMaterial;
  water:PBRMaterial;
  woodDeep:PBRMaterial;
  wood:PBRMaterial;
  woodLit:PBRMaterial;
  roof:PBRMaterial;
  roofLit:PBRMaterial;
  stone:PBRMaterial;
  stoneDark:PBRMaterial;
  mapleShadow:PBRMaterial;
  mapleBase:PBRMaterial;
  mapleLit:PBRMaterial;
  mapleHighlight:PBRMaterial;
  mountainNear:PBRMaterial;
  mountainFar:PBRMaterial;
};

function pbr(
  name:string,
  scene:Scene,
  color:string,
  roughness:number,
  metallic=0,
  environmentIntensity=.72
){
  const material=new PBRMaterial(name,scene);
  material.albedoColor=color3(color);
  material.roughness=roughness;
  material.metallic=metallic;
  material.environmentIntensity=environmentIntensity;
  return material;
}

function makeMaterials(scene:Scene,profile:ReferenceLookProfile):P0Materials{
  const water=pbr('P0_WaterMaterial',scene,profile.water.shallow,profile.water.roughness,.01,1.0);
  water.alpha=profile.water.alpha;
  water.transparencyMode=Material.MATERIAL_ALPHABLEND;
  water.indexOfRefraction=1.333;
  water.microSurface=.96;
  water.clearCoat.isEnabled=true;
  water.clearCoat.intensity=.62;
  water.clearCoat.roughness=.10;

  const mountainNear=pbr('P0_MountainNear',scene,'#547386',.96,0,.28);
  const mountainFar=pbr('P0_MountainFar',scene,'#7998A9',1,0,.18);

  const mapleShadow=pbr('P0_MapleShadow',scene,profile.foliage.mapleShadow,.86,0,.54);
  const mapleBase=pbr('P0_MapleBase',scene,profile.foliage.mapleBase,.82,0,.58);
  const mapleLit=pbr('P0_MapleLit',scene,profile.foliage.mapleLit,.78,0,.62);
  const mapleHighlight=pbr('P0_MapleHighlight',scene,profile.foliage.mapleHighlight,.76,0,.66);
  for(const material of [mapleShadow,mapleBase,mapleLit,mapleHighlight]){
    material.sheen.isEnabled=true;
    material.sheen.intensity=.14;
    material.sheen.roughness=.74;
    material.sheen.albedoScaling=true;
  }

  const roof=pbr('P0_RoofMaterial',scene,profile.architecture.roofDeep,.58,0,.68);
  const roofLit=pbr('P0_RoofLitMaterial',scene,profile.architecture.roofLit,.52,0,.72);
  for(const material of [roof,roofLit]){
    material.clearCoat.isEnabled=true;
    material.clearCoat.intensity=.12;
    material.clearCoat.roughness=.42;
  }

  return {
    ground:pbr('P0_GroundMaterial',scene,'#405044',.96,0,.48),
    grassShadow:pbr('P0_GrassShadowMaterial',scene,profile.foliage.grassShadow,.93,0,.48),
    grass:pbr('P0_GrassMaterial',scene,profile.foliage.grassBase,.90,0,.52),
    grassLit:pbr('P0_GrassLitMaterial',scene,profile.foliage.grassLit,.88,0,.56),
    lakeDeep:pbr('P0_LakeDeepMaterial',scene,profile.water.deep,.99,0,.35),
    water,
    woodDeep:pbr('P0_WoodDeepMaterial',scene,profile.architecture.woodDeep,.79,0,.54),
    wood:pbr('P0_WoodMaterial',scene,profile.architecture.woodBase,.72,0,.60),
    woodLit:pbr('P0_WoodLitMaterial',scene,profile.architecture.woodLit,.66,0,.64),
    roof,
    roofLit,
    stone:pbr('P0_StoneMaterial',scene,profile.architecture.stoneLit,.88,0,.62),
    stoneDark:pbr('P0_StoneDarkMaterial',scene,profile.architecture.stoneDeep,.92,0,.52),
    mapleShadow,
    mapleBase,
    mapleLit,
    mapleHighlight,
    mountainNear,
    mountainFar
  };
}

function noise(seed:number,index:number){
  const raw=Math.sin(seed*12.9898+index*78.233)*43758.5453;
  return raw-Math.floor(raw);
}

function createSkyBackdrop(scene:Scene){
  const texture=new DynamicTexture('P0_SkyGradient',{width:32,height:512},scene,false);
  const ctx=texture.getContext();
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#B8DDEB');
  gradient.addColorStop(.48,'#CFE7F2');
  gradient.addColorStop(1,'#E6EFF2');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,32,512);
  texture.update(false);

  const material=pbr('P0_SkyBackdropMaterial',scene,'#FFFFFF',1,0,0);
  material.albedoTexture=texture;
  material.emissiveTexture=texture;
  material.emissiveColor=color3('#FFFFFF');
  material.unlit=true;
  material.backFaceCulling=false;

  const sky=MeshBuilder.CreateSphere('P0_SkyDome',{
    diameter:170,
    segments:32,
    sideOrientation:Mesh.BACKSIDE
  },scene);
  sky.position.set(0,18,12);
  sky.material=material;
  sky.applyFog=false;
  sky.isPickable=false;
  return sky;
}

function createWaterNormalTexture(scene:Scene){
  const size=128;
  const texture=new DynamicTexture('P0_WaterNormal',{width:size,height:size},scene,false);
  const ctx=texture.getContext();
  const image=ctx.createImageData(size,size);

  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      const u=x/size*Math.PI*2;
      const v=y/size*Math.PI*2;
      const dx=Math.cos(u*3.0+Math.sin(v*2.0))*.23+Math.cos(u*7.0-v*4.0)*.08;
      const dy=Math.cos(v*4.0+Math.sin(u*1.5))*.20+Math.sin(v*6.0+u*3.0)*.07;
      const inv=1/Math.hypot(dx,dy,1);
      const nx=-dx*inv;
      const ny=-dy*inv;
      const nz=inv;
      const i=(y*size+x)*4;
      image.data[i]=Math.round((nx*.5+.5)*255);
      image.data[i+1]=Math.round((ny*.5+.5)*255);
      image.data[i+2]=Math.round((nz*.5+.5)*255);
      image.data[i+3]=255;
    }
  }

  ctx.putImageData(image,0,0);
  texture.update(false);
  texture.wrapU=Texture.WRAP_ADDRESSMODE;
  texture.wrapV=Texture.WRAP_ADDRESSMODE;
  texture.uScale=4.8;
  texture.vScale=3.6;
  return texture;
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
  const segments=28;
  const ringHeights=[0,height*.17,height*.39,height*.62,height*.81,height*.95];
  const ringRadius=[1,.96,.82,.61,.39,.16];
  const positions:number[]=[];
  const indices:number[]=[];
  const normals:number[]=[];

  for(let ring=0;ring<ringHeights.length;ring++){
    const radius=(width*.5)*ringRadius[ring];
    const y=ringHeights[ring];
    for(let i=0;i<segments;i++){
      const angle=i/segments*Math.PI*2;
      const jitter=.80+noise(seed+ring*.37,i)*.38;
      const leanX=ring/(ringHeights.length-1)*(noise(seed,91)-.5)*width*.26;
      const leanZ=ring/(ringHeights.length-1)*(noise(seed,92)-.5)*depth*.20;
      positions.push(
        Math.cos(angle)*radius*jitter+leanX,
        y+(noise(seed+ring,100+i)-.5)*height*.03,
        Math.sin(angle)*(depth*.5)*ringRadius[ring]*(.84+noise(seed+7,i)*.25)+leanZ
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
  mesh.position.set(x,-.18,z);
  mesh.material=material;
  mesh.receiveShadows=true;

  for(let lobe=0;lobe<2;lobe++){
    const bulb=MeshBuilder.CreateIcoSphere('P0_KarstLobe',{radius:1,subdivisions:3},scene);
    bulb.position.set(
      x+(lobe===0?-1:1)*width*(.17+noise(seed,30+lobe)*.09),
      height*(.31+lobe*.15),
      z+(noise(seed,40+lobe)-.5)*depth*.18
    );
    bulb.scaling.set(width*(.27-lobe*.035),height*(.31-lobe*.04),depth*(.26-lobe*.03));
    bulb.material=material;
    bulb.receiveShadows=true;
  }

  const cap=MeshBuilder.CreateIcoSphere('P0_KarstCap',{radius:1,subdivisions:3},scene);
  cap.position.set(x+(noise(seed,91)-.5)*width*.18,height*.94,z+(noise(seed,92)-.5)*depth*.15);
  cap.scaling.set(width*.14,height*.115,depth*.14);
  cap.material=material;
  cap.receiveShadows=true;
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
    tessellation:10
  },scene);
  branch.position=start.add(end).scale(.5);
  branch.material=material;
  branch.alignWithNormal(direction.normalize());
  shadow.addShadowCaster(branch);
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
    height:4.9*scale,
    diameterTop:.22*scale,
    diameterBottom:.66*scale,
    tessellation:12
  },scene);
  trunk.position.set(x,2.43*scale,z);
  trunk.rotation.z=variant%2?-.045:.05;
  trunk.material=materials.woodDeep;
  shadow.addShadowCaster(trunk);

  const branchBase=new Vector3(x,3.58*scale,z);
  addBranch(scene,materials.woodDeep,shadow,branchBase,new Vector3(x-1.22*scale,4.58*scale,z+.18*scale),.24*scale);
  addBranch(scene,materials.woodDeep,shadow,branchBase,new Vector3(x+1.02*scale,4.74*scale,z-.12*scale),.22*scale);
  addBranch(scene,materials.wood,shadow,new Vector3(x,3.9*scale,z),new Vector3(x+.12*scale,5.32*scale,z+.82*scale),.19*scale);
  addBranch(scene,materials.wood,shadow,new Vector3(x-.25*scale,4.1*scale,z),new Vector3(x-1.55*scale,5.1*scale,z-.45*scale),.15*scale);

  const foliageMaterials=[
    materials.mapleShadow,
    materials.mapleBase,
    materials.mapleLit,
    materials.mapleHighlight
  ];
  const centers=[
    new Vector3(x-1.15*scale,4.72*scale,z+.12*scale),
    new Vector3(x+1.0*scale,4.82*scale,z-.10*scale),
    new Vector3(x+.12*scale,5.45*scale,z+.74*scale),
    new Vector3(x-1.38*scale,5.16*scale,z-.42*scale)
  ];

  for(let i=0;i<24;i++){
    const center=centers[i%centers.length];
    const angle=i/24*Math.PI*2+variant*.41;
    const radius=(.28+noise(variant+2,i)*1.04)*scale;
    const yLift=(noise(variant+5,i)-.38)*1.02*scale;
    const blob=MeshBuilder.CreateIcoSphere('P0_MapleFoliage',{radius:.70*scale,subdivisions:2},scene);
    blob.position.set(
      center.x+Math.cos(angle)*radius,
      center.y+yLift,
      center.z+Math.sin(angle)*radius*.70
    );
    const size=.68+noise(variant+9,i)*.58;
    blob.scaling.set(size*1.32,size*.68,size);
    blob.rotation.set(noise(variant,80+i)*.45,angle,noise(variant,120+i)*.38);
    blob.material=foliageMaterials[(i+variant)%foliageMaterials.length];
    blob.receiveShadows=true;
    shadow.addShadowCaster(blob);
  }
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
    const column=MeshBuilder.CreateCylinder('P0_PavilionColumn',{height:4.0,diameter:.34,tessellation:14},scene);
    column.parent=root;
    column.position.set(cx,2.55,cz);
    column.material=materials.wood;
    shadow.addShadowCaster(column);
  }

  for(const zBeam of [-1.72,1.72]){
    const beam=MeshBuilder.CreateBox('P0_PavilionBeam',{width:5.25,height:.34,depth:.38},scene);
    beam.parent=root;
    beam.position.set(0,4.36,zBeam);
    beam.material=materials.woodLit;
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
  cap.material=materials.roofLit;
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
    eave.material=materials.roofLit;
    shadow.addShadowCaster(eave);
  }
}

function bridgeHeight(t:number){
  return .34+1.58*(1-Math.pow((t-.5)*2,2));
}

function createBridge(scene:Scene,materials:P0Materials,shadow:CascadedShadowGenerator){
  const segments=32;
  const leftRail:Vector3[]=[];
  const rightRail:Vector3[]=[];

  for(let i=0;i<segments;i++){
    const t=i/(segments-1);
    const x=-5.65+t*11.3;
    const y=bridgeHeight(t);
    const nextT=Math.min(1,t+1/(segments-1));
    const nextY=bridgeHeight(nextT);
    const deck=MeshBuilder.CreateBox('P0_BridgeDeck',{width:.46,height:.30,depth:2.34},scene);
    deck.position.set(x,y,2.15);
    deck.rotation.z=Math.atan2(nextY-y,.36);
    deck.material=i%4===0?materials.stoneDark:materials.stone;
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
  const material=pbr('P0_FlowerBandMaterial',scene,'#B85F79',.72,0,.45);
  material.emissiveColor=color3('#241016');

  const source=MeshBuilder.CreateSphere('P0_Flower',{diameter:.12,segments:6},scene);
  source.material=material;
  source.position.set(x-width*.5,.20,z);
  for(let i=1;i<count;i++){
    const t=i/(count-1);
    const flower=source.createInstance('P0_FlowerInstance');
    const wave=Math.sin(i*1.7)*.32;
    flower.position.set(x+(t-.5)*width,.2+(i%3)*.025,z+wave);
    flower.scaling.setAll(.75+(i%5)*.08);
  }
}

function createShoreRocks(
  scene:Scene,
  materials:P0Materials,
  shadow:CascadedShadowGenerator
){
  const placements=[
    [-11.8,.34,-.1,1.4],[-10.2,.26,.45,.9],[-8.8,.24,-.25,.75],
    [9.0,.28,-.10,.86],[10.7,.36,.35,1.15],[12.2,.30,.05,.92],
    [-7.2,.22,13.0,.72],[6.8,.24,13.1,.78]
  ] as const;

  placements.forEach(([x,y,z,s],index)=>{
    const rock=MeshBuilder.CreateIcoSphere('P0_ShoreRock',{radius:.62,subdivisions:2},scene);
    rock.position.set(x,y,z);
    rock.scaling.set(s*1.35,s*.62,s);
    rock.rotation.set(.1*index,.35*index,.06*(index%3));
    rock.material=index%3===0?materials.stone:materials.stoneDark;
    rock.receiveShadows=true;
    shadow.addShadowCaster(rock);
  });
}

export function createP0ReferenceWorld(
  scene:Scene,
  sun:DirectionalLight,
  profile:ReferenceLookProfile
):P0WorldRuntime{
  const materials=makeMaterials(scene,profile);
  createSkyBackdrop(scene);

  sun.shadowMinZ=1;
  sun.shadowMaxZ=110;
  const shadow=new CascadedShadowGenerator(2048,sun);
  shadow.numCascades=4;
  shadow.lambda=.72;
  shadow.bias=.0008;
  shadow.normalBias=.036;
  shadow.darkness=.27;
  shadow.autoCalcDepthBounds=true;
  shadow.filter=ShadowGenerator.FILTER_PCF;
  shadow.filteringQuality=ShadowGenerator.QUALITY_HIGH;

  const ground=MeshBuilder.CreateGround('P0_Ground',{width:64,height:66,subdivisions:2},scene);
  ground.position.y=-.10;
  ground.position.z=9;
  ground.material=materials.ground;
  ground.receiveShadows=true;

  const backBank=MeshBuilder.CreateGround('P0_BackBank',{width:42,height:13,subdivisions:2},scene);
  backBank.position.set(0,.01,16.8);
  backBank.material=materials.grass;
  backBank.receiveShadows=true;

  const leftBank=MeshBuilder.CreateGround('P0_LeftBank',{width:12,height:31,subdivisions:2},scene);
  leftBank.position.set(-14.2,.015,5.2);
  leftBank.rotation.y=-.10;
  leftBank.material=materials.grassShadow;
  leftBank.receiveShadows=true;

  const rightBank=MeshBuilder.CreateGround('P0_RightBank',{width:12,height:31,subdivisions:2},scene);
  rightBank.position.set(14.2,.018,5.6);
  rightBank.rotation.y=.09;
  rightBank.material=materials.grassLit;
  rightBank.receiveShadows=true;

  createKarstMountain(scene,materials.mountainFar,-21,43,12,20,8,1);
  createKarstMountain(scene,materials.mountainFar,-8,45,9,15,7,2);
  createKarstMountain(scene,materials.mountainFar,8,44,13,23,9,3);
  createKarstMountain(scene,materials.mountainFar,23,46,10,18,7,4);
  createKarstMountain(scene,materials.mountainNear,-13,35,9,14,6,11);
  createKarstMountain(scene,materials.mountainNear,16,36,8,15,6,12);

  createBridge(scene,materials,shadow);
  createPavilion(scene,materials,shadow,-10.2,8.4,1.05);
  createPavilion(scene,materials,shadow,8.8,13.2,.72);

  const maples=[
    [-13.5,4.8,1.48,2],[-8.0,11.0,1.14,1],[-15.2,13.8,1.18,3],
    [10.4,4.8,1.58,0],[14.8,8.4,1.12,2],[11.8,13.6,.94,1],
    [-3.8,15.3,.88,2],[4.2,15.4,.94,0]
  ] as const;
  maples.forEach(([x,z,s,v])=>createMaple(scene,materials,shadow,x,z,s,v));

  createFlowerBand(scene,-8.4,1.2,8.5,48);
  createFlowerBand(scene,9.8,1.0,8,44);
  createFlowerBand(scene,0,14.2,13,56);
  createShoreRocks(scene,materials,shadow);

  const lakeBed=MeshBuilder.CreateDisc('P0_LakeBed',{
    radius:17,
    tessellation:80,
    sideOrientation:Mesh.DOUBLESIDE
  },scene);
  lakeBed.rotation.x=Math.PI*.5;
  lakeBed.scaling.y=.80;
  lakeBed.position.set(0,.015,4.1);
  lakeBed.material=materials.lakeDeep;
  lakeBed.receiveShadows=true;

  const mistMaterial=pbr('P0_MistMaterial',scene,'#A7C6D2',1,0,0);
  mistMaterial.emissiveColor=color3('#92B7C4');
  mistMaterial.alpha=.05;
  mistMaterial.transparencyMode=Material.MATERIAL_ALPHABLEND;
  mistMaterial.unlit=true;
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
    mist.visibility=.76-index*.07;
    mist.isPickable=false;
  });

  const waterNormal=createWaterNormalTexture(scene);
  waterNormal.level=profile.water.normalStrength;
  materials.water.bumpTexture=waterNormal;

  const water=MeshBuilder.CreateDisc('P0_Lake',{
    radius:17,
    tessellation:112,
    sideOrientation:Mesh.DOUBLESIDE
  },scene);
  water.rotation.x=Math.PI*.5;
  water.scaling.y=.80;
  water.position.set(0,.09,4.1);
  water.material=materials.water;
  water.receiveShadows=true;

  const mirror=new MirrorTexture('P0_WaterMirror',1024,scene,true);
  mirror.mirrorPlane=new Plane(0,-1,0,.10);
  mirror.level=profile.water.reflection;
  mirror.adaptiveBlurKernel=20;
  materials.water.reflectionTexture=mirror;
  mirror.renderList=scene.meshes.filter(
    (mesh)=>mesh!==water && mesh!==lakeBed && !mesh.name.includes('Mist')
  );

  let waterTime=0;
  scene.onBeforeRenderObservable.add(()=>{
    waterTime+=scene.getEngine().getDeltaTime()*.001;
    waterNormal.uOffset=(waterTime*.0035)%1;
    waterNormal.vOffset=(waterTime*.0022)%1;
  });

  const applyProfile=(next:ReferenceLookProfile)=>{
    materials.grassShadow.albedoColor=color3(next.foliage.grassShadow);
    materials.grass.albedoColor=color3(next.foliage.grassBase);
    materials.grassLit.albedoColor=color3(next.foliage.grassLit);

    materials.mapleShadow.albedoColor=color3(next.foliage.mapleShadow);
    materials.mapleBase.albedoColor=color3(next.foliage.mapleBase);
    materials.mapleLit.albedoColor=color3(next.foliage.mapleLit);
    materials.mapleHighlight.albedoColor=color3(next.foliage.mapleHighlight);

    materials.lakeDeep.albedoColor=color3(next.water.deep);
    materials.water.albedoColor=color3(next.water.shallow);
    materials.water.roughness=next.water.roughness;
    materials.water.alpha=next.water.alpha;
    waterNormal.level=next.water.normalStrength;
    mirror.level=next.water.reflection;

    materials.woodDeep.albedoColor=color3(next.architecture.woodDeep);
    materials.wood.albedoColor=color3(next.architecture.woodBase);
    materials.woodLit.albedoColor=color3(next.architecture.woodLit);
    materials.roof.albedoColor=color3(next.architecture.roofDeep);
    materials.roofLit.albedoColor=color3(next.architecture.roofLit);
    materials.stone.albedoColor=color3(next.architecture.stoneLit);
    materials.stoneDark.albedoColor=color3(next.architecture.stoneDeep);
  };

  return {applyProfile};
}
