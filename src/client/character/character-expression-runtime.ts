import type { PublicPlayer } from '../../shared/types';

/** Lightweight VRM expression state machine kept separate from locomotion/combat animation. */
export class CharacterExpressionRuntime{
  private t=0;private nextBlink=.8;private blinkPhase=-1;
  constructor(private readonly vrm:any){}
  update(dt:number,time:number,actor?:PublicPlayer){
    const manager=this.vrm?.expressionManager;if(!manager)return;this.t+=dt;
    if(this.blinkPhase<0&&this.t>=this.nextBlink){this.blinkPhase=0;this.nextBlink=this.t+2.4+Math.random()*2.8;}
    let blink=0;if(this.blinkPhase>=0){this.blinkPhase+=dt;const p=this.blinkPhase/.16;blink=p<.5?p*2:(1-p)*2;if(p>=1)this.blinkPhase=-1;}
    manager.setValue?.('blink',Math.max(0,Math.min(1,blink)));
    const dead=!!actor&&actor.hp<=0,hit=!!actor&&actor.staggerUntil>time,combat=!!actor&&(actor.state==='Combat'||!!actor.attack);
    manager.setValue?.('angry',dead?0:(combat?0.18:0));manager.setValue?.('sorrow',dead?0.42:(hit?0.25:0));
  }
  dispose(){const manager=this.vrm?.expressionManager;if(!manager)return;for(const key of ['blink','angry','sorrow'])manager.setValue?.(key,0);}
}
