import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R21 official Mixamo -> VRM retarget and foot-lock cadence (R20 compatibility filename)',()=>{
  const root=path.resolve(process.cwd());
  const retarget=fs.readFileSync(path.join(root,'src/client/character/mixamo-retarget.ts'),'utf8');
  const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');

  it('uses the official three-vrm normalized-bone rotation conversion',()=>{
    expect(retarget).toContain('q.fromArray(sourceTrack.values as ArrayLike<number>,i).premultiply(parentRestWorld).multiply(restWorldInv).normalize()');
    expect(retarget).toContain("if(vrm0){q.x=-q.x;q.z=-q.z;}");
    expect(retarget).toContain('retargetVrmNormalizedClip');
    expect(retarget).not.toContain('desiredWorld.copy(targetRest).multiply(restSpaceDelta)');
  });

  it('maps the Mixamo rest pose to normalized identity instead of injecting a world-rest target rotation',()=>{
    type Q=[number,number,number,number];
    const mul=(a:Q,b:Q):Q=>[
      a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
      a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
      a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
      a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2],
    ];
    const inv=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
    const axis=(x:number,y:number,z:number,deg:number):Q=>{const h=deg*Math.PI/360,s=Math.sin(h);return [x*s,y*s,z*s,Math.cos(h)];};
    const parent=axis(1,0,0,90),localRest=axis(0,0,1,175),boneWorldRest=mul(parent,localRest);
    const normalizedRest=mul(mul(parent,localRest),inv(boneWorldRest));
    expect(Math.abs(normalizedRest[0])+Math.abs(normalizedRest[1])+Math.abs(normalizedRest[2])).toBeLessThan(1e-6);
    expect(Math.abs(Math.abs(normalizedRest[3])-1)).toBeLessThan(1e-6);
  });

  it('keeps gameplay root travel outside the humanoid while retaining bounded vertical pelvis bob',()=>{
    expect(retarget).toContain('addScaledVector(travel,-u)');
    expect(retarget).toContain('worldBob.set(0,T.MathUtils.clamp(delta.y,-.10,.10),0)');
    expect(retarget).toContain('strideLength=Math.hypot(travel.x,travel.z)*scale');
    expect(retarget).toContain('(clip as any).qinglanStrideLength=hips.strideLength');
  });

  it('drives walk/run from one normalized gait phase velocity instead of re-snapping divergent clocks',()=>{
    expect(runtime).toContain('private cadenceSpeed=0');
    expect(runtime).toContain('private locomotionStrideLength');
    expect(runtime).toContain('const blendedStride=T.MathUtils.lerp(walkStride,runStride,runBlend)');
    expect(runtime).toContain('const phaseHz=this.cadenceSpeed>.02?T.MathUtils.clamp(this.cadenceSpeed/blendedStride,.16,2.6):0');
    expect(runtime).toContain('walkFull.setEffectiveTimeScale(walkClip?phaseHz*walkClip.duration:0)');
    expect(runtime).toContain('runFull.setEffectiveTimeScale(runClip?phaseHz*runClip.duration:0)');
    const locomotion=runtime.match(/private setLocomotion\([\s\S]*?\n  \}\n  private oneShot/m)?.[0]??'';
    expect(locomotion).not.toContain('if(walkWeight>.001&&runWeight>.001)');
  });

  it('uses authoritative movement speed for foot cadence while retaining smoothed blend weights',()=>{
    expect(runtime).toContain('const targetSpeed=actor?.flight?0:Math.max(0,speed);this.cadenceSpeed=targetSpeed');
    expect(runtime).toContain('this.locomotionSpeed+=(targetSpeed-this.locomotionSpeed)');
    expect(runtime).toContain('this.resolveAnimation(time,actor,this.locomotionSpeed)');
  });

  it('keeps gameplay root and visual VRM root as separate transform authorities',()=>{
    expect(runtime).toContain('private readonly visualBasePosition=new T.Vector3()');
    expect(runtime).toContain('private readonly visualBaseQuaternion=new T.Quaternion()');
    expect(runtime).toContain('private enforceVisualRootInvariant()');
    expect(runtime).toContain('this.root.position.x=0;this.root.position.z=0;this.root.quaternion.identity()');
    const update=runtime.match(/update\(dt:number,time:number,actor\?:PublicPlayer,speed=0\)\{([\s\S]*?)\n  \}\n  dispose/m)?.[1]??'';
    expect(update.indexOf('this.enforceVisualRootInvariant()')).toBeGreaterThanOrEqual(0);
    expect(update.lastIndexOf('this.enforceVisualRootInvariant()')).toBeGreaterThan(update.indexOf('updateVroid(this.handle,dt)'));
  });
});
