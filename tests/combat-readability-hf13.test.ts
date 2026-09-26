import { describe,expect,it } from 'vitest';
import { monsterTelegraphProfile } from '../src/shared/data/monster-telegraph-profiles';
import { EFFECTS } from '../src/shared/data/effects';

describe('P0.26.8 HF13 combat readability',()=>{
 it('keeps the authoritative endpoint radius while adding directional guides',()=>{
  expect(monsterTelegraphProfile('charge').guide).toBe('path');
  expect(monsterTelegraphProfile('queen-dash').guide).toBe('path');
  expect(monsterTelegraphProfile('venom').guide).toBe('cone');
  expect(monsterTelegraphProfile('feather').guide).toBe('cone');
  expect(monsterTelegraphProfile('stomp').guide).toBe('none');
 });
 it('has world-readable colors for damaging/control effects',()=>{
  for(const id of ['poison','burn','bleed','slow','freeze','shock'])expect(EFFECTS[id]?.color).toMatch(/^#[0-9a-f]{6}$/i);
 });
});
