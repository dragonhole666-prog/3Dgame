import {describe,expect,it} from 'vitest';
import {WEAPON_GRIP_PROFILES} from '../src/client/character/weapon-grip';
import {curatedEquipmentDefinition} from '../src/client/character/curated-equipment';

describe('P0.26.8 two-hand combat contact and bow facing',()=>{
  it('keeps spear and staff support hands materially engaged during combat',()=>{
    const spear=WEAPON_GRIP_PROFILES.spear.secondary!;
    const staff=WEAPON_GRIP_PROFILES.staff.secondary!;
    expect(spear.combatIk).toBeGreaterThan(.7);
    expect(spear.combatCap).toBeGreaterThan(.7);
    expect(staff.combatIk).toBeGreaterThan(.65);
    expect(staff.combatCap).toBeGreaterThan(.65);
  });

  it('does not bake the old avatar-palm -90 degree bow rotation',()=>{
    expect(WEAPON_GRIP_PROFILES.bow.primary.side).toBe('left');
    expect(WEAPON_GRIP_PROFILES.bow.proceduralMountRotation).toEqual([0,0,0]);
    expect(curatedEquipmentDefinition('heavenfall-bow')?.localRotation).toBeUndefined();
  });
});
