import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const root=path.resolve(__dirname,'..');
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('HF24 free AI art asset pipeline',()=>{
  it('binds Cloudflare Workers AI and protects dev endpoints',()=>{
    const wrangler=JSON.parse(read('cloudflare/world-worker/wrangler.jsonc'));
    expect(wrangler.ai?.binding).toBe('AI');
    const worker=read('cloudflare/world-worker/src/index.js');
    expect(worker).toContain('/api/art/style-transfer');
    expect(worker).toContain('/api/art/generate-texture');
    expect(worker).toContain('ART_PIPELINE_TOKEN');
    expect(worker).toContain('@cf/stabilityai/stable-diffusion-xl-base-1.0');
  });
  it('routes world materials through AI-generated asset directory',()=>{
    const world=read('src/client/world/xianxia-hero-garden.ts');
    expect(world).toContain('/assets/reference-20260925/grass_albedo.png');
    expect(world).toContain('/assets/reference-20260925/stone_albedo.png');
    expect(world).toContain('/assets/reference-20260925/wood_albedo.png');
    expect(world).toContain('/assets/reference-20260925/roof_albedo.png');
  });
  it('loads optional AI-generated GLB props by manifest',()=>{
    const layer=read('src/client/world/ai-cinematic-props.ts');
    expect(layer).toContain('/assets/ai-models/manifest.json');
    expect(fs.existsSync(path.join(root,'public/assets/ai-models/manifest.json'))).toBe(true);
  });
});
