import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ContentPack } from '../shared/data/content';
import { applyContent } from '../shared/data/content';
import { heightAt } from '../shared/data/world';
import { WorldRenderer } from '../client/world/world-renderer';
import { MonsterModel } from '../client/character/monster-model';
import { disposeTree } from '../client/rendering/primitives';
export class EditorMapView {
 private scene=new T.Scene();private renderer:T.WebGLRenderer;private camera=new T.PerspectiveCamera(45,1,.1,800);private controls:OrbitControls;private world:WorldRenderer;private observer:ResizeObserver;private models:MonsterModel[]=[];
 constructor(private host:HTMLElement,content:ContentPack){
  applyContent(content);this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(1);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;host.append(this.renderer.domElement);this.scene.background=new T.Color('#b7c8bd');this.scene.fog=new T.FogExp2('#bac9bd',.004);this.scene.add(new T.HemisphereLight('#dfeee5','#657262',2.6));const sun=new T.DirectionalLight('#ffe3bd',3);sun.position.set(-40,75,20);this.scene.add(sun);
  this.world=new WorldRenderer(this.scene);this.camera.position.set(65,135,150);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,0,0);this.controls.enableDamping=true;this.controls.maxPolarAngle=Math.PI*.47;this.controls.minDistance=10;this.controls.maxDistance=300;
  for(const o of content.objects.filter(o=>o.kind==='monster')){const def=content.monsters[o.monsterId!];if(!def)continue;const m=new MonsterModel(def);m.root.position.set(o.x,heightAt(o.x,o.z),o.z);m.root.rotation.y=o.rotation;this.models.push(m);this.scene.add(m.root);}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 resize(){const r=this.host.getBoundingClientRect();this.renderer.setSize(r.width,r.height);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
 update(dt:number,time:number){this.controls.update();this.world.update({x:this.controls.target.x,z:this.controls.target.z},time);for(const m of this.models)m.update(dt,time);this.renderer.render(this.scene,this.camera);}
 dispose(){this.observer.disconnect();this.controls.dispose();for(const m of this.models)m.dispose();this.world.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
