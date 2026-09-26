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
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Layer } from '@babylonjs/core/Layers/layer';
import { Scene } from '@babylonjs/core/scene';
import { HF265_NATURE_PLACEMENTS,HF265_POND,HF265_SPAWN,HF265_WORLD_HALF,hf265TerrainHeight } from '../../../shared/data/hf265-world-layout';
import { XIANXIA_REFERENCE_20260926 as REF } from '../reference-style';

export interface BabylonXianxiaWorld{
  camera:ArcRotateCamera;
  sun:DirectionalLight;
  hemisphere:HemisphericLight;
  shadow:ShadowGenerator;
  water:Mesh;
  terrain:Mesh;
  dispose():void;
}

const pbr=(name:string,hex:string,scene:Scene,roughness=.8,metallic=0)=>{
  const m=new PBRMaterial(name,scene);
  m.albedoColor=Color3.FromHexString(hex);
  m.roughness=roughness;
  m.metallic=metallic;
  m.environmentIntensity=metallic>.2?1.15:.72;
  return m;
};

function createSky(scene:Scene){
  const texture=new DynamicTexture('HF27_SkyGradientTexture',{width:8,height:512},scene,false);
  const ctx=texture.getContext();
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#BEE5F5');
  gradient.addColorStop(.42,'#C7E0EA');
  gradient.addColorStop(.76,'#8FB4C8');
  gradient.addColorStop(1,'#5F8196');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,8,512);texture.update(false);
  const layer=new Layer('HF27_SkyGradient',null,scene,true);
  layer.texture=texture;
  layer.color.a=1;
  return {layer,texture};
}

function createTerrain(scene:Scene){
  const size=HF265_WORLD_HALF*2;
  const terrain=MeshBuilder.CreateGround('HF27_Babylon_Terrain',{width:size,height:size,subdivisions:128,updatable:true},scene);
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
  const mat=pbr('HF27_TerrainMaterial',REF.palette.grassSage,scene,.96,0);
  mat.albedoColor=Color3.FromHexString('#7D896B');
  mat.microSurface=.22;
  terrain.material=mat;
  terrain.receiveShadows=true;
  return terrain;
}

function addShadow(shadow:ShadowGenerator,mesh:Mesh){
  mesh.receiveShadows=true;
  shadow.addShadowCaster(mesh,true);
}

function createPavilion(scene:Scene,shadow:ShadowGenerator,x:number,z:number,scale=1){
  const root=new TransformNode('HF27_Pavilion',scene);
  root.position.set(x,hf265TerrainHeight(x,z),z);
  const stone=pbr('HF27_PavilionStone'+x,REF.palette.stoneWarm,scene,.88,0);
  const wood=pbr('HF27_PavilionWood'+x,'#654437',scene,.72,0);
  const roof=pbr('HF27_PavilionRoof'+x,'#405665',scene,.54,.06);
  const roofHi=pbr('HF27_PavilionRoofHi'+x,'#6C8290',scene,.46,.08);
  const gold=pbr('HF27_PavilionGold'+x,'#A98558',scene,.32,.66);
  const platform=MeshBuilder.CreateCylinder('platform',{height:.36*scale,diameterTop:7.25*scale,diameterBottom:7.75*scale,tessellation:24},scene);platform.parent=root;platform.position.y=.18*scale;platform.material=stone;addShadow(shadow,platform);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=2.75*scale;const c=MeshBuilder.CreateCylinder('column',{height:3.7*scale,diameterTop:.3*scale,diameterBottom:.38*scale,tessellation:10},scene);c.parent=root;c.position.set(Math.cos(a)*r,2.05*scale,Math.sin(a)*r);c.material=wood;addShadow(shadow,c);}
  const eave=MeshBuilder.CreateCylinder('eave',{height:.22*scale,diameter:6.3*scale,tessellation:16},scene);eave.parent=root;eave.position.y=3.9*scale;eave.material=wood;addShadow(shadow,eave);
  const roof1=MeshBuilder.CreateCylinder('roof-main',{height:1.45*scale,diameterTop:.35*scale,diameterBottom:8.55*scale,tessellation:8},scene);roof1.parent=root;roof1.position.y=4.52*scale;roof1.rotation.y=Math.PI/8;roof1.scaling.z=.86;roof1.material=roof;addShadow(shadow,roof1);
  const roof2=MeshBuilder.CreateCylinder('roof-hi',{height:.92*scale,diameterTop:.25*scale,diameterBottom:6.9*scale,tessellation:8},scene);roof2.parent=root;roof2.position.y=5.05*scale;roof2.rotation.y=Math.PI/8;roof2.scaling.z=.86;roof2.material=roofHi;addShadow(shadow,roof2);
  const cap=MeshBuilder.CreateCylinder('roof-cap',{height:.75*scale,diameterTop:.09*scale,diameterBottom:.16*scale,tessellation:8},scene);cap.parent=root;cap.position.y=5.85*scale;cap.material=gold;addShadow(shadow,cap);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8,r=4.02*scale;const tip=MeshBuilder.CreateSphere('eave-tip',{diameter:.23*scale,segments:8},scene);tip.parent=root;tip.position.set(Math.cos(a)*r,4.12*scale,Math.sin(a)*r*.86);tip.material=gold;addShadow(shadow,tip);}
  return root;
}

function cylinderBetween(scene:Scene,a:Vector3,b:Vector3,diameter:number,material:PBRMaterial,parent:TransformNode){
  const mid=a.add(b).scale(.5),direction=b.subtract(a),length=direction.length();
  const mesh=MeshBuilder.CreateCylinder('bridge-rail',{height:length,diameter,tessellation:8},scene);
  mesh.position=mid;mesh.material=material;mesh.parent=parent;
  const up=new Vector3(0,1,0),normal=direction.normalize(),axis=Vector3.Cross(up,normal),dot=Math.max(-1,Math.min(1,Vector3.Dot(up,normal))),angle=Math.acos(dot);
  if(axis.lengthSquared()>.000001)mesh.rotate(axis.normalize(),angle);
  return mesh;
}

function createBridge(scene:Scene,shadow:ShadowGenerator){
  const root=new TransformNode('HF27_Arched_Bridge',scene);
  const stone=pbr('HF27_BridgeStone','#AAA69D',scene,.86,0);
  const rail=pbr('HF27_BridgeRail','#8B9295',scene,.7,.03);
  const count=31;
  for(let i=0;i<count;i++){
    const t=i/(count-1),x=-10.2+t*20.4,arch=Math.sin(Math.PI*t)*2.15;
    const slab=MeshBuilder.CreateBox('bridge-slab',{width:.74,height:.25,depth:3.1},scene);
    slab.position.set(HF265_POND.x+x,hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.18+arch,HF265_POND.z);
    slab.rotation.z=Math.cos(Math.PI*t)*-.12;slab.material=stone;addShadow(shadow,slab);slab.parent=root;
  }
  for(const side of [-1,1])for(let i=0;i<11;i++){
    const t=i/10,x=-9.5+t*19,arch=Math.sin(Math.PI*t)*2.15,y=hf265TerrainHeight(HF265_POND.x+x,HF265_POND.z)+.75+arch;
    const post=MeshBuilder.CreateCylinder('bridge-post',{height:.86,diameterTop:.18,diameterBottom:.24,tessellation:8},scene);post.position.set(HF265_POND.x+x,y,HF265_POND.z+side*1.48);post.material=rail;addShadow(shadow,post);post.parent=root;
    if(i<10){const nt=(i+1)/10,nx=-9.5+nt*19,narch=Math.sin(Math.PI*nt)*2.15,ny=hf265TerrainHeight(HF265_POND.x+nx,HF265_POND.z)+1.12+narch;
      const a=new Vector3(HF265_POND.x+x,y+.37,HF265_POND.z+side*1.48),b=new Vector3(HF265_POND.x+nx,ny,HF265_POND.z+side*1.48),mid=a.add(b).scale(.5),len=Vector3.Distance(a,b);
      const bar=cylinderBetween(scene,a,b,.13,rail,root);addShadow(shadow,bar);
    }
  }
  return root;
}

function createTree(scene:Scene,shadow:ShadowGenerator,x:number,z:number,height:number,tint:string,rotationY:number){
  const root=new TransformNode('HF27_Maple',scene);root.position.set(x,hf265TerrainHeight(x,z),z);root.rotation.y=rotationY;
  const trunkMat=pbr('trunk-'+x,'#5A3C32',scene,.9,0);
  const leafHex=tint==='coral'?REF.palette.mapleBright:tint==='peach'?REF.palette.maplePeach:tint==='cool'?'#667C70':'#788667';
  const leafMat=pbr('leaf-'+x,leafHex,scene,.72,0);leafMat.subSurface.isTranslucencyEnabled=true;leafMat.subSurface.translucencyIntensity=.12;
  const trunk=MeshBuilder.CreateCylinder('tree-trunk',{height:height*.54,diameterTop:height*.11,diameterBottom:height*.18,tessellation:9},scene);trunk.parent=root;trunk.position.y=height*.27;trunk.material=trunkMat;addShadow(shadow,trunk);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+(i%2)*.3;const crown=MeshBuilder.CreateSphere('maple-crown',{diameter:height*(.46+(i%3)*.035),segments:12},scene);crown.parent=root;crown.position.set(Math.cos(a)*height*.17,height*(.62+(i%2)*.09),Math.sin(a)*height*.14);crown.scaling.y=.62;crown.scaling.z=.82;crown.material=leafMat;addShadow(shadow,crown);}
  return root;
}

function createRock(scene:Scene,shadow:ShadowGenerator,x:number,z:number,height:number,rotationY:number){
  const rock=MeshBuilder.CreateIcoSphere('HF27_Rock',{radius:height*.62,subdivisions:2},scene);rock.position.set(x,hf265TerrainHeight(x,z)+height*.36,z);rock.scaling.set(1.25,.72,.9);rock.rotation.y=rotationY;rock.material=pbr('rock-'+x,'#8D8E88',scene,.94,0);addShadow(shadow,rock);return rock;
}

function createMountains(scene:Scene){
  const root=new TransformNode('HF27_Karst_Horizon',scene);
  const mats=[pbr('mountain-back','#7D9EAC',scene,.98,0),pbr('mountain-mid','#66818D',scene,.98,0),pbr('mountain-near','#566E78',scene,.98,0)];
  const clusters=[
    {z:HF265_SPAWN.z-138,baseY:-8,count:13,spread:110,mat:mats[0],scale:.82},
    {z:HF265_SPAWN.z-112,baseY:-7,count:11,spread:92,mat:mats[1],scale:1},
    {z:HF265_SPAWN.z-92,baseY:-6,count:7,spread:78,mat:mats[2],scale:1.05},
  ];
  for(let ring=0;ring<clusters.length;ring++){const c=clusters[ring];for(let i=0;i<c.count;i++){
    const n=(i+.5)/c.count-.5,seed=(i*17+ring*29)%31,height=(22+((seed*13)%25))*c.scale,width=9+((seed*7)%9);
    const peak=MeshBuilder.CreateCylinder('karst',{height,diameterTop:width*.18,diameterBottom:width,tessellation:10,subdivisions:3},scene);peak.position.set(HF265_SPAWN.x+n*c.spread,c.baseY+height*.5,c.z-((i*11)%9));peak.scaling.z=.72+((seed%5)*.08);peak.rotation.y=(seed%7)*.11;peak.material=c.mat;peak.parent=root;
  }}
  return root;
}

function createWater(scene:Scene){
  const y=hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.07;
  const water=MeshBuilder.CreateDisc('HF27_Reflective_Lake',{radius:1,tessellation:128,sideOrientation:Mesh.DOUBLESIDE},scene);
  water.rotation.x=Math.PI/2;water.scaling.set(HF265_POND.rx,HF265_POND.rz,1);water.position.set(HF265_POND.x,y,HF265_POND.z);
  const mat=pbr('HF27_LakeMaterial','#4E8EAA',scene,.08,.04);mat.alpha=.86;mat.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;mat.indexOfRefraction=1.333;mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.72;mat.clearCoat.roughness=.12;
  water.material=mat;
  const mirror=new MirrorTexture('HF27_LakeMirror',1024,scene,true);
  mirror.mirrorPlane=new Plane(0,-1,0,y);
  mirror.level=.78;
  mat.reflectionTexture=mirror;
  return {water,mirror};
}

function createMist(scene:Scene){
  const root=new TransformNode('HF27_LakeMist',scene);
  for(let i=0;i<5;i++){const plane=MeshBuilder.CreatePlane('mist',{width:18+i*5,height:3.2+i*.35,sideOrientation:Mesh.DOUBLESIDE},scene);plane.parent=root;plane.position.set(HF265_POND.x+(i-2)*3.5,hf265TerrainHeight(HF265_POND.x,HF265_POND.z)+.75+i*.12,HF265_POND.z-4-i*5);plane.rotation.x=Math.PI/2;const m=new StandardMaterial('mist-mat-'+i,scene);m.diffuseColor=Color3.FromHexString(i<2?'#D7E8EE':'#A8C3CE');m.emissiveColor=m.diffuseColor.scale(.55);m.alpha=.045+i*.008;m.disableLighting=true;m.backFaceCulling=false;plane.material=m;}
  return root;
}

export function createBabylonXianxiaWorld(scene:Scene,canvas:HTMLCanvasElement):BabylonXianxiaWorld{
  scene.useRightHandedSystem=true;
  scene.clearColor=Color4.FromHexString('#C7E0EAFF');
  scene.fogMode=Scene.FOGMODE_EXP2;
  scene.fogDensity=.0030;
  scene.fogColor=Color3.FromHexString('#8FB2C2');
  createSky(scene);

  const camera=new ArcRotateCamera('HF27_CinematicCamera',-Math.PI*.64,Math.PI*.35,42,new Vector3(HF265_POND.x,4.2,HF265_POND.z-4),scene);
  camera.minZ=.08;camera.maxZ=800;camera.lowerRadiusLimit=5;camera.upperRadiusLimit=72;camera.wheelPrecision=30;camera.panningSensibility=0;camera.attachControl(canvas,true);
  scene.activeCamera=camera;

  const hemi=new HemisphericLight('HF27_Hemisphere',new Vector3(0,1,0),scene);hemi.diffuse=Color3.FromHexString('#D5E8F1');hemi.groundColor=Color3.FromHexString('#354651');hemi.intensity=.54;
  const sun=new DirectionalLight('HF27_WarmSun',new Vector3(-.52,-1,.38),scene);sun.diffuse=Color3.FromHexString('#F5C5A0');sun.specular=Color3.FromHexString('#FFF3DE');sun.intensity=4.25;sun.position.set(HF265_SPAWN.x+54,76,HF265_SPAWN.z+42);
  const fill=new DirectionalLight('HF27_CoolFill',new Vector3(.62,-.32,-.44),scene);fill.diffuse=Color3.FromHexString('#7FA9C0');fill.intensity=.36;fill.position.set(HF265_SPAWN.x-30,25,HF265_SPAWN.z+20);
  const rim=new DirectionalLight('HF27_WarmRim',new Vector3(-.25,-.45,-.82),scene);rim.diffuse=Color3.FromHexString('#D99274');rim.intensity=.32;rim.position.set(HF265_SPAWN.x+15,24,HF265_SPAWN.z-42);

  const shadow=new ShadowGenerator(2048,sun,true);shadow.useBlurExponentialShadowMap=true;shadow.blurKernel=18;shadow.bias=.00035;shadow.normalBias=.025;

  const terrain=createTerrain(scene);
  const {water,mirror}=createWater(scene);
  createBridge(scene,shadow);
  createPavilion(scene,shadow,HF265_SPAWN.x-18.2,HF265_SPAWN.z-15,1.02);
  createPavilion(scene,shadow,HF265_SPAWN.x+19,HF265_SPAWN.z-5,.86);
  for(const p of HF265_NATURE_PLACEMENTS){
    if(p.asset.startsWith('rock'))createRock(scene,shadow,p.x,p.z,p.height,p.rotationY);
    else if(p.asset.includes('tree')||p.asset.includes('pine'))createTree(scene,shadow,p.x,p.z,p.height,p.tint??'sage',p.rotationY);
  }
  createMountains(scene);
  createMist(scene);

  const reflectables=scene.meshes.filter(m=>m!==water&&!m.name.startsWith('mist')&&!m.name.includes('Sky'));
  mirror.renderList=reflectables;

  return {camera,sun,hemisphere:hemi,shadow,water,terrain,dispose(){mirror.dispose();shadow.dispose();camera.dispose();}};
}
