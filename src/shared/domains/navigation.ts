import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { Pathfinding } from 'three-pathfinding';
import { groundStepAllowed, heightAt, walkable } from '../data/world';
import { HF265_WORLD_HALF,hf265AreaClear } from '../data/hf265-world-layout';
import { distance, type Vec2 } from '../types';

const SHARED_FINDER=new Pathfinding();let valleyZoneReady=false;
function ensureValleyZone(){
 if(valleyZoneReady)return;const vertices:number[]=[];const step=2.5,min=-HF265_WORLD_HALF+2,max=HF265_WORLD_HALF-2;
 for(let x=min;x<=max-step;x+=step)for(let z=min;z<=max-step;z+=step){
  if(!hf265AreaClear(x,x+step,z,z+step,.65))continue;
  const a={x,z},b={x:x+step,z},c={x,z:z+step},d={x:x+step,z:z+step},m={x:x+step/2,z:z+step/2},pts=[a,b,c,d,m];if(!pts.every(p=>walkable(p,.65)))continue;
  const links:[[Vec2,Vec2],[Vec2,Vec2],[Vec2,Vec2],[Vec2,Vec2]]=[[a,b],[a,c],[b,d],[c,d]];if(!links.every(([p,q])=>groundStepAllowed(p,q)))continue;
  const ay=heightAt(a.x,a.z),by=heightAt(b.x,b.z),cy=heightAt(c.x,c.z),dy=heightAt(d.x,d.z);vertices.push(a.x,ay,a.z,c.x,cy,c.z,b.x,by,b.z,b.x,by,b.z,c.x,cy,c.z,d.x,dy,d.z);
 }
 if(!vertices.length)throw new Error('HF26.5 navigation mesh is empty.');const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));try{SHARED_FINDER.setZoneData('valley',Pathfinding.createZone(geometry));valleyZoneReady=true;}finally{geometry.dispose();}
}
export class NavigationDomain{
 private finder=SHARED_FINDER;constructor(){ensureValleyZone();}
 path(from:Vec2,to:Vec2):Vec2[]{if(!walkable(to,1))throw new Error('此處被新地形、庭園水域或實體景物阻擋，請選擇附近可通行位置。');const a=new Vector3(from.x,heightAt(from.x,from.z),from.z),b=new Vector3(to.x,heightAt(to.x,to.z),to.z),group=this.finder.getGroup('valley',a),path=this.finder.findPath(a,b,'valley',group);if(!path?.length||distance(path.at(-1)!,to)>4.5)throw new Error('找不到可通行的路線。');return path.map(p=>({x:p.x,z:p.z}));}
 step(from:Vec2,to:Vec2):Vec2{if(groundStepAllowed(from,to))return to;const xOnly={x:to.x,z:from.z};if(groundStepAllowed(from,xOnly))return xOnly;const zOnly={x:from.x,z:to.z};if(groundStepAllowed(from,zOnly))return zOnly;return {...from};}
}
