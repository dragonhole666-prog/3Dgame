import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('HF17.2 desktop character-name input regression',()=>{
 it('keeps the create-character input focusable and isolated from gameplay keys',()=>{
  const ui=read('src/client/ui/game-ui.ts');
  const input=read('src/client/input/game-input-controller.ts');
  expect(ui).toMatch(/enterkeyhint=[\"']done[\"'][^>]*\bautofocus\b/);
  expect(ui).toContain("['keydown','keyup','keypress','beforeinput','compositionstart','compositionupdate','compositionend']");
  expect(input).toContain('this.typing(e)');
  expect(input).toContain("el.isContentEditable");
 });
 it('does not permanently disable the name field while a login request is in flight',()=>{
  const ui=read('src/client/ui/game-ui.ts');
  const game=read('src/client/core/game.ts');
  expect(ui).toContain('input.readOnly=busy');
  expect(ui).not.toContain('input.disabled=busy');
  expect(game).toContain("this.ui.loginError(`連線未完成：${text}`,'NETWORK_TRANSIENT')");
 });
});
