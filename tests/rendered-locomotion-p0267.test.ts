import { describe,expect,it } from 'vitest';
import { renderedGroundSpeed } from '../src/client/character/rendered-motion';

describe('P0.26.7 rendered locomotion speed authority',()=>{
  it('stops foot cadence when the server wants movement but the rendered root is blocked',()=>{
    expect(renderedGroundSpeed({beforeX:2,beforeZ:3,afterX:2,afterZ:3,dt:.05,authoritativeSpeed:3.8})).toBe(0);
  });
  it('uses actual rendered displacement instead of the faster authoritative scalar',()=>{
    const speed=renderedGroundSpeed({beforeX:0,beforeZ:0,afterX:.075,afterZ:0,dt:.05,authoritativeSpeed:3.8});
    expect(speed).toBeCloseTo(1.5,6);
  });
  it('caps reconciliation spikes and ignores teleports / flight',()=>{
    expect(renderedGroundSpeed({beforeX:0,beforeZ:0,afterX:4,afterZ:0,dt:.05,authoritativeSpeed:3.8})).toBeLessThanOrEqual(3.8*1.12+.08);
    expect(renderedGroundSpeed({beforeX:0,beforeZ:0,afterX:4,afterZ:0,dt:.05,authoritativeSpeed:3.8,snapped:true})).toBe(0);
    expect(renderedGroundSpeed({beforeX:0,beforeZ:0,afterX:.2,afterZ:0,dt:.05,authoritativeSpeed:3.8,flight:true})).toBe(0);
  });
});
