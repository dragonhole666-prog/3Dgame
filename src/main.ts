import './styles.css';
import { applyContent } from './shared/data/content';
import { apiUrl,CLOUD_RUNTIME } from './client/networking/runtime-endpoints';

const host=document.querySelector<HTMLDivElement>('#app')!;

async function boot(){
 try{
  const response=await fetch(apiUrl('/api/game-content'),{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`世界資料載入失敗（HTTP ${response.status}）`);
  const {content}=await response.json();
  applyContent(content);

  if(location.pathname.startsWith('/editor')){
   if(CLOUD_RUNTIME)throw new Error('世界工坊僅限本機開發模式；Cloudflare 公開站不提供編輯器。');
   throw new Error('HF35 世界工坊正在轉換為 Babylon.js；舊 Three.js 編輯器已停用，不會作為相容回退。');
  }

  const {BabylonGame}=await import('./client/core/babylon-game');
  await BabylonGame.create(host);
 }catch(error){
  host.innerHTML='<main class="boot-error"><span>青 嵐 志</span><h1>山門尚未開啟</h1><p></p><button onclick="location.reload()">重新連線</button><a href="/">返回山門</a></main>';
  host.querySelector('p')!.textContent=error instanceof Error?error.message:String(error);
  console.error(error);
 }
}
void boot();
