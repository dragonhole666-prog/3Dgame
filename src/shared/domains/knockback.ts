import type { Vec2 } from '../types';

export interface KnockbackResult extends Vec2 {
 moved: number;
 blocked: boolean;
 steps: number;
}

/**
 * Moves an actor away from a source by at most `requestedDistance`.
 *
 * The direction is normalized exactly once at impact time. This is important:
 * reusing a stale initial distance while repeatedly reading the actor's new
 * offset causes each sub-step to grow geometrically and can launch actors
 * across the map.
 *
 * `step` remains authoritative for collision / terrain resolution. Every
 * accepted position is additionally bounded against the requested path budget,
 * so a malformed navigation result cannot turn one hit into a teleport.
 */
export function resolveBoundedKnockback(
 from: Vec2,
 source: Vec2,
 requestedDistance: number,
 fallbackAngle: number,
 step: (current: Vec2, desired: Vec2) => Vec2,
 maxStep = 0.4,
): KnockbackResult {
 const requested = Number.isFinite(requestedDistance) ? Math.max(0, requestedDistance) : 0;
 const stride = Number.isFinite(maxStep) ? Math.max(0.05, maxStep) : 0.4;
 const startX = from.x, startZ = from.z;
 let x = startX, z = startZ;
 let dx = startX - source.x, dz = startZ - source.z;
 let len = Math.hypot(dx, dz);

 // Exact overlap can happen during charge/pounce resolution. Use the attacker's
 // facing direction rather than amplifying a near-zero separation vector.
 if(len < 1e-4){
  const angle = Number.isFinite(fallbackAngle) ? fallbackAngle : 0;
  dx = Math.sin(angle); dz = Math.cos(angle); len = 1;
 }
 dx /= len; dz /= len;

 let remaining = requested, movedPath = 0, steps = 0, blocked = false;
 const maxIterations = Math.ceil(requested / stride) + 2;
 const epsilon = 1e-6;

 while(remaining > epsilon && steps < maxIterations){
  const segment = Math.min(stride, remaining);
  const current = {x,z};
  const desired = {x:x + dx * segment, z:z + dz * segment};
  const next = step(current, desired);
  steps++;

  if(!Number.isFinite(next.x) || !Number.isFinite(next.z)) { blocked = true; break; }
  const segmentMoved = Math.hypot(next.x - x, next.z - z);
  if(segmentMoved <= epsilon){ blocked = true; break; }

  // Defense in depth: never accept a navigation response whose accumulated
  // travel exceeds the skill's authoritative knockback budget.
  if(segmentMoved > segment + epsilon || movedPath + segmentMoved > requested + epsilon){ blocked = true; break; }

  x = next.x; z = next.z;
  movedPath += segmentMoved;
  remaining = Math.max(0, requested - movedPath);
 }
 if(remaining > epsilon) blocked = true;

 return {x,z,moved:movedPath,blocked,steps};
}
