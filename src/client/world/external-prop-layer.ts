import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD,heightAt } from '../../shared/data/world';
import { resolvePolyHavenGltf } from '../rendering/external-art-assets';

/**
 * HF25 external art layer.
 * - Hero props: photoreal CC0 Poly Haven models discovered through the official API.
 * - Distant filler: tiny free Polyfork GLBs as optional low-cost LOD only.
 * All network assets are optional and never replace authoritative collision.
 */
const POLYFORK={
 rock:'https://polyfork.dev/cdn/garden-rock-2d3b51.glb',
 stone:'https://polyfork.dev/cdn/path-stone-a-aead48.glb',
} as const;

const loader=new GLTFLoader().setCrossOrigin('anonymous');
const cache=new Map<string,Promise<T.Object3D>>();
function loadUrl(url:string){
 let p=cache.get(url);if(p)return p;
 p=loader.loadAsync(url).then(g=>g.scene);cache.set(url,p);return p;
}
async function loadPolyHaven(assetId:string){return loadUrl(await resolvePolyHavenGltf(assetId,'1k'));}

function cloneAndPolish(source:T.Object3D,mode:'maple'|'rock'|'stump'|'neutral'='neutral'){
 const root=source.clone(true);
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
  const wasArray=Array.isArray(o.material);const list=wasArray?o.material:[o.material];
  const key=(o.name+' '+list.map((x:T.Material)=>x.name).join(' ')).toLowerCase();
  const cloned=list.map((material:T.Material)=>{
   if(material instanceof T.MeshStandardMaterial){
    const m=material.clone();m.roughness=Math.max(mode==='rock'?.72:.58,m.roughness);m.metalness=Math.min(.08,m.metalness);m.envMapIntensity=mode==='rock'?.82:1.02;m.dithering=true;
    if(mode==='maple'){
     if(/leaf|leaves|foliage|twig/.test(key)){m.color.multiply(new T.Color('#B7826B'));m.roughness=Math.max(.66,m.roughness);m.envMapIntensity=.94;}
     else if(/branch|trunk|bark|stem/.test(key)){m.color.multiply(new T.Color('#835845'));m.roughness=Math.max(.78,m.roughness);}
    }else if(mode==='rock'){m.color.multiply(new T.Color('#B2ACA3'));}
    else if(mode==='stump'){m.color.multiply(new T.Color('#8A5A47'));m.roughness=Math.max(.8,m.roughness);}
    return m;
   }
   return material.clone();
  });
  o.material=wasArray?cloned:cloned[0];
 });
 return root;
}

function normalizeToHeight(root:T.Object3D,targetHeight:number){
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),size=new T.Vector3();box.getSize(size);const s=targetHeight/Math.max(.001,size.y);root.scale.multiplyScalar(s);root.updateMatrixWorld(true);return root;
}
function placeOnTerrain(root:T.Object3D,x:number,z:number,rotation=0){
 root.position.set(x,0,z);root.rotation.y=rotation;root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);root.position.y=heightAt(x,z)-box.min.y;root.updateMatrixWorld(true);
}

export class ExternalPropLayer{
 readonly root=new T.Group();private disposed=false;private detail:'low'|'balanced'|'high';private highDetailRoot=new T.Group();private lowCostRoot=new T.Group();
 constructor(parent:T.Object3D,detail:'low'|'balanced'|'high'){
  this.detail=detail;this.root.name='HF25_External_Mature_Art_Layer';this.highDetailRoot.name='HF25_PolyHaven_CC0_Hero_Props';this.lowCostRoot.name='HF25_Polyfork_Secondary_LOD';this.root.add(this.highDetailRoot,this.lowCostRoot);parent.add(this.root);void this.init();
 }
 private async init(){
  await Promise.allSettled([this.initPolyHavenHero(),this.initPolyforkLod()]);
  if(!this.disposed)this.setDetail(this.detail);
 }
 private async initPolyHavenHero(){
  const [tree,boulder,stump,screen,teaTable,stool,chandelier,armchair,lionHead]=await Promise.all([
   loadPolyHaven('jacaranda_tree'),
   loadPolyHaven('boulder_01'),
   loadPolyHaven('tree_stump_01'),
   loadPolyHaven('chinese_screen_panels'),
   loadPolyHaven('chinese_tea_table'),
   loadPolyHaven('chinese_stool'),
   loadPolyHaven('chinese_chandelier'),
   loadPolyHaven('chinese_armchair'),
   loadPolyHaven('lion_head'),
  ]);
  if(this.disposed)return;
  // Large mature canopy = the hero maple silhouette missing from the old low-poly scene.
  const hero=normalizeToHeight(cloneAndPolish(tree,'maple'),13.8);placeOnTerrain(hero,WORLD.spawn.x+11.8,WORLD.spawn.z-6.2,-.42);hero.userData.externalArt='polyhaven-jacaranda-maple';this.highDetailRoot.add(hero);
  const hero2=normalizeToHeight(cloneAndPolish(tree,'maple'),10.5);placeOnTerrain(hero2,WORLD.spawn.x-17.8,WORLD.spawn.z-5.2,.7);hero2.userData.externalArt='polyhaven-jacaranda-maple-secondary';this.highDetailRoot.add(hero2);
  for(const [ox,oz,h,rot] of [[-14,-1.8,2.4,.3],[-7.4,-3.2,1.75,-.4],[17.6,-7.4,2.25,.7],[14.2,-16.8,1.9,-.2]] as const){const r=normalizeToHeight(cloneAndPolish(boulder,'rock'),h);placeOnTerrain(r,WORLD.spawn.x+ox,WORLD.spawn.z+oz,rot);r.userData.externalArt='polyhaven-boulder';this.highDetailRoot.add(r);}
  for(const [ox,oz,h,rot] of [[-24,-12.4,2.4,.3],[23,-15.7,2.1,-.6]] as const){const s=normalizeToHeight(cloneAndPolish(stump,'stump'),h);placeOnTerrain(s,WORLD.spawn.x+ox,WORLD.spawn.z+oz,rot);s.userData.externalArt='polyhaven-stump';this.highDetailRoot.add(s);}

  // Authentic CC0 Chinese furniture/screens give the hero pavilion real-world scale,
  // surface detail and cultural specificity that primitive geometry cannot fake.
  const screenProp=normalizeToHeight(cloneAndPolish(screen,'neutral'),2.55);placeOnTerrain(screenProp,WORLD.spawn.x-15.7,WORLD.spawn.z-15.55,.02);screenProp.userData.externalArt='polyhaven-chinese-screen';this.highDetailRoot.add(screenProp);
  const tableProp=normalizeToHeight(cloneAndPolish(teaTable,'neutral'),.78);placeOnTerrain(tableProp,WORLD.spawn.x-15.45,WORLD.spawn.z-13.65,.06);tableProp.userData.externalArt='polyhaven-chinese-tea-table';this.highDetailRoot.add(tableProp);
  for(const [ox,oz,rot] of [[-16.5,-13.5,.2],[-14.5,-13.55,-.25]] as const){const seat=normalizeToHeight(cloneAndPolish(stool,'neutral'),.58);placeOnTerrain(seat,WORLD.spawn.x+ox,WORLD.spawn.z+oz,rot);seat.userData.externalArt='polyhaven-chinese-stool';this.highDetailRoot.add(seat);}
  // Additional confirmed CC0 Chinese assets from the same live API. These are
  // scene dressing only and never participate in collision/gameplay authority.
  for(const [ox,oz,rot] of [[-18.25,-13.55,.24],[-13.25,-13.3,-.35]] as const){const chair=normalizeToHeight(cloneAndPolish(armchair,'neutral'),1.12);placeOnTerrain(chair,WORLD.spawn.x+ox,WORLD.spawn.z+oz,rot);chair.userData.externalArt='polyhaven-chinese-armchair';this.highDetailRoot.add(chair);}
  for(const [ox,oz,h] of [[-17.8,-14.8,3.45],[18.8,-4.8,2.95]] as const){const lamp=normalizeToHeight(cloneAndPolish(chandelier,'neutral'),.82);placeOnTerrain(lamp,WORLD.spawn.x+ox,WORLD.spawn.z+oz,0);lamp.position.y+=h;lamp.userData.externalArt='polyhaven-chinese-chandelier';this.highDetailRoot.add(lamp);}
  for(const [ox,oz,rot] of [[-9.8,-9.2,.18],[9.6,-8.6,-.18]] as const){const guardian=normalizeToHeight(cloneAndPolish(lionHead,'neutral'),1.58);placeOnTerrain(guardian,WORLD.spawn.x+ox,WORLD.spawn.z+oz,rot);guardian.userData.externalArt='polyhaven-lion-head';this.highDetailRoot.add(guardian);}
 }
 private async initPolyforkLod(){
  const specs=[
   {url:POLYFORK.rock,kind:'rock' as const,placements:[[-27,-5,1.2,.2],[24,-20,1.4,1.2],[31,4,1.05,-.5],[-30,-35,1.25,.6]]},
   {url:POLYFORK.stone,kind:'rock' as const,placements:[[-7,6,0.13,.1],[-4,7,0.13,.2],[-1,7.5,.13,.3],[2,7.4,.13,.1],[5,6.7,.13,-.2],[8,5.5,.13,-.3]]},
  ];
  await Promise.all(specs.map(async spec=>{
   try{
    const asset=await loadUrl(spec.url);if(this.disposed)return;
    for(const [ox,oz,targetHeight,rot] of spec.placements){const clone=normalizeToHeight(cloneAndPolish(asset,spec.kind),targetHeight),wx=WORLD.spawn.x+ox,wz=WORLD.spawn.z+oz;placeOnTerrain(clone,wx,wz,rot);clone.userData.externalArt='polyfork-secondary';this.lowCostRoot.add(clone);}
   }catch(error){console.info(`[HF25] Optional Polyfork asset unavailable: ${spec.url}`,error);}
  }));
 }
 setDetail(detail:'low'|'balanced'|'high'){
  this.detail=detail;this.root.visible=true;this.highDetailRoot.visible=detail!=='low';
  // Polyfork remains limited to unobtrusive stones/rocks; all hero composition comes from the authored garden plus vetted Poly Haven assets.
  this.lowCostRoot.visible=true;
  // Secondary photoreal hero tree is high-tier only. The main hero remains in balanced/high.
  const children=this.highDetailRoot.children;for(const child of children)if(child.userData.externalArt==='polyhaven-jacaranda-maple-secondary')child.visible=detail==='high';
 }
 dispose(){this.disposed=true;this.root.traverse(o=>{if(o instanceof T.Mesh){o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.root.removeFromParent();}
}
