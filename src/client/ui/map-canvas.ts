import type { Snapshot } from '../../shared/types';
import { WORLD,REGIONS,NPCS,heightAt } from '../../shared/data/world';

export function drawMap(canvas:HTMLCanvasElement,snapshot?:Snapshot,compact=false){
 const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;
 const centerX=compact&&snapshot?snapshot.self.x:0,centerZ=compact&&snapshot?snapshot.self.z:0;
 const radius=compact?82:WORLD.half,span=radius*2;
 const p=(x:number,z:number)=>({x:(x-(centerX-radius))/span*w,y:(z-(centerZ-radius))/span*h});
 const visible=(x:number,z:number,pad=0)=>Math.abs(x-centerX)<=radius+pad&&Math.abs(z-centerZ)<=radius+pad;

 c.clearRect(0,0,w,h);
 // Lightweight topographic tint sampled from the same authoritative GLB heightfield.
 const cells=compact?18:34,cw=w/cells,ch=h/cells;
 for(let iz=0;iz<cells;iz++)for(let ix=0;ix<cells;ix++){
  const x=centerX-radius+(ix+.5)/cells*span,z=centerZ-radius+(iz+.5)/cells*span;
  const y=heightAt(x,z),t=Math.max(0,Math.min(1,(y-6)/45));
  const g=Math.round(54+t*38),r=Math.round(31+t*31),b=Math.round(43+t*26);
  c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(ix*cw,iz*ch,cw+1,ch+1);
 }
 c.strokeStyle='#c9d6c82b';c.lineWidth=.7;
 const rings=compact?5:11;
 for(let i=1;i<=rings;i++){c.beginPath();c.ellipse(w/2,h/2,(i/rings)*w*.48,(i/rings)*h*.48,0,0,Math.PI*2);c.stroke();}

 for(const r of REGIONS){if(!visible(r.x,r.z,8))continue;const q=p(r.x,r.z);c.fillStyle=r.color;c.beginPath();c.arc(q.x,q.y,compact?2.5:4,0,6.28);c.fill();if(!compact){c.font='15px "Microsoft JhengHei",sans-serif';c.textAlign='center';c.fillStyle='#e1decd';c.fillText(r.name,q.x,q.y-11);c.font='10px sans-serif';c.fillStyle='#b6c4b7';c.fillText(r.level,q.x,q.y+18);}}
 for(const npc of NPCS){if(!visible(npc.x,npc.z,4))continue;const q=p(npc.x,npc.z);c.fillStyle='#dad397';c.fillRect(q.x-1.5,q.y-1.5,3,3);}

 if(snapshot){
  for(const m of snapshot.monsters)if(m.hp>0&&visible(m.x,m.z,4)){const q=p(m.x,m.z);c.fillStyle=m.defId==='kui'?'#d68a82':'#d9a994';c.beginPath();c.arc(q.x,q.y,m.defId==='kui'?4:1.5,0,6.28);c.fill();}
  if(snapshot.self.path.length){c.strokeStyle='#b9ddd2';c.setLineDash([4,5]);c.beginPath();const start=p(snapshot.self.x,snapshot.self.z);c.moveTo(start.x,start.y);for(const node of snapshot.self.path){const q=p(node.x,node.z);c.lineTo(q.x,q.y);}c.stroke();c.setLineDash([]);}
  const q=p(snapshot.self.x,snapshot.self.z);c.save();c.translate(q.x,q.y);c.rotate(-snapshot.self.angle);c.fillStyle='#f5e8ba';c.shadowColor='#f3e7af';c.shadowBlur=8;c.beginPath();c.moveTo(0,compact?5:8);c.lineTo(-4,-4);c.lineTo(0,-1);c.lineTo(4,-4);c.closePath();c.fill();c.restore();
 }
}
