/**
 * Authoritative locomotion metadata measured from the exact user-supplied Mixamo GLBs.
 * World units are metres in Qinglan.  Do not independently tune player ground speed while these
 * clips are authoritative or the feet will slide against the terrain.
 */
export const PLAYER_AUTHORED_LOCOMOTION={
 walk:{asset:'/assets/animations/mixamo/Walking.glb',duration:1.0333333872258663,rootTravel:1.808558977842331,speed:1.7502182743728725},
 run:{asset:'/assets/animations/mixamo/Fast_Run.glb',duration:.5333333276212215,rootTravel:2.9574322366714476,speed:5.545185503149063},
} as const;

// R27.2 movement feel: the source GLB root-travel speed is a cadence reference, not a gameplay
// cap. Default ground travel is raised from 3.2 -> 3.8 m/s after playtest feedback that normal
// movement felt too slow. Foot cadence still derives from actual actor speed / target stride length,
// so the authored Walking.glb remains synchronized instead of skating across the terrain.
export const PLAYER_WALK_SPEED=3.8;
export const PLAYER_RUN_SPEED=PLAYER_AUTHORED_LOCOMOTION.run.speed;
// Animation gait selection is based on the authored locomotion clips, not on gameplay travel speed.
// Keeping these concerns separate prevents a 3.8 m/s gameplay walk from forcing Walking.glb to
// run at >2x playback speed. Normal travel now blends into the run/jog gait while sprint remains
// fully Run.
export const PLAYER_WALK_RUN_SWITCH=(PLAYER_AUTHORED_LOCOMOTION.walk.speed+PLAYER_AUTHORED_LOCOMOTION.run.speed)/2;
export const PLAYER_WALK_RUN_BLEND_HALF_WIDTH=.72;
