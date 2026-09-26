import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SKILL_VFX_PROFILES } from '../src/shared/data/skill-vfx-profiles';

const root=process.cwd();
const fx=fs.readFileSync(path.join(root,'src/client/rendering/xianxia-skill-fx.ts'),'utf8');
const game=fs.readFileSync(path.join(root,'src/client/core/game.ts'),'utf8');
const effects=fs.readFileSync(path.join(root,'src/client/rendering/effects.ts'),'utf8');
const world=fs.readFileSync(path.join(root,'server/world.ts'),'utf8');
const types=fs.readFileSync(path.join(root,'src/shared/types.ts'),'utf8');

describe('P0.26.8 HF12 combat presentation / authoritative VFX timing',()=>{
 it('carries authoritative cast/impact timestamps from server to the VFX runtime',()=>{
  expect(types).toContain('castAt?: number');
  expect(types).toContain('impactAt?: number');
  expect(world).toContain('castAt:p.attack.started');
  expect(world).toContain('impactAt:p.attack.hitAt');
  expect(effects).toContain('this.skillFx.cast(e,serverTime)');
  expect(game).toContain('this.fx.event(event,s.time)');
  expect(fx).toContain('remainingImpactDelay');
  expect(fx).toContain('e.impactAt-serverTime');
  expect(fx).toContain('e.castAt!==undefined&&serverTime!==undefined');
 });
 it('shows data-driven player telegraphs for the three showcase spells',()=>{
  expect(SKILL_VFX_PROFILES['fire-orb'].telegraph?.radius).toBeCloseTo(3.15,5);
  expect(SKILL_VFX_PROFILES['ice-spike'].telegraph?.radius).toBeCloseTo(3.4,5);
  expect(SKILL_VFX_PROFILES.blizzard.telegraph?.radius).toBeCloseTo(5.5,5);
  expect(SKILL_VFX_PROFILES.blizzard.telegraph?.style).toBe('rune');
  expect(fx).toContain('startTelegraph');
  expect(fx).toContain('updateTelegraphs');
 });
 it('caps expensive spell instances and removes per-frame shard vector allocation',()=>{
  expect(fx).toContain("projectileBudget(){return this.quality==='reduced'?8:20;}");
  expect(fx).toContain("fieldBudget(){return this.quality==='reduced'?2:4;}");
  expect(fx).toContain("telegraphBudget(){return this.quality==='reduced'?4:10;}");
  expect(fx).toContain('scratchDirection');
  expect(fx).not.toContain('dir=new T.Vector3(dx,dy,dz)');
 });
 it('scales local combat camera feedback by skill power and critical impact',()=>{
  expect(game).toContain('skill.multiplier-1');
  expect(game).toContain('skill.radius*.018');
  expect(game).toContain('criticalScale=event.critical?1.28:1');
  expect(game).toContain("element==='fire'||element==='frost'||element==='lightning'");
 });
});
