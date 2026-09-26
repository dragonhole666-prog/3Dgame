import path from 'node:path';
import {apiConfig,parseArgs,postImage,readImageBase64,writeBinary} from './ai-api-common.mjs';

const args=parseArgs(process.argv.slice(2));
const input=path.resolve(String(args.input||args._[0]||''));
if(!args.input&&!args._[0])throw new Error('用法：node scripts/ai-style-transfer.mjs --input screenshot.png --output styled.png');
const output=path.resolve(String(args.output||'art-output/xianxia-reference-matched.png'));
const {base,token}=apiConfig(args);
const prompt=String(args.prompt||`commercial cinematic Chinese xianxia AI drama frame, premium high-end production design, realistic natural materials, rich but controlled color separation, deep teal-blue shadows, warm coral maple leaves and amber sunlight, cool cyan water reflections, volumetric mountain haze, realistic Chinese pavilion and stone bridge, dense foliage detail, physically plausible PBR appearance, atmospheric perspective, sophisticated film color grading, high dynamic range, elegant restrained saturation, not a game screenshot, not low-poly`);
const negativePrompt=String(args.negative||`low poly, primitive geometry, flat shading, pastel toy palette, cheap mobile game, washed out cyan fog, plastic material, empty background, cartoon, voxel, oversaturated primary colors, white clipped highlights, flat lighting, simple cones, simple spheres`);
const data=await postImage(`${base}/api/art/style-transfer`,token,{imageB64:readImageBase64(input),prompt,negativePrompt,strength:Number(args.strength??0.48),guidance:Number(args.guidance??8),steps:Number(args.steps??20),width:Number(args.width??1024),height:Number(args.height??1024),seed:Number(args.seed??20260925)});
writeBinary(output,data);
console.log(`AI style transfer saved: ${output}`);
