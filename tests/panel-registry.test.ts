import {describe,expect,it} from 'vitest';
import {FUNCTION_PANEL_IDS,PANEL_DEFINITIONS,panelForHotkey} from '../src/client/ui/panel-registry';

describe('panel registry',()=>{
 it('keeps labels and keyboard shortcuts in one source of truth',()=>{
  expect(PANEL_DEFINITIONS.equipment.title).toBe('人物');
  expect(panelForHotkey('c')).toBe('equipment');
  expect(panelForHotkey('B')).toBe('inventory');
  expect(panelForHotkey('f10')).toBe('settings');
 });
 it('drives the function menu without internal-only panels',()=>{
  expect(FUNCTION_PANEL_IDS).toContain('equipment');
  expect(FUNCTION_PANEL_IDS).not.toContain('trade');
  expect(FUNCTION_PANEL_IDS).not.toContain('npc');
 });
});
