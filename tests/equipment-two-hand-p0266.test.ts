import { describe,expect,it } from 'vitest';
import { GameWorld } from '../server/world';
import { equip, isTwoHandedWeapon, mainhandBlocksOffhand } from '../src/shared/domains/equipment';
import { ITEMS } from '../src/shared/data/equipment';

const fresh=()=>{
  const world=new GameWorld(()=>.5),player=world.createPlayer('p0266-equip','Verifier');
  player.level=30;
  for(const item of player.inventory)item.identified=true;
  return player;
};
const bag=(player:ReturnType<typeof fresh>,baseId:string)=>{
  const item=player.inventory.find(i=>i.baseId===baseId);if(!item)throw new Error(`missing ${baseId}`);return item;
};

describe('P0.26.6 two-hand equipment contract',()=>{
  it.each(['mountain-blade','jade-spear','star-staff','frost-bow'])(`%s is authoritative two-hand gear`,baseId=>{
    expect(isTwoHandedWeapon(ITEMS[baseId])).toBe(true);
  });

  it.each(['mountain-blade','jade-spear','star-staff','frost-bow'])('equipping %s automatically clears an existing shield',baseId=>{
    const player=fresh(),shield=bag(player,'green-ward-shield');equip(player,shield.id);expect(player.equipment.offhand?.baseId).toBe('green-ward-shield');
    const weapon=bag(player,baseId);equip(player,weapon.id);
    expect(player.equipment.mainhand?.baseId).toBe(baseId);
    expect(player.equipment.offhand).toBeUndefined();
    expect(player.inventory.some(i=>i.baseId==='green-ward-shield')).toBe(true);
    expect(mainhandBlocksOffhand(player)).toBe(true);
  });

  it('rejects equipping a shield while a two-hand weapon is active',()=>{
    const player=fresh(),staff=bag(player,'star-staff');equip(player,staff.id);
    const shield=bag(player,'green-ward-shield');
    expect(()=>equip(player,shield.id)).toThrow('雙手武器');
    expect(player.equipment.mainhand?.baseId).toBe('star-staff');
    expect(player.equipment.offhand).toBeUndefined();
  });

  it('keeps shield compatibility for a one-hand sword',()=>{
    const player=fresh();
    // Starter sword begins equipped; offhand is legal for this profile.
    const shield=bag(player,'green-ward-shield');equip(player,shield.id);
    expect(player.equipment.mainhand?.baseId).toBe('iron-sword');
    expect(player.equipment.offhand?.baseId).toBe('green-ward-shield');
    expect(mainhandBlocksOffhand(player)).toBe(false);
  });
});
