import type { Command,Snapshot } from '../../shared/types';
import { BUILD_RELEASE } from '../../shared/build-info';
import { socketEndpoints } from './runtime-endpoints';
import { NETWORK_POLICY,reconnectDelayMs } from '../../shared/network/network-policy';

function validSnapshot(value:unknown):value is Snapshot{
 const s=value as Partial<Snapshot>|null;
 return !!s&&typeof s==='object'&&!!s.self&&typeof s.self.id==='string'&&Number.isFinite(s.time)
  &&Array.isArray(s.players)&&Array.isArray(s.monsters)&&Array.isArray(s.drops)&&Array.isArray(s.events)&&Array.isArray(s.listings);
}

type CharacterJoinRequest=
 | {mode:'create';name:string}
 | {mode:'resume';token:string};

const CHARACTER_LOGIN_ERROR_CODES=new Set([
 'CHARACTER_NAME_REQUIRED','CHARACTER_NAME_LENGTH','CHARACTER_NAME_INVALID','CHARACTER_NAME_RESERVED','CHARACTER_NAME_TAKEN','CHARACTER_SESSION_INVALID','CHARACTER_SESSION_REPLACED'
]);

export class Connection {
 private socket?:WebSocket;private sequence=0;private joinRequest?:CharacterJoinRequest;private reconnect=0;private joinTimer=0;private endpointIndex=0;private synced=false;private pending:Command[]=[];private attempt=0;private reconnectAttempt=0;private lastMessageAt=0;id='';activeToken='';
 onSnapshot=(s:Snapshot)=>{};onStatus=(s:string)=>{};onContent=()=>{};onError=(s:string)=>{};onLoginRejected=(s:string,code:string)=>{};onSession=(id:string,session:string,token:string,name?:string)=>{};
 constructor(){
  window.addEventListener('online',()=>this.resumeAfterLifecycle(true));
  window.addEventListener('pageshow',event=>this.resumeAfterLifecycle((event as PageTransitionEvent).persisted));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.resumeAfterLifecycle(false);});
 }
 private endpoints(){return socketEndpoints();}
 private resumeAfterLifecycle(force=false){
  if(!this.joinRequest||typeof navigator!=='undefined'&&!navigator.onLine)return;
  const open=this.socket?.readyState===WebSocket.OPEN,stale=!this.lastMessageAt||Date.now()-this.lastMessageAt>NETWORK_POLICY.resumeStaleMs;
  if(open&&this.synced&&!stale&&!force)return;
  this.onStatus(stale?'裝置已恢復，正在重新同步角色…':'網路已恢復，正在重新連線…');this.reconnectAttempt=0;this.beginCycle();
 }
 connectCreate(name:string){this.joinRequest={mode:'create',name};this.activeToken='';this.reconnectAttempt=0;this.beginCycle();}
 connectCharacter(token:string){this.joinRequest={mode:'resume',token};this.activeToken=token;this.reconnectAttempt=0;this.beginCycle();}
 /** Backward-compatible alias. New UI should call connectCreate explicitly. */
 connect(name:string){this.connectCreate(name);}
 private beginCycle(){this.endpointIndex=0;this.synced=false;this.id='';clearTimeout(this.reconnect);clearTimeout(this.joinTimer);try{this.socket?.close(1000);}catch{}this.openEndpoint();}
 private scheduleReconnect(message='連線中斷，正在重連…'){if(!this.joinRequest)return;if(typeof navigator!=='undefined'&&!navigator.onLine){this.onStatus('目前網路離線；恢復連線後會自動續登目前角色。');clearTimeout(this.reconnect);return;}this.onStatus(message);clearTimeout(this.reconnect);const delay=reconnectDelayMs(this.reconnectAttempt++);this.reconnect=window.setTimeout(()=>this.beginCycle(),delay);}
 private openEndpoint(){const urls=this.endpoints();const url=urls[Math.min(this.endpointIndex,urls.length-1)];this.synced=false;this.id='';this.onStatus(`正在連線… ${url}`);let opened=false;
  const attempt=++this.attempt;let socket:WebSocket;
  try{socket=new WebSocket(url);this.socket=socket;}catch(error){this.tryFallback(`WebSocket 建立失敗：${String(error)}`);return;}
  const current=()=>this.socket===socket&&this.attempt===attempt;
  socket.onopen=()=>{if(!current())return;opened=true;this.sequence=0;const request=this.joinRequest;if(!request){this.rejectLogin('尚未選擇角色。','CHARACTER_SESSION_INVALID');return;}this.onStatus(request.mode==='create'?`正在建立角色… ${url}`:`正在同步角色… ${url}`);socket.send(JSON.stringify({...request,type:'join',release:BUILD_RELEASE}));clearTimeout(this.joinTimer);this.joinTimer=window.setTimeout(()=>{if(current()&&!this.synced)this.tryFallback(`${Math.round(NETWORK_POLICY.joinTimeoutMs/1000)} 秒內沒有收到世界快照：${url}`);},NETWORK_POLICY.joinTimeoutMs);};
  socket.onmessage=e=>{if(!current())return;this.lastMessageAt=Date.now();
   let message:any;
   try{message=JSON.parse(e.data);}catch(error){this.onError(`伺服器訊息 JSON 解析失敗：${String(error)}`);return;}
   try{
    if(message.release&&message.release!==BUILD_RELEASE){this.tryFallback(`前後端版本不一致：前端 ${BUILD_RELEASE} / 後端 ${message.release}`);return;}
    if(message.type==='joined'){
     if(message.release!==BUILD_RELEASE){this.tryFallback(`後端版本不符：${String(message.release??'unknown')}`);return;}
     this.id=message.id;this.activeToken=String(message.token??'');this.joinRequest={mode:'resume',token:this.activeToken};this.onSession(message.id,typeof message.session==='string'?message.session:'',this.activeToken,typeof message.name==='string'?message.name:undefined);this.onStatus('已連線，等待世界資料…');
    }else if(message.type==='snapshot'){
     if(message.release!==BUILD_RELEASE){this.tryFallback(`世界快照版本不符：${String(message.release??'unknown')}`);return;}
     if(!validSnapshot(message.data)){this.tryFallback('後端回傳的世界快照格式不完整。');return;}
     this.synced=true;this.reconnectAttempt=0;clearTimeout(this.joinTimer);this.onStatus('世界已同步');this.flushPending();
     try{this.onSnapshot(message.data);}catch(error){console.error('[Connection] snapshot consumer failed',error);this.onError(`世界快照已收到，但前端處理失敗：${error instanceof Error?error.message:String(error)}`);}
    }else if(message.type==='contentUpdated')this.onContent();
    else if(message.type==='error'){
     const code=typeof message.code==='string'?message.code:'';
     if(CHARACTER_LOGIN_ERROR_CODES.has(code)){this.rejectLogin(message.text||'角色登入失敗。',code);return;}
     this.onError(message.text||'伺服器回報未知錯誤');
    }
   }catch(error){this.onError(`伺服器訊息處理失敗：${error instanceof Error?error.message:String(error)}`);}
  };
  socket.onerror=()=>{if(!current())return;if(!opened)this.tryFallback(`無法連線遊戲後端：${url}`);else this.onError(`WebSocket 發生錯誤：${url}`);};
  socket.onclose=e=>{if(!current())return;clearTimeout(this.joinTimer);this.synced=false;this.id='';if(e.code===4009){this.rejectLogin(e.reason||'此角色已在另一個裝置或視窗登入。','CHARACTER_SESSION_REPLACED');return;}if(!opened){this.tryFallback(e.reason||`連線失敗：${url}`);return;}this.scheduleReconnect(e.reason||'連線中斷，正在重連…');};
 }
 private rejectLogin(message:string,code:string){clearTimeout(this.joinTimer);this.synced=false;this.id='';this.pending.length=0;const socket=this.socket;this.socket=undefined;this.attempt++;try{socket?.close(1000,'login rejected');}catch{}this.onStatus('角色登入未完成');this.onLoginRejected(message,code);}
 private tryFallback(message:string){clearTimeout(this.joinTimer);this.synced=false;this.id='';const old=this.socket;this.socket=undefined;if(old&&old.readyState<2){try{old.close(1000);}catch{}}const urls=this.endpoints();if(this.endpointIndex+1<urls.length){this.endpointIndex++;this.onStatus('目前連線無法完成世界同步，改用備援端點…');window.setTimeout(()=>this.openEndpoint(),NETWORK_POLICY.fallbackDelayMs);return;}this.fail(message);this.scheduleReconnect();}
 private fail(message:string){console.error('[Connection]',message);this.onStatus('連線異常');this.onError(message);}
 private flushPending(){if(this.socket?.readyState!==WebSocket.OPEN||!this.synced)return;const q=this.pending.splice(0);for(const command of q)this.socket.send(JSON.stringify({type:'command',seq:++this.sequence,command}));}
 send(command:Command){if(this.socket?.readyState===WebSocket.OPEN&&this.synced){this.socket.send(JSON.stringify({type:'command',seq:++this.sequence,command}));return;}if(command.type==='move'){this.pending=this.pending.filter(c=>c.type!=='move');this.pending.push(command);}else if(this.pending.length<NETWORK_POLICY.pendingCommandLimit)this.pending.push(command);this.onStatus('世界同步中，操作已暫存…');}
 close(){clearTimeout(this.reconnect);clearTimeout(this.joinTimer);this.synced=false;this.id='';this.joinRequest=undefined;this.pending.length=0;this.attempt++;try{this.socket?.close(1000);}catch{}}
}
