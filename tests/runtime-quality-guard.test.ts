import { describe,expect,it } from 'vitest';
import { RuntimeQualityGuard } from '../src/client/core/runtime-quality-guard';

describe('runtime quality guard',()=>{
 it('does not judge FPS during the first 15 seconds',()=>{const guard=new RuntimeQualityGuard();for(let i=0;i<20;i++)expect(guard.update(.5,10,'high','high',5+i*.5,true)).toBeUndefined();});
 it('locks cinematic to balanced after roughly eight sustained seconds below 34 FPS',()=>{const guard=new RuntimeQualityGuard();let result;for(let i=0;i<16;i++)result=guard.update(.5,30,'high','high',20+i*.5,true);expect(result).toEqual({cap:'balanced',threshold:34,reason:'持續低於 34 FPS'});});
 it('locks balanced to low after roughly eight sustained seconds below 27 FPS',()=>{const guard=new RuntimeQualityGuard();let result;for(let i=0;i<16;i++)result=guard.update(.5,24,'balanced','balanced',20+i*.5,true);expect(result?.cap).toBe('low');expect(result?.threshold).toBe(27);});
 it('background-tab time does not count toward sustained low FPS',()=>{const guard=new RuntimeQualityGuard();for(let i=0;i<12;i++)guard.update(.5,20,'high','high',20+i*.5,true);for(let i=0;i<30;i++)guard.update(.5,1,'high','high',30+i*.5,false);expect(guard.sustainedLowSeconds).toBe(0);let result;for(let i=0;i<15;i++)result=guard.update(.5,20,'high','high',50+i*.5,true);expect(result).toBeUndefined();result=guard.update(.5,20,'high','high',58,true);expect(result?.cap).toBe('balanced');});
 it('a recovered frame rate resets the sustained-low timer',()=>{const guard=new RuntimeQualityGuard();for(let i=0;i<10;i++)guard.update(.5,20,'balanced','balanced',20+i*.5,true);guard.update(.5,60,'balanced','balanced',26,true);expect(guard.sustainedLowSeconds).toBe(0);for(let i=0;i<10;i++)expect(guard.update(.5,20,'balanced','balanced',27+i*.5,true)).toBeUndefined();});
});
