export interface GameInputCallbacks {
 isStarted():boolean;
 onMovementEdge():void;
 onLook(dx:number,dy:number):void;
 onZoom(deltaY:number):void;
 onClick(x:number,y:number):void;
 onDoubleClick():void;
 onKeyDown(key:string,event:KeyboardEvent):void;
 onBlur():void;
}

/** Owns browser input listeners; gameplay decisions stay in Game. */
export class GameInputController {
 private readonly keys=new Set<string>();
 private dragging=false;
 private pointerStartX=0;
 private pointerStartY=0;
 private virtualX=0;
 private virtualZ=0;
 private virtualSprint=false;
 private touchLookPointer:number|null=null;
 private touchLookX=0;
 private touchLookY=0;
 private touchStartAt=0;
 private touchMoved=false;
 private readonly typing=(event?:Event)=>{
  const target=event?.target instanceof HTMLElement?event.target:undefined,active=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
  const textEntry=(el?:HTMLElement)=>!!el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable||!!el.closest('[contenteditable=\"true\"]'));
  return textEntry(target)||textEntry(active);
 };
 constructor(private readonly canvas:HTMLCanvasElement,private readonly cb:GameInputCallbacks){
  canvas.style.touchAction='none';
  canvas.addEventListener('contextmenu',this.onContextMenu);
  canvas.addEventListener('pointerdown',this.onPointerDown);
  canvas.addEventListener('pointermove',this.onPointerMove);
  canvas.addEventListener('pointerup',this.onPointerUp);
  canvas.addEventListener('pointercancel',this.onPointerCancel);
  canvas.addEventListener('dblclick',this.onDoubleClick);
  canvas.addEventListener('wheel',this.onWheel,{passive:false});
  window.addEventListener('keydown',this.onKeyDown);
  window.addEventListener('keyup',this.onKeyUp);
  window.addEventListener('blur',this.onBlur);
 }
 isDown(key:string){return this.keys.has(key);}
 movementAxes(){
  const keyboardX=(this.keys.has('d')?1:0)-(this.keys.has('a')?1:0),keyboardZ=(this.keys.has('s')?1:0)-(this.keys.has('w')?1:0);
  if(keyboardX||keyboardZ){const length=Math.hypot(keyboardX,keyboardZ)||1;return {x:keyboardX/length,z:keyboardZ/length};}
  return {x:this.virtualX,z:this.virtualZ};
 }
 sprintRequested(){return this.keys.has('shift')||this.virtualSprint;}
 setVirtualMovement(x:number,z:number,sprint=false){
  if(!Number.isFinite(x)||!Number.isFinite(z)){x=0;z=0;}
  const length=Math.hypot(x,z),scale=length>1?1/length:1,nextX=x*scale,nextZ=z*scale;
  const changed=Math.abs(nextX-this.virtualX)>.015||Math.abs(nextZ-this.virtualZ)>.015||sprint!==this.virtualSprint;
  this.virtualX=nextX;this.virtualZ=nextZ;this.virtualSprint=sprint;
  if(changed)this.cb.onMovementEdge();
 }
 clearVirtualMovement(){if(this.virtualX||this.virtualZ||this.virtualSprint){this.virtualX=0;this.virtualZ=0;this.virtualSprint=false;this.cb.onMovementEdge();}}
 clear(){this.keys.clear();this.dragging=false;this.touchLookPointer=null;this.virtualX=0;this.virtualZ=0;this.virtualSprint=false;}
 dispose(){
  this.canvas.removeEventListener('contextmenu',this.onContextMenu);this.canvas.removeEventListener('pointerdown',this.onPointerDown);this.canvas.removeEventListener('pointermove',this.onPointerMove);this.canvas.removeEventListener('pointerup',this.onPointerUp);this.canvas.removeEventListener('pointercancel',this.onPointerCancel);this.canvas.removeEventListener('dblclick',this.onDoubleClick);this.canvas.removeEventListener('wheel',this.onWheel);
  window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);this.clear();
 }
 private onContextMenu=(e:MouseEvent)=>e.preventDefault();
 private onPointerDown=(e:PointerEvent)=>{
  this.pointerStartX=e.clientX;this.pointerStartY=e.clientY;
  if(e.pointerType==='touch'){
   if(this.touchLookPointer!==null)return;
   this.touchLookPointer=e.pointerId;this.touchLookX=e.clientX;this.touchLookY=e.clientY;this.touchStartAt=performance.now();this.touchMoved=false;
   this.canvas.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  if(e.button===2){this.dragging=true;this.canvas.setPointerCapture(e.pointerId);}
 };
 private onPointerMove=(e:PointerEvent)=>{
  if(e.pointerType==='touch'&&e.pointerId===this.touchLookPointer){
   const dx=e.clientX-this.touchLookX,dy=e.clientY-this.touchLookY;this.touchLookX=e.clientX;this.touchLookY=e.clientY;
   if(Math.hypot(e.clientX-this.pointerStartX,e.clientY-this.pointerStartY)>7)this.touchMoved=true;
   if(dx||dy)this.cb.onLook(dx,dy);e.preventDefault();return;
  }
  if(this.dragging)this.cb.onLook(e.movementX,e.movementY);
 };
 private onPointerUp=(e:PointerEvent)=>{
  if(e.pointerType==='touch'&&e.pointerId===this.touchLookPointer){
   const wasTap=!this.touchMoved&&performance.now()-this.touchStartAt<320;
   this.touchLookPointer=null;try{this.canvas.releasePointerCapture(e.pointerId);}catch{}
   if(wasTap)this.cb.onClick(e.clientX,e.clientY);e.preventDefault();return;
  }
  if(e.button===2){this.dragging=false;return;}
  if(e.button===0&&Math.hypot(e.clientX-this.pointerStartX,e.clientY-this.pointerStartY)<6)this.cb.onClick(e.clientX,e.clientY);
 };
 private onPointerCancel=(e:PointerEvent)=>{if(e.pointerId===this.touchLookPointer)this.touchLookPointer=null;if(e.button===2)this.dragging=false;};
 private onDoubleClick=()=>this.cb.onDoubleClick();
 private onWheel=(e:WheelEvent)=>{e.preventDefault();this.cb.onZoom(e.deltaY);};
 private onKeyDown=(e:KeyboardEvent)=>{if(this.typing(e)||!this.cb.isStarted())return;const key=e.key.toLowerCase();if([' ','tab','arrowup','arrowdown'].includes(key))e.preventDefault();if(e.repeat)return;this.keys.add(key);if(['w','a','s','d','shift'].includes(key))this.cb.onMovementEdge();this.cb.onKeyDown(key,e);};
 private onKeyUp=(e:KeyboardEvent)=>{if(this.typing(e))return;this.keys.delete(e.key.toLowerCase());this.cb.onMovementEdge();};
 private onBlur=()=>{this.clear();this.cb.onBlur();};
}
