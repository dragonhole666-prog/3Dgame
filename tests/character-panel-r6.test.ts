import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {PANEL_DEFINITIONS,panelForHotkey} from '../src/client/ui/panel-registry';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('P0.25.9R6 character panel / ice mythic sword regression',()=>{
  it('labels the C-key panel as 人物 through the shared panel registry',()=>{
    expect(PANEL_DEFINITIONS.equipment.title).toBe('人物');
    expect(PANEL_DEFINITIONS.equipment.menuLabel).toBe('人物');
    expect(PANEL_DEFINITIONS.equipment.hotkeys).toContain('c');
    expect(panelForHotkey('C')).toBe('equipment');
    const ui=read('src/client/ui/game-ui.ts');
    expect(ui).toContain('PANEL_DEFINITIONS.equipment.menuLabel');
    expect(ui).toContain("this.toggle('equipment')");
  });

  it('keeps character header and paper-doll fixed while only the equipment grid scrolls',()=>{
    const css=read('src/styles.css');
    expect(css).toContain('P0.25.9R6 Character panel UX');
    expect(css).toMatch(/\.panel-equipment\{[\s\S]*?overflow:hidden!important/);
    expect(css).toMatch(/\.panel-equipment \.panel-body\{[\s\S]*?overflow:hidden!important/);
    expect(css).toMatch(/\.panel-equipment \.equipment-inventory-grid\{[\s\S]*?overflow-y:auto!important/);
    expect(css).toMatch(/\.panel-equipment \.equipment-character-pane\{[\s\S]*?overflow:hidden/);
  });

  it('maps mythic-sword to the uploaded GLB and packages that asset',()=>{
    const curated=read('src/client/character/curated-equipment.ts');
    expect(curated).toContain("'mythic-sword':{itemId:'mythic-sword'");
    expect(curated).toContain("url:'/assets/user-equipment/ice-mythic-sword.glb'");
    const file=path.join(root,'public/assets/user-equipment/ice-mythic-sword.glb');
    expect(fs.existsSync(file)).toBe(true);
    const header=fs.readFileSync(file).subarray(0,12);
    expect(header.subarray(0,4).toString('ascii')).toBe('glTF');
    expect(header.readUInt32LE(4)).toBe(2);
  });
});
