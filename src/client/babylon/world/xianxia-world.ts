import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Color3,Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Layer } from '@babylonjs/core/Layers/layer';
import { Scene } from '@babylonjs/core/scene';
import { HF265_NATURE_PLACEMENTS,HF265_POND,HF265_SPAWN,HF265_WORLD_HALF,hf265TerrainHeight,type HF265Placement } from '../../../shared/data/hf265-world-layout';
import { XIANXIA_REFERENCE_20260926 as REF } from '../reference-style';

export interface BabylonXianxiaWorld{
  camera:ArcRotateCamera;
  sun:DirectionalLight;
  hemisphere:HemisphericLight;
  shadow:ShadowGenerator;
  water:Mesh;
  terrain:Mesh;
  natureMode:'quaternius'|'procedural-fallback';
  dispose():void;
}

const QUATERNIUS_ROOT='/assets/quaternius/nature/';
const QUATERNIUS_FILES:Record<HF265Placement['asset'],string>={
  'common-tree-1':'CommonTree_1.gltf',
  'common-tree-3':'CommonTree_3.gltf',
  'twisted-tree-1':'TwistedTree_1.gltf',
  'pine-2':'Pine_2.gltf',
  'rock-medium-1':'Rock_Medium_1.gltf',
  'rock-medium-3':'Rock_Medium_3.gltf',
  'bush-flowers':'Bush_Common_Flowers.gltf',
  'flower-3':'Flower_3_Group.gltf',
  'grass-short':'Grass_Common_Short.gltf',
};

const pbr=(name:string,hex:string,scene:Scene,roughness=.8,metallic=0)=>{
  const m=new PBRMaterial(name,scene);
  m.albedoColor=Color3.FromHexString(hex);
  m.roughness=roughness;
  m.metallic=metallic;
  m.environmentIntensity=metallic>.2?1.02:.72;
  return m;
};

function mixColor(base:Color3,hex:string,amount:number){
  const target=Color3.FromHexString(hex);
  base.r+=(target.r-base.r)*amount;
  base.g+=(target.g-base.g)*amount;
  base.b+=(target.b-base.b)*amount;
}

function createSky(scene:Scene){
  const texture=new DynamicTexture('HF34_SkyGradientTexture',{width:16,height:512},scene,false);
  const ctx=texture.getContext();
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,REF.palette.skyTop);
  gradient.addColorStop(.36,REF.palette.skyLight);
  gradient.addColorStop(.70,REF.palette.skyHorizon);
  gradient.addColorStop(1,REF.palette.mountainFar);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,16,512);
  const glow=ctx.createRadialGradient(11,82,2,11,82,48);
  glow.addColorStop(0,'rgba(255,244,219,.42)');
  glow.addColorStop(1,'rgba(255,244,219,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,16,170);
  texture.update(false);
  const layer=new Layer('HF34_SkyGradient',null,scene,true);
  layer.texture=texture;
  layer.color.a=1;
  return {layer,texture};
}

function createTerrain(scene:Scene){
  const size=HF265_WORLD_HALF*2;
  const terrain=MeshBuilder.CreateGround('HF34_Babylon_Terrain',{width:size,height:size,subdivisions:128,updatable:true},scene);
  const positions=terrain.getVerticesData(VertexBuffer.PositionKind);
  const indices=terrain.getIndices();
  if(positions&&indices){
    for(let i=0;i<positions.length;i+=3)positions[i+1]=hf265TerrainHeight(positions[i],positions[i+2]);
    terrain.updateVerticesData(VertexBuffer.PositionKind,positions);
    const normals:number[]=[];
    VertexData.ComputeNormals(positions,indices,normals);
    terrain.updateVerticesData(VertexBuffer.NormalKind,normals);
    terrain.refreshBoundingInfo();
  }
  const mat=pbr('HF34_TerrainMaterial',REF.palette.grassSage,scene,.92,0);
  mat.albedoColor=Color3.FromHexString('#6B7D5D');
  mat.microSurface=.28;
  mat.environmentIntensity=.70;
  terrain.material=mat;
  terrain.receiveShadows=true;
  return terrain;
}

function addShadow(shadow:ShadowGenerator,mesh:Mesh){
  mesh.receiveShadows=true;
  shadow.addShadowCaster(mesh,true);
}

function createPavilion(scene:Scene,shadow:ShadowGenerator,x:number,z:number,scale=1){
  const root=new TransformNode('HF34_Pavilion',scene);
  root.position.set(x,hf265TerrainHeight(x,z),z);
  const stone=pbr('HF34_PavilionStone'+x,REF.palette.stoneWarm,scene,.84,0);
  const wood=pbr('HF34_PavilionWood'+x,REF.palette.timberDark,scene,.66,0);
  const roof=pbr('HF34_PavilionRoof'+x,REF.palette.roofDark,scene,.60,.025);
  const roofHi=pbr('HF34_PavilionRoofHi'+x,'#4A4743',scene,.56,.035);
  const trim=pbr('HF34_PavilionTrim'+x,'#AE9166',scene,.40,.34);
  const platform=MeshBuilder.CreateCylinder('platform',{height:.36*scale,diameterTop:7.25*scale,diameterBottom:7.75*scale,tessellation:32},scene);platform.parent=root;platform.position.y=.18*scale;platform.material=stone;addShadow(shadow,platform);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=2.75*scale;const c=MeshBuilder.CreateCylinder('column',{height:3.7*scale,diameterTop:.28*scale,diameterBottom:.36*scale,tessellation:12},scene);c.parent=root;c.position.set(Math.cos(a)*r,2.05*scale,Math.sin(a)*r);c.material=wood;addShadow(shadow,c);}
  const eave=MeshBuilder.CreateCylinder('eave',{height:.20*scale,diameter:6.3*scale,tessellation:24},scene);eave.parent=root;eave.position.y=3.9*scale;eave.material=wood;addShadow(shadow,eave);
  const roof1=MeshBuilder.CreateCylinder('roof-main',{height:1.38*scale,diameterTop:.32*scale,diameterBottom:8.55*scale,tessellation:16},scene);roof1.parent=root;roof1.position.y=4.48*scale;roof1.rotation.y=Math.PI/16;roof1.scaling.z=.86;roof1.material=roof;addShadow(shadow,roof1);
  const roof2=MeshBuilder.CreateCylinder('roof-hi',{height:.86*scale,diameterTop:.22*scale,diameterBottom:6.75*scale,tessellation:16},scene);roof2.parent=root;roof2.position.y=5.0*scale;roof2.rotation.y=Math.PI/16;roof2.scaling.z=.86;roof2.material=roofHi;addShadow(shadow,roof2);
  const cap=MeshBuilder.CreateCylinder('roof-cap',{height:.75*scale,diameterTop:.08*scale,diameterBottom:.15*scale,tessellation:10},scene);cap.parent=root;cap.position.y=5.78*scale;cap.material=trim;addShadow(shadow,cap);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,r=4.02*scale;const tip=MeshBuilder.CreateSphere('eave-tip',{diameter:.20*scale,segments:8},scene);tip.parent=root;tip.position.set(Math.cos(a)*r,4.10*scale,Math.sin(a)*r*.86);tip.material=trim;addShadow(shadow,tip);}
  return root;
}

function cylinderBetween(scene:Scene,a:Vector3,b:Vector3,diameter:number,material:PBRMaterial,parent:TransformNode){
  const mid=a.add(b).scale(.5),direction=b.subtract(a),length=direction.length();
  const mesh=MeshBuilder.CreateCylinder('bridge-rail',{height:length,diameter,tessellation:10},scene);
  mesh.position=mid;mesh.material=material;mesh.parent=parent;
  const up=new Vector3(0,1,0),normal=direction.normalize(),axis=Vector3.Cross(up,normal),dot=Math.max(-1,Math.min(1,Vector3.Dot(up,normal))),angle=Math.acos(dot);
  if(axis.lengthSquared()>.000001)mesh.rotate(axis.normalize(),angle);
  return mesh;
}

function createBridge(scene:Scene,shadow:ShadowGenerator){
  const root=new TransformNode('HF34_Arched_Bridge',scene);
  const stone=pbr('HF34_BridgeStone',REF.palette.stoneWarm,scene,.82,0);
  const rail=pbr('HF34_BridgeRail','#8E918E',scene,.72,.02);
  const count=35;
  for(let i=0;i<count;i++){
    const t=i/(count-1),x=-10.2+t*20.4,arch=Math.sin(Math.PI*t)*2.15;
    const slab=MeshBuilder.CreateBox('bridge-slab',{width:.66,height:.23,depth:3.15},scene);
    slab.position.set(HF265_POND.x+x,hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.17+arch,HF265_POND.z);
    slab.rotation.z=Math.cos(Math.PI*t)*-.115;slab.material=stone;addShadow(shadow,slab);slab.parent=root;
  }
  for(const side of [-1,1])for(let i=0;i<11;i++){
    const t=i/10,x=-9.5+t*19,arch=Math.sin(Math.PI*t)*2.15,y=hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.75+arch;
    const post=MeshBuilder.CreateCylinder('bridge-post',{height:.86,diameterTop:.16,diameterBottom:.22,tessellation:10},scene);post.position.set(HF265_POND.x+x,y,HF265_POND.z+side*1.48);post.material=rail;addShadow(shadow,post);post.parent=root;
    if(i<10){const nt=(i+1)/10,nx=-9.5+nt*19,narch=Math.sin(Math.PI*nt)*2.15,ny=hf265TerrainHeight(HF265_POND.x+nx,HF265_POND.z)+1.12+narch;
      const a=new Vector3(HF265_POND.x+x,y+.37,HF265_POND.z+side*1.48),b=new Vector3(HF265_POND.x+nx,ny,HF265_POND.z+side*1.48);
      const bar=cylinderBetween(scene,a,b,.12,rail,root);addShadow(shadow,bar);
    }
  }
  return root;
}

function fallbackTree(scene:Scene,shadow:ShadowGenerator,p:HF265Placement){
  const root=new TransformNode('HF34_FallbackTree_'+p.id,scene);root.position.set(p.x,hf265TerrainHeight(p.x,p.z),p.z);root.rotation.y=p.rotationY;
  const trunkMat=pbr('HF34_FallbackBark_'+p.id,REF.palette.timberDark,scene,.90,0);
  const leafHex=p.tint==='coral'?REF.palette.mapleBright:p.tint==='peach'?REF.palette.maplePeach:p.tint==='cool'?REF.palette.foliageDeep:REF.palette.foliageMid;
  const leafMat=pbr('HF34_FallbackLeaf_'+p.id,leafHex,scene,.76,0);leafMat.subSurface.isTranslucencyEnabled=true;leafMat.subSurface.translucencyIntensity=.09;
  const trunk=MeshBuilder.CreateCylinder('tree-trunk',{height:p.height*.56,diameterTop:p.height*.085,diameterBottom:p.height*.16,tessellation:12},scene);trunk.parent=root;trunk.position.y=p.height*.28;trunk.material=trunkMat;addShadow(shadow,trunk);
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+(i%2)*.36;
    const crown=MeshBuilder.CreateIcoSphere('tree-crown',{radius:p.height*(.20+(i%3)*.016),subdivisions:2},scene);
    crown.parent=root;crown.position.set(Math.cos(a)*p.height*.17,p.height*(.61+(i%3)*.055),Math.sin(a)*p.height*.14);
    crown.scaling.set(1.15,.67,.90);crown.material=leafMat;addShadow(shadow,crown);
  }
  return root;
}

function createRock(scene:Scene,shadow:ShadowGenerator,x:number,z:number,height:number,rotationY:number){
  const rock=MeshBuilder.CreateIcoSphere('HF34_Rock',{radius:height*.62,subdivisions:2},scene);rock.position.set(x,hf265TerrainHeight(x,z)+height*.36,z);rock.scaling.set(1.25,.72,.9);rock.rotation.y=rotationY;rock.material=pbr('rock-'+x,'#918D84',scene,.92,0);addShadow(shadow,rock);return rock;
}

function createFallbackPlant(scene:Scene,p:HF265Placement){
  const root=new TransformNode('HF34_FallbackPlant_'+p.id,scene);root.position.set(p.x,hf265TerrainHeight(p.x,p.z),p.z);root.rotation.y=p.rotationY;
  const color=p.tint==='peach'?REF.palette.maplePeach:REF.palette.foliageMid;
  const mat=pbr('HF34_FallbackPlantMat_'+p.id,color,scene,.82,0);
  const count=p.asset==='grass-short'?5:3;
  for(let i=0;i<count;i++){
    const s=MeshBuilder.CreateIcoSphere('plant',{radius:p.height*(p.asset==='grass-short'?.22:.30),subdivisions:1},scene);
    s.parent=root;s.position.set((i-(count-1)/2)*p.height*.20,p.height*.22,((i*7)%3-1)*p.height*.13);s.scaling.y=.65;s.material=mat;
  }
}

function tintImportedMaterial(material:PBRMaterial|StandardMaterial,p:HF265Placement,label:string){
  const leaves=/(leaf|leaves|foliage|grass|flower|bush|pine)/.test(label);
  const bark=/(bark|trunk|wood)/.test(label);
  const stone=/(rock|stone)/.test(label)||p.asset.startsWith('rock');
  if(material instanceof PBRMaterial){
    material.metallic=0;
    material.environmentIntensity=.72;
    material.roughness=stone ? .90 : (leaves ? .74 : (bark ? .88 : .78));
    if(leaves){
      const target=p.tint==='coral'?REF.palette.mapleBright:p.tint==='peach'?REF.palette.maplePeach:p.tint==='cool'?REF.palette.foliageDeep:REF.palette.foliageMid;
      mixColor(material.albedoColor,target,(p.tint==='coral'||p.tint==='peach') ? .48 : .34);
      material.backFaceCulling=false;
    }else if(bark)mixColor(material.albedoColor,REF.palette.timberDark,.30);
    else if(stone)mixColor(material.albedoColor,REF.palette.stoneWarm,.28);
  }else{
    if(leaves){
      const target=p.tint==='coral'?REF.palette.mapleBright:p.tint==='peach'?REF.palette.maplePeach:p.tint==='cool'?REF.palette.foliageDeep:REF.palette.foliageMid;
      mixColor(material.diffuseColor,target,(p.tint==='coral'||p.tint==='peach') ? .48 : .34);
      material.backFaceCulling=false;
    }else if(bark)mixColor(material.diffuseColor,REF.palette.timberDark,.30);
    else if(stone)mixColor(material.diffuseColor,REF.palette.stoneWarm,.28);
  }
}

async function quaterniusInstalled(){
  try{
    const response=await fetch(QUATERNIUS_ROOT+'CommonTree_1.gltf',{method:'HEAD',cache:'no-store'});
    return response.ok;
  }catch{return false;}
}

async function createQuaterniusPlacement(scene:Scene,shadow:ShadowGenerator,p:HF265Placement){
  const file=QUATERNIUS_FILES[p.asset];
  try{
    const imported=await SceneLoader.ImportMeshAsync('',QUATERNIUS_ROOT,file,scene);
    let minY=Number.POSITIVE_INFINITY,maxY=Number.NEGATIVE_INFINITY;
    for(const mesh of imported.meshes){
      if(mesh.getTotalVertices()<=0)continue;
      mesh.computeWorldMatrix(true);
      const box=mesh.getBoundingInfo().boundingBox;
      minY=Math.min(minY,box.minimumWorld.y);maxY=Math.max(maxY,box.maximumWorld.y);
    }
    if(!Number.isFinite(minY)||!Number.isFinite(maxY)){minY=0;maxY=1;}
    const wrapper=new TransformNode('HF34_Quaternius_'+p.id,scene);
    for(const mesh of imported.meshes){
      if(!mesh.parent)mesh.parent=wrapper;
      if(mesh.material){
        const clone=mesh.material.clone(mesh.material.name+'-'+p.id);
        if(clone)mesh.material=clone;
      }
      const material=mesh.material;
      const label=(mesh.name+' '+(material?.name??'')).toLowerCase();
      if(material instanceof PBRMaterial||material instanceof StandardMaterial)tintImportedMaterial(material,p,label);
      if(mesh instanceof Mesh){mesh.receiveShadows=true;shadow.addShadowCaster(mesh,true);}
    }
    const naturalHeight=Math.max(.1,maxY-minY),scale=p.height/naturalHeight;
    wrapper.scaling.setAll(scale);
    wrapper.rotation.y=p.rotationY;
    wrapper.position.set(p.x,hf265TerrainHeight(p.x,p.z)-minY*scale,p.z);
    return wrapper;
  }catch(error){
    console.warn('[HF34 Babylon] Quaternius placement fallback',p.id,file,error);
    return null;
  }
}

function createMountains(scene:Scene){
  const root=new TransformNode('HF34_Karst_Horizon',scene);
  const mats=[pbr('mountain-back',REF.palette.mountainFar,scene,.98,0),pbr('mountain-mid',REF.palette.mountainBlue,scene,.98,0),pbr('mountain-near','#5C7988',scene,.98,0)];
  const clusters=[
    {z:HF265_SPAWN.z-145,baseY:-10,count:14,spread:118,mat:mats[0],scale:.84},
    {z:HF265_SPAWN.z-118,baseY:-8,count:12,spread:98,mat:mats[1],scale:1},
    {z:HF265_SPAWN.z-96,baseY:-7,count:8,spread:82,mat:mats[2],scale:1.04},
  ];
  for(let ring=0;ring<clusters.length;ring++){const c=clusters[ring];for(let i=0;i<c.count;i++){
    const n=(i+.5)/c.count-.5,seed=(i*17+ring*29)%31,height=(24+((seed*13)%27))*c.scale,width=9+((seed*7)%10);
    const peak=MeshBuilder.CreateCylinder('karst',{height,diameterTop:width*.13,diameterBottom:width,tessellation:12,subdivisions:4},scene);
    peak.position.set(HF265_SPAWN.x+n*c.spread,c.baseY+height*.5,c.z-((i*11)%10));peak.scaling.z=.70+((seed%5)*.07);peak.rotation.y=(seed%7)*.11;peak.material=c.mat;peak.parent=root;
  }}
  return root;
}

function createWater(scene:Scene){
  const y=hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.07;
  const water=MeshBuilder.CreateDisc('HF34_Reflective_Lake',{radius:1,tessellation:160,sideOrientation:Mesh.DOUBLESIDE},scene);
  water.rotation.x=Math.PI/2;water.scaling.set(HF265_POND.rx,HF265_POND.rz,1);water.position.set(HF265_POND.x,y,HF265_POND.z);
  const mat=pbr('HF34_LakeMaterial',REF.palette.lake,scene,.045,.015);
  mat.alpha=.91;mat.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;mat.indexOfRefraction=1.333;mat.environmentIntensity=1.05;
  mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.84;mat.clearCoat.roughness=.09;
  const normal=new Texture('/assets/hf23/water_normal.png',scene,false,false,Texture.TRILINEAR_SAMPLINGMODE);
  normal.uScale=4.2;normal.vScale=3.6;normal.level=.16;
  mat.bumpTexture=normal;
  water.material=mat;
  const mirror=new MirrorTexture('HF34_LakeMirror',1024,scene,true);
  mirror.mirrorPlane=new Plane(0,-1,0,y);mirror.level=.70;
  mat.reflectionTexture=mirror;
  const observer=scene.onBeforeRenderObservable.add(()=>{
    normal.uOffset=(normal.uOffset+.000045)%1;
    normal.vOffset=(normal.vOffset+.000025)%1;
  });
  return {water,mirror,normal,observer};
}

function createMist(scene:Scene){
  const root=new TransformNode('HF34_LakeMist',scene);
  for(let i=0;i<6;i++){
    const plane=MeshBuilder.CreatePlane('mist',{width:20+i*5,height:3.0+i*.30,sideOrientation:Mesh.DOUBLESIDE},scene);
    plane.parent=root;plane.position.set(HF265_POND.x+(i-2.5)*3.1,hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.66+i*.12,HF265_POND.z-4-i*5.3);plane.rotation.x=Math.PI/2;
    const m=new StandardMaterial('mist-mat-'+i,scene);m.diffuseColor=Color3.FromHexString(i<2?'#DCEAF0':'#AFC8D2');m.emissiveColor=m.diffuseColor.scale(.46);m.alpha=.030+i*.006;m.disableLighting=true;m.backFaceCulling=false;plane.material=m;
  }
  return root;
}

export async function createBabylonXianxiaWorld(scene:Scene,canvas:HTMLCanvasElement):Promise<BabylonXianxiaWorld>{
  scene.useRightHandedSystem=true;
  scene.clearColor=Color4.FromHexString(REF.palette.skyHorizon+'FF');
  scene.fogMode=Scene.FOGMODE_EXP2;
  scene.fogDensity=REF.render.fogDensity;
  scene.fogColor=Color3.FromHexString('#9AB6C1');
  createSky(scene);

  const camera=new ArcRotateCamera('HF34_CinematicCamera',-Math.PI*.64,Math.PI*.35,42,new Vector3(HF265_POND.x,4.2,HF265_POND.z-4),scene);
  camera.minZ=.08;camera.maxZ=800;camera.lowerRadiusLimit=5;camera.upperRadiusLimit=72;camera.wheelPrecision=30;camera.panningSensibility=0;camera.attachControl(canvas,true);
  scene.activeCamera=camera;

  const hemi=new HemisphericLight('HF34_Hemisphere',new Vector3(0,1,0),scene);hemi.diffuse=Color3.FromHexString('#D5E8ED');hemi.groundColor=Color3.FromHexString('#3B504B');hemi.intensity=REF.render.hemisphereIntensity;
  const sun=new DirectionalLight('HF34_WarmSun',new Vector3(-.52,-1,.38),scene);sun.diffuse=Color3.FromHexString(REF.palette.sunlight);sun.specular=Color3.FromHexString('#FFF8E9');sun.intensity=REF.render.sunIntensity;sun.position.set(HF265_SPAWN.x+54,76,HF265_SPAWN.z+42);
  const fill=new DirectionalLight('HF34_CoolFill',new Vector3(.62,-.32,-.44),scene);fill.diffuse=Color3.FromHexString(REF.palette.coolFill);fill.intensity=REF.render.coolFillIntensity;fill.position.set(HF265_SPAWN.x-30,25,HF265_SPAWN.z+20);
  const rim=new DirectionalLight('HF34_WarmRim',new Vector3(-.25,-.45,-.82),scene);rim.diffuse=Color3.FromHexString(REF.palette.warmHighlight);rim.intensity=REF.render.warmRimIntensity;rim.position.set(HF265_SPAWN.x+15,24,HF265_SPAWN.z-42);

  const shadow=new ShadowGenerator(2048,sun,true);shadow.useBlurExponentialShadowMap=true;shadow.blurKernel=22;shadow.bias=.00035;shadow.normalBias=.026;

  const terrain=createTerrain(scene);
  const waterState=createWater(scene);
  const water=waterState.water;
  createBridge(scene,shadow);
  createPavilion(scene,shadow,HF265_SPAWN.x-18.2,HF265_SPAWN.z-15,1.02);
  createPavilion(scene,shadow,HF265_SPAWN.x+19,HF265_SPAWN.z-5,.86);

  const useQuaternius=await quaterniusInstalled();
  if(useQuaternius){
    await Promise.all(HF265_NATURE_PLACEMENTS.map(async p=>{
      const loaded=await createQuaterniusPlacement(scene,shadow,p);
      if(loaded)return;
      if(p.asset.startsWith('rock'))createRock(scene,shadow,p.x,p.z,p.height,p.rotationY);
      else if(p.asset.includes('tree')||p.asset.includes('pine'))fallbackTree(scene,shadow,p);
      else createFallbackPlant(scene,p);
    }));
  }else{
    console.warn('[HF34 Babylon] Quaternius local cache absent; using visual fallback. Run npm run assets:quaternius:hf265.');
    for(const p of HF265_NATURE_PLACEMENTS){
      if(p.asset.startsWith('rock'))createRock(scene,shadow,p.x,p.z,p.height,p.rotationY);
      else if(p.asset.includes('tree')||p.asset.includes('pine'))fallbackTree(scene,shadow,p);
      else createFallbackPlant(scene,p);
    }
  }

  createMountains(scene);
  createMist(scene);

  const reflectables=scene.meshes.filter(m=>m!==water&&!m.name.startsWith('mist')&&!m.name.includes('Sky'));
  waterState.mirror.renderList=reflectables;

  return {
    camera,sun,hemisphere:hemi,shadow,water,terrain,natureMode:useQuaternius?'quaternius':'procedural-fallback',
    dispose(){
      scene.onBeforeRenderObservable.remove(waterState.observer);
      waterState.normal.dispose();
      waterState.mirror.dispose();
      shadow.dispose();
      camera.dispose();
    }
  };
}
