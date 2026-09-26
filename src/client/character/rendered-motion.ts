/**
 * P0.26.7 rendered locomotion authority.
 *
 * Network Actor.speed is the simulation's intended/authoritative travel scalar. The character
 * mesh, however, is interpolated/predicted on the client and can move more slowly (or not at all
 * when navigation/collision rejects a step). Foot cadence must follow what is actually rendered,
 * otherwise the avatar runs in place while its root barely moves.
 */
export interface RenderedGroundSpeedSample {
  beforeX:number; beforeZ:number; afterX:number; afterZ:number; dt:number;
  authoritativeSpeed:number; snapped?:boolean; flight?:boolean;
}

export function renderedGroundSpeed(sample:RenderedGroundSpeedSample){
  if(sample.flight||sample.snapped||sample.dt<=1e-5||sample.authoritativeSpeed<=.025)return 0;
  const dx=sample.afterX-sample.beforeX,dz=sample.afterZ-sample.beforeZ;
  const visual=Math.hypot(dx,dz)/sample.dt;
  if(!Number.isFinite(visual)||visual<=.015)return 0;
  // A correction may briefly move the render root faster than gameplay. Never let a network
  // reconciliation spike accelerate the feet beyond the simulation's real travel speed.
  const ceiling=Math.max(.18,sample.authoritativeSpeed*1.12+.08);
  return Math.min(visual,ceiling);
}
