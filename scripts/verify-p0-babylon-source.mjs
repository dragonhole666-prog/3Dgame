import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolve=(p)=>path.join(root,p);
const exists=(p)=>fs.existsSync(resolve(p))&&fs.statSync(resolve(p)).isFile();
const read=(p)=>fs.readFileSync(resolve(p),'utf8').replace(/^\uFEFF/,'');
const must=(ok,message)=>{if(!ok)throw new Error('P0 BABYLON SOURCE FAIL: '+message);console.log('PASS ',message);};

const required=[
 'package.json','package-lock.json','src/main.ts','src/client/core/game.ts',
 'src/client/babylon/engine.ts','src/client/babylon/runtime.ts',
 'src/client/babylon/world/xianxia-world.ts','src/client/babylon/rendering/reference-pipeline.ts',
 'src/client/babylon/lookdev.ts','src/client/babylon/reference-style.ts',
 'src/shared/data/hf265-world-layout.ts','server/index.ts',
 'cloudflare/world-worker/src/index.js','cloudflare/world-worker/wrangler.jsonc',
 'scripts/verify-current.mjs','tests/hf27-visual-capture.spec.ts',
 'config/p0-reference-metrics.json'
];
for(const p of required)must(exists(p),'required source exists: '+p);

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
must(pkg.dependencies?.['@babylonjs/core']==='9.28.0','Babylon core pinned at 9.28.0');
must(pkg.dependencies?.['@babylonjs/loaders']==='9.28.0','Babylon loaders pinned at 9.28.0');
must(lock.packages?.['']?.dependencies?.['@babylonjs/core']==='9.28.0','lock root Babylon core matches');
must(lock.packages?.['']?.dependencies?.['@babylonjs/loaders']==='9.28.0','lock root Babylon loaders matches');
must(lock.packages?.['']?.devDependencies?.['@playwright/test']==='1.55.0','lock root Playwright matches');

const main=read('src/main.ts');
must(main.includes("??'babylon'"),'Babylon is default runtime');
must(main.includes("requested==='three'"),'legacy Three fallback is explicit');
must(main.includes("import('./client/babylon/runtime')"),'Babylon runtime is lazy-loaded');

const engine=read('src/client/babylon/engine.ts');
must(engine.includes('WebGPUEngine'),'WebGPU engine path exists');
must(engine.includes('new Engine('),'WebGL2 fallback exists');

const babylonFiles=fs.readdirSync(resolve('src/client/babylon'),{recursive:true})
 .filter((p)=>typeof p==='string'&&p.endsWith('.ts'))
 .map((p)=>path.posix.join('src/client/babylon',String(p).replaceAll('\\','/')));
for(const p of babylonFiles){
 const source=read(p);
 must(!/from\s+['"]three(?:\/|['"])/.test(source),'Babylon layer has no Three.js import: '+p);
}

console.log('P0 BABYLON SOURCE VERIFICATION PASS');
