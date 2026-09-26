/**
 * R27.3 archery draw-hand profile.
 *
 * A bow string is hooked with the index/middle/ring fingers; it is not held with a closed fist.
 * Thumb and little finger remain relaxed.  Values are deliberately moderate because the runtime
 * solves toward an anatomical string line in world space across many different VRM hand rigs.
 */
export type BowDrawDigit='index'|'middle'|'ring'|'little'|'thumb';

export const BOW_DRAW_HAND={
  virtualStringRadius:.0035,
  /** Distance from draw-hand wrist toward the bow where the virtual string crosses the fingers. */
  stringContactForward:.052,
  fingerStrength:{
    index:.62,
    middle:.78,
    ring:.64,
    little:0,
    thumb:0,
  },
  drawInEnd:.18,
  releaseStart:.70,
  releaseEnd:.84,
} as const;

export function bowDrawFingerStrength(digit:BowDrawDigit,phase:number,timing:Partial<{drawInEnd:number;releaseStart:number;releaseEnd:number}>={}){
  const p=Math.max(0,Math.min(1,phase));
  const base=BOW_DRAW_HAND.fingerStrength[digit];
  if(base<=0)return 0;
  const drawInEnd=timing.drawInEnd??BOW_DRAW_HAND.drawInEnd,releaseStart=timing.releaseStart??BOW_DRAW_HAND.releaseStart,releaseEnd=timing.releaseEnd??BOW_DRAW_HAND.releaseEnd;
  let envelope=1;
  if(p<drawInEnd)envelope=p/Math.max(.001,drawInEnd);
  else if(p>releaseStart)envelope=1-(p-releaseStart)/Math.max(.001,releaseEnd-releaseStart);
  return base*Math.max(0,Math.min(1,envelope));
}
