import { createServer } from 'node:http';
import { readFileSync,existsSync } from 'node:fs';
import { resolve,extname,sep } from 'node:path';
import { WebSocketServer,WebSocket } from 'ws';
import { randomBytes,randomUUID } from 'node:crypto';
import { GameWorld } from './world';
import { Persistence } from './persistence';
import { applyContent,exportContent,validateContent,type ContentPack } from '../src/shared/data/content';
import { NavigationDomain } from '../src/shared/domains/navigation';
import { BUILD_RELEASE } from '../src/shared/build-info';
import { parseCommand } from '../src/shared/protocol/command-schema';
import { analyzeEquipmentGlb,createImportedEquipmentRecords,persistImportedEquipmentAsset,syncEditorEquipmentRegistry } from './equipment-import';
import { FULL_SAVE_TICKS,NETWORK_POLICY,NETWORK_SNAPSHOT_SCOPE,POSITION_CHECKPOINT_TICKS,SIMULATION_INTERVAL_MS,SIMULATION_STEP,shouldSendSnapshot,commandRequiresPersistence } from '../src/shared/network/network-policy';
import { characterNameKey,validateCharacterName } from '../src/shared/identity/character-name';
const persistence=new Persistence();const savedContent=persistence.read<ContentPack>('content');if(savedContent){validateContent(savedContent);applyContent(savedContent);}
const world=new GameWorld();persistence.restore(world);
const RELEASE=BUILD_RELEASE;
const SERVER_SESSION=randomUUID();
const port=Number(process.env.PORT??8787),editorKey=randomBytes(24).toString('hex');
const localOrigin=(origin:string|undefined)=>!origin||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const localHost=(host:string|undefined)=>!!host&&/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
const publicOriginSuffix=(process.env.QINGLAN_PUBLIC_ORIGIN_SUFFIX??'').trim().toLowerCase();
const allowedOrigin=(origin:string|undefined)=>{
 if(localOrigin(origin))return true;
 if(!origin||!publicOriginSuffix)return false;
 try{const parsed=new URL(origin);return parsed.protocol==='https:'&&parsed.hostname.toLowerCase().endsWith(publicOriginSuffix);}catch{return false;}
};
const localEditorRequest=(host:string|undefined,origin:string|undefined)=>localHost(host)&&localOrigin(origin);
const server=createServer(async(req,res)=>{
 const url=new URL(req.url??'/','http://localhost');res.setHeader('X-Content-Type-Options','nosniff');
 const json=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(!allowedOrigin(req.headers.origin)){json(403,{error:'Local origin required'});return;}
 if(url.pathname==='/health'){json(200,{status:'ok',app:'qinglan-realms',release:RELEASE,players:[...world.players.values()].filter(p=>p.online).length,monsters:world.monsters.size});return;}
 if(url.pathname==='/api/game-content'&&req.method==='GET'){json(200,{content:exportContent()});return;}
 if(url.pathname==='/api/content'&&req.method==='GET'){
  if(!localEditorRequest(req.headers.host,req.headers.origin)){json(403,{error:'Editor API is local-only in public test mode.'});return;}
  json(200,{content:exportContent(),editorKey});return;
 }
 if(url.pathname==='/api/content'&&req.method==='PUT'){
  if(!localEditorRequest(req.headers.host,req.headers.origin)){json(403,{error:'Editor API is local-only in public test mode.'});return;}
  if(req.headers['x-editor-key']!==editorKey){json(403,{error:'請重新開啟本地編輯器。'});return;}
  try{let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>3e6)throw new Error('內容過大。');}const content=JSON.parse(body) as ContentPack;validateContent(content);syncEditorEquipmentRegistry(content);
   persistence.backup('content');persistence.write('content',content);applyContent(content);world.navigation=new NavigationDomain();world.spawnMonsters();
   for(const client of clients.keys())client.send(JSON.stringify({type:'contentUpdated'}));json(200,{ok:true});
  }catch(e){json(400,{error:e instanceof Error?e.message:'儲存失敗'});}return;
 }
 if(url.pathname==='/api/editor/import-equipment'&&req.method==='POST'){
  if(!localEditorRequest(req.headers.host,req.headers.origin)){json(403,{error:'裝備 GLB 匯入僅允許本機編輯器。'});return;}
  if(req.headers['x-editor-key']!==editorKey){json(403,{error:'請重新開啟本地編輯器。'});return;}
  try{
   const encoded=String(req.headers['x-file-name']??'equipment.glb'),fileName=decodeURIComponent(encoded);if(!/\.glb$/i.test(fileName))throw new Error('請選擇 .glb 裝備檔案。');
   const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=data.length;if(bytes>100*1024*1024)throw new Error('GLB 超過 100 MB 匯入上限。');chunks.push(data);}if(bytes<20)throw new Error('GLB 檔案內容為空或不完整。');
   const buffer=Buffer.concat(chunks),analysis=analyzeEquipmentGlb(buffer,fileName),content=exportContent(),created=createImportedEquipmentRecords(content,analysis);content.items[created.id]=created.item;content.appearances[created.appearance.id]=created.appearance;content.dataVersion=(content.dataVersion??1)+1;validateContent(content);
   persistImportedEquipmentAsset(buffer,created.id,analysis);syncEditorEquipmentRegistry(content);persistence.backup('content');persistence.write('content',content);applyContent(content);
   for(const client of clients.keys())client.send(JSON.stringify({type:'contentUpdated'}));json(200,{ok:true,itemId:created.id,content,fit:{slot:analysis.slot,confidence:analysis.confidence,strategy:analysis.strategy,bodyFit:analysis.bodyFit,hasSkin:analysis.hasSkin,morphTargetBindings:analysis.morphTargetBindings,signals:analysis.signals}});
  }catch(e){json(400,{error:e instanceof Error?e.message:'GLB 匯入失敗'});}return;
 }
 const root=resolve('dist');let pathname:string;try{pathname=decodeURIComponent(url.pathname);}catch{json(400,{error:'Bad path'});return;}
 if((pathname==='/editor'||pathname.startsWith('/editor/'))&&!localEditorRequest(req.headers.host,req.headers.origin)){json(403,{error:'World editor is local-only in public test mode.'});return;}
 const path=resolve(root,'.'+pathname);if(path!==root&&!path.startsWith(root+sep)){json(403,{error:'Forbidden'});return;}
 const file=extname(path)?path:resolve(root,'index.html');if(!existsSync(file)){json(404,{error:'請執行 npm run build，或使用 http://127.0.0.1:5173'});return;}
 const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
 res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(readFileSync(file));
});
const wss=new WebSocketServer({server,path:'/socket',maxPayload:16*1024});
const clients=new Map<WebSocket,{id?:string;seq:number;count:number;window:number;lastSeen:number;lastEventId:number}>();
wss.on('connection',(ws,req)=>{
 if(!allowedOrigin(req.headers.origin)){ws.close(1008);return;}
 const client={id:undefined as string|undefined,seq:0,count:0,window:Date.now(),lastSeen:Date.now(),lastEventId:world.latestEventId()};clients.set(ws,client);
 ws.on('message',raw=>{
  if(Date.now()-client.window>1000){client.window=Date.now();client.count=0;}if(++client.count>NETWORK_POLICY.commandRateLimitPerSecond){ws.close(1008,'Rate limit');return;}
  try{
   const message=JSON.parse(raw.toString());client.lastSeen=Date.now();
   if(message.type==='syncProbe'&&!client.id){
    const probeId=`probe-${randomUUID()}`;
    try{world.createPlayer(probeId,'__QINGLAN_SYNC_PROBE__');const payload=JSON.stringify({type:'syncProbe',release:RELEASE,data:world.snapshot(probeId,[],NETWORK_SNAPSHOT_SCOPE)});ws.send(payload);}
    catch(error){ws.send(JSON.stringify({type:'error',release:RELEASE,text:`世界快照自我測試失敗：${error instanceof Error?error.message:String(error)}`}));}
    finally{world.players.delete(probeId);}
    return;
   }
   if(message.type==='join'&&!client.id){
    if(message.release&&message.release!==RELEASE){ws.send(JSON.stringify({type:'error',release:RELEASE,text:`版本不一致：client=${message.release} server=${RELEASE}`}));ws.close(1008,'Release mismatch');return;}
    const mode=message.mode==='create'?'create':message.mode==='resume'?'resume':'legacy';
    let id:string|undefined,token='';
    if(mode==='create'){
     const validated=validateCharacterName(message.name);
     if(!validated.ok){ws.send(JSON.stringify({type:'error',release:RELEASE,code:validated.code,text:validated.message}));return;}
     const collision=[...world.players.values()].find(p=>characterNameKey(p.name)===validated.key);
     if(collision){ws.send(JSON.stringify({type:'error',release:RELEASE,code:'CHARACTER_NAME_TAKEN',text:'此角色名稱已被使用，請換一個名稱。'}));return;}
     id=randomUUID();token=randomBytes(32).toString('hex');persistence.tokens[token]=id;world.createPlayer(id,validated.name);
    }else{
     const supplied=typeof message.token==='string'?message.token:'';id=persistence.tokens[supplied];token=supplied;
     // HF17: resume is token-authoritative; typed names can no longer silently select or rename a character.
     if(id&&!world.players.has(id)){delete persistence.tokens[supplied];id=undefined;token='';}
     if(!id){
      if(mode==='resume'){ws.send(JSON.stringify({type:'error',release:RELEASE,code:'CHARACTER_SESSION_INVALID',text:'此角色登入憑證已失效，請建立新角色或選擇其他角色。'}));return;}
      // Backward compatibility for older clients that have not yet sent an explicit join mode.
      const validated=validateCharacterName(message.name);
      if(!validated.ok){ws.send(JSON.stringify({type:'error',release:RELEASE,code:validated.code,text:validated.message}));return;}
      const collision=[...world.players.values()].find(p=>characterNameKey(p.name)===validated.key);
      if(collision){ws.send(JSON.stringify({type:'error',release:RELEASE,code:'CHARACTER_NAME_TAKEN',text:'此角色名稱已被使用，請更新客戶端後從角色列表登入。'}));return;}
      id=randomUUID();token=randomBytes(32).toString('hex');persistence.tokens[token]=id;world.createPlayer(id,validated.name);
     }
    }
    if(!id||!token){ws.send(JSON.stringify({type:'error',release:RELEASE,code:'CHARACTER_SESSION_INVALID',text:'角色登入狀態不完整，請重新選擇角色。'}));return;}
    for(const [other,c] of clients)if(c.id===id&&other!==ws){other.close(4009,'此角色已在另一個裝置或視窗登入');clients.delete(other);}
    client.id=id;const player=world.players.get(id);if(!player){ws.send(JSON.stringify({type:'error',release:RELEASE,text:'角色資料不存在，請重新登入。'}));client.id=undefined;return;}player.online=true;
    // P0.21.1: join and first snapshot are one atomic handoff. The UI must never wait for the interval loop for initial world state.
    ws.send(JSON.stringify({type:'joined',release:RELEASE,session:SERVER_SESSION,id,token,name:player.name}));
    client.lastEventId=world.latestEventId();ws.send(JSON.stringify({type:'snapshot',release:RELEASE,session:SERVER_SESSION,ack:client.seq,data:world.snapshot(id,[],NETWORK_SNAPSHOT_SCOPE)}));
    persistence.save(world);return;
   }
   if(message.type==='command'&&client.id&&Number.isSafeInteger(message.seq)&&message.seq>client.seq&&message.seq<1e12){
    const parsed=parseCommand(message.command);
    if(!parsed.ok){console.warn('[Protocol] rejected command',{client:client.id,seq:message.seq,error:parsed.error});ws.send(JSON.stringify({type:'error',release:RELEASE,code:parsed.error.code,field:parsed.error.field,text:`操作格式錯誤：${parsed.error.message}`}));return;}
    client.seq=message.seq;world.command(client.id,parsed.command);
    if(commandRequiresPersistence(parsed.command.type))persistence.save(world);
   }
  }catch(error){console.error('[Protocol] message handling failed',error);ws.send(JSON.stringify({type:'error',release:RELEASE,code:'MESSAGE_PROCESSING_FAILED',text:`無法讀取此操作：${error instanceof Error?error.message:'未知錯誤'}`}));}
 });
 ws.on('close',()=>{if(clients.has(ws)&&client.id){world.disconnect(client.id);persistence.save(world);}clients.delete(ws);});
});
let ticks=0;const interval=setInterval(()=>{
 try{world.tick(SIMULATION_STEP);}catch(error){console.error('[WorldTick]',error);return;}ticks++;
 for(const [ws,c] of clients){
  if(!c.id||ws.readyState!==WebSocket.OPEN)continue;
  const bufferedBytes=ws.bufferedAmount;
  if(!shouldSendSnapshot(ticks,bufferedBytes))continue;
  if(!world.players.has(c.id)){console.error('[Snapshot] missing player for connected client',c.id);ws.close(1011,'角色資料遺失');continue;}
  try{const pendingEvents=world.eventsAfter(c.lastEventId);const payload=JSON.stringify({type:'snapshot',release:RELEASE,session:SERVER_SESSION,ack:c.seq,data:world.snapshot(c.id,pendingEvents,NETWORK_SNAPSHOT_SCOPE)});ws.send(payload);c.lastEventId=world.latestEventId();}
  catch(error){console.error('[Snapshot] send failed',c.id,error);try{ws.send(JSON.stringify({type:'error',release:RELEASE,text:`世界快照送出失敗：${error instanceof Error?error.message:String(error)}`}));}catch{}}
 }
 if(ticks%POSITION_CHECKPOINT_TICKS===0)persistence.checkpointPositions(world);
 if(ticks%FULL_SAVE_TICKS===0){try{persistence.save(world);}catch(error){console.error('[Persistence]',error);}}
},SIMULATION_INTERVAL_MS);
server.listen(port,'127.0.0.1',()=>console.log(`青嵐志 world ready at http://127.0.0.1:${port} · local editor /editor`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{clearInterval(interval);persistence.save(world);for(const ws of clients.keys())ws.close();server.close(()=>process.exit(0));});
