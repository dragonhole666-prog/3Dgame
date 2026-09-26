import * as T from 'three';
import type { Appearance } from '../../shared/types';
import { box,cylinder,ellipsoid,lathe,material,mesh,ring,ribbon,tube } from '../rendering/primitives';
export function weaponModel(a:Appearance){
 const g=new T.Group(),metal=material(a.color,.83,.27),trim=material(a.trim,.78,.3),leather=material('#344448',.1,.8),glow=material(a.color,.4,.3,a.vfx?2:0),L=a.length,W=a.width;
 if(a.shape==='bow'){
  const gripX=.33;
  tube(g,metal,[[0,-L*.55,0],[.21,-L*.4,0],[.35,0,0],[.21,L*.4,0],[0,L*.55,0]],W*.45,24);
  tube(g,trim,[[0,-L*.55,0],[-.07,0,0],[0,L*.55,0]],.006);cylinder(g,leather,[gripX,0,0],.055,.055,.25);for(let i=0;i<4;i++)tube(g,trim,[[.22,(i-1.5)*.22,0],[.48,(i-1.5)*.32,.02],[.4,(i-1.5)*.42,0]],.016);
  // Weapon groups are mounted at the anatomical palm socket. Recenter procedural bows around the
  // physical leather grip instead of the string/limb construction origin; otherwise rotating the
  // bow target-forward leaves the real grip ~33 cm in front of the hand and makes every shot look
  // disconnected even when the arm pose itself is correct.
  for(const child of g.children)child.position.x-=gripX;
  return g;
 }
 if(a.shape==='staff'||a.shape==='wand'||a.shape==='spear'){
  cylinder(g,metal,[0,L*.25,0],.035,.045,L*.88);for(let i=0;i<7;i++)cylinder(g,trim,[0,i*L/10-L*.15,0],.042,.042,.025);
  if(a.shape==='staff'||a.shape==='wand'){const compact=a.shape==='wand',headY=compact?L*.78:L*.8;ring(g,trim,compact?.13:.19,.026,[0,headY,0]);ellipsoid(g,glow,[0,headY,0],[compact?.075:.105,compact?.10:.15,compact?.075:.105]);for(let i=0;i<(compact?2:3);i++)tube(g,metal,[[0,L*(compact?.58:.61),0],[Math.cos(i*3.14)* (compact?.14:.24),L*(compact?.80:.82),Math.sin(i*3.14)*(compact?.14:.24)],[0,L*(compact?.94:.97),0]],compact?.018:.025);}
  else {const s=new T.Shape();s.moveTo(0,0);s.lineTo(-.11,.2);s.lineTo(0,.6);s.lineTo(.11,.2);s.closePath();const blade=mesh(g,new T.ExtrudeGeometry(s,{depth:.022,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:1}),trim,0,L*.64,0);blade.rotation.y=.2;}
  return g;
 }
 cylinder(g,leather,[0,.08,0],.043,.045,.27);ellipsoid(g,trim,[0,-.08,0],[.058,.055,.044]);
 for(let i=0;i<6;i++)cylinder(g,trim,[0,i*.034-.015,0],.046,.046,.007);
 const guard=box(g,trim,[0,.23,0],[W*3.5,.055,.085]);guard.rotation.z=a.shape==='dao'?.12:0;
 tube(g,metal,[[-W*1.8,.27,0],[-W,.18,0],[0,.24,0],[W,.18,0],[W*1.8,.27,0]],.027);
 const shape=new T.Shape();
 if(['dao','cleaver'].includes(a.shape)){shape.moveTo(-W*.36,.27);shape.lineTo(-W*.4,L*.8);shape.quadraticCurveTo(-W*.45,L, W*.4,L+.1);shape.lineTo(W*.9,L*.76);shape.lineTo(W*.5,.3);shape.closePath();}
 else if(['thunder','rune','orbital'].includes(a.shape)){shape.moveTo(-W*.5,.27);shape.lineTo(-W*.65,L*.45);shape.lineTo(-W*.36,L*.54);shape.lineTo(-W*.52,L*.73);shape.lineTo(0,L+.2);shape.lineTo(W*.5,L*.72);shape.lineTo(W*.3,L*.51);shape.lineTo(W*.7,L*.44);shape.lineTo(W*.5,.27);shape.closePath();}
 else {shape.moveTo(-W*.45,.27);shape.lineTo(-W*(a.shape==='leaf'?.85:.5),L*.64);shape.lineTo(0,L+.17);shape.lineTo(W*(a.shape==='leaf'?.85:.5),L*.64);shape.lineTo(W*.45,.27);shape.closePath();}
 mesh(g,new T.ExtrudeGeometry(shape,{depth:.02,bevelEnabled:true,bevelSize:.014,bevelThickness:.016,bevelSegments:1}),metal,0,0,-.01);
 tube(g,trim,[[0,.28,.027],[0,L*.6,.032],[0,L+.12,.005]],.008);
 if(a.ornaments>1)for(let i=0;i<a.ornaments;i++){
  const y=.38+i*(L-.35)/a.ornaments;const rune=ring(g,glow,.025,.006,[0,y,.043]);rune.scale.x=.6;rune.rotation.z=Math.PI/4;
 }
 if(a.shape==='rune'||a.shape==='orbital')for(let i=0;i<a.ornaments;i++){const y=.35+i*.17;const bit=box(g,glow,[(i%2?1:-1)*W*.9,y,0],[.04,.1,.025],.55);bit.userData.floating=i;}
 if(a.vfx)tube(g,glow,[[0,.3,.043],[-W*.2,L*.45,.044],[W*.23,L*.55,.044],[-W*.1,L*.7,.044],[0,L+.1,.025]],.01);
 return g;
}
export function armorModel(a:Appearance,side=1){
 const g=new T.Group(),metal=material(a.color,['plate','lamellar','horned','spiked','scale'].includes(a.shape)?.7:.18,.48),trim=material(a.trim,.7,.38),dark=material(a.color,.05,.86),glow=material(a.color,.3,.35,a.vfx?1.7:0),w=a.width,l=a.length;
 switch(a.slot){
 case 'chest':case 'fashion':{
  lathe(g,metal,[[w*.78,-.39],[w*.72,-.17],[w*.92,.1],[w,.28],[w*.55,.39]],.64);
  // Layered lapels and front cloth panels make robes read as tailored garments instead of a single shell.
  const inner=material('#d8ddd4',.06,.78),accent=material(a.trim,.55,.4);
  tube(g,inner,[[-w*.42,.33,.22],[-w*.15,.12,.255],[0,-.04,.27]],.018,12);tube(g,inner,[[w*.42,.33,.22],[w*.15,.12,.255],[0,-.04,.27]],.018,12);
  if(!['plate','lamellar'].includes(a.shape)){const cloth=metal.clone();cloth.side=T.DoubleSide;ribbon(g,cloth,[[-w*.28,-.18,.23],[-w*.32,-.48,.25],[-w*.38,-Math.min(l,.95),.2]],[w*.16,w*.2,w*.23]);ribbon(g,cloth,[[w*.28,-.18,.23],[w*.32,-.48,.25],[w*.38,-Math.min(l,.95),.2]],[w*.16,w*.2,w*.23]);}
  box(g,accent,[0,-.23,.255],[w*1.55,.055,.04]);ellipsoid(g,accent,[0,-.23,.29],[.05,.065,.024]);
  for(const sign of [-1,1])tube(g,trim,[[sign*.13,.37,.17],[sign*.25,.06,.235],[0,-.18,.2],[sign*.19,-.35,.17]],.009);
  if(a.shape==='lamellar'||a.shape==='plate'){
   for(let row=0;row<4;row++)for(let col=-3;col<=3;col++)box(g,row===0?trim:metal,[col*w*.22,.14-row*.12,.235-Math.abs(col)*.019],[w*.19,.13,.045],col*.06);
  }
  if(l>.7)for(let i=0;i<8;i++){
   const angle=i/8*Math.PI*2,half=w*.26,group=new T.Group();group.rotation.y=angle;
   const cloth=metal.clone();cloth.side=T.DoubleSide;
   ribbon(group,cloth,[[0,-.28,w*.65],[0,-.65,w*.85],[Math.sin(i)*.03,-l-.15,w*1.07]],[half,half*1.4,half*1.7]);
   tube(group,trim,[[-half,-.3,w*.66],[-half*1.4,-.65,w*.85],[-half*1.7,-l-.15,w*1.07]],.008);g.add(group);
  }
  ellipsoid(g,glow,[0,.12,.264],[.035,.055,.018]);break;
 }
 case 'head':{
  if(a.shape==='pin'){cylinder(g,trim,[0,.18,-.07],.045,.07,.15);const pin=cylinder(g,metal,[0,.2,-.07],.016,.018,.34);pin.rotation.z=Math.PI/2;ellipsoid(g,glow,[-.2,.2,-.07],[.04,.045,.04]);}
  else{lathe(g,metal,[[w*.7,-.02],[w*.92,.08],[w*.85,l*.47],[w*.4,l*.75]],.8);for(let i=0;i<Math.max(3,a.ornaments);i++){const x=(i-(Math.max(3,a.ornaments)-1)/2)*.09;tube(g,trim,[[x,.06,.17],[x*1.4,l*.64,.13],[x*.7,l,.04]],.019);}}
  break;
 }
 case 'shoulders':{
  const cap=ellipsoid(g,metal,[0,-.05,0],[w,.13+l*.13,w*.7]);cap.rotation.z=side*-.2;
  for(let i=0;i<Math.max(1,a.ornaments);i++){
   const scale=box(g,i%2?metal:trim,[side*(.07+i*.047),-.035-i*.04,.05],[w*.85,.065,w*.95],side*-.4);
   if(a.shape==='horned'||a.shape==='wing')tube(g,trim,[[side*.1,.06,.03],[side*(w*.7),l*.4,-.08],[side*w*1.2,l*.65,-.13]],.029);
  }break;
 }
 case 'wrists':case 'hands':case 'feet':case 'legs':{
  cylinder(g,metal,[0,-l*.43,0],w,w*.86,l,12);
  cylinder(g,trim,[0,-.025,0],w*1.02,w*1.02,.028,12);cylinder(g,trim,[0,-l+.02,0],w*.9,w*.9,.022,12);
  for(let i=0;i<a.ornaments;i++)box(g,i%2?metal:trim,[0,-.1-i*l/(a.ornaments+1),w*.83],[w*1.2,.07,.04],.12);
  if(a.slot==='feet')ellipsoid(g,metal,[0,-l*.8,.085],[w*.92,.105,.23]);
  if(a.shape==='fang'||a.shape==='spiked')for(let i=0;i<3;i++){const horn=cylinder(g,trim,[side*w,-.08-i*.07,0],0,.028,.14);horn.rotation.z=-side*.65;}
  break;
 }
 case 'waist':{
  const belt=lathe(g,metal,[[w,-l/2],[w,l/2]],.65);ellipsoid(g,trim,[0,0,w*.67],[.12,.09,.035]);
  for(const sign of [-1,1])tube(g,trim,[[sign*w*.8,-.07,.05],[sign*w*1.2,-.35,.09],[sign*w*.8,-.5,.13]],.018);break;
 }
 case 'cape':{
  const cloth=dark.clone();cloth.side=T.DoubleSide;
  for(let i=0;i<7;i++){const x=(i-3)*w*.25;ribbon(g,cloth,[[x*.55,.2,0],[x,-.35,-.2],[x*1.2,-l*.72,-.32],[x*1.32,-l,-.42]],[w*.09,w*.13,w*.15,w*.17]);tube(g,trim,[[x*.6,.16,-.008],[x,-.35,-.215],[x*1.3,-l,-.43]],.008);}break;
 }
 case 'offhand':{
  if(a.shape==='shield'){
   const face=cylinder(g,metal,[0,0,0],w,w*.92,Math.max(.055,l*.09),18);face.rotation.x=Math.PI/2;
   ring(g,trim,w*.9,.028,[0,0,l*.048]);box(g,trim,[0,0,l*.065],[w*1.28,.045,.035]);box(g,trim,[0,0,l*.066],[.045,w*1.22,.035]);
   // Rear handle is centered on the hand mount; fingers wrap around this instead of the shield plate.
   cylinder(g,dark,[0,0,-Math.max(.07,l*.11)],.026,.026,Math.max(.2,w*.52),12);
   ellipsoid(g,glow,[0,0,l*.09],[.075,.075,.035]);
  }else{ring(g,metal,w,.045);ring(g,trim,w*.77,.015);ellipsoid(g,glow,[0,0,0],[.08,.08,.04]);}
  break;
 }
 case 'artifact':{
  if(a.shape==='drum'){const drum=cylinder(g,metal,[0,0,0],w,w,l,20);drum.rotation.x=Math.PI/2;const face=cylinder(g,trim,[0,0,l*.52],w*.94,w*.94,.015,20);face.rotation.x=Math.PI/2;ring(g,trim,w,.025,[0,0,l*.54]);for(let i=0;i<8;i++)ellipsoid(g,glow,[Math.cos(i*.785)*w,Math.sin(i*.785)*w,l*.55],[.025,.025,.025]);}
  else {ellipsoid(g,metal,[0,-.05,0],[w,l*.43,w]);ellipsoid(g,metal,[0,l*.36,0],[w*.65,l*.27,w*.65]);cylinder(g,trim,[0,l*.65,0],.045,.055,.1);}
  break;
 }
 case 'back':{
  box(g,dark,[0,-.2,0],[w,.8,.16]);for(let i=0;i<a.ornaments;i++){const sword=weaponModel({...a,shape:'jian',length:.85,width:.06,ornaments:0,slot:'mainhand'});sword.position.set((i-(a.ornaments-1)/2)*.1,-.6,0);sword.rotation.z=(i-(a.ornaments-1)/2)*.18;g.add(sword);}break;
 }
 case 'neck':tube(g,trim,[[-.14,.2,0],[-.11,0,.13],[0,-.12,.17],[.11,0,.13],[.14,.2,0]],.009);ellipsoid(g,glow,[0,-.11,.18],[w,.095,.025]);break;
 case 'ring':ring(g,trim,.027,.007);break;
 case 'charm':box(g,metal,[0,-.15,0],[w,l,.014]);for(let i=0;i<4;i++)box(g,glow,[0,-.07-i*.04,.009],[w*.55,.007,.006],i*.4);break;
 }
 return g;
}
