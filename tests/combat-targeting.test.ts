import { describe,it,expect } from 'vitest';
import { GameWorld } from '../server/world';
import { MONSTERS } from '../src/shared/data/monsters';

describe('combat auto targeting',()=>{
  it('selects the nearest living monster when attack has no target',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('player','tester'),all=[...world.monsters.values()];
    for(const m of all)m.hp=0;
    const farther=all[0],nearest=all[1];
    Object.assign(farther,{hp:MONSTERS[farther.defId].hp,x:p.x+2.1,z:p.z});
    Object.assign(nearest,{hp:MONSTERS[nearest.defId].hp,x:p.x+1.25,z:p.z});
    p.angle=Math.atan2(nearest.x-p.x,nearest.z-p.z);
    world.command(p.id,{type:'attack',skill:'basic'});
    expect(p.target).toBe(nearest.id);
    expect(p.attack?.target).toBe(nearest.id);
  });

  it('queues the requested offensive skill while approaching instead of replacing it with basic attack',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('player','tester'),all=[...world.monsters.values()];
    for(const m of all)m.hp=0;
    const target=all[0];
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+12,z:p.z});
    world.command(p.id,{type:'attack',skill:'sword-wave'});
    expect(p.target).toBe(target.id);
    expect(p.queuedSkill).toBe('sword-wave');
    expect(p.attack).toBeUndefined();
    // Simulate the authoritative actor reaching the queued skill's range.
    p.path=[];p.x=target.x-2.2;p.z=target.z;p.angle=Math.atan2(target.x-p.x,target.z-p.z);p.input={x:0,z:0,sprint:false};p.inputAt=-10;
    world.tick(.05);
    expect(p.attack?.skill).toBe('sword-wave');
    expect(p.queuedSkill).toBeUndefined();
  });

  it('uses a single last-input-wins combat buffer and executes it immediately after recovery',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('buffer-player','tester'),all=[...world.monsters.values()];
    for(const m of all)m.hp=0;
    const target=all[0];Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.5,z:p.z});p.angle=Math.atan2(target.x-p.x,target.z-p.z);
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    expect(p.attack?.skill).toBe('basic');
    // Button mashing fills the same slot. The newest skill must replace every older request.
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    world.command(p.id,{type:'attack',skill:'sword-wave',target:target.id});
    world.command(p.id,{type:'attack',skill:'sword-array',target:target.id});
    expect(p.bufferedSkill).toBe('sword-array');
    // Movement heartbeat during an uninterruptible attack must not erase the combat buffer.
    world.command(p.id,{type:'move',x:1,z:0,sprint:false});
    expect(p.bufferedSkill).toBe('sword-array');
    const endsAt=p.attack!.endsAt;world.tick(endsAt-world.time+.001);
    expect(p.attack?.skill).toBe('sword-array');
    expect(p.bufferedSkill).toBeUndefined();
  });

  it('requires facing alignment before committing an in-range attack',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('facing-player','tester'),target=[...world.monsters.values()][0];
    for(const m of world.monsters.values())m.hp=0;
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+1.5,z:p.z});
    p.angle=-Math.PI/2;
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    expect(p.attack).toBeUndefined();
    expect(p.queuedSkill).toBe('basic');
    expect(p.navLabel).toBe('調整攻擊方向');
    world.tick(.2);
    expect(p.attack?.skill).toBe('basic');
  });

  it('repaths combat pursuit when a moving target changes the desired engagement point',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('pursuit-player','tester'),target=[...world.monsters.values()][0];
    for(const m of world.monsters.values())m.hp=0;
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+12,z:p.z});
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    const firstEnd={...p.path.at(-1)!};
    target.z+=4;
    world.tick(.2);
    const secondEnd=p.path.at(-1)!;
    expect(p.queuedSkill).toBe('basic');
    expect(Math.hypot(secondEnd.x-firstEnd.x,secondEnd.z-firstEnd.z)).toBeGreaterThan(.65);
  });

  it('switches auto pursuit to the nearest living monster and discards the old-target path',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('nearest-pursuit','tester'),all=[...world.monsters.values()];
    for(const m of all)m.hp=0;
    const oldTarget=all[0],newNearest=all[1];
    Object.assign(oldTarget,{hp:MONSTERS[oldTarget.defId].hp,x:p.x+12,z:p.z});
    Object.assign(newNearest,{hp:MONSTERS[newNearest.defId].hp,x:p.x+18,z:p.z+2});
    world.command(p.id,{type:'attack',skill:'basic',target:oldTarget.id});
    expect(p.target).toBe(oldTarget.id);expect(p.queuedSkill).toBe('basic');
    // A different monster becomes closer while auto pursuit is active. The authoritative lock must
    // change immediately rather than following the stale endpoint produced for oldTarget.
    Object.assign(newNearest,{x:p.x+4,z:p.z});
    const staleEnd={...p.path.at(-1)!};world.tick(.2);
    expect(p.target).toBe(newNearest.id);expect(p.queuedSkill).toBe('basic');
    const currentEnd=p.path.at(-1)!;
    expect(Math.hypot(currentEnd.x-staleEnd.x,currentEnd.z-staleEnd.z)).toBeGreaterThan(.65);
    expect(Math.hypot(currentEnd.x-newNearest.x,currentEnd.z-newNearest.z)).toBeLessThan(Math.hypot(staleEnd.x-newNearest.x,staleEnd.z-newNearest.z));
  });

  it('applies a bounded melee lunge during windup without crossing the monster combat body',()=>{
    const world=new GameWorld(()=>.5),p=world.createPlayer('lunge-player','tester'),target=[...world.monsters.values()][0];
    for(const m of world.monsters.values())m.hp=0;
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+2.9,z:p.z});
    p.angle=Math.atan2(target.x-p.x,target.z-p.z);
    const before=p.x;
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    expect(p.attack?.lungeDistance).toBeGreaterThan(0);
    world.tick((p.attack!.hitAt-world.time)*.55);
    expect(p.x).toBeGreaterThan(before);
    expect(Math.hypot(target.x-p.x,target.z-p.z)).toBeGreaterThan(MONSTERS[target.defId].combatRadius!);
  });

});
