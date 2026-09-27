import { groundStepAllowed, walkable } from '../data/world';
import { HF265_WORLD_HALF,hf265AreaClear } from '../data/hf265-world-layout';
import { distance, type Vec2 } from '../types';

/**
 * Renderer-independent navigation for HF35.
 *
 * The previous implementation built a THREE.BufferGeometry and delegated path search
 * to three-pathfinding. Navigation is authoritative gameplay logic and must not depend
 * on a browser renderer, so HF35 uses an A* grid derived from the same HF26.5
 * walkability / collider / slope rules.
 */
const GRID_STEP=2.5;
const GRID_MIN=-HF265_WORLD_HALF+2;
const GRID_MAX=HF265_WORLD_HALF-2;
const CLEARANCE=.65;
const TARGET_CLEARANCE=1;
const MAX_TARGET_GAP=4.5;

type GridNode={ix:number;iz:number;x:number;z:number};
type HeapItem={key:string;score:number};

const keyOf=(ix:number,iz:number)=>`${ix},${iz}`;
const pointFor=(ix:number,iz:number):GridNode=>({
 ix,iz,
 x:GRID_MIN+ix*GRID_STEP,
 z:GRID_MIN+iz*GRID_STEP,
});
const GRID_WIDTH=Math.floor((GRID_MAX-GRID_MIN)/GRID_STEP)+1;

function inGrid(ix:number,iz:number){
 return ix>=0&&iz>=0&&ix<GRID_WIDTH&&iz<GRID_WIDTH;
}

const passableCache=new Map<string,boolean>();
function passable(ix:number,iz:number){
 if(!inGrid(ix,iz))return false;
 const key=keyOf(ix,iz),cached=passableCache.get(key);
 if(cached!==undefined)return cached;
 const p=pointFor(ix,iz);
 const half=GRID_STEP*.42;
 const ok=walkable(p,CLEARANCE)&&
  hf265AreaClear(p.x-half,p.x+half,p.z-half,p.z+half,CLEARANCE);
 passableCache.set(key,ok);
 return ok;
}

function nearestNode(point:Vec2,maxRings=4):GridNode|undefined{
 const cx=Math.round((point.x-GRID_MIN)/GRID_STEP);
 const cz=Math.round((point.z-GRID_MIN)/GRID_STEP);
 let best:GridNode|undefined,bestD=Infinity;
 for(let ring=0;ring<=maxRings;ring++){
  for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++){
   if(ring>0&&Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
   const ix=cx+dx,iz=cz+dz;
   if(!passable(ix,iz))continue;
   const node=pointFor(ix,iz),d=distance(node,point);
   if(d<bestD){best=node;bestD=d;}
  }
  if(best&&bestD<=GRID_STEP*(ring+.8))break;
 }
 return best;
}

class MinHeap{
 private items:HeapItem[]=[];
 get size(){return this.items.length;}
 push(item:HeapItem){
  const a=this.items;a.push(item);let i=a.length-1;
  while(i>0){
   const p=(i-1)>>1;if(a[p].score<=item.score)break;
   a[i]=a[p];i=p;
  }
  a[i]=item;
 }
 pop(){
  const a=this.items;if(!a.length)return undefined;
  const root=a[0],last=a.pop()!;
  if(a.length){
   let i=0;
   while(true){
    const l=i*2+1,r=l+1;
    if(l>=a.length)break;
    const child=r<a.length&&a[r].score<a[l].score?r:l;
    if(a[child].score>=last.score)break;
    a[i]=a[child];i=child;
   }
   a[i]=last;
  }
  return root;
 }
}

const DIRECTIONS=[
 [1,0],[-1,0],[0,1],[0,-1],
 [1,1],[1,-1],[-1,1],[-1,-1],
] as const;

function canTraverse(a:GridNode,b:GridNode){
 if(!passable(b.ix,b.iz)||!groundStepAllowed(a,b))return false;
 const dx=b.ix-a.ix,dz=b.iz-a.iz;
 if(dx!==0&&dz!==0){
  // No corner cutting through scenery: both orthogonal sides must remain valid.
  const sideX=pointFor(a.ix+dx,a.iz),sideZ=pointFor(a.ix,a.iz+dz);
  if(!passable(sideX.ix,sideX.iz)||!passable(sideZ.ix,sideZ.iz))return false;
  if(!groundStepAllowed(a,sideX)||!groundStepAllowed(a,sideZ))return false;
 }
 return true;
}

function reconstruct(cameFrom:Map<string,string>,endKey:string,startKey:string){
 const keys=[endKey];let cursor=endKey;
 while(cursor!==startKey){
  const prev=cameFrom.get(cursor);if(!prev)break;
  cursor=prev;keys.push(cursor);
 }
 keys.reverse();
 return keys.map(key=>{
  const [ix,iz]=key.split(',').map(Number);
  return pointFor(ix,iz);
 });
}

function astar(start:GridNode,goal:GridNode){
 const startKey=keyOf(start.ix,start.iz),goalKey=keyOf(goal.ix,goal.iz);
 const open=new MinHeap();open.push({key:startKey,score:distance(start,goal)});
 const cameFrom=new Map<string,string>(),gScore=new Map<string,number>([[startKey,0]]);
 const closed=new Set<string>();

 while(open.size){
  const currentItem=open.pop()!;
  if(closed.has(currentItem.key))continue;
  if(currentItem.key===goalKey)return reconstruct(cameFrom,goalKey,startKey);
  closed.add(currentItem.key);
  const [ix,iz]=currentItem.key.split(',').map(Number),current=pointFor(ix,iz);
  const currentG=gScore.get(currentItem.key)??Infinity;

  for(const [dx,dz] of DIRECTIONS){
   const nx=ix+dx,nz=iz+dz;if(!inGrid(nx,nz))continue;
   const next=pointFor(nx,nz),nextKey=keyOf(nx,nz);
   if(closed.has(nextKey)||!canTraverse(current,next))continue;
   const moveCost=GRID_STEP*(dx!==0&&dz!==0?Math.SQRT2:1);
   const tentative=currentG+moveCost;
   if(tentative>=(gScore.get(nextKey)??Infinity))continue;
   cameFrom.set(nextKey,currentItem.key);gScore.set(nextKey,tentative);
   open.push({key:nextKey,score:tentative+distance(next,goal)});
  }
 }
 return undefined;
}

function simplify(points:Vec2[]){
 if(points.length<3)return points;
 const out:Vec2[]=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=out[out.length-1],b=points[i],c=points[i+1];
  const abx=b.x-a.x,abz=b.z-a.z,bcx=c.x-b.x,bcz=c.z-b.z;
  const cross=Math.abs(abx*bcz-abz*bcx);
  if(cross>.001)out.push(b);
 }
 out.push(points.at(-1)!);
 return out;
}

export class NavigationDomain{
 path(from:Vec2,to:Vec2):Vec2[]{
  if(!walkable(to,TARGET_CLEARANCE))
   throw new Error('此處被新地形、庭園水域或實體景物阻擋，請選擇附近可通行位置。');

  if(groundStepAllowed(from,to))return [{...to}];

  const start=nearestNode(from),goal=nearestNode(to);
  if(!start||!goal)throw new Error('找不到可通行的路線。');
  const gridPath=astar(start,goal);
  if(!gridPath?.length||distance(gridPath.at(-1)!,to)>MAX_TARGET_GAP)
   throw new Error('找不到可通行的路線。');

  const points:Vec2[]=[];
  if(distance(from,gridPath[0])>.15)points.push({x:gridPath[0].x,z:gridPath[0].z});
  for(let i=1;i<gridPath.length;i++)points.push({x:gridPath[i].x,z:gridPath[i].z});
  const tail=points.at(-1)??from;
  if(groundStepAllowed(tail,to))points.push({...to});
  else if(distance(tail,to)>MAX_TARGET_GAP)throw new Error('找不到可通行的路線。');
  return simplify(points);
 }

 step(from:Vec2,to:Vec2):Vec2{
  if(groundStepAllowed(from,to))return to;
  const xOnly={x:to.x,z:from.z};if(groundStepAllowed(from,xOnly))return xOnly;
  const zOnly={x:from.x,z:to.z};if(groundStepAllowed(from,zOnly))return zOnly;
  return {...from};
 }
}
