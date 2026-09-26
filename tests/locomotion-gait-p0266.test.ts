import { describe,expect,it } from 'vitest';
import { PLAYER_AUTHORED_LOCOMOTION,PLAYER_WALK_RUN_BLEND_HALF_WIDTH,PLAYER_WALK_RUN_SWITCH,PLAYER_WALK_SPEED } from '../src/shared/data/locomotion';

const smoothstep=(x:number,a:number,b:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

describe('P0.26.6 gameplay speed / animation gait separation',()=>{
  it('derives gait switch from authored clip speeds instead of gameplay walk speed',()=>{
    expect(PLAYER_WALK_RUN_SWITCH).toBeCloseTo((PLAYER_AUTHORED_LOCOMOTION.walk.speed+PLAYER_AUTHORED_LOCOMOTION.run.speed)/2,8);
  });
  it('uses a jog/run-dominant blend at the 3.8 m/s normal travel speed',()=>{
    const blend=smoothstep(PLAYER_WALK_SPEED,PLAYER_WALK_RUN_SWITCH-PLAYER_WALK_RUN_BLEND_HALF_WIDTH,PLAYER_WALK_RUN_SWITCH+PLAYER_WALK_RUN_BLEND_HALF_WIDTH);
    expect(blend).toBeGreaterThan(.55);
    expect(blend).toBeLessThan(.9);
  });
  it('preserves exact authored source metadata and sprint speed',()=>{
    expect(PLAYER_AUTHORED_LOCOMOTION.walk.speed).toBeCloseTo(1.7502182743728725,8);
    expect(PLAYER_AUTHORED_LOCOMOTION.run.speed).toBeCloseTo(5.545185503149063,8);
  });
});
