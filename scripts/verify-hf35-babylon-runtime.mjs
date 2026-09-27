import { readFile,stat } from 'node:fs/promises';
import { dirname,extname,resolve } from 'node:path';

const root=process.cwd();
const forbidden=[
 /^three(?:\/|$)/,
 /^three-pathfinding(?:\/|$)/,
 /^@pixiv\/three-vrm(?:\/|$)/,
 /^@react-three\//,
 /^@pmndrs\//
];
const visited=new Set();
const violations=[];

async function resolveLocal(from,spec){
 const base=resolve(dirname(from),spec);
 const candidates=extname(base)?[base]:[
  base+'.ts',base+'.tsx',base+'.js',base+'.mjs',
  resolve(base,'index.ts'),resolve(base,'index.tsx'),resolve(base,'index.js')
 ];
 for(const file of candidates){try{if((await stat(file)).isFile())return file;}catch{}}
 return undefined;
}

async function walk(file){
 file=resolve(file);if(visited.has(file))return;visited.add(file);
 const source=await readFile(file,'utf8');
 const importRe=/(?:import|export)\s+(?!type\b)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
 for(const match of source.matchAll(importRe)){
  const spec=match[1]??match[2]??match[3];if(!spec)continue;
  if(forbidden.some(rx=>rx.test(spec))){violations.push({file:file.slice(root.length+1),spec});continue;}
  if(spec.startsWith('.')){const next=await resolveLocal(file,spec);if(next)await walk(next);}
 }
}

await walk(resolve(root,'src/main.ts'));
if(violations.length){
 console.error('HF35 Babylon runtime gate FAILED.');
 for(const v of violations)console.error(`- ${v.file}: ${v.spec}`);
 process.exit(1);
}
console.log(`HF35 Babylon runtime gate PASS: ${visited.size} active modules scanned; no Three.js runtime imports.`);
