import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolve=(p)=>path.join(root,p);
const exists=(p)=>fs.existsSync(resolve(p))&&fs.statSync(resolve(p)).isFile();
const read=(p)=>fs.readFileSync(resolve(p),'utf8').replace(/^\uFEFF/,'');
const must=(ok,message)=>{if(!ok)throw new Error('HF35 BABYLON SOURCE FAIL: '+message);console.log('PASS ',message);};

const required=[
 'package.json','package-lock.json','src/main.ts',
 'src/client/core/babylon-game.ts',
 'src/client/babylon/actor-runtime.ts',
 'src/client/babylon/engine.ts',
 'src/client/babylon/world/xianxia-world.ts',
 'src/client/babylon/rendering/reference-pipeline.ts',
 'src/client/rendering/babylon-preview.ts',
 'src/client/ui/game-ui.ts',
 'src/shared/domains/navigation.ts',
 'src/shared/data/hf265-world-layout.ts',
 'src/shared/data/skills.ts','src/shared/data/monsters.ts','src/shared/data/world.ts',
 'server/index.ts','scripts/verify-hf35-babylon-runtime.mjs'
];
for(const p of required)must(exists(p),'required recovery source exists: '+p);

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
must(pkg.dependencies?.['@babylonjs/core']==='9.28.0','Babylon core pinned at 9.28.0');
must(pkg.dependencies?.['@babylonjs/loaders']==='9.28.0','Babylon loaders pinned at 9.28.0');
must(lock.packages?.['']?.dependencies?.['@babylonjs/core']==='9.28.0','lock root Babylon core matches');
must(lock.packages?.['']?.dependencies?.['@babylonjs/loaders']==='9.28.0','lock root Babylon loaders matches');

const main=read('src/main.ts');
must(main.includes("import('./client/core/babylon-game')"),'full Babylon game is the only normal game boot path');
must(!main.includes("requested==='three'")&&!main.includes("client/core/game"),'main has no Three.js fallback path');

const navigation=read('src/shared/domains/navigation.ts');
must(!/from\s+['\"]three(?:\\/|['\"])/.test(navigation)&&!/from\s+['\"]three-pathfinding(?:\\/|['\"])/.test(navigation),'server-authoritative navigation no longer imports Three.js / three-pathfinding');

const engine=read('src/client/babylon/engine.ts');
must(engine.includes('WebGPUEngine'),'WebGPU engine path exists');
must(engine.includes('new Engine('),'Babylon WebGL fallback exists');

const world=read('src/client/babylon/world/xianxia-world.ts');
must(world.includes('SceneLoader.ImportMeshAsync'),'Babylon world imports glTF assets natively');
must(world.includes('MirrorTexture'),'Babylon world owns reflective water');

const scan=[
 'src/client/core/babylon-game.ts',
 'src/client/rendering/babylon-preview.ts',
 'src/client/ui/game-ui.ts',
 'src/shared/domains/navigation.ts'
];
const babylonDir=fs.readdirSync(resolve('src/client/babylon'),{recursive:true})
 .filter(p=>typeof p==='string'&&p.endsWith('.ts'))
 .map(p=>path.posix.join('src/client/babylon',String(p).replaceAll('\\','/')));
for(const p of [...scan,...babylonDir]){
 const source=read(p);
 must(!/from\s+['"]three(?:\/|['"])/.test(source),'active Babylon layer has no Three.js import: '+p);
 must(!source.includes('three-pathfinding'),'active Babylon layer has no three-pathfinding import: '+p);
 must(!source.includes('@pixiv/three-vrm'),'active Babylon layer has no three-vrm import: '+p);
}

console.log('HF35 FULL-GAME BABYLON SOURCE VERIFICATION PASS');
