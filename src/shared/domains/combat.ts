import type { Stats } from '../types';
import type { Random } from './item';
import { emptyStats } from './item';
import { CombatFormulaService } from './combat-formula';
export function damage(stats:Stats,defense:number,multiplier:number,rng:Random=Math.random){
 return CombatFormulaService.resolve(stats,{...emptyStats(),defense},multiplier,rng);
}
export const MONSTER_SKILLS:Record<string,{name:string;windup:number;recovery:number;multiplier:number;radius:number;range:number;knockback:number}>={
 bite:{name:'撕咬',windup:.55,recovery:1.4,multiplier:1,radius:1.8,range:2.3,knockback:.3},pounce:{name:'撲擊',windup:.85,recovery:2,multiplier:1.4,radius:2.6,range:5,knockback:2},
 venom:{name:'赤羽吐息',windup:1.1,recovery:2,multiplier:1.4,radius:3,range:7,knockback:.4},coil:{name:'盤尾',windup:.6,recovery:1.6,multiplier:.9,radius:2.6,range:3,knockback:1},
 shell:{name:'旋甲',windup:1.3,recovery:2.5,multiplier:1.7,radius:3.8,range:4,knockback:3},frost:{name:'凝霜',windup:1,recovery:1.8,multiplier:1.2,radius:3,range:9,knockback:.5},
 claw:{name:'裂石爪',windup:.75,recovery:1.5,multiplier:1.3,radius:3,range:3.5,knockback:2},roar:{name:'震山吼',windup:1.4,recovery:2.5,multiplier:1.4,radius:5,range:5,knockback:4},
 feather:{name:'羽刃',windup:1.1,recovery:1.8,multiplier:1.2,radius:2.5,range:10,knockback:.5},dive:{name:'掠風俯衝',windup:1.2,recovery:2.2,multiplier:1.6,radius:3,range:9,knockback:3},
 ram:{name:'震角撞擊',windup:.85,recovery:1.6,multiplier:1,radius:4,range:5,knockback:2},stomp:{name:'雷霆踐踏',windup:1.65,recovery:2,multiplier:1.65,radius:7,range:7,knockback:6},
 charge:{name:'雷角衝鋒',windup:1.6,recovery:2.4,multiplier:1.85,radius:4.5,range:17,knockback:7},storm:{name:'九霄雷獄',windup:2,recovery:2.7,multiplier:2,radius:7.5,range:20,knockback:4},
 'queen-slash':{name:'女王斜斬',windup:.55,recovery:1.0,multiplier:1.2,radius:2.4,range:3.4,knockback:.8},
 'queen-cross':{name:'金曜交叉斬',windup:.78,recovery:1.25,multiplier:1.45,radius:3.0,range:4.0,knockback:1.5},
 'queen-spin':{name:'王權迴旋',windup:1.05,recovery:1.65,multiplier:1.58,radius:4.8,range:4.8,knockback:3.5},
 'queen-dash':{name:'金閃突進',windup:.95,recovery:1.55,multiplier:1.72,radius:3.0,range:12,knockback:4.5},
 'queen-burst':{name:'日冕王威',windup:1.45,recovery:2.05,multiplier:1.85,radius:6.2,range:10,knockback:3}
};
