import { describe, expect, it } from 'vitest';
import { resolveBoundedKnockback } from '../src/shared/domains/knockback';

describe('P0.25.3 bounded knockback solver',()=>{
 it('keeps close-range knockback linear instead of geometric',()=>{
  const start={x:.1,z:0},source={x:0,z:0};
  const result=resolveBoundedKnockback(start,source,7,0,(_from,to)=>to);
  expect(result.x).toBeCloseTo(7.1,6);
  expect(result.z).toBeCloseTo(0,6);
  expect(result.moved).toBeCloseTo(7,6);
  expect(result.steps).toBeLessThanOrEqual(Math.ceil(7/.4)+2);
 });

 it('uses attacker facing as a stable fallback when both actors overlap',()=>{
  const result=resolveBoundedKnockback({x:0,z:0},{x:0,z:0},3,Math.PI/2,(_from,to)=>to);
  expect(result.x).toBeCloseTo(3,6);
  expect(result.z).toBeCloseTo(0,6);
  expect(result.moved).toBeCloseTo(3,6);
 });

 it('stops cleanly when authoritative navigation blocks the next segment',()=>{
  const result=resolveBoundedKnockback({x:0,z:0},{x:-1,z:0},4,0,(from,to)=>to.x>1.2?from:to);
  expect(result.blocked).toBe(true);
  expect(result.x).toBeLessThanOrEqual(1.2);
  expect(result.moved).toBeLessThan(4);
 });

 it('rejects a navigation result that would exceed the skill distance budget',()=>{
  const result=resolveBoundedKnockback({x:0,z:0},{x:-1,z:0},2,0,()=>({x:100,z:0}));
  expect(result.blocked).toBe(true);
  expect(result.x).toBe(0);
  expect(result.z).toBe(0);
  expect(result.moved).toBe(0);
 });
});
