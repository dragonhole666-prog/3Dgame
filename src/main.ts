import './styles.css';
import { QinglanApp } from './app/QinglanApp';

const host=document.querySelector<HTMLDivElement>('#app');
if(!host) throw new Error('Missing #app host');

const app=new QinglanApp(host);
(window as any).__QINGLAN_BABYLON__=app;

app.start().catch((error)=>{
  console.error(error);
  host.innerHTML='<main class="boot-error"><span>青 嵐 志</span><h1>山門尚未開啟</h1><p></p><button onclick="location.reload()">重新載入</button></main>';
  const p=host.querySelector('p'); if(p) p.textContent=error instanceof Error?error.message:String(error);
});
