import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import process from 'node:process';

const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const clamp01=(v)=>Math.max(0,Math.min(1,v));
const similarity=(actual,target)=>target===0?(actual===0?1:0):clamp01(1-Math.abs(actual-target)/Math.abs(target));
const ratioSimilarity=(a,b)=>Math.max(a,b)===0?1:Math.min(a,b)/Math.max(a,b);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};

function decodePng(buffer){
  if(buffer.length<8||!buffer.subarray(0,8).equals(SIGNATURE)) throw new Error('Only PNG input is supported.');
  let offset=8,width=0,height=0,bitDepth=0,colorType=-1,interlace=0;const idat=[];
  while(offset+12<=buffer.length){
    const length=buffer.readUInt32BE(offset);
    const type=buffer.toString('ascii',offset+4,offset+8);
    const data=buffer.subarray(offset+8,offset+8+length);
    offset+=12+length;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];}
    else if(type==='IDAT')idat.push(data);
    else if(type==='IEND')break;
  }
  if(bitDepth!==8||![2,6].includes(colorType)||interlace!==0) throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
  const channels=colorType===6?4:3,bpp=channels,stride=width*channels,raw=inflateSync(Buffer.concat(idat)),rgba=Buffer.alloc(width*height*4);
  let pos=0;let prev=Buffer.alloc(stride);
  for(let y=0;y<height;y++){
    const filter=raw[pos++],scan=raw.subarray(pos,pos+stride);pos+=stride;const row=Buffer.allocUnsafe(stride);
    for(let x=0;x<stride;x++){
      const a=x>=bpp?row[x-bpp]:0,b=prev[x]??0,c=x>=bpp?(prev[x-bpp]??0):0,v=scan[x];
      row[x]=filter===0?v:
        filter===1?(v+a)&255:
        filter===2?(v+b)&255:
        filter===3?(v+Math.floor((a+b)/2))&255:
        filter===4?(v+paeth(a,b,c))&255:
        (()=>{throw new Error(`Unsupported PNG filter ${filter}`);})();
    }
    for(let x=0;x<width;x++){
      const si=x*channels,di=(y*width+x)*4;
      rgba[di]=row[si];rgba[di+1]=row[si+1];rgba[di+2]=row[si+2];rgba[di+3]=channels===4?row[si+3]:255;
    }
    prev=row;
  }
  return {width,height,rgba};
}

function rgbToHsv(r,g,b){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d!==0){
    if(max===r)h=((g-b)/d)%6;
    else if(max===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;if(h<0)h+=360;
  }
  return [h,max===0?0:d/max,max];
}

function pixel(image,x,y){
  const i=(y*image.width+x)*4;
  return [image.rgba[i]/255,image.rgba[i+1]/255,image.rgba[i+2]/255];
}
function luma(rgb){return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}

function measure(image,target){
  const crop=target.crop;
  const x0=Math.max(1,crop.x),y0=Math.max(1,crop.y);
  const x1=Math.min(image.width-1,crop.x+crop.width),y1=Math.min(image.height-1,crop.y+crop.height);
  let satSum=0,valSum=0,lumaSum=0,lumaSq=0,warm=0,cool=0,n=0,edge=0,edgeN=0;

  for(let y=y0;y<y1;y++){
    for(let x=x0;x<x1;x++){
      const rgb=pixel(image,x,y);const [h,s,v]=rgbToHsv(...rgb);const Y=luma(rgb);
      satSum+=s;valSum+=v;lumaSum+=Y;lumaSq+=Y*Y;n++;
      if(s>.2&&v>.15){
        if(h>=330||h<=60)warm++;
        if(h>=170&&h<=250)cool++;
      }
      if(((x-x0)&1)===0&&((y-y0)&1)===0&&x>0&&x<image.width-1&&y>0&&y<image.height-1){
        const dx=Math.abs(luma(pixel(image,x+1,y))-luma(pixel(image,x-1,y)));
        const dy=Math.abs(luma(pixel(image,x,y+1))-luma(pixel(image,x,y-1)));
        if(dx+dy>.12)edge++;
        edgeN++;
      }
    }
  }

  const meanLuma=lumaSum/Math.max(1,n);
  const stdLuma=Math.sqrt(Math.max(0,lumaSq/Math.max(1,n)-meanLuma*meanLuma));
  const rows=target.grid.rows,cols=target.grid.cols,grid=[];
  for(let gy=0;gy<rows;gy++){
    const row=[];
    const ya=Math.round(y0+gy*(y1-y0)/rows),yb=Math.round(y0+(gy+1)*(y1-y0)/rows);
    for(let gx=0;gx<cols;gx++){
      const xa=Math.round(x0+gx*(x1-x0)/cols),xb=Math.round(x0+(gx+1)*(x1-x0)/cols);
      let rs=0,gs=0,bs=0,cnt=0;
      for(let y=ya;y<yb;y+=2)for(let x=xa;x<xb;x+=2){
        const rgb=pixel(image,x,y);rs+=rgb[0]*255;gs+=rgb[1]*255;bs+=rgb[2]*255;cnt++;
      }
      row.push([rs/cnt,gs/cnt,bs/cnt]);
    }
    grid.push(row);
  }
  return {
    saturationMean:satSum/n,
    valueMean:valSum/n,
    lumaMean:meanLuma,
    lumaStd:stdLuma,
    edgeDensity:edge/Math.max(1,edgeN),
    warmShare:warm/n,
    coolShare:cool/n,
    grid
  };
}

function score(actual,target){
  let gridDistance=0,count=0;
  for(let y=0;y<target.grid.rows;y++)for(let x=0;x<target.grid.cols;x++){
    const a=actual.grid[y][x],b=target.grid.rgbMean[y][x];
    const d=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])/(Math.sqrt(3)*255);
    gridDistance+=d;count++;
  }
  const gridMean=gridDistance/Math.max(1,count);
  const spatial=clamp01(1-gridMean/.35);
  const saturation=similarity(actual.saturationMean,target.global.saturationMean);
  const tone=(
    similarity(actual.valueMean,target.global.valueMean)+
    similarity(actual.lumaMean,target.global.lumaMean)+
    similarity(actual.lumaStd,target.global.lumaStd)
  )/3;
  const detail=ratioSimilarity(actual.edgeDensity,target.global.edgeDensity);
  const warmCool=(
    ratioSimilarity(actual.warmShare,target.global.warmShare)+
    ratioSimilarity(actual.coolShare,target.global.coolShare)
  )/2;
  const total=100*(.30*spatial+.20*saturation+.20*tone+.20*detail+.10*warmCool);
  return {
    total,
    components:{spatial:spatial*100,saturation:saturation*100,tone:tone*100,detail:detail*100,warmCool:warmCool*100},
    gridMeanDistance:gridMean
  };
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i].startsWith('--'))out[argv[i].slice(2)]=argv[++i];}return out;}
const cli=args(process.argv);
if(!cli.candidate||!cli.target){
  console.error('Usage: node scripts/hf27-style-score.mjs --candidate screenshot.png --target config/hf27-reference-style-target.json [--json report.json] [--enforce 90]');
  process.exit(2);
}
const [png,targetRaw]=await Promise.all([readFile(cli.candidate),readFile(cli.target,'utf8')]);
const target=JSON.parse(targetRaw),image=decodePng(png),actual=measure(image,target),result=score(actual,target);
const threshold=Number(cli.enforce??target.acceptance?.styleScore??90);
const report={
  version:1,
  candidate:cli.candidate,
  target:cli.target,
  score:Number(result.total.toFixed(3)),
  threshold,
  pass:result.total>=threshold,
  components:Object.fromEntries(Object.entries(result.components).map(([k,v])=>[k,Number(v.toFixed(3))])),
  actual:Object.fromEntries(Object.entries(actual).filter(([k])=>k!=='grid').map(([k,v])=>[k,Number(v.toFixed(6))])),
  targetGlobal:target.global,
  gridMeanDistance:Number(result.gridMeanDistance.toFixed(6))
};
console.log(JSON.stringify(report,null,2));
if(cli.json)await writeFile(cli.json,JSON.stringify(report,null,2)+'\n');
if(cli.enforce!==undefined&&result.total<threshold)process.exitCode=1;
