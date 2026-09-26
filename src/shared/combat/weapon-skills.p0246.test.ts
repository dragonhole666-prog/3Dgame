import { describe,expect,it } from 'vitest';
import { createItem } from '../domains/item';
import { isSkillAllowed,resolveSkillHotbar,weaponCombatIdentity } from './weapon-skills';

describe('P0.24.6 weapon discipline identity',()=>{
 it('gives every weapon profile its own basic label and skill set',()=>{
  const rows=[
   ['iron-sword','sword','流雲起劍'],['mountain-blade','greatsword','鎮嶽起勢'],['twin-moon','dual','雙月連斬'],
   ['jade-spear','spear','游龍點槍'],['star-staff','staff','引靈法訣'],['frost-bow','bow','引弦破風']
  ] as const;
  const labels=new Set<string>();
  for(const [id,profile,label] of rows){const equipment={mainhand:createItem(id,()=>.42)};expect(weaponCombatIdentity(equipment).profile).toBe(profile);const bar=resolveSkillHotbar(equipment);expect(bar[0].label).toBe(label);expect(isSkillAllowed(equipment,bar[1].skillId)).toBe(true);labels.add(bar[0].label!);}
  expect(labels.size).toBe(rows.length);
 });
});
