import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BOW_DRAW_HAND,bowDrawFingerStrength } from '../src/client/character/bow-draw-hand';
import { PLAYER_RUN_SPEED,PLAYER_WALK_SPEED } from '../src/shared/data/locomotion';
import { GameWorld } from '../server/world';
import { combatMotionSpec } from '../src/client/character/weapon-animation-profiles';
import { MONSTERS } from '../src/shared/data/monsters';

const root=path.resolve(import.meta.dirname,'..');

describe('R27.3 bow string hook + combat pursuit',()=>{
  it('uses a three-finger string hook instead of a closed draw-hand fist',()=>{
    expect(BOW_DRAW_HAND.fingerStrength.index).toBeGreaterThan(0);
    expect(BOW_DRAW_HAND.fingerStrength.middle).toBeGreaterThan(BOW_DRAW_HAND.fingerStrength.index);
    expect(BOW_DRAW_HAND.fingerStrength.ring).toBeGreaterThan(0);
    expect(BOW_DRAW_HAND.fingerStrength.little).toBe(0);
    expect(BOW_DRAW_HAND.fingerStrength.thumb).toBe(0);
    expect(bowDrawFingerStrength('middle',.5)).toBeGreaterThan(.7);
    expect(bowDrawFingerStrength('middle',.9)).toBe(0);
  });

  it('installs the bow hook after physical bow-handle grip and keeps it bow-attack-only',()=>{
    const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
    expect(runtime).toContain('private applyBowStringHook()');
    expect(combatMotionSpec('BowShot').poseCorrection?.kind).toBe('bow-draw');
    expect(runtime).toContain('poseCorrectionFor(this.activeOneShot)');
    expect(runtime).toContain('bowDrawFingerStrength(entry.digit,phase,correction)');
    expect(runtime).toContain('this.syncHandMounts();this.root.updateMatrixWorld(true);this.applyBowStringHook()');
  });

  it('uses run speed for server-owned out-of-range combat pursuit',()=>{
    expect(PLAYER_RUN_SPEED).toBeGreaterThan(PLAYER_WALK_SPEED);
    const world=new GameWorld(()=>.5),p=world.createPlayer('r273-pursuit','tester'),target=[...world.monsters.values()][0];
    for(const m of world.monsters.values())m.hp=0;
    Object.assign(target,{hp:MONSTERS[target.defId].hp,x:p.x+15,z:p.z});
    world.command(p.id,{type:'attack',skill:'basic',target:target.id});
    expect(p.queuedSkill).toBe('basic');
    expect(p.path.length).toBeGreaterThan(0);
    expect(p.input.sprint).toBe(true);
    for(let i=0;i<12;i++)world.tick(.05);
    expect(p.speed).toBeGreaterThan(PLAYER_WALK_SPEED);
    expect(p.speed).toBeLessThanOrEqual(PLAYER_RUN_SPEED+.05);
  });
});
