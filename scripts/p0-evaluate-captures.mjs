import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const dir=process.argv[2]??'artifacts/hf27-screenshots';
const outDir=process.argv[3]??'artifacts/hf27-visual-metrics';
await mkdir(outDir,{recursive:true});
const files=(await readdir(dir)).filter((name)=>name.endsWith('.png')).sort();
const summary=[];
for(const file of files){
  const candidate=path.join(dir,file);
  const report=path.join(outDir,file.replace(/\.png$/i,'.json'));
  const code=await new Promise((resolve)=>{
    const child=spawn(process.execPath,[
      'scripts/hf27-visual-regression.mjs',
      '--candidate',candidate,
      '--target','config/p0-reference-metrics.json',
      '--thresholds','config/hf27-visual-thresholds.json',
      '--json',report,
      '--report-only','1',
    ],{stdio:['ignore','pipe','inherit']});
    let stdout='';
    child.stdout.on('data',(chunk)=>stdout+=chunk);
    child.on('close',(exitCode)=>{try{summary.push(JSON.parse(stdout));}catch{summary.push({candidate:file,parseError:true});}resolve(exitCode??1);});
  });
  if(code!==0)process.exitCode=code;
}
await writeFile(path.join(outDir,'summary.json'),JSON.stringify({version:1,files:summary},null,2)+'\n');
console.log(`HF27 visual metrics written: ${files.length} capture(s)`);
