import type { Stats } from '../types';
export interface EffectDefinition {id:string;name:string;duration:number;interval:number;power:number;maxStacks:number;moveScale:number;interrupt:boolean;stats:Partial<Stats>;color:string;kind:'damage'|'heal'|'control'|'buff'}
export const EFFECTS:Record<string,EffectDefinition>={
 poison:{id:'poison',name:'中毒',duration:6,interval:2,power:7,maxStacks:3,moveScale:1,interrupt:false,stats:{},color:'#8fb966',kind:'damage'},
 burn:{id:'burn',name:'燃燒',duration:5,interval:1,power:5,maxStacks:3,moveScale:1,interrupt:false,stats:{},color:'#ef9963',kind:'damage'},
 bleed:{id:'bleed',name:'流血',duration:6,interval:2,power:8,maxStacks:3,moveScale:1,interrupt:false,stats:{},color:'#ce6868',kind:'damage'},
 slow:{id:'slow',name:'寒緩',duration:4,interval:0,power:0,maxStacks:1,moveScale:.6,interrupt:false,stats:{},color:'#93d0df',kind:'control'},
 freeze:{id:'freeze',name:'冰凍',duration:1.2,interval:0,power:0,maxStacks:1,moveScale:0,interrupt:true,stats:{},color:'#addded',kind:'control'},
 stun:{id:'stun',name:'暈眩',duration:.6,interval:0,power:0,maxStacks:1,moveScale:0,interrupt:true,stats:{},color:'#d7c287',kind:'control'},
 knockdown:{id:'knockdown',name:'擊倒',duration:.8,interval:0,power:0,maxStacks:1,moveScale:0,interrupt:true,stats:{},color:'#a5a4a3',kind:'control'},
 shock:{id:'shock',name:'雷蝕',duration:5,interval:1,power:4,maxStacks:2,moveScale:.85,interrupt:false,stats:{lightningResist:-10},color:'#b399eb',kind:'damage'},
 empower:{id:'empower',name:'劍意',duration:10,interval:0,power:0,maxStacks:1,moveScale:1,interrupt:false,stats:{attack:12},color:'#e8c286',kind:'buff'},
 armorBreak:{id:'armorBreak',name:'破甲',duration:6,interval:0,power:0,maxStacks:2,moveScale:1,interrupt:false,stats:{defense:-8},color:'#cf9a81',kind:'buff'},
 regen:{id:'regen',name:'生息',duration:6,interval:1,power:8,maxStacks:1,moveScale:1,interrupt:false,stats:{},color:'#a3d7ac',kind:'heal'}
};
