import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { heightAt } from '../../shared/data/world';
import { XIANXIA_GRADIENTS, sampleXianxiaGradient } from '../rendering/xianxia-visual-style';
import { upgradeMaterialFromPolyHaven } from '../rendering/external-art-assets';

type DetailLevel='low'|'balanced'|'high';

const loader=new T.TextureLoader();
const texture=(url:string,srgb=false,repeatX=1,repeatY=1)=>{
  if(typeof document==='undefined'){
    const data=new Uint8Array(srgb?[128,128,128,255]:[128,128,255,255]);
    const t=new T.DataTexture(data,1,1,T.RGBAFormat,T.UnsignedByteType);
    t.wrapS=t.wrapT=T.RepeatWrapping;
    t.repeat.set(repeatX,repeatY);
    if(srgb)t.colorSpace=T.SRGBColorSpace;
    t.needsUpdate=true;
    t.name=`QL-TestFallback:${url}`;
    return t;
  }
  const t=loader.load(url);
  t.wrapS=t.wrapT=T.RepeatWrapping;
  t.repeat.set(repeatX,repeatY);
  t.anisotropy=4;
  if(srgb)t.colorSpace=T.SRGBColorSpace;
  return t;
};

const TEX={
  grass:texture('/assets/reference-20260925/grass_albedo.png',true,8,8),
  grassRough:texture('/assets/reference-20260925/grass_roughness.png',false,8,8),
  grassNormal:texture('/assets/reference-20260925/grass_normal.png',false,8,8),
  stone:texture('/assets/reference-20260925/stone_albedo.png',true,5,5),
  stoneRough:texture('/assets/reference-20260925/stone_roughness.png',false,5,5),
  stoneNormal:texture('/assets/reference-20260925/stone_normal.png',false,5,5),
  wood:texture('/assets/reference-20260925/wood_albedo.png',true,3,3),
  woodRough:texture('/assets/reference-20260925/wood_roughness.png',false,3,3),
  woodNormal:texture('/assets/reference-20260925/wood_normal.png',false,3,3),
  roof:texture('/assets/reference-20260925/roof_albedo.png',true,4,4),
  roofRough:texture('/assets/reference-20260925/roof_roughness.png',false,4,4),
  roofNormal:texture('/assets/reference-20260925/roof_normal.png',false,4,4),
  waterNormal:texture('/assets/reference-20260925/water_normal.png',false,5,5),
  mapleLeaf:texture('/assets/external-lookdev/maple_leaf_mask.png',true,1,1),
  flower:texture('/assets/external-lookdev/peach_flower.png',true,1,1),
  mist:texture('/assets/reference-20260925/mist.png',true,1,1),
};

function mat(color:T.ColorRepresentation,roughness:number,metalness:number,opacity=1){
  const material=new T.MeshStandardMaterial({color,roughness,metalness,transparent:opacity<1,opacity});
  material.envMapIntensity=metalness>.2?1.0:.7;
  material.dithering=true;
  return material;
}
function texturedMat(opts:{map:T.Texture;roughnessMap?:T.Texture;normalMap?:T.Texture;color?:T.ColorRepresentation;roughness?:number;metalness?:number;side?:T.Side;transparent?:boolean;alphaTest?:number;opacity?:number}){
  const m=new T.MeshStandardMaterial({map:opts.map,roughnessMap:opts.roughnessMap,normalMap:opts.normalMap,color:opts.color??'#ffffff',roughness:opts.roughness??.7,metalness:opts.metalness??0,side:opts.side??T.FrontSide,transparent:opts.transparent??false,alphaTest:opts.alphaTest??0,opacity:opts.opacity??1});
  m.envMapIntensity=.78;m.dithering=true;return m;
}

function seeded(seed:number){let s=seed*16807%2147483647;return()=>((s=s*16807%2147483647)-1)/2147483646;}

function createCurvedTrunk(seed:number){
  const rnd=seeded(1200+seed*73);
  const wood=texturedMat({map:TEX.wood,roughnessMap:TEX.woodRough,normalMap:TEX.woodNormal,roughness:.82,metalness:.01});upgradeMaterialFromPolyHaven(wood,'bark',2,4);
  const root=new T.Group();
  const points=[new T.Vector3(0,0,0),new T.Vector3((rnd()-.5)*.45,1.6,(rnd()-.5)*.4),new T.Vector3((rnd()-.5)*.85,3.2,(rnd()-.5)*.75),new T.Vector3((rnd()-.5)*1.1,4.8,(rnd()-.5)*.95),new T.Vector3((rnd()-.5)*1.25,6.0,(rnd()-.5)*1.1)];
  const curve=new T.CatmullRomCurve3(points);
  const trunk=new T.Mesh(new T.TubeGeometry(curve,28,.42,10,false),wood);
  trunk.castShadow=true;trunk.receiveShadow=true;root.add(trunk);
  const branchEnds:T.Vector3[]=[];
  for(let i=0;i<8;i++){
    const startT=.42+i*.06;
    const start=curve.getPoint(startT);
    const angle=i/8*Math.PI*2+rnd()*.7;
    const len=2.0+rnd()*1.6;
    const mid=start.clone().add(new T.Vector3(Math.cos(angle)*len*.45,.55+rnd()*.8,Math.sin(angle)*len*.45));
    const end=start.clone().add(new T.Vector3(Math.cos(angle)*len,1.0+rnd()*1.4,Math.sin(angle)*len));
    const bcurve=new T.CatmullRomCurve3([start,mid,end]);
    const branch=new T.Mesh(new T.TubeGeometry(bcurve,12,.17+rnd()*.07,7,false),wood);
    branch.castShadow=true;branch.receiveShadow=true;root.add(branch);branchEnds.push(end);
  }
  return {root,branchEnds};
}

function createLeafCanopy(seed:number,branchEnds:T.Vector3[],quality:DetailLevel){
  const rnd=seeded(4100+seed*97);
  const count=quality==='high'?620:quality==='balanced'?390:170;
  const g=new T.PlaneGeometry(.46,.68,1,1);
  const m=texturedMat({map:TEX.mapleLeaf,roughness:.72,metalness:0,side:T.DoubleSide,transparent:true,alphaTest:.28});
  m.vertexColors=true;m.envMapIntensity=.56;
  const leaves=new T.InstancedMesh(g,m,count);
  leaves.castShadow=quality!=='low';leaves.receiveShadow=true;
  const dummy=new T.Object3D();const c=new T.Color();const tmp=new T.Color();
  for(let i=0;i<count;i++){
    const anchor=branchEnds[i%branchEnds.length]??new T.Vector3(0,5,0);
    const a=rnd()*Math.PI*2,r=0.35+Math.pow(rnd(),.55)*2.25;
    dummy.position.copy(anchor).add(new T.Vector3(Math.cos(a)*r,(rnd()-.3)*1.8,Math.sin(a)*r));
    dummy.rotation.set(rnd()*Math.PI,rnd()*Math.PI,rnd()*Math.PI);
    const s=.48+rnd()*.62;dummy.scale.setScalar(s);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
    const palette=rnd()<.18?XIANXIA_GRADIENTS.cherry:XIANXIA_GRADIENTS.maple;
    sampleXianxiaGradient(palette,.38+rnd()*.56,tmp);c.copy(tmp).offsetHSL((rnd()-.5)*.012,.02+(rnd()-.5)*.035,.015+(rnd()-.5)*.04);leaves.setColorAt(i,c);
  }
  leaves.instanceMatrix.needsUpdate=true;if(leaves.instanceColor)leaves.instanceColor.needsUpdate=true;
  return leaves;
}

function buildMapleTree(seed:number,quality:DetailLevel){
  const tree=new T.Group();const {root,branchEnds}=createCurvedTrunk(seed);tree.add(root);tree.add(createLeafCanopy(seed,branchEnds,quality));return tree;
}

function createCurvedRoof(radius=4.6,height=1.8,sides=8,radial=8){
  const positions:number[]=[];const uvs:number[]=[];const indices:number[]=[];
  for(let r=0;r<=radial;r++){
    const t=r/radial,rr=radius*t;
    for(let s=0;s<sides;s++){
      const a=s/sides*Math.PI*2;
      const cornerLift=Math.pow(Math.abs(Math.cos(a*sides/2)),5)*.42*t*t;
      const y=height*(1-Math.pow(t,.72)) + cornerLift + Math.pow(t,5)*.24;
      positions.push(Math.cos(a)*rr,y,Math.sin(a)*rr);uvs.push(s/sides,t);
    }
  }
  for(let r=0;r<radial;r++)for(let s=0;s<sides;s++){
    const n=(s+1)%sides,a=r*sides+s,b=r*sides+n,c=(r+1)*sides+s,d=(r+1)*sides+n;
    indices.push(a,c,b,b,c,d);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function addPavilion(parent:T.Object3D,x:number,z:number,scale=1){
  const group=new T.Group();
  const stone=texturedMat({map:TEX.stone,roughnessMap:TEX.stoneRough,normalMap:TEX.stoneNormal,roughness:.78});
  const wood=texturedMat({map:TEX.wood,roughnessMap:TEX.woodRough,normalMap:TEX.woodNormal,roughness:.73,metalness:.02});
  const roof=texturedMat({map:TEX.roof,roughnessMap:TEX.roofRough,normalMap:TEX.roofNormal,roughness:.44,metalness:.10});
  upgradeMaterialFromPolyHaven(stone,'stone',4,4);upgradeMaterialFromPolyHaven(wood,'wood',3,5);upgradeMaterialFromPolyHaven(roof,'roof',4,4);
  const gold=mat('#CFA668',.34,.52);
  const floor=new T.Mesh(new T.CylinderGeometry(3.85,4.15,.42,32),stone);floor.receiveShadow=true;group.add(floor);
  const beamY=3.55;
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const post=new T.Mesh(new T.CylinderGeometry(.16,.2,4.25,12),wood);post.position.set(Math.cos(a)*2.9,2.12,Math.sin(a)*2.9);post.castShadow=true;post.receiveShadow=true;group.add(post);
    const rail=new T.Mesh(new T.BoxGeometry(1.75,.11,.11),wood);rail.position.set(Math.cos(a)*2.65,1.15,Math.sin(a)*2.65);rail.rotation.y=-a;group.add(rail);
    for(let j=-1;j<=1;j++){
      const bal=new T.Mesh(new T.CylinderGeometry(.035,.045,.78,8),wood);bal.position.set(Math.cos(a)*2.7+Math.cos(a+Math.PI/2)*j*.48,.82,Math.sin(a)*2.7+Math.sin(a+Math.PI/2)*j*.48);group.add(bal);
    }
    const lampBody=new T.Mesh(new T.CylinderGeometry(.13,.13,.34,10),gold);lampBody.position.set(Math.cos(a)*2.15,3.25,Math.sin(a)*2.15);group.add(lampBody);
    const light=new T.PointLight('#FFD6A1',.16,4.2,2);light.position.copy(lampBody.position);group.add(light);
  }
  const topRing=new T.Mesh(new T.TorusGeometry(2.86,.09,10,64),gold);topRing.rotation.x=Math.PI/2;topRing.position.y=beamY;group.add(topRing);
  const roofMesh=new T.Mesh(createCurvedRoof(),roof);roofMesh.position.y=3.48;roofMesh.castShadow=true;roofMesh.receiveShadow=true;group.add(roofMesh);
  const roof2=new T.Mesh(createCurvedRoof(2.6,1.15),roof);roof2.position.y=5.1;roof2.scale.y=.75;roof2.castShadow=true;group.add(roof2);
  const finial=new T.Mesh(new T.CylinderGeometry(.11,.23,.85,12),gold);finial.position.y=6.15;group.add(finial);
  group.position.set(x,.16,z);group.scale.setScalar(scale);parent.add(group);
}

function addArchBridge(parent:T.Object3D){
  const stone=texturedMat({map:TEX.stone,roughnessMap:TEX.stoneRough,normalMap:TEX.stoneNormal,roughness:.74});upgradeMaterialFromPolyHaven(stone,'stone',5,5);
  const bridge=new T.Group();
  const slabs=23;
  for(let i=0;i<slabs;i++){
    const t=i/(slabs-1),x=-8+t*16,y=Math.sin(t*Math.PI)*2.45;
    const slab=new T.Mesh(new T.BoxGeometry(.82,.28,4.2),stone);slab.position.set(x,y,0);slab.rotation.z=Math.cos(t*Math.PI)*-.12;slab.castShadow=true;slab.receiveShadow=true;bridge.add(slab);
    if(i%2===0){for(const side of [-1,1]){const post=new T.Mesh(new T.CylinderGeometry(.075,.095,1.05,10),stone);post.position.set(x,y+.74,side*1.85);post.castShadow=true;bridge.add(post);}}
  }
  for(const side of [-1,1])for(let i=0;i<22;i++){
    const t=(i+.5)/22,x=-7.65+t*15.3,y=.93+Math.sin(t*Math.PI)*2.45;
    const rail=new T.Mesh(new T.BoxGeometry(.78,.14,.14),stone);rail.position.set(x,y,side*1.85);rail.rotation.z=Math.cos(t*Math.PI)*-.11;bridge.add(rail);
  }
  bridge.position.set(0,.2,-8.6);parent.add(bridge);
}

function addWaterLily(parent:T.Object3D,x:number,z:number,scale:number){
  const leaf=new T.Mesh(new T.CircleGeometry(.7*scale,24),mat('#657158',.82,.02));leaf.rotation.x=-Math.PI/2;leaf.position.set(x,.07,z);leaf.receiveShadow=true;parent.add(leaf);
  for(let i=0;i<7;i++){
    const petal=new T.Mesh(new T.SphereGeometry(.13*scale,10,8,0,Math.PI*2,0,Math.PI/2),mat('#D9A3A0',.7,.01));petal.scale.set(1,.48,1.7);petal.position.set(x+Math.cos(i/7*Math.PI*2)*.13*scale,.13,z+Math.sin(i/7*Math.PI*2)*.13*scale);petal.rotation.y=i/7*Math.PI*2;parent.add(petal);
  }
}



function createGrassBlades(quality:DetailLevel){
  const maxCount=2800,count=quality==='high'?2800:quality==='balanced'?1700:650;
  const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.94,metalness:0,alphaTest:.05});material.envMapIntensity=.36;material.dithering=true;
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(.075,.72),material,maxCount);mesh.name='HF25_Grass_Blades';mesh.castShadow=false;mesh.receiveShadow=true;
  const dummy=new T.Object3D(),rnd=seeded(74321),col=new T.Color();
  for(let i=0;i<maxCount;i++){
    const a=rnd()*Math.PI*2,r=11.2+Math.pow(rnd(),.72)*28,x=Math.cos(a)*r,z=Math.sin(a)*r-8.7;
    dummy.position.set(x,.34+rnd()*.08,z);dummy.rotation.set(0,rnd()*Math.PI*2,(rnd()-.5)*.16);const sc=.45+rnd()*.85;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    col.set(rnd()<.18?'#A1A087':rnd()<.45?'#83866C':'#657158').offsetHSL((rnd()-.5)*.025,(rnd()-.5)*.04,(rnd()-.5)*.045);mesh.setColorAt(i,col);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.count=count;return mesh;
}

function createSteppingPath(stone:T.MeshStandardMaterial){
  const count=22,mesh=new T.InstancedMesh(new T.CylinderGeometry(.58,.64,.12,14),stone,count);mesh.name='HF25_Garden_Stepping_Path';mesh.castShadow=true;mesh.receiveShadow=true;
  const dummy=new T.Object3D();
  for(let i=0;i<count;i++){
    const t=i/(count-1),z=5.5-t*10.0,x=Math.sin(t*Math.PI*1.6)*.55;
    dummy.position.set(x,.03,z);dummy.rotation.set(0,t*.7,.02);dummy.scale.set(.78+(i%4)*.07,1,.62+(i%3)*.08);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;return mesh;
}

function createFlowerMeadow(quality:DetailLevel){
  const maxCount=2600,count=quality==='high'?2600:quality==='balanced'?1500:560;
  const material=texturedMat({map:TEX.flower,roughness:.76,metalness:0,side:T.DoubleSide,transparent:true,alphaTest:.16});material.envMapIntensity=.45;material.vertexColors=true;
  const mesh=new T.InstancedMesh(new T.PlaneGeometry(.28,.28),material,maxCount);mesh.name='HF25_Peach_Flower_Meadow';mesh.castShadow=false;mesh.receiveShadow=false;
  const dummy=new T.Object3D(),rnd=seeded(99173),col=new T.Color();
  for(let i=0;i<maxCount;i++){
    let a=rnd()*Math.PI*2,r=9.5+Math.pow(rnd(),.62)*25;
    // Keep the densest flowers on the far shore and around the maples, away from the player's feet.
    const x=Math.cos(a)*r,z=Math.sin(a)*r-9.5;
    dummy.position.set(x,.14+rnd()*.12,z);dummy.rotation.set(-Math.PI/2+(rnd()-.5)*.18,rnd()*Math.PI*2,(rnd()-.5)*.24);const sc=.55+rnd()*1.15;dummy.scale.setScalar(sc);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    col.set(rnd()<.38?'#D9A3A0':rnd()<.68?'#C88782':'#E0B2A0').offsetHSL((rnd()-.5)*.012,(rnd()-.5)*.04,(rnd()-.5)*.03);mesh.setColorAt(i,col);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.count=count;return mesh;
}

function createCragMountain(seed:number,radius:number,height:number,color:T.ColorRepresentation){
  const rnd=seeded(7300+seed*211);const geo=new T.ConeGeometry(radius,height,48,14,false);const pos=geo.getAttribute('position');
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),angle=Math.atan2(z,x),yn=(y+height*.5)/height;
    const noise=Math.sin(angle*3.1+seed)*.09+Math.sin(angle*7.3+yn*5.7+seed*.7)*.045+(rnd()-.5)*.035;
    const scale=1+noise*(.3+.7*(1-yn));pos.setXYZ(i,x*scale,y,z*scale);
  }
  geo.computeVertexNormals();const m=mat(color,.97,.0);m.envMapIntensity=.22;const mesh=new T.Mesh(geo,m);mesh.receiveShadow=true;return mesh;
}

function createMistPlane(width:number,height:number){
  const m=texturedMat({map:TEX.mist,roughness:1,metalness:0,side:T.DoubleSide,transparent:true,opacity:.24});m.depthWrite=false;m.emissive.set('#D0E5F0');m.emissiveIntensity=.08;return new T.Mesh(new T.PlaneGeometry(width,height),m);
}

export class XianxiaHeroGarden{
  readonly root=new T.Group();private water:T.Mesh[]=[];private mist:T.Mesh[]=[];private petals:T.InstancedMesh;private flowers:T.InstancedMesh;private grassBlades:T.InstancedMesh;private reflectors:Reflector[]=[];private detail:DetailLevel='balanced';
  constructor(parent:T.Object3D,anchor:{x:number;z:number},initialDetail:DetailLevel='balanced'){
    this.detail=initialDetail;this.root.name='Qinglan_Hero_Garden_HF25';this.root.position.set(anchor.x,heightAt(anchor.x,anchor.z),anchor.z);parent.add(this.root);
    const grass=texturedMat({map:TEX.grass,roughnessMap:TEX.grassRough,normalMap:TEX.grassNormal,roughness:.88,metalness:.0});upgradeMaterialFromPolyHaven(grass,'grass',12,12);
    const stone=texturedMat({map:TEX.stone,roughnessMap:TEX.stoneRough,normalMap:TEX.stoneNormal,roughness:.78});upgradeMaterialFromPolyHaven(stone,'stone',5,5);
    const ground=new T.Mesh(new T.CircleGeometry(42,128),grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.05;ground.receiveShadow=true;this.root.add(ground);
    const bankMat=grass.clone();bankMat.color=new T.Color('#9FA27B');const bank=new T.Mesh(new T.RingGeometry(10.7,14.2,96),bankMat);bank.rotation.x=-Math.PI/2;bank.position.set(0,.0,-8.7);bank.receiveShadow=true;this.root.add(bank);this.root.add(createSteppingPath(stone));
    const waterMat=mat('#31627C',.10,.10,.955);waterMat.normalMap=TEX.waterNormal;waterMat.normalScale.set(.50,.50);waterMat.envMapIntensity=2.35;waterMat.emissive.set('#102936');waterMat.emissiveIntensity=.012;waterMat.depthWrite=true;
    const pondGeo=new T.CircleGeometry(11.0,96);
    const reflector=new Reflector(pondGeo.clone(),{clipBias:.0025,textureWidth:initialDetail==='high'?768:initialDetail==='balanced'?512:256,textureHeight:initialDetail==='high'?768:initialDetail==='balanced'?512:256,color:new T.Color('#31586F')});
    reflector.rotation.x=-Math.PI/2;reflector.position.set(0,.035,-8.7);reflector.renderOrder=-2;this.root.add(reflector);this.reflectors.push(reflector);
    const pond=new T.Mesh(pondGeo,waterMat);pond.rotation.x=-Math.PI/2;pond.position.set(0,.05,-8.7);pond.receiveShadow=true;pond.renderOrder=-1;this.root.add(pond);this.water.push(pond);
    const shallow=new T.Mesh(new T.CircleGeometry(5.8,64),waterMat.clone());shallow.rotation.x=-Math.PI/2;shallow.position.set(-8,.055,-11.2);shallow.scale.set(1.3,.72,1);shallow.renderOrder=-1;this.root.add(shallow);this.water.push(shallow);
    addArchBridge(this.root);addPavilion(this.root,-17.8,-14.8,1.14);addPavilion(this.root,18.8,-4.8,.94);
    const trees:[number,number,number,number][]=[[-13.2,-1.4,1,1.18],[15.7,-13.7,3,1.08],[-20.2,-9.2,4,1.04],[-6.2,-18.4,5,1.02],[22.6,-15.4,6,.98],[-25.2,-18.7,7,1.12],[5.4,-22.5,8,.94],[28.2,-4.4,9,.9],[-30.5,-3.1,10,.98],[1.5,-28.8,11,.88]];
    for(const [x,z,seed,s] of trees){const tree=buildMapleTree(seed,initialDetail);tree.position.set(x,0,z);tree.scale.setScalar(s);this.root.add(tree);}
    for(const [x,z,s] of [[-15,-1.5,1.0],[-8,-3.2,.72],[6.8,-2.1,.92],[18,-6.4,1.05],[13.6,-16.2,.9]] as const){const rock=new T.Mesh(new T.IcosahedronGeometry(1.3*s,2),stone);rock.position.set(x,.65,z);rock.scale.set(1.4,.72,1.0);rock.rotation.set(.1,s*.7,.12);rock.castShadow=true;rock.receiveShadow=true;this.root.add(rock);}
    for(const [x,z,s] of [[-3.8,-5.6,1.1],[1.7,-10.7,.85],[4.8,-6.8,.92],[-6,-11.5,.7]] as const)addWaterLily(this.root,x,z,s);
    this.grassBlades=createGrassBlades(initialDetail);this.root.add(this.grassBlades);
    this.flowers=createFlowerMeadow(initialDetail);this.root.add(this.flowers);
    for(const spec of [[15,4,.7,-8.5],[12,3.2,.8,-6.3],[17,3.8,.62,-12.2]] as const){const m=createMistPlane(spec[0],spec[1]);m.rotation.x=-Math.PI/2;m.position.set(0,spec[2],spec[3]);this.root.add(m);this.mist.push(m);}
    for(const [x,y,z,r,h,c,seed] of [[-82,13,-100,15,40,'#59798B',1],[-48,7,-82,11,29,'#6E8A98',2],[5,18,-116,19,52,'#91AEBB',3],[61,11,-96,14,38,'#5F7B89',4],[102,18,-130,22,58,'#91AEBB',5]] as const){const mountain=createCragMountain(seed,r,h,c);mountain.position.set(x,y,z);mountain.rotation.y=(x+z)*.019;this.root.add(mountain);}
    const petalMat=mat('#D39A8A',.72,.01,.82);petalMat.side=T.DoubleSide;petalMat.depthWrite=false;const g=new T.PlaneGeometry(.18,.1);this.petals=new T.InstancedMesh(g,petalMat,34);const dummy=new T.Object3D();
    for(let i=0;i<34;i++){const a=i/34*Math.PI*2,r=4.4+(i%8)*1.6;dummy.position.set(Math.cos(a)*r,1.5+(i%6)*.45,Math.sin(a)*r-8.6);dummy.rotation.set(rndAngle(i),a,rndAngle(i+7));dummy.scale.setScalar(.8+(i%4)*.18);dummy.updateMatrix();this.petals.setMatrixAt(i,dummy.matrix);}this.petals.instanceMatrix.needsUpdate=true;this.root.add(this.petals);
    this.setDetail(initialDetail);
  }
  update(time:number){for(let i=0;i<this.water.length;i++){const m=this.water[i],mat=m.material as T.MeshStandardMaterial;mat.normalScale.set(.38+Math.sin(time*.22+i)*.04,.38+Math.cos(time*.19+i)*.04);m.rotation.z=Math.sin(time*.1+i)*.003;}for(let i=0;i<this.mist.length;i++){const m=this.mist[i];m.position.x=Math.sin(time*.12+i)*.8;m.position.y=.58+i*.08+Math.sin(time*.32+i)*.08;(m.material as T.MeshStandardMaterial).opacity=this.detail==='high'?.23:this.detail==='balanced'?.18:.12;}const dummy=new T.Object3D();for(let i=0;i<this.petals.count;i++){const a=i/this.petals.count*Math.PI*2+time*.05*(1+i%3),r=4.8+(i%8)*1.45;dummy.position.set(Math.cos(a)*r,1.4+((i*.31+time*.12)%3.7),Math.sin(a)*r-8.6);dummy.rotation.set(time*.2+i,a,time*.13+i*.7);dummy.scale.setScalar(.8+(i%4)*.18);dummy.updateMatrix();this.petals.setMatrixAt(i,dummy.matrix);}this.petals.instanceMatrix.needsUpdate=true;}
  setDetail(detail:DetailLevel){this.detail=detail;this.petals.visible=detail!=='low';if(this.flowers){this.flowers.visible=true;this.flowers.count=detail==='high'?2600:detail==='balanced'?1500:560;}if(this.grassBlades){this.grassBlades.count=detail==='high'?2800:detail==='balanced'?1700:650;}for(const m of this.mist)m.visible=detail!=='low';for(const r of this.reflectors)r.visible=detail!=='low';}
  dispose(){this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.InstancedMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
function rndAngle(n:number){return ((n*12.9898)%1)*Math.PI*2;}
