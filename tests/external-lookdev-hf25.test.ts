import fs from 'node:fs';import path from 'node:path';import {describe,expect,it} from 'vitest';
const root=path.resolve(__dirname,'..');const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');
describe('HF26.5 external/free art look-dev',()=>{
 it('keeps the Poly Haven environment path available for PBR look-dev',()=>{const source=read('src/client/rendering/external-art-assets.ts');expect(source).toContain('https://api.polyhaven.com/files');expect(source).toContain("resolvePolyHavenHdr('chinese_garden'");});
 it('uses verified Quaternius CC0 nature assets as the active natural-world source',()=>{const registry=read('src/client/assets/quaternius-asset-registry.ts'),layer=read('src/client/world/hf265-quaternius-nature-layer.ts');expect(registry).toContain('Stylized%20Nature%20MegaKit%5BStandard%5D');expect(registry).toContain("HF265_QUATERNIUS_LICENSE='CC0-1.0'");expect(layer).toContain('quaterniusNatureUrl');expect(layer).toContain('InstancedMesh');});
 it('packages local-vendor support while retaining resilient runtime fallback',()=>{const vendor=read('scripts/fetch-quaternius-hf265.mjs'),layer=read('src/client/world/hf265-quaternius-nature-layer.ts');expect(vendor).toContain('CommonTree_1.gltf');expect(vendor).toContain('License_Standard.txt');expect(layer).toContain('urls.local');expect(layer).toContain('urls.remote');});
});
