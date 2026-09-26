import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('P0.25.9R9 responsive UI regression',()=>{
  it('makes every game panel draggable from its header without stealing close-button input',()=>{
    const ui=read('src/client/ui/game-ui.ts');
    const css=read('src/styles.css');
    expect(ui).toContain('this.makePanelDraggable(el)');
    expect(ui).toContain("closest('button,a,input,select,textarea,label')");
    expect(ui).toContain("panel.classList.add('panel-dragged','panel-dragging')");
    expect(css).toContain('.game-panel.panel-dragged');
    expect(css).toContain('--panel-left');
  });

  it('pins item tooltips to the top content edge of the owning panel and keeps them above windows',()=>{
    const ui=read('src/client/ui/game-ui.ts');
    const css=read('src/styles.css');
    expect(ui).toContain("anchor.closest<HTMLElement>('.game-panel')");
    expect(ui).toContain("headerRect?.bottom");
    expect(css).toMatch(/\.item-tooltip\{z-index:900!important/);
  });

  it('keeps the character panel dense, stats scroll-safe and mobile item icons compact',()=>{
    const css=read('src/styles.css');
    expect(css).toContain('P0.25.9R9 UI density');
    expect(css).toMatch(/\.panel-equipment \.character-stats\{[\s\S]*?max-height:72px;overflow-y:auto/);
    expect(css).toContain('#game-ui.touch-controls .item-cell{min-width:0!important;min-height:0!important}');
    expect(css).toContain('#game-ui.touch-controls .mobile-skill{width:46px!important;height:46px!important');
    expect(css).toContain('#game-ui.touch-controls .function-menu svg{width:18px!important;height:18px!important}');
  });
});
