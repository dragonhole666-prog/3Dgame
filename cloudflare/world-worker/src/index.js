import { DurableObject } from 'cloudflare:workers';
import { GameWorld } from '../../../server/world.ts';
import { migrateSave,SAVE_VERSION } from '../../../server/migrations.ts';
import { ITEMS } from '../../../src/shared/data/equipment.ts';
import { refreshStats, repairIllegalHandLoadout } from '../../../src/shared/domains/equipment.ts';
import { walkable } from '../../../src/shared/data/world.ts';
import { exportContent } from '../../../src/shared/data/content.ts';
import { parseCommand } from '../../../src/shared/protocol/command-schema.ts';
import { BUILD_RELEASE } from '../../../src/shared/build-info.ts';
import { FULL_SAVE_TICKS,NETWORK_POLICY,NETWORK_SNAPSHOT_SCOPE,SIMULATION_INTERVAL_MS,SIMULATION_STEP,commandRequiresPersistence,shouldSendSnapshot } from '../../../src/shared/network/network-policy.ts';
import { characterNameKey,validateCharacterName } from '../../../src/shared/identity/character-name.ts';

function token(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function isLocalOrigin(origin){
 if(!origin)return true;
 try{const u=new URL(origin);return (u.hostname==='localhost'||u.hostname==='127.0.0.1')&&(u.protocol==='http:'||u.protocol==='https:');}catch{return false;}
}
function allowedOrigin(origin,env,requestUrl=''){
 if(isLocalOrigin(origin))return true;
 if(!origin)return true;
 try{
  const u=new URL(origin);
  if(u.protocol!=='https:')return false;
  if(requestUrl){
   const target=new URL(requestUrl);
   if(u.host.toLowerCase()===target.host.toLowerCase())return true;
  }
  const suffix=String(env.PUBLIC_ORIGIN_SUFFIX||'').trim().toLowerCase();
  return suffix.length>0&&u.hostname.toLowerCase().endsWith(suffix);
 }catch{return false;}
}
function cors(origin){
 const h=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(origin)h.set('Access-Control-Allow-Origin',origin);
 h.set('Vary','Origin');h.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type,X-Qinglan-Art-Token');
 return h;
}
function json(data,status=200,origin=''){
 const h=cors(origin);h.set('Content-Type','application/json; charset=utf-8');
 return new Response(JSON.stringify(data),{status,headers:h});
}

export class QinglanWorld extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.ctx=ctx;this.env=env;this.world=new GameWorld();this.tokens={};this.clients=new Map();this.ticks=0;this.timer=undefined;this.savePromise=undefined;this.saveDirty=false;this.session=crypto.randomUUID();
  this.ctx.blockConcurrencyWhile(async()=>this.restore());
 }
 async restore(){
  const raw=await this.ctx.storage.get('world');if(!raw)return;
  const saved=migrateSave(raw);this.tokens=saved.tokens||{};
  for(const p of saved.players||[]){
   p.inventory=p.inventory.filter(i=>ITEMS[i.baseId]);
   for(const [slot,item] of Object.entries(p.equipment))if(item&&!ITEMS[item.baseId])delete p.equipment[slot];
   p.online=false;p.flight=false;p.input={x:0,z:0,sprint:false};p.path=[];p.attack=undefined;p.target=undefined;p.autoAttack=false;p.queuedSkill=undefined;p.bufferedSkill=undefined;p.bufferedTarget=undefined;p.cooldowns={};p.hitAt=0;p.staggerUntil=0;p.jumpAt=-10;p.state=p.hp>0?'Idle':'Dead';
   if(Number.isFinite(p.x)&&Number.isFinite(p.z)&&!walkable({x:p.x,z:p.z})){p.x=0;p.z=0;}
   repairIllegalHandLoadout(p);refreshStats(p);this.world.players.set(p.id,p);
  }
  this.world.economy.listings=(saved.listings||[]).filter(l=>ITEMS[l.item.baseId]&&this.world.players.has(l.seller));
 }
 worldSave(){return {saveVersion:SAVE_VERSION,tokens:this.tokens,players:[...this.world.players.values()],listings:this.world.economy.listings};}
 save(){
  this.saveDirty=true;if(this.savePromise)return this.savePromise;
  this.savePromise=(async()=>{while(this.saveDirty){this.saveDirty=false;await this.ctx.storage.put('world',this.worldSave());}})().catch(error=>console.error('[CloudPersistence]',error)).finally(()=>{this.savePromise=undefined;if(this.saveDirty)void this.save();});
  return this.savePromise;
 }
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/health')return json({status:'ok',app:'qinglan-realms-cloud',release:BUILD_RELEASE,players:[...this.world.players.values()].filter(p=>p.online).length,monsters:this.world.monsters.size},200,request.headers.get('Origin')||'');
  if(url.pathname!=='/socket')return new Response('Not found',{status:404});
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Expected Upgrade: websocket',{status:426});
  const [client,server]=Object.values(new WebSocketPair());server.accept();
  const state={id:undefined,seq:0,count:0,window:Date.now(),lastSeen:Date.now(),lastEventId:this.world.latestEventId()};this.clients.set(server,state);
  server.addEventListener('message',event=>this.onMessage(server,state,event.data));
  server.addEventListener('close',event=>{void this.onClose(server,state,event.code,event.reason);});
  server.addEventListener('error',()=>{void this.onClose(server,state,1011,'WebSocket error');});
  this.startLoop();
  return new Response(null,{status:101,webSocket:client});
 }
 onMessage(ws,state,raw){
  if(Date.now()-state.window>1000){state.window=Date.now();state.count=0;}if(++state.count>NETWORK_POLICY.commandRateLimitPerSecond){ws.close(1008,'Rate limit');return;}
  try{
   const text=typeof raw==='string'?raw:new TextDecoder().decode(raw),message=JSON.parse(text);state.lastSeen=Date.now();
   if(message.type==='syncProbe'&&!state.id){
    const probeId=`probe-${crypto.randomUUID()}`;
    try{this.world.createPlayer(probeId,'__QINGLAN_SYNC_PROBE__');ws.send(JSON.stringify({type:'syncProbe',release:BUILD_RELEASE,data:this.world.snapshot(probeId,[],NETWORK_SNAPSHOT_SCOPE)}));}
    catch(error){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,text:`世界快照自我測試失敗：${error instanceof Error?error.message:String(error)}`}));}
    finally{this.world.players.delete(probeId);}return;
   }
   if(message.type==='join'&&!state.id){
    if(message.release&&message.release!==BUILD_RELEASE){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,text:`版本不一致：client=${message.release} server=${BUILD_RELEASE}`}));ws.close(1008,'Release mismatch');return;}
    const mode=message.mode==='create'?'create':message.mode==='resume'?'resume':'legacy';
    let id,browserToken='';
    if(mode==='create'){
     const validated=validateCharacterName(message.name);
     if(!validated.ok){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:validated.code,text:validated.message}));return;}
     const collision=[...this.world.players.values()].find(p=>characterNameKey(p.name)===validated.key);
     if(collision){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:'CHARACTER_NAME_TAKEN',text:'此角色名稱已被使用，請換一個名稱。'}));return;}
     id=crypto.randomUUID();browserToken=token();this.tokens[browserToken]=id;this.world.createPlayer(id,validated.name);
    }else{
     const supplied=typeof message.token==='string'?message.token:'';id=this.tokens[supplied];browserToken=supplied;
     if(id&&!this.world.players.has(id)){delete this.tokens[supplied];id=undefined;browserToken='';}
     if(!id){
      if(mode==='resume'){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:'CHARACTER_SESSION_INVALID',text:'此角色登入憑證已失效，請建立新角色或選擇其他角色。'}));return;}
      const validated=validateCharacterName(message.name);
      if(!validated.ok){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:validated.code,text:validated.message}));return;}
      const collision=[...this.world.players.values()].find(p=>characterNameKey(p.name)===validated.key);
      if(collision){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:'CHARACTER_NAME_TAKEN',text:'此角色名稱已被使用，請更新客戶端後從角色列表登入。'}));return;}
      id=crypto.randomUUID();browserToken=token();this.tokens[browserToken]=id;this.world.createPlayer(id,validated.name);
     }
    }
    for(const [other,otherState] of this.clients)if(other!==ws&&otherState.id===id){try{other.close(4009,'此角色已在另一個裝置或視窗登入');}catch{}this.clients.delete(other);}
    state.id=id;const player=this.world.players.get(id);if(!player){state.id=undefined;ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,text:'角色資料不存在，請重新登入。'}));return;}player.online=true;
    ws.send(JSON.stringify({type:'joined',release:BUILD_RELEASE,session:this.session,id,token:browserToken,name:player.name}));
    state.lastEventId=this.world.latestEventId();ws.send(JSON.stringify({type:'snapshot',release:BUILD_RELEASE,session:this.session,ack:state.seq,data:this.world.snapshot(id,[],NETWORK_SNAPSHOT_SCOPE)}));void this.save();return;
   }
   if(message.type==='command'&&state.id&&Number.isSafeInteger(message.seq)&&message.seq>state.seq&&message.seq<1e12){
    const parsed=parseCommand(message.command);if(!parsed.ok){ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:parsed.error.code,field:parsed.error.field,text:`操作格式錯誤：${parsed.error.message}`}));return;}
    state.seq=message.seq;this.world.command(state.id,parsed.command);if(commandRequiresPersistence(parsed.command.type))void this.save();
   }
  }catch(error){console.error('[CloudProtocol]',error);try{ws.send(JSON.stringify({type:'error',release:BUILD_RELEASE,code:'MESSAGE_PROCESSING_FAILED',text:`無法讀取此操作：${error instanceof Error?error.message:'未知錯誤'}`}));}catch{}}
 }
 async onClose(ws,state,code,reason){
  if(!this.clients.has(ws))return;this.clients.delete(ws);if(state.id){this.world.disconnect(state.id);await this.save();}
  if(this.clients.size===0&&this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}
 }
 startLoop(){if(this.timer!==undefined)return;const step=()=>{
  this.timer=undefined;if(this.clients.size===0)return;
  try{this.world.tick(SIMULATION_STEP);}catch(error){console.error('[CloudWorldTick]',error);}this.ticks++;
  for(const [ws,state] of this.clients){if(!state.id||ws.readyState!==WebSocket.OPEN)continue;const bufferedBytes=Number.isFinite(ws.bufferedAmount)?ws.bufferedAmount:0;if(!shouldSendSnapshot(this.ticks,bufferedBytes))continue;if(!this.world.players.has(state.id)){try{ws.close(1011,'角色資料遺失');}catch{}continue;}try{const pendingEvents=this.world.eventsAfter(state.lastEventId);ws.send(JSON.stringify({type:'snapshot',release:BUILD_RELEASE,session:this.session,ack:state.seq,data:this.world.snapshot(state.id,pendingEvents,NETWORK_SNAPSHOT_SCOPE)}));state.lastEventId=this.world.latestEventId();}catch(error){console.error('[CloudSnapshot]',error);}}
  if(this.ticks%FULL_SAVE_TICKS===0)void this.save();this.timer=setTimeout(step,SIMULATION_INTERVAL_MS);
 };this.timer=setTimeout(step,SIMULATION_INTERVAL_MS);}
}


function cleanBase64Image(value){
 if(typeof value!=='string')return '';
 const marker='base64,';const at=value.indexOf(marker);return (at>=0?value.slice(at+marker.length):value).replace(/\s+/g,'');
}
function clampNumber(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function requireArtToken(request,env){
 const configured=String(env.ART_PIPELINE_TOKEN||'');
 if(!configured)return {ok:false,response:json({error:'AI art pipeline is not configured. Set ART_PIPELINE_TOKEN with wrangler secret put ART_PIPELINE_TOKEN.'},503,request.headers.get('Origin')||'')};
 const supplied=String(request.headers.get('X-Qinglan-Art-Token')||'');
 if(!supplied||supplied!==configured)return {ok:false,response:json({error:'Unauthorized AI art pipeline request.'},401,request.headers.get('Origin')||'')};
 return {ok:true};
}
async function parseSmallJson(request,maxBytes=12_000_000){
 const length=Number(request.headers.get('Content-Length')||0);if(length>maxBytes)throw new Error('request too large');
 const text=await request.text();if(text.length>maxBytes)throw new Error('request too large');return JSON.parse(text||'{}');
}
function aiImageHeaders(origin,contentType='image/png'){const h=cors(origin);h.set('Content-Type',contentType);h.set('Cache-Control','no-store');return h;}
async function handleStyleTransfer(request,env,origin){
 const auth=requireArtToken(request,env);if(!auth.ok)return auth.response;
 try{
  const body=await parseSmallJson(request),image_b64=cleanBase64Image(body.imageB64||body.image_b64);
  if(!image_b64)return json({error:'imageB64 is required'},400,origin);
  const prompt=String(body.prompt||'commercial cinematic Chinese xianxia fantasy drama, premium art direction, deep teal shadows, warm coral maple highlights, realistic PBR materials, layered volumetric mist, filmic lighting, detailed environment, no low-poly look').slice(0,2048);
  const negative_prompt=String(body.negativePrompt||body.negative_prompt||'low poly, flat shading, pastel toy colors, plastic material, cheap mobile game, oversaturated primary colors, washed out, empty background, cartoon primitive geometry').slice(0,2048);
  const result=await env.AI.run(String(env.ART_STYLE_MODEL||'@cf/stabilityai/stable-diffusion-xl-base-1.0'),{
   prompt,negative_prompt,image_b64,
   width:Math.round(clampNumber(body.width,512,1536,1024)),height:Math.round(clampNumber(body.height,512,1536,1024)),
   num_steps:Math.round(clampNumber(body.steps,4,20,20)),strength:clampNumber(body.strength,.2,.82,.45),guidance:clampNumber(body.guidance,3,12,7.5),
   seed:Math.max(0,Math.round(clampNumber(body.seed,0,2**31-1,1337)))
  });
  return new Response(result,{status:200,headers:aiImageHeaders(origin,'image/png')});
 }catch(error){return json({error:'AI style transfer failed',detail:error instanceof Error?error.message:String(error)},500,origin);}
}
async function handleTextureGeneration(request,env,origin){
 const auth=requireArtToken(request,env);if(!auth.ok)return auth.response;
 try{
  const body=await parseSmallJson(request,1_000_000);
  const prompt=String(body.prompt||'seamless tileable PBR material texture, commercial Chinese xianxia fantasy game, flat albedo, physically plausible material, no perspective, no object, no text, no lighting baked into texture, no border').slice(0,2048);
  const negative_prompt=String(body.negativePrompt||'object, perspective, horizon, text, logo, frame, strong shadow, dramatic lighting baked into texture, low poly, cartoon, toy, oversaturated primary colors').slice(0,2048);
  const result=await env.AI.run(String(env.ART_TEXTURE_MODEL||'@cf/stabilityai/stable-diffusion-xl-base-1.0'),{prompt,negative_prompt,width:Math.round(clampNumber(body.width,512,1024,1024)),height:Math.round(clampNumber(body.height,512,1024,1024)),num_steps:Math.round(clampNumber(body.steps,4,20,20)),guidance:clampNumber(body.guidance,3,12,7.5),seed:Math.max(0,Math.round(clampNumber(body.seed,0,2**31-1,2026)))});
  return new Response(result,{status:200,headers:aiImageHeaders(origin,'image/png')});
 }catch(error){return json({error:'AI texture generation failed',detail:error instanceof Error?error.message:String(error)},500,origin);}
}

export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return allowedOrigin(origin,env,request.url)?new Response(null,{status:204,headers:cors(origin)}):new Response(null,{status:403});
  if(!allowedOrigin(origin,env,request.url))return json({error:'Origin not allowed'},403,origin);
  if(url.pathname==='/api/release'&&request.method==='GET')return json({status:'ok',app:'qinglan-realms-worker',release:BUILD_RELEASE},200,origin);
  if(url.pathname==='/api/art/style-transfer'&&request.method==='POST')return handleStyleTransfer(request,env,origin);
  if(url.pathname==='/api/art/generate-texture'&&request.method==='POST')return handleTextureGeneration(request,env,origin);
  if(url.pathname==='/api/game-content'&&request.method==='GET')return json({content:exportContent()},200,origin);
  if(url.pathname==='/health'&&request.method==='GET')return env.QINGLAN_WORLD.getByName(env.WORLD_NAME||'global').fetch(new Request('https://qinglan.internal/health',{headers:origin?{Origin:origin}:{}}));
  if(url.pathname==='/socket'&&request.method==='GET'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Expected Upgrade: websocket',{status:426});
   return env.QINGLAN_WORLD.getByName(env.WORLD_NAME||'global').fetch(request);
  }
  return json({error:'Not found'},404,origin);
 }
};
