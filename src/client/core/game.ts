import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import type { Snapshot,PublicPlayer,Monster,Command,GameEvent } from '../../shared/types';
import { distance } from '../../shared/types';
import { MONSTERS } from '../../shared/data/monsters';
import { NPCS,WORLD,heightAt } from '../../shared/data/world';
import { SKILL_DEFINITIONS } from '../../shared/data/skills';
import { skillForHotkey } from '../../shared/combat/weapon-skills';
import { createItem } from '../../shared/domains/item';
import { Character } from '../character/character';
import { renderedGroundSpeed } from '../character/rendered-motion';
import { getAvatarCandidate, npcAvatarCandidate, saveAvatarCandidate, type AvatarCandidateId } from '../character/avatar-candidates';
import { MonsterModel, monsterVisualHeight } from '../character/monster-model';
import { WorldRenderer } from '../world/world-renderer';
import { VisualEffects } from '../rendering/effects';
import { GameAudio } from '../audio/audio';
import { Connection } from '../networking/connection';
import { GameUI } from '../ui/game-ui';
import { material,mesh } from '../rendering/primitives';
import { GRAPHICS_PRESETS,loadGraphicsSettings,saveGraphicsSettings,type GraphicsPreset,type GraphicsSettings,type PostProcessingQuality } from './graphics-settings';
import { classifyGraphicsHardware,clampGraphicsSettingsToCap,effectiveGraphicsTier,graphicsPresetLabel,lowerPreset,presetAllowed,type FixedGraphicsPreset,type GraphicsHardwareCapability } from './graphics-capability';
import { RuntimeQualityGuard } from './runtime-quality-guard';
import { DynamicResolutionController } from './dynamic-resolution';
import { AdaptiveQualityController } from './adaptive-quality';
import { clampRenderScale,chooseRuntimePostProcessing } from './graphics-safety';
import { createWideGamutRendererSurface,setWideGamutTextureHints } from '../rendering/wide-gamut-color';
import { createCinematicGradePass,configureCinematicGrade,updateCinematicGrade } from '../rendering/cinematic-rendering-pipeline';
import { loadPolyHavenEnvironment } from '../rendering/external-art-assets';
import { DEFAULT_CUSTOMIZATION,applyBodyPreset,applyFacePreset,exportCustomization,importCustomization,loadCustomization,loadCustomizationSlot,randomCustomization,saveCustomization,saveCustomizationSlot,type CharacterCustomization,type NumericCustomizationKey } from '../character/customization';
import { GameInputController } from '../input/game-input-controller';
import { resolveInteractionTarget } from '../interaction/interaction-target';
import { canPredictAttack, predictionTarget } from './combat-prediction';
import { panelForHotkey } from '../ui/panel-registry';

export class Game {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(48,1,.1,750);world:WorldRenderer;fx:VisualEffects;audio=new GameAudio();connection=new Connection();ui:GameUI;graphics:GraphicsSettings=loadGraphicsSettings();private sun:T.DirectionalLight;private composer:EffectComposer;private ssaoPass:SSAOPass;private bloomPass:UnrealBloomPass;private cinematicGrade:ReturnType<typeof createCinematicGradePass>;private dynamicResolution=new DynamicResolutionController();private adaptiveQuality=new AdaptiveQualityController();private autoQuality=true;runtimeRenderScale=1;private runtimePostProcessing:PostProcessingQuality='off';private readonly touchPerformanceProfile=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;private viewportWidth=1;private viewportHeight=1;private viewportLeft=0;private viewportTop=0;private viewportObserver?:ResizeObserver;private fallbackEnvironment?:T.Texture;private externalEnvironment?:T.Texture;private maxRenderTargetDimension=4096;private maxTextureSize=4096;private maxRenderbufferSize=4096;private maxSamples=0;private gpuRenderer='瀏覽器未提供 GPU 型號';private memoryGBEstimated=false;private hardwareCapability!:GraphicsHardwareCapability;private runtimeMaxPreset:FixedGraphicsPreset='balanced';private runtimeQualityReason='硬體能力上限';private runtimeQualityGuard=new RuntimeQualityGuard();private gameplayStartedAt=0;
 snapshot?:Snapshot;characters=new Map<string,Character>();monsters=new Map<string,MonsterModel>();npcs=new Map<string,Character>();private snapshotPlayerIds=new Set<string>();private snapshotMonsterIds=new Set<string>();characterCustomization:CharacterCustomization=loadCustomization();
 private labels=new Map<string,{el:HTMLElement;text:HTMLElement;bar:HTMLElement;fill:HTMLElement;seen:number;lastText:string;lastHp:number}>();private overlay:HTMLElement;private selected:T.Mesh;private marker:T.Mesh;private raycaster=new T.Raycaster();private pointer=new T.Vector2();
 private yaw=.05;private pitch=.20;private zoom=13.8;private creatorView:'none'|'face'|'body'|'full'='none';private creatorRestore?:{zoom:number;pitch:number};private follow=new T.Vector3(WORLD.spawn.x,heightAt(WORLD.spawn.x,WORLD.spawn.z)+1.1,WORLD.spawn.z);private loginCameraAnchor=new T.Vector3(WORLD.spawn.x,heightAt(WORLD.spawn.x,WORLD.spawn.z)+1.65,WORLD.spawn.z-8.4);private input!:GameInputController;private last=performance.now();private lastInput='';private movementHeartbeat=0;private time=0;private localHitStopUntil=0;private localHitStopTarget?:string;private cameraImpulseLateral=0;private cameraImpulseVertical=0;private cameraImpulseDepth=0;private cameraFovKick=0;private markerUntil=0;private pendingNpc?:string;private pendingPickup?:string;private frameCount=0;private fpsTime=0;fps=60;private started=false;private bootTime=performance.now();private labelTimer=0;private labelPass=0;private uiFrameTime=0;private cameraProbeTimer=0;private cameraDistance=this.zoom;private tempTarget=new T.Vector3();private tempFollow=new T.Vector3();private tempOffset=new T.Vector3();private tempDirection=new T.Vector3();private tempDesired=new T.Vector3();private tempProject=new T.Vector3();private renderFrame=0;private frameErrors=0;private lastFrameError='';private npcsBooted=false;private latestSnapshotTime=-Infinity;private snapshotReceivedAt=performance.now();private serverSession='';private forceSelfSnap=false;
 constructor(public host:HTMLElement){
  const initialRect=host.getBoundingClientRect(),initialWidth=Math.max(1,Math.round(initialRect.width||window.visualViewport?.width||innerWidth)),initialHeight=Math.max(1,Math.round(initialRect.height||window.visualViewport?.height||innerHeight));this.viewportWidth=initialWidth;this.viewportHeight=initialHeight;this.viewportLeft=initialRect.left;this.viewportTop=initialRect.top;
  const wideGamutSurface=createWideGamutRendererSurface();
  this.renderer=new T.WebGLRenderer({canvas:wideGamutSurface.canvas,context:wideGamutSurface.context as WebGLRenderingContext,antialias:false,powerPreference:'high-performance',stencil:false,alpha:false,premultipliedAlpha:false});
  setWideGamutTextureHints(this.renderer);
  const gl=this.renderer.getContext(),debugInfo=gl.getExtension('WEBGL_debug_renderer_info') as unknown as {UNMASKED_RENDERER_WEBGL:number}|null;
  this.maxTextureSize=Math.max(1,this.renderer.capabilities.maxTextureSize);this.maxRenderbufferSize=Math.max(1,Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))||this.maxTextureSize);this.maxSamples='MAX_SAMPLES' in gl?Math.max(0,Number(gl.getParameter((gl as WebGL2RenderingContext).MAX_SAMPLES))||0):0;this.maxRenderTargetDimension=Math.max(1,Math.min(this.maxTextureSize,this.maxRenderbufferSize));
  this.gpuRenderer=debugInfo?String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)||gl.getParameter(gl.RENDERER)||this.gpuRenderer):String(gl.getParameter(gl.RENDERER)||this.gpuRenderer);
  const nav=navigator as Navigator&{deviceMemory?:number};this.memoryGBEstimated=typeof nav.deviceMemory!=='number';this.hardwareCapability=classifyGraphicsHardware({memoryGB:nav.deviceMemory??6,cores:nav.hardwareConcurrency??4,dpr:Math.min(devicePixelRatio||1,3),width:initialWidth,height:initialHeight,mobile:this.touchPerformanceProfile,gpuRenderer:this.gpuRenderer,maxTextureSize:this.maxTextureSize,maxRenderbufferSize:this.maxRenderbufferSize,maxSamples:this.maxSamples});this.runtimeMaxPreset=this.hardwareCapability.maxPreset;this.runtimeQualityReason=this.hardwareCapability.reasons[0]??'硬體能力上限';this.graphics=clampGraphicsSettingsToCap(this.graphics,this.runtimeMaxPreset);saveGraphicsSettings(this.graphics);
  // HF18 hardware preflight happens before world/character GLBs start streaming. Performance
  // scaling removes expensive buffers first; the commercial palette/PBR art direction is constant.
  const bootPp=chooseRuntimePostProcessing(this.graphics.postProcessing,this.touchPerformanceProfile,initialWidth,initialHeight,this.maxRenderTargetDimension);this.runtimePostProcessing=bootPp;
  const bootRatio=clampRenderScale({requested:Math.min(devicePixelRatio||1,this.graphics.pixelRatio,.92),width:initialWidth,height:initialHeight,maxDimension:this.maxRenderTargetDimension,postProcessing:bootPp,mobile:this.touchPerformanceProfile});
  this.renderer.setPixelRatio(bootRatio);this.renderer.setSize(initialWidth,initialHeight,false);this.renderer.shadowMap.enabled=this.graphics.shadows;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=bootPp==='cinematic'?1.00:bootPp==='light'?1.02:1.00;this.renderer.outputColorSpace=T.SRGBColorSpace;
  const pmrem=new T.PMREMGenerator(this.renderer),env=pmrem.fromScene(new RoomEnvironment(),.04);this.fallbackEnvironment=env.texture;this.scene.environment=env.texture;this.scene.environmentIntensity=this.graphics.modelDetail==='high'?1.04:this.graphics.modelDetail==='balanced'?.96:.82;pmrem.dispose();void loadPolyHavenEnvironment(this.renderer).then(texture=>{if(!texture)return;this.externalEnvironment=texture;this.scene.environment=texture;this.scene.environmentIntensity=this.graphics.modelDetail==='high'?1.08:this.graphics.modelDetail==='balanced'?.98:.84;});
  this.renderer.domElement.id='game-canvas';host.append(this.renderer.domElement);
  const composerType=this.runtimeMaxPreset==='verylow'||this.runtimeMaxPreset==='low'?T.UnsignedByteType:T.HalfFloatType;this.composer=new EffectComposer(this.renderer,new T.WebGLRenderTarget(1,1,{type:composerType,depthBuffer:true,stencilBuffer:false}));this.composer.addPass(new RenderPass(this.scene,this.camera));this.ssaoPass=new SSAOPass(this.scene,this.camera,initialWidth,initialHeight);this.ssaoPass.kernelRadius=14;this.ssaoPass.minDistance=.0015;this.ssaoPass.maxDistance=.11;this.composer.addPass(this.ssaoPass);this.bloomPass=new UnrealBloomPass(new T.Vector2(1,1),.14,.30,.89);this.composer.addPass(this.bloomPass);this.cinematicGrade=createCinematicGradePass();configureCinematicGrade(this.cinematicGrade,bootPp,initialWidth,initialHeight);this.composer.addPass(this.cinematicGrade);this.composer.addPass(new OutputPass());
  this.camera.aspect=initialWidth/initialHeight;this.camera.updateProjectionMatrix();this.scene.background=new T.Color('#CFE6F1');this.scene.fog=new T.FogExp2('#92B5C5',.00135);
  const ambient=new T.HemisphereLight('#D3E7F1','#32434D',.34);this.scene.add(ambient);this.scene.add(new T.AmbientLight('#8FA4AE',.032));
  const fill=new T.DirectionalLight('#7FA9C0',.30);fill.position.set(52,38,62);this.scene.add(fill);fill.target.position.set(WORLD.spawn.x,2,WORLD.spawn.z-5);this.scene.add(fill.target);const rim=new T.DirectionalLight('#D99678',.38);rim.position.set(42,30,-56);rim.target.position.set(WORLD.spawn.x,2.8,WORLD.spawn.z-8);this.scene.add(rim,rim.target);const bounce=new T.PointLight('#D59A7D',.18,30,2);bounce.position.set(WORLD.spawn.x-5,3.5,WORLD.spawn.z-9);this.scene.add(bounce);
  this.sun=new T.DirectionalLight('#F5C7A1',4.4);const sun=this.sun;sun.position.set(-56,76,-46);sun.castShadow=this.graphics.shadows;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.far=220;sun.shadow.normalBias=.026;sun.shadow.bias=-.0001;sun.shadow.radius=2.8;this.scene.add(sun);this.scene.add(sun.target);sun.target.position.set(WORLD.spawn.x,0,WORLD.spawn.z-7.5);
  this.world=new WorldRenderer(this.scene,this.graphics.modelDetail);this.fx=new VisualEffects(this.scene); // P0.20.2: no whole-scene shader warmup on the UI thread.
  this.overlay=document.createElement('div');this.overlay.id='world-labels';host.append(this.overlay);
  this.selected=mesh(this.scene,new T.RingGeometry(.72,.79,64),new T.MeshBasicMaterial({color:'#e3b86f',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));this.selected.rotation.x=-Math.PI/2;this.selected.visible=false;
  this.marker=mesh(this.scene,new T.RingGeometry(.35,.43,32),new T.MeshBasicMaterial({color:'#b8dfca',transparent:true,opacity:.8,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;
  this.ui=new GameUI(host,this);window.addEventListener('qinglan-map-error',()=>this.ui.runtimeError('主場景地圖載入失敗，已保留首頁仙俠庭園作為保底場景。'));window.addEventListener('qinglan-map-ready',()=>this.ui.toast('仙俠場景已載入。'));this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.frameErrors++;this.lastFrameError='WebGL context lost';this.lowerRuntimeQualityCap('low','WebGL context loss',false);this.ui.runtimeError('GPU 繪圖內容遺失；已鎖定效能優先，恢復後仍維持安全畫質。');});this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.applyGraphicsSettings(clampGraphicsSettingsToCap(this.graphics,this.runtimeMaxPreset),true);this.ui.toast('GPU 已恢復，安全畫質鎖定仍然有效。');});this.applyGraphicsSettings(this.graphics,false);this.connection.onSnapshot=s=>this.receive(s);this.connection.onSession=(id,session)=>this.beginNetworkSession(id,session);this.connection.onStatus=text=>this.ui.status(text);this.connection.onError=text=>{this.ui.runtimeError(text);if(!this.snapshot){this.started=false;this.ui.loginError(`連線未完成：${text}`,'NETWORK_TRANSIENT');}};this.connection.onLoginRejected=(text,code)=>{if(!this.snapshot){this.started=false;this.ui.loginError(text,code);}else{this.ui.status('角色連線已停止');this.ui.runtimeError(text);}};this.connection.onContent=()=>this.ui.toast('世界內容已更新，重新進入可載入新的外觀與場景。');
  // P0.21.1: NPCs are scene-critical. Instantiate their roots immediately; their high-detail GLBs stream in through the shared cache.
  this.bootNpcs();
  this.bindInput();this.startMovementHeartbeat();this.animate();
  window.addEventListener('resize',this.resizeViewport);window.visualViewport?.addEventListener('resize',this.resizeViewport);window.visualViewport?.addEventListener('scroll',this.resizeViewport);if(typeof ResizeObserver!=='undefined'){this.viewportObserver=new ResizeObserver(this.resizeViewport);this.viewportObserver.observe(host);}this.resizeViewport();
  (window as unknown as {qinglan:unknown}).qinglan={getState:()=>this.snapshot,getMetrics:()=>({fps:this.fps,avgFps:this.adaptiveQuality.averageFps,hardware:this.hardwareCapability,quality:this.graphics.preset,maxQuality:this.runtimeMaxPreset,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,chunks:this.world.loadedChunks,geometries:this.renderer.info.memory.geometries,renderScale:this.runtimeRenderScale,gpu:this.gpuRenderer,maxTextureSize:this.maxTextureSize,maxRenderbufferSize:this.maxRenderbufferSize,maxSamples:this.maxSamples,maxRenderTargetDimension:this.maxRenderTargetDimension,postProcessing:this.runtimePostProcessing,activeMonsters:this.monsters.size,frameErrors:this.frameErrors,lastFrameError:this.lastFrameError,flight:!!this.snapshot?.self.flight}),send:(c:Command)=>this.command(c),game:this};
 }

 getGraphicsDiagnostics(){return {gpu:this.gpuRenderer,maxRenderTargetDimension:this.maxRenderTargetDimension,maxTextureSize:this.maxTextureSize,maxRenderbufferSize:this.maxRenderbufferSize,maxSamples:this.maxSamples,postProcessing:this.runtimePostProcessing,renderScale:this.runtimeRenderScale,hardwareTier:this.hardwareCapability.tierLabel,hardwareMaxPreset:this.hardwareCapability.maxPreset,maxPreset:this.runtimeMaxPreset,maxPresetLabel:graphicsPresetLabel(this.runtimeMaxPreset),runtimeReason:this.runtimeQualityReason,memoryGB:this.hardwareCapability.memoryGB,memoryGBEstimated:this.memoryGBEstimated,cores:this.hardwareCapability.cores,physicalPixels:this.hardwareCapability.physicalPixels,mobile:this.hardwareCapability.mobile,reasons:this.hardwareCapability.reasons};}
 getGraphicsCapability(){return {hardwareMaxPreset:this.hardwareCapability.maxPreset,maxPreset:this.runtimeMaxPreset,reason:this.runtimeQualityReason};}
 setGraphicsPreset(preset:Exclude<GraphicsPreset,'custom'>){this.autoQuality=false;const safe=presetAllowed(preset,this.runtimeMaxPreset)?preset:this.runtimeMaxPreset;if(safe!==preset)this.ui?.toast(`${graphicsPresetLabel(preset)}超過目前安全上限，已改用${graphicsPresetLabel(safe)}。`);this.applyGraphicsSettings({...GRAPHICS_PRESETS[safe]});}
 setGraphicsSetting<K extends keyof GraphicsSettings>(key:K,value:GraphicsSettings[K]){this.autoQuality=false;this.applyGraphicsSettings({...this.graphics,[key]:value,preset:'custom'});}
 private lowerRuntimeQualityCap(cap:FixedGraphicsPreset,reason:string,apply=true){const next=lowerPreset(this.runtimeMaxPreset,cap);if(next===this.runtimeMaxPreset)return false;this.runtimeMaxPreset=next;this.runtimeQualityReason=reason;this.runtimeQualityGuard.reset();const safe=clampGraphicsSettingsToCap(this.graphics,next);if(apply)this.applyGraphicsSettings(safe,false);else{this.graphics=safe;this.ui?.onGraphicsChanged();}return true;}
 private monitorRuntimeQuality(dt:number){if(!this.started||this.gameplayStartedAt<=0){this.runtimeQualityGuard.reset();return;}const gameplaySeconds=(performance.now()-this.gameplayStartedAt)/1000,result=this.runtimeQualityGuard.update(dt,this.fps,effectiveGraphicsTier(this.graphics),this.runtimeMaxPreset,gameplaySeconds,!document.hidden);if(!result)return;const changed=this.lowerRuntimeQualityCap(result.cap,result.reason);if(changed)this.ui?.toast(`效能保護：${result.reason}，最高畫質已鎖至${graphicsPresetLabel(result.cap)}。`);}
 private bootNpcs(){
  if(this.npcsBooted)return;this.npcsBooted=true;
  for(const n of NPCS){
   if(this.npcs.has(n.id))continue;
   try{
    const c=new Character(undefined,'npc',npcAvatarCandidate(this.npcs.size));
    const outfit=n.id==='guide'?{chest:createItem('cloud-robe'),shoulders:createItem('cloud-shoulders'),cape:createItem('mist-cape'),legs:createItem('linen-legs'),feet:createItem('cloud-boots'),head:createItem('jade-crown'),waist:createItem('woven-belt'),mainhand:createItem('cloud-sword')}:n.id==='smith'?{chest:createItem('reed-vest'),wrists:createItem('wolf-bracers'),legs:createItem('scale-legs'),feet:createItem('linen-boots'),head:createItem('cloth-head'),waist:createItem('woven-belt'),mainhand:createItem('mountain-blade')}:{fashion:createItem('snow-fashion'),legs:createItem('linen-legs'),feet:createItem('cloud-boots'),head:createItem('jade-crown'),waist:createItem('woven-belt')};
    c.setEquipment(outfit);c.root.position.set(n.x,heightAt(n.x,n.z),n.z);c.root.rotation.y=n.angle;c.root.userData.npcId=n.id;c.root.userData.sceneCritical=true;this.npcs.set(n.id,c);this.scene.add(c.root);this.setProxyShadows(c.root,this.graphics.shadows&&this.graphics.characterShadows);
   }catch(error){console.error(`[P0.21.1 NPCBoot] ${n.id}`,error);this.ui.runtimeError(`NPC ${n.name} 建立失敗：${error instanceof Error?error.message:String(error)}`);}
  }
  console.info(`[P0.21.1] NPC visual roots ready: ${this.npcs.size}/${NPCS.length}`);
 }
 private scheduleShaderWarmup(){
  const run=()=>{const renderer=this.renderer as T.WebGLRenderer&{compileAsync?:(scene:T.Scene,camera:T.Camera)=>Promise<unknown>};if(renderer.compileAsync)void renderer.compileAsync(this.scene,this.camera).catch(()=>{});else this.renderer.compile(this.scene,this.camera);};
  const w=window as typeof window&{requestIdleCallback?:(cb:()=>void,opts?:{timeout:number})=>number};if(w.requestIdleCallback)w.requestIdleCallback(run,{timeout:2600});else setTimeout(run,1800);
 }
 private setProxyShadows(root:T.Object3D,enabled:boolean){root.traverse(o=>{if(o.userData.shadowProxy)o.castShadow=enabled;});}
 private resizeViewport=()=>{if(!this.renderer||!this.composer)return;const rect=this.host.getBoundingClientRect(),visual=window.visualViewport,width=Math.max(1,Math.round(rect.width||visual?.width||innerWidth)),height=Math.max(1,Math.round(rect.height||visual?.height||innerHeight));this.viewportWidth=width;this.viewportHeight=height;this.viewportLeft=rect.left;this.viewportTop=rect.top;this.applyRenderScale(this.dynamicResolution.scale);configureCinematicGrade(this.cinematicGrade,this.runtimePostProcessing,width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();};
 private applyRenderScale(scale:number){const requested=Math.min(devicePixelRatio||1,scale),ratio=clampRenderScale({requested,width:this.viewportWidth,height:this.viewportHeight,maxDimension:this.maxRenderTargetDimension,postProcessing:this.runtimePostProcessing,mobile:this.touchPerformanceProfile});this.runtimeRenderScale=ratio;this.renderer.setPixelRatio(ratio);this.renderer.setSize(this.viewportWidth,this.viewportHeight,false);if(this.runtimePostProcessing==='off'){this.composer.setPixelRatio(1);this.composer.setSize(1,1);}else{this.composer.setPixelRatio(ratio);this.composer.setSize(this.viewportWidth,this.viewportHeight);}}
 applyGraphicsSettings(settings:GraphicsSettings,persist=true){
  this.graphics=clampGraphicsSettingsToCap(settings,this.runtimeMaxPreset);if(persist)saveGraphicsSettings(this.graphics);
  const mobile=this.touchPerformanceProfile,mobileScaleCap=this.graphics.preset==='verylow'?.7:this.graphics.preset==='low'?.85:this.graphics.preset==='balanced'?.9:1,baseScale=mobile?Math.min(this.graphics.pixelRatio,mobileScaleCap):this.graphics.pixelRatio;const requestedPp=this.graphics.postProcessing,pp:PostProcessingQuality=chooseRuntimePostProcessing(requestedPp,mobile,this.viewportWidth,this.viewportHeight,this.maxRenderTargetDimension);this.runtimePostProcessing=pp;const initialScale=this.dynamicResolution.configure(this.graphics.dynamicResolution,baseScale,this.graphics.preset,mobile);this.applyRenderScale(initialScale);this.ssaoPass.enabled=pp==='cinematic'&&this.graphics.modelDetail!=='low';this.ssaoPass.kernelRadius=pp==='cinematic'?12:10;this.ssaoPass.minDistance=.0009;this.ssaoPass.maxDistance=pp==='cinematic'?.070:.055;this.bloomPass.enabled=pp!=='off';this.bloomPass.strength=pp==='cinematic'?.14:pp==='light'?.07:0;this.bloomPass.radius=pp==='cinematic'?.30:.20;this.bloomPass.threshold=pp==='cinematic'?.89:.94;configureCinematicGrade(this.cinematicGrade,pp,this.viewportWidth,this.viewportHeight);this.renderer.toneMappingExposure=pp==='cinematic'?1.00:pp==='light'?1.02:1.00;
  const shadowQuality=mobile&&this.graphics.shadowQuality==='high'?'medium':this.graphics.shadowQuality;this.renderer.shadowMap.enabled=this.graphics.shadows;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.sun.castShadow=this.graphics.shadows;this.sun.shadow.radius=shadowQuality==='high'?2.6:shadowQuality==='medium'?2.0:1.4;
  const shadowSize=shadowQuality==='high'?2048:shadowQuality==='medium'?1024:512;
  if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.mapSize.set(shadowSize,shadowSize);if(this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}}
  const shadowExtent=shadowQuality==='high'?48:shadowQuality==='medium'?36:24;
  this.sun.shadow.camera.left=-shadowExtent;this.sun.shadow.camera.right=shadowExtent;this.sun.shadow.camera.top=shadowExtent;this.sun.shadow.camera.bottom=-shadowExtent;this.sun.shadow.camera.updateProjectionMatrix();
  for(const c of this.characters.values())this.setProxyShadows(c.root,this.graphics.shadows&&this.graphics.characterShadows);
  for(const c of this.npcs.values())this.setProxyShadows(c.root,this.graphics.shadows&&this.graphics.characterShadows);
  for(const m of this.monsters.values())this.setProxyShadows(m.root,this.graphics.shadows&&this.graphics.monsterShadows&&!mobile);
  this.world.setVegetationQuality(this.graphics.vegetation);this.world.setModelDetail(this.graphics.modelDetail);const envTexture=this.externalEnvironment??this.fallbackEnvironment;if(envTexture)this.scene.environment=envTexture;this.scene.environmentIntensity=this.graphics.modelDetail==='high'?1.08:this.graphics.modelDetail==='balanced'?.98:.84;this.fx.setQuality(this.graphics.vfx);this.overlay.style.display=this.graphics.worldLabels?'':'none';
  const view=mobile&&this.graphics.viewDistance==='far'?'balanced':this.graphics.viewDistance;if(view==='near'){this.camera.far=280;this.scene.fog=new T.FogExp2('#A0BECC',.00235);this.world.setChunkRadius(1);}else if(view==='far'){this.camera.far=750;this.scene.fog=new T.FogExp2('#9FBCC9',.00095);this.world.setChunkRadius(2);}else{this.camera.far=520;this.scene.fog=new T.FogExp2('#92B5C5',.00135);this.world.setChunkRadius(2);}this.camera.updateProjectionMatrix();
  this.ui?.onGraphicsChanged();
 }

 createCharacter(name:string){this.lastInput='';this.connection.connectCreate(name);}
 resumeCharacter(token:string){this.lastInput='';this.connection.connectCharacter(token);}
 /** Backward-compatible alias for old UI/tests. */
 join(name:string){this.createCharacter(name);}
 private beginNetworkSession(id:string,session:string){
  const identityChanged=!!this.snapshot&&this.snapshot.self.id!==id;
  if((session&&session!==this.serverSession)||identityChanged){this.latestSnapshotTime=-Infinity;this.snapshotReceivedAt=performance.now();if(this.serverSession)this.time=0;this.forceSelfSnap=identityChanged;}
  if(session)this.serverSession=session;
 }
 private movementCommand(){const axes=this.input.movementAxes(),x=axes.x,z=axes.z;return {type:'move' as const,x:x*Math.cos(this.yaw)+z*Math.sin(this.yaw),z:-x*Math.sin(this.yaw)+z*Math.cos(this.yaw),sprint:this.input.sprintRequested()};}
 setMobileMovement(x:number,z:number,sprint=false){this.input.setVirtualMovement(x,z,sprint);}
 stopMobileMovement(){this.input.clearVirtualMovement();}
 mobileBasicAttack(){if(this.started)this.command({type:'attack',skill:'basic'});}
 mobileJump(){if(this.started)this.command({type:'jump'});}
 mobileFlight(){if(this.started)this.command({type:'flight'});}
 mobileInteract(){if(!this.started||!this.snapshot)return;const target=resolveInteractionTarget(this.snapshot);if(target?.type==='drop')this.pickup(target.id);else if(target?.type==='npc')this.interact(target.id);else this.interact();}
 private sendMovement(force=false){if(!this.started)return;const input=this.movementCommand(),moving=Math.hypot(input.x,input.z)>.001,sig=`${input.x.toFixed(4)},${input.z.toFixed(4)},${input.sprint?1:0}`;if(force||moving||sig!==this.lastInput)this.command(input);this.lastInput=sig;}
 private startMovementHeartbeat(){if(this.movementHeartbeat)return;this.movementHeartbeat=window.setInterval(()=>this.sendMovement(),90);}
 private shouldPredictAttack(c:Extract<Command,{type:'attack'}>){
  const s=this.snapshot;if(!s||s.self.attack)return false;const skill=SKILL_DEFINITIONS[c.skill];if(!skill)return false;
  if(skill.targeting!=='enemy')return canPredictAttack(s,c.skill,c.target);
  const target=predictionTarget(s,c.target),actor=this.characters.get(s.self.id);if(!target||!actor)return false;
  const targetModel=this.monsters.get(target.id);if(!targetModel)return false;
  return canPredictAttack(s,c.skill,c.target,{x:actor.root.position.x,z:actor.root.position.z,angle:actor.root.rotation.y},{x:targetModel.root.position.x,z:targetModel.root.position.z});
 }
 command(c:Command){if(c.type==='attack'&&this.shouldPredictAttack(c))this.characters.get(this.snapshot!.self.id)?.predictAttack(c.skill,this.time);this.connection.send(c);}
 private scheduleLocalHitStop(event:GameEvent){
  const self=this.snapshot?.self;if(!self||event.type!=='hit'||event.actor!==self.id||event.target===self.id||(event.value??0)<=0)return;
  const skill=SKILL_DEFINITIONS[event.skill??''];if(!skill)return; // periodic status ticks are intentionally excluded
  const profile=event.weaponProfile??this.characters.get(self.id)?.profile??'sword';
  const base=profile==='greatsword'?.052:profile==='sword'?.032:profile==='spear'?.028:profile==='dual'?.018:profile==='bow'?.022:.026;
  const power=T.MathUtils.clamp(Math.max(0,skill.multiplier-1)*.014+skill.radius*.0018,0,.016),critical=event.critical?.018:0,duration=T.MathUtils.clamp(base+power+critical,.014,.075);
  this.localHitStopUntil=Math.max(this.localHitStopUntil,performance.now()+duration*1000);this.localHitStopTarget=event.target;
 }
 private applyCombatCameraImpulse(event:GameEvent){
  const self=this.snapshot?.self;if(!self)return;
  const profile=event.weaponProfile??this.characters.get(self.id)?.profile??'sword',skill=SKILL_DEFINITIONS[event.skill??''],skillPower=skill?T.MathUtils.clamp(Math.max(0,skill.multiplier-1)*.17+skill.radius*.018,0,.78):0,criticalScale=event.critical?1.28:1;
  if(event.type==='hit'&&event.target===self.id){this.cameraImpulseLateral+=.025;this.cameraImpulseVertical+=.08;this.cameraImpulseDepth-=.095;this.cameraFovKick+=.75;return;}
  if(event.type==='cast'&&event.actor===self.id){const anticipation=skill?T.MathUtils.clamp(skill.windup*.22+skill.radius*.012,0,.32):0;this.cameraFovKick-=(profile==='greatsword'?.32:profile==='staff'?.24:.14)+anticipation;return;}
  if(event.type!=='hit'||event.actor!==self.id)return;
  if(profile==='greatsword'){this.cameraImpulseLateral+=.035;this.cameraImpulseVertical+=.065;this.cameraImpulseDepth-=.105;this.cameraFovKick+=.9;}
  else if(profile==='spear'){this.cameraImpulseLateral+=.008;this.cameraImpulseVertical+=.018;this.cameraImpulseDepth-=.07;this.cameraFovKick+=.48;}
  else if(profile==='dual'){this.cameraImpulseLateral+=.025;this.cameraImpulseVertical+=.01;this.cameraImpulseDepth-=.022;this.cameraFovKick+=.2;}
  else if(profile==='staff'){this.cameraImpulseLateral+=.006;this.cameraImpulseVertical+=.035;this.cameraImpulseDepth-=.04;this.cameraFovKick+=.6;}
  else if(profile==='bow'){this.cameraImpulseLateral+=.006;this.cameraImpulseVertical+=.014;this.cameraImpulseDepth-=.045;this.cameraFovKick+=.3;}
  else{this.cameraImpulseLateral+=.022;this.cameraImpulseVertical+=.018;this.cameraImpulseDepth-=.035;this.cameraFovKick+=.35;}
  this.cameraImpulseVertical+=skillPower*.035*criticalScale;this.cameraImpulseDepth-=skillPower*.055*criticalScale;this.cameraFovKick+=skillPower*.48*criticalScale;if(event.critical){this.cameraImpulseLateral+=.018;this.cameraFovKick+=.34;}
 }
 getAvatarCandidate(){return getAvatarCandidate();}
 setAvatarCandidate(id:AvatarCandidateId){saveAvatarCandidate(id);const self=this.snapshot?.self.id;if(self)this.characters.get(self)?.setAvatarCandidate(id);}
  getCharacterCustomization(){return {...this.characterCustomization};}
 setCharacterCustomization(next:CharacterCustomization){this.characterCustomization={...next};saveCustomization(this.characterCustomization);const id=this.snapshot?.self.id;if(id)this.characters.get(id)?.setCustomization(this.characterCustomization);}
 setCharacterCustomizationKey(key:NumericCustomizationKey,value:number){this.setCharacterCustomization({...this.characterCustomization,[key]:value});}
 setCharacterOption<K extends keyof CharacterCustomization>(key:K,value:CharacterCustomization[K]){this.setCharacterCustomization({...this.characterCustomization,[key]:value});}
 setCharacterStyleColor(key:'skinColor'|'hairColor'|'leftEyeColor'|'rightEyeColor'|'lipColor'|'underwearColor'|'tattooColor'|'makeupColor',value:string){this.setCharacterCustomization({...this.characterCustomization,[key]:value});}
 setCharacterHairStyle(value:number){this.setCharacterOption('hairStyle',value);}
 applyCharacterFacePreset(index:number){this.setCharacterCustomization(applyFacePreset(this.characterCustomization,index));}
 applyCharacterBodyPreset(index:number){this.setCharacterCustomization(applyBodyPreset(this.characterCustomization,index));}
 resetCharacterCustomization(){this.setCharacterCustomization({...DEFAULT_CUSTOMIZATION});}
 randomizeCharacterCustomization(){this.setCharacterCustomization(randomCustomization(this.characterCustomization));}
 saveCharacterCustomizationSlot(slot:number){return saveCustomizationSlot(slot,this.characterCustomization);}
 loadCharacterCustomizationSlot(slot:number){const next=loadCustomizationSlot(slot);if(next)this.setCharacterCustomization(next);return !!next;}
 exportCharacterCustomization(){return exportCustomization(this.characterCustomization);}
 importCharacterCustomization(text:string){const next=importCustomization(text);if(!next)return false;this.setCharacterCustomization(next);return true;}
 setSelfEquipmentPreview(hidden:boolean){const id=this.snapshot?.self.id;if(id)this.characters.get(id)?.setEquipmentVisible(!hidden);}
 setCharacterCreatorView(view:'none'|'face'|'body'|'full'){
  if(view!=='none'&&this.creatorView==='none')this.creatorRestore={zoom:this.zoom,pitch:this.pitch};
  this.creatorView=view;
  if(view==='face'){this.zoom=2.35;this.pitch=.08;}else if(view==='body'){this.zoom=4.6;this.pitch=.14;}else if(view==='full'){this.zoom=6.6;this.pitch=.18;}else if(this.creatorRestore){this.zoom=this.creatorRestore.zoom;this.pitch=this.creatorRestore.pitch;this.creatorRestore=undefined;}
 }
 previewCharacterAnimation(name:string){const id=this.snapshot?.self.id;return id?!!this.characters.get(id)?.previewAnimation(name):false;}
 previewCharacterVoice(){const u=new SpeechSynthesisUtterance('喝！');const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/zh|chinese/i.test(v.lang+v.name))??null;u.pitch=.65+this.characterCustomization.voicePitch/100*.75;u.rate=[1.05,.9,1.18,.78][this.characterCustomization.voiceStyle]??1;speechSynthesis.cancel();speechSynthesis.speak(u);}
 private receive(s:Snapshot){
  if(!s?.self||typeof s.self.id!=='string'||!Array.isArray(s.players)||!Array.isArray(s.monsters)||!Array.isArray(s.drops)||!Array.isArray(s.events)){this.ui.runtimeError('收到不完整的世界快照，已拒絕套用。');return;}
  if(s.time+1e-6<this.latestSnapshotTime)return;
  const previousSelf=this.snapshot?.self;
  if(previousSelf&&previousSelf.id===s.self.id&&previousSelf.hp<=0&&s.self.hp>0&&distance(previousSelf,s.self)>8)this.forceSelfSnap=true;
  const firstLogin=!this.started;this.latestSnapshotTime=s.time;this.snapshotReceivedAt=performance.now();this.snapshot=s;this.time=s.time;
  if(firstLogin){this.started=true;this.gameplayStartedAt=performance.now();this.runtimeQualityGuard.reset();this.audio.start();}
  // P0.21.1: release the UI first. A GLB/rig/equipment failure must never make the whole game look unsynchronized.
  try{this.ui.update(s);if(firstLogin)this.ui.completeCharacterLogin(s.self.id,s.self.name,this.connection.activeToken);}catch(error){console.error('[P0.21.1 Snapshot:UI]',error);this.ui.runtimeError(`世界資料已同步，但 HUD 更新失敗：${error instanceof Error?error.message:String(error)}`);}
  try{
   let selfActor=this.characters.get(s.self.id);
   if(!selfActor){selfActor=new Character();selfActor.root.name='LocalPlayer';selfActor.root.position.set(s.self.x,heightAt(s.self.x,s.self.z)+(s.self.flight?4.25:0),s.self.z);this.characters.set(s.self.id,selfActor);this.scene.add(selfActor.root);this.setProxyShadows(selfActor.root,this.graphics.shadows&&this.graphics.characterShadows);}
   selfActor.root.visible=true;selfActor.setEquipment(s.self.equipment??{});selfActor.setCustomization(this.characterCustomization);
  }catch(error){console.error('[P0.21.1 Snapshot:SelfActor]',error);this.ui.runtimeError(`主角 3D 建立失敗，但世界同步仍保持：${error instanceof Error?error.message:String(error)}`);}
  try{
   this.snapshotPlayerIds.clear();for(const p of s.players){this.snapshotPlayerIds.add(p.id);if(p.id===s.self.id)continue;let c=this.characters.get(p.id);if(!c){c=new Character(undefined,'player',npcAvatarCandidate(this.characters.size));c.root.position.set(p.x,heightAt(p.x,p.z),p.z);this.characters.set(p.id,c);this.scene.add(c.root);this.setProxyShadows(c.root,this.graphics.shadows&&this.graphics.characterShadows);}c.setEquipment(p.equipment??{});}
   for(const [id,c] of this.characters)if(id!==s.self.id&&!this.snapshotPlayerIds.has(id)){c.dispose();this.characters.delete(id);}
  }catch(error){console.error('[P0.21.1 Snapshot:Players]',error);}
  try{
   const runtimeStressed=this.fps<30,monsterRadius=runtimeStressed?36:this.graphics.modelDetail==='low'?42:this.graphics.modelDetail==='balanced'?62:82,monsterRadiusSq=monsterRadius*monsterRadius;
   this.snapshotMonsterIds.clear();for(const m of s.monsters){const dx=m.x-s.self.x,dz=m.z-s.self.z;if(m.id===s.self.target||dx*dx+dz*dz<=monsterRadiusSq)this.snapshotMonsterIds.add(m.id);}
   let createBudget=(runtimeStressed||this.graphics.modelDetail==='low')?1:2;
   for(const m of s.monsters){if(createBudget<=0)break;if(!this.snapshotMonsterIds.has(m.id)||this.monsters.has(m.id))continue;const def=MONSTERS[m.defId];if(!def)continue;const model=new MonsterModel(def);model.root.position.set(m.x,heightAt(m.x,m.z),m.z);model.root.userData.monsterId=m.id;this.monsters.set(m.id,model);this.scene.add(model.root);this.setProxyShadows(model.root,this.graphics.shadows&&this.graphics.monsterShadows);createBudget--;}
   for(const [id,m] of this.monsters)if(!this.snapshotMonsterIds.has(id)){m.dispose();this.monsters.delete(id);}
  }catch(error){console.error('[P0.21.1 Snapshot:Monsters]',error);}
  try{this.fx.sync(s.drops,s.monsters,s.self);}catch(error){console.error('[P0.21.1 Snapshot:FXSync]',error);}
  try{
   for(const event of s.events){this.fx.event(event,s.time);if(event.type==='hit'){const mine=event.target===s.self.id,dealt=event.actor===s.self.id&&!mine,element=SKILL_DEFINITIONS[event.skill??'']?.element;this.audio.play(mine?'hurt':'hit');if(dealt&&event.skill!=='basic'&&(element==='fire'||element==='frost'||element==='lightning'))this.audio.play(element==='lightning'?'thunder':element);this.applyCombatCameraImpulse(event);if(dealt)this.scheduleLocalHitStop(event);if(mine&&event.value!>0)this.ui.impact();this.ui.damage(event);}if(event.type==='cast'&&event.actor===s.self.id&&!['flight-on','flight-off','jump'].includes(event.skill??'')){this.applyCombatCameraImpulse(event);const element=SKILL_DEFINITIONS[event.skill??'']?.element;this.audio.play(element==='lightning'?'thunder':element==='fire'?'fire':element==='frost'?'frost':'swing');}if(event.type==='pickup'){this.audio.play('loot');if(event.actor===s.self.id){this.pendingPickup=undefined;this.characters.get(s.self.id)?.playPickup(event.itemId??'',event.rarity??'common',s.time);}}if(event.type==='equip'&&event.actor===s.self.id)this.audio.play('equip');}
  }catch(error){console.error('[P0.21.1 Snapshot:Events]',error);}
  if(this.pendingNpc){const npc=NPCS.find(n=>n.id===this.pendingNpc);if(npc&&distance(s.self,npc)<6){this.pendingNpc=undefined;this.interact(npc.id);}}
  if(this.pendingPickup){const d=s.drops.find(d=>d.id===this.pendingPickup);if(!d)this.pendingPickup=undefined;else if(distance(s.self,d)<4.25){const id=d.id;this.pendingPickup=undefined;this.command({type:'pickup',id});}}
 }
 pickup(id?:string){if(!this.snapshot)return;if(this.snapshot.self.flight){this.ui.toast('御劍時無法拾取，按 G 收劍落地。');return;}const drops=this.snapshot.drops.filter(d=>!id||d.id===id).sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self));const d=drops[0];if(!d)return;if(distance(d,this.snapshot.self)>4.25){this.pendingPickup=d.id;this.command({type:'navigate',x:d.x,z:d.z,label:'拾取 '+ITEM_NAME(d.item.baseId)});return;}this.pendingPickup=undefined;this.command({type:'pickup',id:d.id});}
 interact(id?:string){if(!this.snapshot)return;if(this.snapshot.self.flight){this.ui.toast('請先按 G 收劍落地，再與居民交談。');return;}const npc=id?NPCS.find(n=>n.id===id):[...NPCS].sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self))[0];if(!npc)return;if(distance(npc,this.snapshot.self)>6.2){this.pendingNpc=npc.id;this.command({type:'navigate',x:npc.x,z:npc.z+2,label:npc.name});return;}this.command({type:'intel',npc:npc.id});this.ui.openNpc(npc.id);}
 private bindInput(){
  this.input=new GameInputController(this.renderer.domElement,{
   isStarted:()=>this.started,
   onMovementEdge:()=>this.sendMovement(true),
   onLook:(dx,dy)=>{this.yaw-=dx*.005;this.pitch=T.MathUtils.clamp(this.pitch+dy*.004,.08,1.18);},
   onZoom:delta=>{this.zoom=T.MathUtils.clamp(this.zoom+delta*.012,3,24);},
   onClick:(x,y)=>this.click(x,y),
   onDoubleClick:()=>this.command({type:'attack',skill:'basic'}),
   onKeyDown:(key,e)=>this.handleGameplayKey(key,e),
   onBlur:()=>{this.lastInput='';this.command({type:'move',x:0,z:0,sprint:false});}
  });
 }
 private handleGameplayKey(key:string,e:KeyboardEvent){
  if(key===' ')this.command({type:'jump'});if(key==='g')this.command({type:'flight'});if(key==='f'&&this.snapshot){const target=resolveInteractionTarget(this.snapshot);if(target?.type==='drop')this.pickup(target.id);else if(target?.type==='npc')this.interact(target.id);else this.interact();}
  if(key==='tab'&&this.snapshot){const nearby=this.snapshot.monsters.filter(m=>m.hp>0&&distance(m,this.snapshot!.self)<35).sort((a,b)=>distance(a,this.snapshot!.self)-distance(b,this.snapshot!.self));const next=nearby[(nearby.findIndex(m=>m.id===this.snapshot!.self.target)+1)%nearby.length];if(next)this.command({type:'target',id:next.id});}
  const skill=this.snapshot?skillForHotkey(this.snapshot.self.equipment,key):undefined;if(skill)this.command({type:'attack',skill});if(key==='6')this.command({type:'potion'});
  const panel=panelForHotkey(key);if(panel){if(panel==='settings'){e.preventDefault();this.ui.openSettings();}else this.ui.toggle(panel);}if(key==='escape')this.ui.closeAll();if(key==='enter')this.ui.focusChat();
 }
 private click(x:number,y:number){if(!this.snapshot)return;this.pointer.set((x-this.viewportLeft)/this.viewportWidth*2-1,-(y-this.viewportTop)/this.viewportHeight*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
  const candidates=[...this.monsters.values()].map(m=>m.root).concat([...this.npcs.values()].map(c=>c.root),[...this.fx.drops.values()]);const hit=this.raycaster.intersectObjects(candidates,true)[0];
  if(hit){let node:T.Object3D|null=hit.object;while(node){if(node.userData.monsterId){this.command({type:'target',id:node.userData.monsterId});return;}if(node.userData.npcId){this.interact(node.userData.npcId);return;}if(node.userData.dropId){this.pickup(node.userData.dropId);return;}node=node.parent;}}
  const ground=this.raycaster.intersectObject(this.world.terrain)[0];if(ground){this.command({type:'navigate',x:ground.point.x,z:ground.point.z});this.marker.position.copy(ground.point);this.marker.position.y+=.09;this.markerUntil=this.time+2;}
 }
 project(x:number,y:number,z:number){const p=this.tempProject.set(x,y,z).project(this.camera);return {x:this.viewportLeft+(p.x*.5+.5)*this.viewportWidth,y:this.viewportTop+(-.5*p.y+.5)*this.viewportHeight,visible:p.z<1&&Math.abs(p.x)<1.15&&Math.abs(p.y)<1.15};}
 private label(id:string,x:number,y:number,z:number,text:string,kind:string,hp?:number){let entry=this.labels.get(id);if(!entry){const el=document.createElement('div');el.className='world-label '+kind;el.innerHTML='<span></span><i><b></b></i>';this.overlay.append(el);entry={el,text:el.querySelector('span')!,bar:el.querySelector('i')!,fill:el.querySelector('b')!,seen:0,lastText:'',lastHp:-1};this.labels.set(id,entry);}entry.seen=this.labelPass;const p=this.project(x,y,z);entry.el.style.display=p.visible?'':'none';if(!p.visible)return;entry.el.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-100%)`;if(entry.lastText!==text){entry.text.textContent=text;entry.lastText=text;}const showHp=hp!==undefined;entry.bar.style.display=showHp?'':'none';if(showHp){const next=Math.round(hp!*1000)/10;if(entry.lastHp!==next){entry.fill.style.width=`${next}%`;entry.lastHp=next;}}}
 private safeFrame(label:string,fn:()=>void){try{fn();}catch(error){this.frameErrors++;this.lastFrameError=`${label}: ${error instanceof Error?error.message:String(error)}`;if(this.frameErrors<=12||this.frameErrors%120===0)console.error(`[P0.20.4 ${label}]`,error);}}
 private renderSafe(){this.safeFrame('render',()=>{if(this.runtimePostProcessing==='off')this.renderer.render(this.scene,this.camera);else this.composer.render();});}
 private animate=()=>{
  requestAnimationFrame(this.animate);try{const now=performance.now(),frameDt=Math.max(0,(now-this.last)/1000),dt=Math.min(.05,frameDt),guardDt=Math.min(.25,frameDt);this.last=now;this.time+=dt;this.frameCount++;this.fpsTime+=guardDt;if(this.fpsTime>1){this.fps=Math.round(this.frameCount/this.fpsTime);this.fpsTime=0;this.frameCount=0;}const scaled=this.dynamicResolution.update(dt,this.fps);if(scaled!==undefined)this.applyRenderScale(scaled);const adaptive=this.autoQuality?this.adaptiveQuality.update(dt,this.fps,this.graphics.preset):undefined;if(adaptive){console.info(`[AdaptiveQuality] ${this.graphics.preset} -> ${adaptive.preset}: ${adaptive.reason}`);this.applyGraphicsSettings({...GRAPHICS_PRESETS[adaptive.preset]},false);}this.monitorRuntimeQuality(guardDt);
  const self=this.snapshot?.self,hitStopActive=performance.now()<this.localHitStopUntil;if(!hitStopActive)this.localHitStopTarget=undefined;
  const runtimeStressed=this.fps<30,labelHz=runtimeStressed?8:this.graphics.modelDetail==='low'?8:this.graphics.modelDetail==='balanced'?14:20;this.labelTimer+=dt;const updateLabels=this.graphics.worldLabels&&this.labelTimer>=1/labelHz;if(updateLabels){this.labelTimer=0;this.labelPass++;}
  const smooth=1-Math.exp(-dt*16);this.renderFrame++;
  const modelRange=runtimeStressed?Math.min(48,this.graphics.modelDetail==='low'?45:this.graphics.modelDetail==='balanced'?80:160):this.graphics.modelDetail==='low'?45:this.graphics.modelDetail==='balanced'?80:160;
  const cadence=(d:number)=>runtimeStressed?(d>24?4:d>12?2:1):this.graphics.animationDetail==='high'?1:this.graphics.animationDetail==='balanced'?(d>38?2:1):(d>30?4:d>18?2:1);
  // P0.21.1: drive local actor directly from authoritative Snapshot.self every frame.
  if(self){const c=this.characters.get(self.id);if(c){c.root.visible=true;const beforeX=c.root.position.x,beforeZ=c.root.position.z,predictAge=Math.min(.32,Math.max(0,(performance.now()-this.snapshotReceivedAt)/1000)),px=self.x+Math.sin(self.angle)*self.speed*predictAge,pz=self.z+Math.cos(self.angle)*self.speed*predictAge,target=this.tempTarget.set(px,heightAt(px,pz)+(self.flight?4.25:0),pz),error=c.root.position.distanceTo(target),snapped=this.forceSelfSnap||error>60;if(snapped){c.root.position.copy(target);this.forceSelfSnap=false;}else{const correction=hitStopActive?0:error>8?1-Math.exp(-dt*6):error>3?1-Math.exp(-dt*10):smooth;c.root.position.lerp(target,correction);}c.root.rotation.y+=Math.atan2(Math.sin(self.angle-c.root.rotation.y),Math.cos(self.angle-c.root.rotation.y))*(hitStopActive?0:1-Math.exp(-(self.attack?24:10.5)*dt));const visualSpeed=renderedGroundSpeed({beforeX,beforeZ,afterX:c.root.position.x,afterZ:c.root.position.z,dt,authoritativeSpeed:self.speed,snapped,flight:!!self.flight});c.update(hitStopActive?0:dt,this.time,self,hitStopActive?0:visualSpeed);}}
  for(const p of this.snapshot?.players??[]){if(p.id===self?.id)continue;const c=this.characters.get(p.id);if(!c)continue;const d=self?distance(p,self):0;c.root.visible=p.id===self?.id||d<=modelRange;if(!c.root.visible)continue;const beforeX=c.root.position.x,beforeZ=c.root.position.z,target=this.tempTarget.set(p.x,heightAt(p.x,p.z)+(p.flight?4.25:0),p.z),remoteError=c.root.position.distanceTo(target),snapped=remoteError>12;if(snapped)c.root.position.copy(target);else c.root.position.lerp(target,smooth);c.root.rotation.y+=Math.atan2(Math.sin(p.angle-c.root.rotation.y),Math.cos(p.angle-c.root.rotation.y))*(1-Math.exp(-10.5*dt));const step=p.id===self?.id?1:cadence(d);if(this.renderFrame%step===0){const visualSpeed=renderedGroundSpeed({beforeX,beforeZ,afterX:c.root.position.x,afterZ:c.root.position.z,dt,authoritativeSpeed:p.speed,snapped,flight:!!p.flight});c.update(dt*step,this.time,p,visualSpeed);}if(updateLabels&&p.id!==self?.id)this.label(p.id,p.x,heightAt(p.x,p.z)+(p.flight?6.45:2.25),p.z,p.name,'player');}
  for(const m of this.snapshot?.monsters??[]){const c=this.monsters.get(m.id);if(!c)continue;const d=self?distance(m,self):0,targeted=m.id===self?.target,impactFrozen=hitStopActive&&m.id===this.localHitStopTarget;c.root.visible=targeted||d<=modelRange;if(!c.root.visible)continue;c.root.position.lerp(this.tempTarget.set(m.x,heightAt(m.x,m.z),m.z),impactFrozen?0:smooth);c.root.rotation.y+=Math.atan2(Math.sin(m.angle-c.root.rotation.y),Math.cos(m.angle-c.root.rotation.y))*(impactFrozen?0:Math.min(1,dt*10));const step=targeted?1:cadence(d);if(this.renderFrame%step===0)c.update(impactFrozen?0:dt*step,this.time,m,impactFrozen?0:m.speed);const def=MONSTERS[m.defId];if(updateLabels&&self&&m.hp>0&&d<38)this.label(m.id,m.x,heightAt(m.x,m.z)+monsterVisualHeight(def)*1.08,m.z,`${def.tier==='godbeast'?'【地圖王·神獸】 ':def.tier==='mutant'?'【異變】 ':''}${def.name}  ·  ${def.level}`,def.aiProfile==='boss'?'boss':'monster',targeted||d<12?m.hp/m.maxHp:undefined);}
  for(const n of NPCS){const c=this.npcs.get(n.id);if(!c)continue;const d=self?distance(n,self):0;c.root.visible=!self||d<=Math.max(65,modelRange);if(c.root.visible){const step=cadence(d);if(this.renderFrame%step===0)c.update(dt*step,this.time);}if(updateLabels&&(!self||d<25))this.label(n.id,n.x,heightAt(n.x,n.z)+2.33,n.z,n.name+' · '+n.role.split(' · ')[0],'npc');}
  if(self){const c=this.characters.get(self.id);const creatorY=this.creatorView==='face'?1.84:this.creatorView==='body'?1.18:1.13;if(c)this.follow.lerp(this.tempFollow.copy(c.root.position).add(this.tempOffset.set(0,creatorY,0)),1-Math.exp(-dt*7));const target=this.snapshot!.monsters.find(m=>m.id===self.target&&m.hp>0);this.selected.visible=!!target;if(target){this.selected.position.set(target.x,heightAt(target.x,target.z)+.07,target.z);const targetDef=MONSTERS[target.defId];this.selected.scale.setScalar(Math.max(targetDef.scale*1.15,monsterVisualHeight(targetDef)*.46));}
   if(updateLabels)for(const drop of this.snapshot!.drops)if(distance(drop,self)<20)this.label(drop.id,drop.x,heightAt(drop.x,drop.z)+.5,drop.z,ITEM_NAME(drop.item.baseId),'loot rarity-'+drop.item.rarity);
  }else{this.selected.visible=false;const loginDrift=Math.sin(this.time*.09)*.22;this.follow.lerp(this.tempFollow.copy(this.loginCameraAnchor),1-Math.exp(-dt*1.9));this.yaw+=(-.98+loginDrift-this.yaw)*(1-Math.exp(-dt*1.3));this.pitch+=(.29-this.pitch)*(1-Math.exp(-dt*1.7));this.zoom+=(15.6+Math.sin(this.time*.07)*.55-this.zoom)*(1-Math.exp(-dt*1.15));}
  if(updateLabels)for(const entry of this.labels.values())if(entry.seen!==this.labelPass)entry.el.style.display='none';
  const offset=this.tempOffset.set(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch)).multiplyScalar(this.zoom),direction=this.tempDirection.copy(offset).normalize();this.cameraProbeTimer+=dt;
  const cameraProbeHz=runtimeStressed?10:this.graphics.modelDetail==='low'?12:this.graphics.modelDetail==='balanced'?20:30;if(this.cameraProbeTimer>=1/cameraProbeHz||this.cameraDistance>this.zoom){this.cameraProbeTimer=0;this.raycaster.set(this.follow,direction);this.raycaster.far=this.zoom;const obstacle=this.raycaster.intersectObjects(this.world.collision,false)[0];this.cameraDistance=obstacle?Math.max(2,obstacle.distance-.4):this.zoom;this.raycaster.far=Infinity;}else this.cameraDistance=Math.min(this.cameraDistance,this.zoom);
  const desired=this.tempDesired.copy(this.follow).add(this.tempOffset.copy(direction).multiplyScalar(Math.min(this.zoom,this.cameraDistance)));desired.y=Math.max(desired.y,heightAt(desired.x,desired.z)+.8);const cameraDecay=Math.exp(-dt*20);this.cameraImpulseLateral*=cameraDecay;this.cameraImpulseVertical*=cameraDecay;this.cameraImpulseDepth*=cameraDecay;this.cameraFovKick*=Math.exp(-dt*15);desired.x+=Math.cos(this.yaw)*this.cameraImpulseLateral+Math.sin(this.yaw)*this.cameraImpulseDepth;desired.z+=-Math.sin(this.yaw)*this.cameraImpulseLateral+Math.cos(this.yaw)*this.cameraImpulseDepth;desired.y+=this.cameraImpulseVertical;const combatFov=48+this.cameraFovKick;if(Math.abs(this.camera.fov-combatFov)>.004){this.camera.fov=combatFov;this.camera.updateProjectionMatrix();}this.camera.position.lerp(desired,1-Math.exp(-dt*15));this.camera.lookAt(this.follow);
  this.safeFrame('world',()=>this.world.update(self??WORLD.spawn,this.time));this.safeFrame('fx',()=>this.fx.update(dt,this.time));updateCinematicGrade(this.cinematicGrade,this.time);this.marker.visible=this.time<this.markerUntil;this.marker.rotation.z+=dt;const uiHz=runtimeStressed?18:this.graphics.modelDetail==='low'?20:30;this.uiFrameTime+=dt;if(this.uiFrameTime>=1/uiHz){const uiDt=this.uiFrameTime;this.uiFrameTime=0;this.safeFrame('ui',()=>this.ui.frame(uiDt,this.time));}this.renderSafe();}catch(error){this.frameErrors++;this.lastFrameError=error instanceof Error?error.message:String(error);if(this.frameErrors<=12||this.frameErrors%120===0)console.error('[P0.20.4 FrameGuard]',error);this.renderSafe();}
 };
}
import { ITEMS } from '../../shared/data/equipment';
const ITEM_NAME=(id:string)=>ITEMS[id]?.name??id;
