import * as T from 'three';
import type { CharacterCustomization,NumericCustomizationKey } from './customization';
import { garmentMorphBinding,garmentMorphWeight } from './garment-morph-runtime';

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const delta=(p:CharacterCustomization,key:NumericCustomizationKey)=>clamp((Number(p[key]??50)-50)/50,-1,1);
const gain=(p:CharacterCustomization,key:NumericCustomizationKey,amount:number)=>1+delta(p,key)*amount;
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a||1),0,1);return t*t*(3-2*t);};

type BoneSnapshot={node:T.Object3D;position:T.Vector3;scale:T.Vector3};
type GeometrySnapshot={mesh:T.Mesh;geometry:T.BufferGeometry;base:Float32Array;min:T.Vector3;max:T.Vector3;center:T.Vector3;forwardSign:number};
type MaterialSnapshot={material:T.Material;color?:T.Color};

/**
 * Data-driven VRM sculpt layer. It never owns animation rotations.
 * Body proportions use humanoid bone positions/scales; face proportions deform a private clone of
 * each face geometry. This keeps animation/IK independent and also lets skinned GLB equipment that
 * shares the avatar skeleton follow body proportions automatically.
 */
export class CharacterMorphRuntime{
  private readonly bones=new Map<string,BoneSnapshot>();
  private readonly faceGeometries:GeometrySnapshot[]=[];
  private readonly materials:MaterialSnapshot[]=[];
  private readonly bodyShapeMorphs:{mesh:T.Mesh;name:string;index:number;key:NumericCustomizationKey}[]=[];
  private readonly bodyShapeMorphKeys=new Set<NumericCustomizationKey>();
  private profile?:CharacterCustomization;
  private dirty=false;
  private readonly tmpColor=new T.Color();

  constructor(private readonly vrm:any,private readonly model:T.Object3D){
    this.captureBones();this.captureBodyShapeMorphs();this.captureFaceGeometry();this.captureMaterials();
  }

  private raw(name:string):T.Object3D|undefined{return this.vrm?.humanoid?.getRawBoneNode?.(name)??undefined;}
  private captureBones(){
    const names=['hips','spine','chest','upperChest','neck','head','leftEye','rightEye','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes'];
    for(const name of names){const node=this.raw(name);if(node)this.bones.set(name,{node,position:node.position.clone(),scale:node.scale.clone()});}
  }
  private captureBodyShapeMorphs(){
    this.model.traverse(o=>{if(!(o instanceof T.Mesh)||!o.morphTargetDictionary||!o.morphTargetInfluences)return;for(const [name,index] of Object.entries(o.morphTargetDictionary)){const binding=garmentMorphBinding(name);if(!binding||!['bodyMass','muscle'].includes(binding.key))continue;this.bodyShapeMorphs.push({mesh:o,name,index,key:binding.key});this.bodyShapeMorphKeys.add(binding.key);}});
  }
  private applyBodyShapeMorphs(p:CharacterCustomization){for(const entry of this.bodyShapeMorphs){const weights=entry.mesh.morphTargetInfluences;if(!weights)continue;const w=garmentMorphWeight(entry.name,p);if(w!==undefined)weights[entry.index]=w;}}
  private faceLike(mesh:T.Mesh){
    const text=[mesh.name,...(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m?.name??'')].join(' ').toLowerCase();
    return /face|head|eye|brow|mouth|skin/.test(text)&&!/hair/.test(text);
  }
  private captureFaceGeometry(){
    const leftEye=this.raw('leftEye'),head=this.raw('head');let forwardSign=-1;
    if(leftEye&&head){const eye=leftEye.getWorldPosition(new T.Vector3()),h=head.getWorldPosition(new T.Vector3());if(Math.abs(eye.z-h.z)>1e-5)forwardSign=Math.sign(eye.z-h.z)||-1;}
    this.model.traverse(o=>{
      if(!(o instanceof T.Mesh)||!this.faceLike(o))return;
      const source=o.geometry,position=source.getAttribute('position');if(!position||position.itemSize!==3||position.count<24)return;
      // Per-avatar geometry prevents creator sliders from mutating cached/shared GLB/VRM buffers.
      const geometry=source.clone();o.geometry=geometry;const pos=geometry.getAttribute('position') as T.BufferAttribute;
      const base=new Float32Array(pos.array.length);base.set(pos.array as ArrayLike<number>);
      geometry.computeBoundingBox();const box=geometry.boundingBox;if(!box)return;
      this.faceGeometries.push({mesh:o,geometry,base,min:box.min.clone(),max:box.max.clone(),center:box.getCenter(new T.Vector3()),forwardSign});
    });
  }
  private captureMaterials(){
    const seen=new Set<T.Material>();this.model.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m||seen.has(m))continue;seen.add(m);const color=(m as any).color as T.Color|undefined;this.materials.push({material:m,color:color?.clone()});}});
  }
  setProfile(profile:CharacterCustomization){this.profile={...profile};this.dirty=true;}
  apply(){if(!this.dirty||!this.profile)return;this.dirty=false;this.restoreBones();this.applyBody(this.profile);this.applyBodyShapeMorphs(this.profile);this.applyFace(this.profile);this.applyColors(this.profile);this.model.updateMatrixWorld(true);}

  private restoreBones(){for(const s of this.bones.values()){s.node.position.copy(s.position);s.node.scale.copy(s.scale);}}
  private scaleBone(name:string,x:number,y=x,z=x){const s=this.bones.get(name);if(s)s.node.scale.set(s.scale.x*x,s.scale.y*y,s.scale.z*z);}
  private multiplyBoneScale(name:string,x:number,y=x,z=x){const s=this.bones.get(name);if(s)s.node.scale.set(s.node.scale.x*x,s.node.scale.y*y,s.node.scale.z*z);}
  private positionFactor(name:string,factor:number){const s=this.bones.get(name);if(s)s.node.position.copy(s.position).multiplyScalar(factor);}
  private positionAxis(name:string,axis:'x'|'y'|'z',factor:number){const s=this.bones.get(name);if(s)s.node.position[axis]=s.position[axis]*factor;}

  private applyBody(p:CharacterCustomization){
    const height=gain(p,'height',.08),head=gain(p,'headSize',.11),faceX=gain(p,'faceWidth',.08),faceY=gain(p,'faceHeight',.075),faceZ=gain(p,'faceDepth',.075);
    this.scaleBone('head',head*faceX,head*faceY,head*faceZ);
    this.scaleBone('neck',gain(p,'neckThickness',.09),gain(p,'neckLength',.08),gain(p,'neckThickness',.09));
    this.positionAxis('head','y',gain(p,'neckLength',.10));
    this.scaleBone('chest',gain(p,'chestWidth',.10),gain(p,'torsoLength',.07),gain(p,'chestDepth',.10));
    this.scaleBone('upperChest',gain(p,'shoulderWidth',.08),gain(p,'torsoLength',.05),gain(p,'chestDepth',.07));
    this.scaleBone('spine',gain(p,'waistWidth',.08),gain(p,'torsoLength',.08),gain(p,'waistDepth',.08));
    this.scaleBone('hips',gain(p,'hipWidth',.09),height,gain(p,'hipDepth',.09));
    const shoulder=gain(p,'shoulderWidth',.13);this.positionAxis('leftShoulder','x',shoulder);this.positionAxis('rightShoulder','x',shoulder);
    const arm=gain(p,'armLength',.10);for(const n of ['leftLowerArm','rightLowerArm','leftHand','rightHand'])this.positionFactor(n,arm);
    const hand=gain(p,'handSize',.10);this.scaleBone('leftHand',hand,gain(p,'handLength',.10),hand);this.scaleBone('rightHand',hand,gain(p,'handLength',.10),hand);
    const upperArm=gain(p,'upperArmThickness',.09),fore=gain(p,'forearmThickness',.09);this.scaleBone('leftUpperArm',upperArm,1,upperArm);this.scaleBone('rightUpperArm',upperArm,1,upperArm);this.scaleBone('leftLowerArm',fore,1,fore);this.scaleBone('rightLowerArm',fore,1,fore);
    const leg=gain(p,'legLength',.10);for(const n of ['leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes'])this.positionFactor(n,leg);
    const thigh=gain(p,'thighThickness',.09),calf=gain(p,'calfThickness',.09);this.scaleBone('leftUpperLeg',thigh,1,thigh);this.scaleBone('rightUpperLeg',thigh,1,thigh);this.scaleBone('leftLowerLeg',calf,1,calf);this.scaleBone('rightLowerLeg',calf,1,calf);
    const foot=gain(p,'footSize',.09),footLength=gain(p,'footLength',.11);this.scaleBone('leftFoot',foot,foot,footLength);this.scaleBone('rightFoot',foot,foot,footLength);
    const eyeScale=gain(p,'eyeSize',.10);this.scaleBone('leftEye',eyeScale,eyeScale,eyeScale);this.scaleBone('rightEye',eyeScale,eyeScale,eyeScale);
    const spacing=gain(p,'eyeSpacing',.11);this.positionAxis('leftEye','x',spacing);this.positionAxis('rightEye','x',spacing);
    const eyeHeight=gain(p,'eyeHeight',.035);this.positionAxis('leftEye','y',eyeHeight);this.positionAxis('rightEye','y',eyeHeight);
    const eyeDepth=gain(p,'eyeDepth',.045);this.positionAxis('leftEye','z',eyeDepth);this.positionAxis('rightEye','z',eyeDepth);
    // HF4: bodyMass/muscle were exposed in the creator but previously never changed the body.
    // Apply them after the local proportion controls so the same semantic values can also drive garment Morph Targets.
    if(!this.bodyShapeMorphKeys.has('bodyMass')){const mass=gain(p,'bodyMass',.11),massDepth=gain(p,'bodyMass',.15),limbMass=gain(p,'bodyMass',.055);for(const n of ['chest','upperChest','spine','hips'])this.multiplyBoneScale(n,mass,1,massDepth);for(const n of ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg'])this.multiplyBoneScale(n,limbMass,1,limbMass);}
    if(!this.bodyShapeMorphKeys.has('muscle')){const muscle=gain(p,'muscle',.075);for(const n of ['chest','upperChest'])this.multiplyBoneScale(n,muscle,1,muscle);for(const n of ['leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg'])this.multiplyBoneScale(n,muscle,1,muscle);}
  }

  private applyFace(p:CharacterCustomization){
    for(const s of this.faceGeometries){
      const pos=s.geometry.getAttribute('position') as T.BufferAttribute,arr=pos.array as Float32Array,{min,max,center,base,forwardSign}=s;
      const w=Math.max(1e-5,max.x-min.x),h=Math.max(1e-5,max.y-min.y),d=Math.max(1e-5,max.z-min.z);
      for(let i=0;i<arr.length;i+=3){
        let x=base[i],y=base[i+1],z=base[i+2];const nx=(x-center.x)/(w*.5),ny=clamp((y-min.y)/h,0,1),front=clamp(((z-center.z)*forwardSign)/(d*.5),-1,1);
        // broad head proportions
        x=center.x+(x-center.x)*gain(p,'faceWidth',.075);y=center.y+(y-center.y)*gain(p,'faceHeight',.055);z=center.z+(z-center.z)*gain(p,'faceDepth',.055);
        // forehead / temple
        const forehead=smooth(.62,.88,ny);x=center.x+(x-center.x)*(1+delta(p,'foreheadWidth')*.065*forehead);y+=delta(p,'foreheadHeight')*h*.025*forehead;
        const temple=smooth(.50,.70,ny)*(1-smooth(.82,.96,ny));x=center.x+(x-center.x)*(1+delta(p,'templeWidth')*.045*temple);
        // cheek and jaw zones
        const cheek=smooth(.34,.48,ny)*(1-smooth(.64,.78,ny))*(.35+.65*Math.min(1,Math.abs(nx)));x=center.x+(x-center.x)*(1+delta(p,'cheekWidth')*.075*cheek);z+=forwardSign*delta(p,'cheekFullness')*d*.035*cheek;y+=delta(p,'cheekHeight')*h*.018*cheek;
        const jaw=(1-smooth(.30,.48,ny))*(.3+.7*Math.min(1,Math.abs(nx)));x=center.x+(x-center.x)*(1+delta(p,'jawWidth')*.085*jaw);y+=delta(p,'jawHeight')*h*.022*jaw;
        const chin=(1-smooth(.15,.30,ny))*(1-smooth(.35,.72,Math.abs(nx)));x=center.x+(x-center.x)*(1+delta(p,'chinWidth')*.08*chin);y-=delta(p,'chinLength')*h*.035*chin;z+=forwardSign*delta(p,'chinForward')*d*.05*chin;
        // eyes / brows: local elliptical regions around each eye. Bone spacing/size above handles
        // the coarse transform; this surface pass shapes eyelids and eye contour without touching
        // the combat/VRM humanoid rotations.
        const eyeSide=nx<0?-1:1,eyeCx=center.x+eyeSide*w*.19,eyeCy=min.y+h*.585;
        const ex=(x-eyeCx)/(w*.17),ey=(y-eyeCy)/(h*.105),eyeRad=Math.hypot(ex,ey),eyeMask=(1-smooth(.72,1.18,eyeRad))*(.25+.75*Math.max(0,front));
        if(eyeMask>0){
          const ew=gain(p,'eyeWidth',.08*eyeMask),eh=gain(p,'eyeSize',.055*eyeMask)*gain(p,'eyeRoundness',.045*eyeMask);
          let dx=(x-eyeCx)*ew,dy=(y-eyeCy)*eh;const a=delta(p,'eyeTilt')*.10*eyeSide*eyeMask,c=Math.cos(a),sn=Math.sin(a);x=eyeCx+dx*c-dy*sn;y=eyeCy+dx*sn+dy*c;
          const lid=delta(p,'eyelidHeight')*h*.012*eyeMask;y+=lid;
          if(ey>0)y+=delta(p,'upperLid')*h*.010*eyeMask;else y-=delta(p,'lowerLid')*h*.009*eyeMask;
        }
        const browCy=min.y+h*.695,bx=(x-eyeCx)/(w*.19),by=(y-browCy)/(h*.075),browMask=(1-smooth(.72,1.15,Math.hypot(bx,by)))*(.2+.8*Math.max(0,front));
        if(browMask>0){y+=delta(p,'browHeight')*h*.018*browMask;x+=eyeSide*delta(p,'browSpacing')*w*.010*browMask;const slope=delta(p,'browAngle')*.022*eyeSide*browMask;y+=slope*(x-eyeCx);x=eyeCx+(x-eyeCx)*gain(p,'browLength',.055*browMask);}
        // ears are intentionally bounded to the outer head silhouette.
        const earMask=smooth(.68,.90,Math.abs(nx))*smooth(.34,.48,ny)*(1-smooth(.72,.84,ny));
        if(earMask>0){x=center.x+(x-center.x)*gain(p,'earWidth',.06*earMask);y+=delta(p,'earHeight')*h*.018*earMask;x+=Math.sign(nx||1)*delta(p,'earAngle')*w*.018*earMask;const es=gain(p,'earSize',.045*earMask);x=center.x+(x-center.x)*es;y=center.y+(y-center.y)*es;}
        // nose: central, forward facial region
        const noseX=1-smooth(.08,.30,Math.abs(nx)),noseY=smooth(.36,.50,ny)*(1-smooth(.69,.80,ny)),nose=noseX*noseY*(.4+.6*Math.max(0,front));
        x=center.x+(x-center.x)*(1+delta(p,'noseWidth')*.12*nose);z+=forwardSign*delta(p,'noseForward')*d*.07*nose;y+=delta(p,'noseHeight')*h*.025*nose;
        const bridge=noseX*smooth(.54,.63,ny)*(1-smooth(.78,.88,ny));x=center.x+(x-center.x)*(1+delta(p,'bridgeWidth')*.08*bridge);z+=forwardSign*delta(p,'bridgeHeight')*d*.045*bridge;
        const tip=noseX*smooth(.40,.48,ny)*(1-smooth(.58,.67,ny));x=center.x+(x-center.x)*(1+delta(p,'noseTipSize')*.10*tip);y+=delta(p,'noseTipHeight')*h*.018*tip;z+=forwardSign*delta(p,'noseLength')*d*.04*tip;
        const nostril=noseX*smooth(.38,.44,ny)*(1-smooth(.52,.59,ny));x=center.x+(x-center.x)*(1+delta(p,'nostrilWidth')*.11*nostril);
        // mouth/lips: lower central region. Keep deformation bounded to avoid tearing cheeks.
        const mouthX=1-smooth(.18,.52,Math.abs(nx)),mouthY=smooth(.22,.30,ny)*(1-smooth(.42,.50,ny)),mouth=mouthX*mouthY*(.35+.65*Math.max(0,front));
        x=center.x+(x-center.x)*(1+delta(p,'mouthWidth')*.11*mouth);y+=delta(p,'mouthHeight')*h*.018*mouth;z+=forwardSign*delta(p,'mouthForward')*d*.055*mouth;
        const upper=mouth*smooth(.33,.37,ny)*(1-smooth(.40,.44,ny)),lower=mouth*smooth(.27,.31,ny)*(1-smooth(.36,.40,ny));z+=forwardSign*(delta(p,'upperLip')*upper+delta(p,'lowerLip')*lower)*d*.028;
        const corner=mouth*(smooth(.25,.48,Math.abs(nx)))*(1-smooth(.56,.76,Math.abs(nx)));y+=delta(p,'mouthCorner')*h*.018*corner;
        const philtrum=noseX*smooth(.34,.39,ny)*(1-smooth(.48,.53,ny));y-=delta(p,'philtrum')*h*.012*philtrum;
        arr[i]=x;arr[i+1]=y;arr[i+2]=z;
      }
      pos.needsUpdate=true;s.geometry.computeVertexNormals();s.geometry.computeBoundingBox();s.geometry.computeBoundingSphere();
    }
  }

  private applyColors(p:CharacterCustomization){
    for(const entry of this.materials){const color=(entry.material as any).color as T.Color|undefined;if(!color||!entry.color)continue;const n=entry.material.name.toLowerCase();let target:string|undefined,amount=.72;
      if(/hair/.test(n))target=p.hairColor;else if(/iris|eye/.test(n)&&!/white|highlight/.test(n)){target=/(?:^|[_ .-])r(?:[_ .-]|$)|right/.test(n)?p.rightEyeColor:p.leftEyeColor;}else if(/mouth|lip/.test(n)){target=p.lipColor;amount=.55;}else if(/face|skin|body/.test(n)){target=p.skinColor;amount=.38;}
      if(target){this.tmpColor.set(target);color.copy(entry.color).lerp(this.tmpColor,amount);(entry.material as any).needsUpdate=true;}else color.copy(entry.color);
    }
  }

  getCoverage(){return {bones:this.bones.size,bodyShapeMorphs:this.bodyShapeMorphs.length,bodyShapeMorphKeys:[...this.bodyShapeMorphKeys],faceMeshes:this.faceGeometries.length,materials:this.materials.length};}
  dispose(){for(const s of this.faceGeometries)s.geometry.dispose();this.faceGeometries.length=0;this.bodyShapeMorphs.length=0;this.bodyShapeMorphKeys.clear();this.bones.clear();this.materials.length=0;}
}
