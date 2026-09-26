import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public/assets/equipment');
const reportPath=path.join(root,'scripts/garment-morph-asset-report.json');
const BAKE='HF5';
// Generated targets are residual fit/clearance corrections ON TOP OF the shared avatar skeleton.
// They intentionally stay small so body bone scaling and garment morphing cannot double-deform the outfit.

const FILE_TARGETS={
 'linen_robe.glb':['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','HipWidth','HipDepth','UpperArmThickness','ForearmThickness','ThighThickness'],
 'cloud_robe.glb':['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','HipWidth','HipDepth','UpperArmThickness','ForearmThickness','ThighThickness'],
 'thunder_armor.glb':['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','HipWidth','HipDepth','UpperArmThickness','ForearmThickness','ThighThickness'],
 'snow_fashion.glb':['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','HipWidth','HipDepth','UpperArmThickness','ForearmThickness','ThighThickness'],
 'linen_legs.glb':['BodyMass','BodyMuscle','HipWidth','HipDepth','ThighThickness'],
 'scale_legs.glb':['BodyMass','BodyMuscle','HipWidth','HipDepth','ThighThickness'],
 'linen_boots.glb':['BodyMass','BodyMuscle','CalfThickness'],
 'cloud_boots.glb':['BodyMass','BodyMuscle','CalfThickness'],
 'thunder_boots.glb':['BodyMass','BodyMuscle','CalfThickness'],
 'cloth_wrists.glb':['BodyMass','BodyMuscle','ForearmThickness'],
 'thunder_bracers.glb':['BodyMass','BodyMuscle','ForearmThickness'],
 'woven_belt.glb':['BodyMass','WaistWidth','WaistDepth','HipWidth','HipDepth'],
 'thunder_belt.glb':['BodyMass','WaistWidth','WaistDepth','HipWidth','HipDepth'],
};
const COMP={5120:{bytes:1,get:'getInt8'},5121:{bytes:1,get:'getUint8'},5122:{bytes:2,get:'getInt16'},5123:{bytes:2,get:'getUint16'},5125:{bytes:4,get:'getUint32'},5126:{bytes:4,get:'getFloat32'}};
const NCOMP={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const TORSO=new Set(['Hips','Spine','Chest']);
const CHEST=new Set(['Spine','Chest']);
const SHOULDERS=new Set(['Chest','LeftUpperArm','RightUpperArm']);
const HIPS=new Set(['Hips','LeftThigh','RightThigh']);
const UPPER_ARMS=new Set(['LeftUpperArm','RightUpperArm']);
const FOREARMS=new Set(['LeftForearm','RightForearm']);
const THIGHS=new Set(['LeftThigh','RightThigh']);
const CALVES=new Set(['LeftShin','RightShin']);
const LIMBS=new Set([...UPPER_ARMS,...FOREARMS,...THIGHS,...CALVES]);
const CHILD={LeftUpperArm:'LeftForearm',RightUpperArm:'RightForearm',LeftForearm:'LeftHand',RightForearm:'RightHand',LeftThigh:'LeftShin',RightThigh:'RightShin',LeftShin:'LeftFoot',RightShin:'RightFoot',Hips:'Spine',Spine:'Chest',Chest:'Neck'};

function readGlb(file){
 const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='glTF')throw new Error(`${file}: not GLB`);
 let off=12,doc,bin=Buffer.alloc(0);while(off+8<=b.length){const len=b.readUInt32LE(off),type=b.readUInt32LE(off+4);off+=8;const chunk=b.subarray(off,off+len);off+=len;if(type===0x4e4f534a)doc=JSON.parse(chunk.toString('utf8').replace(/[\u0000 ]+$/,''));else if(type===0x004e4942)bin=Buffer.from(chunk);}
 if(!doc)throw new Error(`${file}: JSON chunk missing`);return {doc,bin};
}
function normalized(v,type){if(type===5120)return Math.max(-1,v/127);if(type===5121)return v/255;if(type===5122)return Math.max(-1,v/32767);if(type===5123)return v/65535;if(type===5125)return v/4294967295;return v;}
function readAccessor(doc,bin,index){
 const a=doc.accessors[index];if(!a||a.sparse)throw new Error(`unsupported accessor ${index}`);const bv=doc.bufferViews[a.bufferView],c=COMP[a.componentType],n=NCOMP[a.type];if(!bv||!c||!n)throw new Error(`invalid accessor ${index}`);
 const stride=bv.byteStride??c.bytes*n,base=(bv.byteOffset??0)+(a.byteOffset??0),view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),out=new Array(a.count);
 for(let i=0;i<a.count;i++){const row=new Array(n);for(let j=0;j<n;j++){const p=base+i*stride+j*c.bytes;let v=view[c.get](p,true);if(a.normalized)v=normalized(v,a.componentType);row[j]=v;}out[i]=row;}return out;
}
function invert4(a){
 const out=new Array(16);const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
 const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(Math.abs(det)<1e-12)return null;det=1/det;
 out[0]=(a11*b11-a12*b10+a13*b09)*det;out[1]=(a02*b10-a01*b11-a03*b09)*det;out[2]=(a31*b05-a32*b04+a33*b03)*det;out[3]=(a22*b04-a21*b05-a23*b03)*det;
 out[4]=(a12*b08-a10*b11-a13*b07)*det;out[5]=(a00*b11-a02*b08+a03*b07)*det;out[6]=(a32*b02-a30*b05-a33*b01)*det;out[7]=(a20*b05-a22*b02+a23*b01)*det;
 out[8]=(a10*b10-a11*b08+a13*b06)*det;out[9]=(a01*b08-a00*b10-a03*b06)*det;out[10]=(a30*b04-a31*b02+a33*b00)*det;out[11]=(a21*b02-a20*b04-a23*b00)*det;
 out[12]=(a11*b07-a10*b09-a12*b06)*det;out[13]=(a00*b09-a01*b07+a02*b06)*det;out[14]=(a31*b01-a30*b03-a32*b00)*det;out[15]=(a20*b03-a21*b01+a22*b00)*det;return out;
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function norm(a){const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l];}
function boneFrame(doc,bin,skinIndex){
 const skin=doc.skins[skinIndex],mats=readAccessor(doc,bin,skin.inverseBindMatrices),byName=new Map();skin.joints.forEach((nodeIndex,i)=>{const name=doc.nodes[nodeIndex]?.name??`Joint${i}`,inv=invert4(mats[i]);const center=inv?[inv[12],inv[13],inv[14]]:[-mats[i][12],-mats[i][13],-mats[i][14]];byName.set(name,{name,index:i,center,axis:[0,1,0]});});
 for(const b of byName.values()){const child=byName.get(CHILD[b.name]);if(child)b.axis=norm(sub(child.center,b.center));}
 return {skin,byName,indexToBone:skin.joints.map((nodeIndex,i)=>byName.get(doc.nodes[nodeIndex]?.name??`Joint${i}`))};
}
function influenceRows(doc,bin,prim,frame){
 const joints=readAccessor(doc,bin,prim.attributes.JOINTS_0),weights=readAccessor(doc,bin,prim.attributes.WEIGHTS_0);return joints.map((row,i)=>row.map((j,k)=>({bone:frame.indexToBone[Math.round(j)],w:weights[i][k]??0})).filter(x=>x.bone&&x.w>1e-6));
}
function groupFactor(infs,set){let s=0;for(const x of infs)if(x?.bone?.name&&set.has(x.bone.name))s+=x.w;return Math.min(1,s);}
function limbRadial(pos,infs,set,amount){let d=[0,0,0];for(const x of infs){if(!x?.bone?.name||!set.has(x.bone.name))continue;const rel=sub(pos,x.bone.center),along=mul(x.bone.axis,dot(rel,x.bone.axis)),perp=sub(rel,along);d=add(d,mul(perp,amount*x.w));}return d;}
function targetDelta(name,pos,infs){
 const torso=groupFactor(infs,TORSO),chest=groupFactor(infs,CHEST),shoulder=groupFactor(infs,SHOULDERS),hips=groupFactor(infs,HIPS);
 switch(name){
  case 'BodyMass':{let d=[pos[0]*.028*torso,0,pos[2]*.036*torso];d=add(d,limbRadial(pos,infs,LIMBS,.016));return d;}
  case 'BodyMuscle':{let d=[pos[0]*.020*chest,0,pos[2]*.020*chest];d=add(d,limbRadial(pos,infs,new Set([...UPPER_ARMS,...FOREARMS]),.020));d=add(d,limbRadial(pos,infs,new Set([...THIGHS,...CALVES]),.015));return d;}
  case 'ShoulderWidth':return [pos[0]*.020*shoulder,0,0];
  case 'ChestWidth':return [pos[0]*.024*chest,0,0];
  case 'ChestDepth':return [0,0,pos[2]*.024*chest];
  case 'WaistWidth':return [pos[0]*.020*groupFactor(infs,new Set(['Hips','Spine'])),0,0];
  case 'WaistDepth':return [0,0,pos[2]*.020*groupFactor(infs,new Set(['Hips','Spine']))];
  case 'HipWidth':return [pos[0]*.022*hips,0,0];
  case 'HipDepth':return [0,0,pos[2]*.022*hips];
  case 'UpperArmThickness':return limbRadial(pos,infs,UPPER_ARMS,.022);
  case 'ForearmThickness':return limbRadial(pos,infs,FOREARMS,.022);
  case 'ThighThickness':return limbRadial(pos,infs,THIGHS,.022);
  case 'CalfThickness':return limbRadial(pos,infs,CALVES,.022);
  default:return [0,0,0];
 }
}
function appendFloatVec3(doc,bin,rows){
 const pad=(4-(bin.length%4))%4;if(pad)bin=Buffer.concat([bin,Buffer.alloc(pad)]);const offset=bin.length,data=Buffer.alloc(rows.length*12),view=new DataView(data.buffer,data.byteOffset,data.byteLength);let maxAbs=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 rows.forEach((r,i)=>{for(let j=0;j<3;j++){const v=Math.abs(r[j])<1e-10?0:r[j];view.setFloat32(i*12+j*4,v,true);min[j]=Math.min(min[j],v);max[j]=Math.max(max[j],v);maxAbs=Math.max(maxAbs,Math.abs(v));}});bin=Buffer.concat([bin,data]);const bv=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34962});const ai=doc.accessors.length;doc.accessors.push({bufferView:bv,componentType:5126,count:rows.length,type:'VEC3',min,max});return {bin,accessor:ai,maxAbs};
}
function writeGlb(file,doc,bin){
 doc.buffers=doc.buffers??[{byteLength:bin.length}];doc.buffers[0].byteLength=bin.length;let json=Buffer.from(JSON.stringify(doc));const jp=(4-json.length%4)%4;if(jp)json=Buffer.concat([json,Buffer.alloc(jp,0x20)]);const bp=(4-bin.length%4)%4;if(bp)bin=Buffer.concat([bin,Buffer.alloc(bp)]);const total=12+8+json.length+8+bin.length,out=Buffer.alloc(total);out.write('glTF',0,'ascii');out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);let o=20+json.length;out.writeUInt32LE(bin.length,o);out.writeUInt32LE(0x004e4942,o+4);bin.copy(out,o+8);fs.writeFileSync(file,out);
}
function bake(file,names){
 let {doc,bin}=readGlb(file);if(!doc.skins?.length)throw new Error(`${path.basename(file)} has no skin`);let generated=0,vertices=0,meshes=0,changed=false;
 const meshNode=new Map();for(const n of doc.nodes??[])if(n.mesh!==undefined&&n.skin!==undefined&&!meshNode.has(n.mesh))meshNode.set(n.mesh,n);
 for(let mi=0;mi<(doc.meshes??[]).length;mi++){
  const mesh=doc.meshes[mi],node=meshNode.get(mi);if(!node)continue;if(mesh.extras?.qinglanGarmentMorphBakeVersion===BAKE){generated+=mesh.extras?.qinglanGeneratedMorphs?.length??0;meshes++;for(const p of mesh.primitives??[]){const a=doc.accessors[p.attributes?.POSITION];if(a)vertices+=a.count;}continue;}
  if((mesh.extras?.targetNames?.length??0)>0||mesh.primitives.some(p=>(p.targets?.length??0)>0)){console.log(`SKIP ${path.basename(file)} / ${mesh.name??mi}: artist-authored/existing Morph Targets preserved`);continue;}
  if(mesh.primitives.length!==1)throw new Error(`${path.basename(file)} mesh ${mi}: multi-primitive mesh is not supported by HF5 baker`);
  const prim=mesh.primitives[0];if(prim.attributes.POSITION===undefined||prim.attributes.JOINTS_0===undefined||prim.attributes.WEIGHTS_0===undefined)continue;const pos=readAccessor(doc,bin,prim.attributes.POSITION);vertices+=pos.length;const frame=boneFrame(doc,bin,node.skin),infs=influenceRows(doc,bin,prim,frame),targets=[],targetNames=[];
  for(const name of names){const rows=pos.map((p,i)=>targetDelta(name,p,infs[i]));const maxAbs=rows.reduce((m,r)=>Math.max(m,Math.abs(r[0]),Math.abs(r[1]),Math.abs(r[2])),0);if(maxAbs<1e-6)continue;const result=appendFloatVec3(doc,bin,rows);bin=result.bin;targets.push({POSITION:result.accessor});targetNames.push(name);generated++;}
  if(targets.length){prim.targets=targets;mesh.weights=new Array(targets.length).fill(0);mesh.extras={...(mesh.extras??{}),targetNames,qinglanGarmentMorphBakeVersion:BAKE,qinglanGeneratedMorphs:targetNames};meshes++;changed=true;}
 }
 if(changed)writeGlb(file,doc,bin);return {file:path.basename(file),meshes,vertices,generated};
}

const results=[];for(const [name,targets] of Object.entries(FILE_TARGETS)){const file=path.join(dir,name);if(!fs.existsSync(file))throw new Error(`missing garment ${name}`);const r=bake(file,targets);results.push(r);console.log(`BAKE ${name}: meshes=${r.meshes} vertices=${r.vertices} generatedMorphBindings=${r.generated}`);}
const report={bakeVersion:BAKE,generatedAt:new Date().toISOString(),assets:results,totalAssets:results.length,totalGeneratedMorphBindings:results.reduce((s,r)=>s+r.generated,0)};fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(`GARMENT MORPH BAKE: assets=${report.totalAssets}, bindings=${report.totalGeneratedMorphBindings}`);
