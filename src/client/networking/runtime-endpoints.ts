declare global {
 interface Window { __QINGLAN_RUNTIME__?: { backendOrigin?: string } }
}

const configured=(globalThis as typeof globalThis & {__QINGLAN_RUNTIME__?:{backendOrigin?:string}}).__QINGLAN_RUNTIME__?.backendOrigin?.trim()??'';
export const BACKEND_ORIGIN=configured.replace(/\/$/,'');
export const CLOUD_RUNTIME=BACKEND_ORIGIN.length>0;

export function apiUrl(path:string){
 const normalized=path.startsWith('/')?path:`/${path}`;
 return BACKEND_ORIGIN?`${BACKEND_ORIGIN}${normalized}`:normalized;
}

export function socketEndpoints(){
 if(BACKEND_ORIGIN){
  const u=new URL(BACKEND_ORIGIN);
  u.protocol=u.protocol==='https:'?'wss:':'ws:';
  u.pathname='/socket';u.search='';u.hash='';
  return [u.toString()];
 }
 const scheme=location.protocol==='https:'?'wss':'ws';
 const proxied=`${scheme}://${location.host}/socket`;
 const localPage=location.hostname==='localhost'||location.hostname==='127.0.0.1';
 if(!localPage)return [proxied];
 const direct='ws://127.0.0.1:8787/socket';
 return proxied===direct?[proxied]:[proxied,direct];
}
