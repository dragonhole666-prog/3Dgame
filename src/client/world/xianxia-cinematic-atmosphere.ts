import * as T from 'three';
import { heightAt } from '../../shared/data/world';

type Detail='low'|'balanced'|'high';

function softTexture(size=256){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!;
  const g=ctx.createRadialGradient(size*.5,size*.5,0,size*.5,size*.5,size*.5);
  g.addColorStop(0,'rgba(255,255,255,.92)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(.72,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;
}

export class XianxiaCinematicAtmosphere{
  readonly root=new T.Group();
  private mist:T.Sprite[]=[];
  private shafts:T.Mesh[]=[];
  private dust:T.Points;
  private detail:Detail='balanced';
  private texture=softTexture();

  constructor(parent:T.Object3D,anchor:{x:number;z:number},detail:Detail='balanced'){
    this.detail=detail;
    this.root.name='HF22_Cinematic_Atmosphere';
    parent.add(this.root);
    const baseY=heightAt(anchor.x,anchor.z);

    // Layered localized mist. These sprites provide depth-separated atmosphere
    // instead of relying on one uniform FogExp2 color across the whole scene.
    const mistPositions=[[-15,1.2,-15,15,5],[0,.9,-13,18,5],[13,1.5,-10,14,4],[-8,2.4,-26,25,7],[18,2.8,-32,28,8],[-25,3.1,-38,32,9]] as const;
    for(let i=0;i<mistPositions.length;i++){
      const [x,y,z,w,h]=mistPositions[i];
      const material=new T.SpriteMaterial({map:this.texture,color:i<3?'#BDD4E0':'#8FB1C3',transparent:true,opacity:i<3?.115:.062,depthWrite:false,depthTest:true,fog:true,blending:T.NormalBlending});
      const sprite=new T.Sprite(material);sprite.position.set(anchor.x+x,baseY+y,anchor.z+z);sprite.scale.set(w,h,1);sprite.renderOrder=2;this.root.add(sprite);this.mist.push(sprite);
    }

    // Warm oblique shafts emulate the directional haze common in xianxia short dramas.
    for(let i=0;i<3;i++){
      const material=new T.MeshBasicMaterial({color:i===0?'#F0C3A6':'#F6D8C2',transparent:true,opacity:.028-i*.0045,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,fog:true});
      const beam=new T.Mesh(new T.CylinderGeometry(.6,5.8,38,24,1,true),material);
      beam.position.set(anchor.x-18+i*14,baseY+17,anchor.z-20-i*5);beam.rotation.z=-.42+i*.08;beam.rotation.x=.18;beam.renderOrder=1;this.root.add(beam);this.shafts.push(beam);
    }

    // Fine airborne particles catch warm key light without looking like magic VFX.
    const count=detail==='high'?180:detail==='balanced'?110:60,positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=i*2.39996,r=4+(i%19)*1.55;
      positions[i*3]=anchor.x+Math.cos(a)*r;
      positions[i*3+1]=baseY+.8+(i%17)*.38;
      positions[i*3+2]=anchor.z-8+Math.sin(a)*r;
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
    const m=new T.PointsMaterial({color:'#E4C7AE',size:.065,transparent:true,opacity:.24,depthWrite:false,sizeAttenuation:true,blending:T.AdditiveBlending});
    this.dust=new T.Points(g,m);this.dust.renderOrder=3;this.root.add(this.dust);

    this.setDetail(detail);
  }

  update(time:number){
    for(let i=0;i<this.mist.length;i++){
      const s=this.mist[i];s.position.x+=Math.sin(time*.08+i)*.0025;s.position.y+=Math.sin(time*.13+i*.7)*.0012;
      const m=s.material as T.SpriteMaterial;m.opacity=(i<3?(this.detail==='high'?.125:.10):.062)*(1+Math.sin(time*.19+i)*.09);
    }
    for(let i=0;i<this.shafts.length;i++)this.shafts[i].rotation.y=Math.sin(time*.035+i)*.08;
    this.dust.rotation.y=time*.008;
  }

  setDetail(detail:Detail){
    this.detail=detail;
    this.shafts.forEach((s,i)=>s.visible=detail==='high'||(detail==='balanced'&&i===0));
    this.mist.forEach((m,i)=>m.visible=detail!=='low'||i<2);
    this.dust.visible=detail!=='low';
  }

  dispose(){
    this.root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}if(o instanceof T.Sprite)o.material.dispose();});
    this.texture.dispose();this.root.removeFromParent();
  }
}
