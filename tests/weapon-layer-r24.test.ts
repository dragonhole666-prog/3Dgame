import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=(p:string)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

describe('R26 equipped locomotion isolation regression',()=>{
 const root=path.resolve(process.cwd());
 const runtime=fs.readFileSync(path.join(root,'src/client/character/vrm-character-runtime.ts'),'utf8');
 it('keeps retarget and supplied locomotion GLBs unchanged',()=>{
   expect(sha(path.join(root,'src/client/character/mixamo-retarget.ts'))).toBe('eb31206ccaa04451f363e55821d5ede909700f8cd3966a97e598b396bb909726');
   expect(sha(path.join(root,'public/assets/animations/mixamo/Walking.glb'))).toBe('dce96054f2befa04435c768ecc7c17bd22094a3b6a7013859beb773676c8ab4f');
   expect(sha(path.join(root,'public/assets/animations/mixamo/Fast_Run.glb'))).toBe('00fa9f493cbd8df6cfbd170304ca199f63aba032ef575276861f93250a412b71');
 });
 it('never replaces equipped Walk/Run arms with body-only locomotion at runtime',()=>{
   const start=runtime.indexOf('private setLocomotion('),end=runtime.indexOf('private oneShot',start);
    const block=runtime.slice(start,end);
   expect(block).toContain("this.locomotionLayer='full'");
   expect(block).not.toContain("dominant:LocomotionLayer=weaponMix");
 });
 it('keeps support-hand contact bounded while allowing true two-hand combat profiles',()=>{
   expect(runtime).toContain('strength*=T.MathUtils.lerp(1,.18,moving)');
   expect(runtime).toContain('strength=Math.min(combat?(secondary.combatCap??.08):(secondary.idleCap??.12),strength)');
 });
});
