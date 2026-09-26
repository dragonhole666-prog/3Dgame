import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('HF17.4 mobile session continuity',()=>{
 it('persists the active character separately per browser storage and clears it only on explicit character selection',()=>{
  const identity=read('src/client/identity/local-characters.ts'),ui=read('src/client/ui/game-ui.ts');
  expect(identity).toMatch(/qinglan-active-character-v1/);
  expect(identity).toMatch(/localStorage\.setItem\(ACTIVE_TOKEN_KEY,record\.token\)/);
  expect(ui).toMatch(/activeLocalCharacterToken\(\)/);
  expect(ui).toMatch(/clearActiveLocalCharacter\(\);location\.reload\(\)/);
 });
 it('reconnects after mobile lifecycle suspension and treats ordinary remote close as recoverable',()=>{
  const connection=read('src/client/networking/connection.ts'),policy=read('src/shared/network/network-policy.ts');
  expect(connection).toMatch(/visibilitychange/);
  expect(connection).toMatch(/pageshow/);
  expect(connection).toMatch(/NETWORK_POLICY\.resumeStaleMs/);
  expect(connection).not.toMatch(/if\(e\.code===1000\)return/);
  expect(policy).toMatch(/resumeStaleMs:12000/);
 });
 it('uses an explicit session-replaced close code instead of confusing it with a normal mobile disconnect',()=>{
  const server=read('server/index.ts'),worker=read('cloudflare/world-worker/src/index.js');
  expect(server).toMatch(/c\.id===id&&other!==ws[\s\S]*close\(4009,'此角色已在另一個裝置或視窗登入'\)/);
  expect(worker).toMatch(/otherState\.id===id[\s\S]*close\(4009,'此角色已在另一個裝置或視窗登入'\)/);
  expect(read('src/client/networking/connection.ts')).toMatch(/e\.code===4009/);
 });
});
