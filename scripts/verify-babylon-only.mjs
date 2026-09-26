import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const packageJson=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const packageBuckets=['dependencies','devDependencies','peerDependencies','optionalDependencies'];
const bannedPackages=['three','@react-three/fiber','@react-three/drei','three-stdlib'];

const violations=[];
for(const bucket of packageBuckets){
  const deps=packageJson[bucket]??{};
  for(const name of Object.keys(deps)){
    if(bannedPackages.some((b)=>name===b || name.startsWith(`${b}/`))){
      violations.push(`package.json: ${bucket} contains forbidden legacy renderer dependency "${name}"`);
    }
  }
}

const roots=['src','server','tests'];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
const importPatterns=[
  /(?:from|import\s*)\s*['"]three(?:\/[^'"]*)?['"]/g,
  /require\(\s*['"]three(?:\/[^'"]*)?['"]\s*\)/g,
  /['"]@react-three\/(?:fiber|drei)['"]/g,
  /['"]three-stdlib['"]/g
];

async function walk(dir){
  let entries;
  try{entries=await readdir(dir,{withFileTypes:true});}
  catch(error){
    if(error && error.code==='ENOENT') return;
    throw error;
  }
  for(const entry of entries){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){
      if(entry.name==='node_modules' || entry.name==='dist' || entry.name==='.git') continue;
      await walk(full);
      continue;
    }
    if(!extensions.has(path.extname(entry.name))) continue;
    const source=await readFile(full,'utf8');
    for(const pattern of importPatterns){
      pattern.lastIndex=0;
      if(pattern.test(source)){
        violations.push(`${path.relative(root,full)}: forbidden Three.js/React-Three import detected`);
        break;
      }
    }
  }
}

for(const candidate of roots) await walk(path.join(root,candidate));

if(violations.length){
  console.error('[FAIL] Babylon-only architecture gate');
  for(const violation of violations) console.error(' -',violation);
  process.exit(1);
}

console.log('[PASS] Babylon-only architecture gate');
console.log('       Runtime renderer dependencies are Babylon.js only.');
