import path from 'node:path';
import {apiConfig,parseArgs,postImage,writeBinary} from './ai-api-common.mjs';

const args=parseArgs(process.argv.slice(2));
const {base,token}=apiConfig(args);
const outDir=path.resolve(String(args.output||'public/assets/ai-cinematic'));
const common='seamless tileable PBR base-color material texture for a premium cinematic Chinese xianxia fantasy drama game, physically plausible, realistic micro-detail, subtle natural variation, no perspective, orthographic surface sample, no text, no border, no baked directional shadow, no object silhouette, refined commercial art direction';
const negative='low poly, cartoon, toy, flat color, neon primary colors, strong baked lighting, perspective, horizon, props, characters, text, frame, watermark, repeating obvious motif';
const materials=[
  ['grass_albedo.png',`${common}, ancient mountain courtyard ground, muted jade-green fine grass and moss, dark cool teal crevices, sparse warm brown soil, tiny restrained peach petals, elegant natural density`,4101],
  ['stone_albedo.png',`${common}, weathered Chinese garden limestone and slate, warm gray-beige body, cool blue-gray pores, very subtle moss traces, refined old stone bridge material, fine mineral grain`,4102],
  ['wood_albedo.png',`${common}, aged Chinese pavilion timber, deep walnut brown with restrained cinnabar undertone, visible realistic grain and pores, elegant lacquer wear, no glossy varnish`,4103],
  ['roof_albedo.png',`${common}, traditional Chinese roof tile surface, deep charcoal blue-gray glazed clay, subtle warm edge weathering, fine mineral speckles, sophisticated muted finish`,4104],
];
for(const [name,prompt,seed] of materials){
  process.stdout.write(`Generating ${name} ... `);
  const data=await postImage(`${base}/api/art/generate-texture`,token,{prompt,negativePrompt:negative,width:1024,height:1024,steps:20,guidance:7.5,seed});
  const target=path.join(outDir,name);writeBinary(target,data);console.log('done');
}
console.log(`AI material albedos written to ${outDir}`);
console.log('Next: python scripts/ai-material-postprocess.py --dir public/assets/ai-cinematic');
