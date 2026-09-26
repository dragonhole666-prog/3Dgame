import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import process from 'node:process';

const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const clamp01=(v)=>Math.max(0,Math.min(1,v));
const percentile=(values,p)=>{if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y);const i=Math.max(0,Math.min(a.length-1,Math.round((a.length-1)*p)));return a[i];};
const srgbToLinear=(x)=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;
const rgbToOklab=(r,g,b)=>{
 r=srgbToLinear(r);g=srgbToLinear(g);b=srgbToLinear(b);
 const l=0.4122214708*r+0.5363325363*g+0.0514459929*b;
 const m=0.2119034982*r+0.6806995451*g+0.1073969566*b;
 const s=0.0883024619*r+0.2817188376*g+0.6299787005*b;
 const l_=Math.cbrt(l),m_=Math.cbrt(m),s_=Math.cbrt(s);
 return [
  0.2104542553*l_+0.793617785*m_-0.0040720468*s_,
  1.9779984951*l_-2.428592205*m_+0.4505937099*s_,
  0.0259040371*l_+0.7827717662*m_-0.808675766*s_,
 ];
};
const hueDeg=(a,b)=>{let h=Math.atan2(b,a)*180/Math.PI;if(h<0)h+=360;return h;};
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};

function decodePng(buffer){
 if(buffer.length<8||!buffer.subarray(0,8).equals(SIGNATURE))throw new Error('Only PNG input is supported.');
 let offset=8,width=0,height=0,bitDepth=0,colorType=-1,interlace=0;const idat=[];
 while(offset+12<=buffer.length){
  const length=buffer.readUInt32BE(offset);const type=buffer.toString('ascii',offset+4,offset+8);const data=buffer.subarray(offset+8,offset+8+length);offset+=12+length;
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
  else if(type==='IDAT')idat.push(data);else if(type==='IEND')break;
 }
 if(bitDepth!==8||![2,6].includes(colorType)||interlace!==0)throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}. Use 8-bit RGB/RGBA non-interlaced PNG.`);
 const channels=colorType===6?4:3,bpp=channels,stride=width*channels,raw=inflateSync(Buffer.concat(idat)),rgba=Buffer.alloc(width*height*4);let pos=0;let prev=Buffer.alloc(stride);
 for(let y=0;y<height;y++){
  const filter=raw[pos++],scan=raw.subarray(pos,pos+stride);pos+=stride;const row=Buffer.allocUnsafe(stride);
  for(let x=0;x<stride;x++){const a=x>=bpp?row[x-bpp]:0,b=prev[x]??0,c=x>=bpp?(prev[x-bpp]??0):0,v=scan[x];row[x]=filter===0?v:filter===1?(v+a)&255:filter===2?(v+b)&255:filter===3?(v+Math.floor((a+b)/2))&255:filter===4?(v+paeth(a,b,c))&255:(()=>{throw new Error(`Unsupported PNG filter ${filter}`);})();}
  for(let x=0;x<width;x++){const si=x*channels,di=(y*width+x)*4;rgba[di]=row[si];rgba[di+1]=row[si+1];rgba[di+2]=row[si+2];rgba[di+3]=channels===4?row[si+3]:255;}prev=row;
 }
 return {width,height,rgba};
}

function sampleImage(image,maxSamples=120000){
 const total=image.width*image.height,step=Math.max(1,Math.floor(total/maxSamples));const samples=[];
 for(let i=0;i<total;i+=step){const j=i*4;if(image.rgba[j+3]<16)continue;samples.push([image.rgba[j]/255,image.rgba[j+1]/255,image.rgba[j+2]/255]);}
 return samples;
}

function metrics(samples){
 const luminance=[],chroma=[];let highlights=0,shadows=0,warm=0,cool=0;
 for(const [r,g,b] of samples){const [L,a,bb]=rgbToOklab(r,g,b),C=Math.hypot(a,bb),h=hueDeg(a,bb);luminance.push(L);chroma.push(C);if(L>=.94)highlights++;if(L<=.18)shadows++;if(C>.035&&(h>=20&&h<=95))warm+=C;if(C>.035&&(h>=180&&h<=285))cool+=C;}
 const n=Math.max(1,samples.length),mean=(a)=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
 return {samples:samples.length,luminance:{p10:percentile(luminance,.10),median:percentile(luminance,.50),p90:percentile(luminance,.90)},chroma:{mean:mean(chroma),p90:percentile(chroma,.90)},highlightShare:highlights/n,shadowShare:shadows/n,warmCoolBalance:(warm-cool)/Math.max(.000001,warm+cool)};
}

function comparePixels(ref,candidate,maxSamples=90000){
 const w=Math.min(ref.width,candidate.width),h=Math.min(ref.height,candidate.height),total=w*h,step=Math.max(1,Math.floor(total/maxSamples));let sum=0,count=0;
 for(let i=0;i<total;i+=step){const x=i%w,y=Math.floor(i/w),ri=(y*ref.width+x)*4,ci=(y*candidate.width+x)*4;if(ref.rgba[ri+3]<16||candidate.rgba[ci+3]<16)continue;const a=rgbToOklab(ref.rgba[ri]/255,ref.rgba[ri+1]/255,ref.rgba[ri+2]/255),b=rgbToOklab(candidate.rgba[ci]/255,candidate.rgba[ci+1]/255,candidate.rgba[ci+2]/255);sum+=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);count++;}
 return sum/Math.max(1,count);
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i].startsWith('--'))out[argv[i].slice(2)]=argv[++i];}return out;}

function metricDelta(reference,actual){
 return {
  luminanceP10:Math.abs(actual.luminance.p10-reference.luminance.p10),
  luminanceMedian:Math.abs(actual.luminance.median-reference.luminance.median),
  luminanceP90:Math.abs(actual.luminance.p90-reference.luminance.p90),
  chromaMean:Math.abs(actual.chroma.mean-reference.chroma.mean),
  chromaP90:Math.abs(actual.chroma.p90-reference.chroma.p90),
  highlightShare:Math.abs(actual.highlightShare-reference.highlightShare),
  shadowShare:Math.abs(actual.shadowShare-reference.shadowShare),
  warmCoolBalance:Math.abs(actual.warmCoolBalance-reference.warmCoolBalance),
 };
}

const cli=args(process.argv);
if(!cli.candidate||(!cli.reference&&!cli.target)){
 console.error('Usage: node scripts/hf27-visual-regression.mjs --candidate candidate.png (--reference reference.png | --target config/p0-reference-metrics.json) [--thresholds config/hf27-visual-thresholds.json] [--json report.json]');
 process.exit(2);
}

const candidate=decodePng(await readFile(cli.candidate));
const actual=metrics(sampleImage(candidate));
let reference,referenceInfo,delta;

if(cli.reference){
 const ref=decodePng(await readFile(cli.reference));
 reference=metrics(sampleImage(ref));
 delta={oklabMean:comparePixels(ref,candidate),...metricDelta(reference,actual)};
 referenceInfo={mode:'image',path:cli.reference,width:ref.width,height:ref.height,metrics:reference};
}else{
 const target=JSON.parse(await readFile(cli.target,'utf8'));
 reference=target.metrics??target;
 delta=metricDelta(reference,actual);
 referenceInfo={mode:'target-profile',path:cli.target,metrics:reference};
}

let thresholds={
 oklabMean:.16,
 luminanceP10:.10,
 luminanceMedian:.10,
 luminanceP90:.10,
 chromaMean:.07,
 chromaP90:.09,
 highlightShare:.09,
 shadowShare:.09,
 warmCoolBalance:.36,
};
if(cli.thresholds)thresholds={...thresholds,...JSON.parse(await readFile(cli.thresholds,'utf8'))};
const checks=Object.fromEntries(Object.entries(delta).map(([key,value])=>[key,{value,limit:thresholds[key],pass:value<=thresholds[key]}]));
const pass=Object.values(checks).every((x)=>x.pass);
const report={version:2,reference:referenceInfo,candidate:{path:cli.candidate,width:candidate.width,height:candidate.height,metrics:actual},checks,pass};
const json=JSON.stringify(report,null,2);
console.log(json);
if(cli.json)await writeFile(cli.json,json+'\n');
process.exitCode=(pass||cli['report-only']==='1')?0:1;
