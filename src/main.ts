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
   const {Editor}=await import('./editor/editor');
   new Editor(host);
   return;
  }

  const requested=(new URLSearchParams(location.search).get('engine')??'babylon').toLowerCase();
  if(requested==='three'){
   const [{Game},{mountHf27LookDevPanel},{detectHf27RendererCapability}]=await Promise.all([
    import('./client/core/game'),
    import('./client/ui/hf27-lookdev-panel'),
    import('./client/rendering/hf27-renderer-capability'),
   ]);
   const game=new Game(host);
   (window as any).__QINGLAN_GAME__=game;
   mountHf27LookDevPanel(game);
   console.info('[Legacy Three Renderer]',detectHf27RendererCapability());
   return;
  }

  const {BabylonP0Runtime}=await import('./client/babylon/runtime');
  await BabylonP0Runtime.mount(host);
 }catch(error){
  host.innerHTML='<main class="boot-error"><span>青 嵐 志</span><h1>山門尚未開啟</h1><p></p><button onclick="location.reload()">重新連線</button><a href="/">返回山門</a></main>';
  host.querySelector('p')!.textContent=error instanceof Error?error.message:String(error);
  console.error(error);
 }
}
void boot();
