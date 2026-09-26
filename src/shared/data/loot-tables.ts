import type { LootEntry, LootTable } from '../types';
import { ITEMS } from './equipment';
import { MONSTERS } from './monsters';
const e=(itemId:string,weight:number,minQuantity=1,maxQuantity=1):LootEntry=>({itemId,weight,minQuantity,maxQuantity});
export const LOOT_TABLES:Record<string,LootTable>={
 wolf:{id:'wolf',rolls:2,chance:.9,entries:[e('wolf-fang',30,1,3),e('beast-hide',18),e('mutant-bone',16,1,2),e('chlorinated-core',7),e('chloroweave-bracers',7),e('chloroweave-boots',5),e('bamboo-sword',5),e('cloud-sword',1)]},
 snake:{id:'snake',rolls:2,chance:.9,entries:[e('red-feather',18,1,3),e('chlorinated-core',18),e('mutant-bone',14),e('chloroweave-belt',8),e('chloroweave-hood',6),e('ember-blade',4),e('storm-charm',1.5)]},
 turtle:{id:'turtle',rolls:2,chance:.92,entries:[e('beast-hide',24,1,3),e('spirit-jade',16),e('chlorinated-core',12),e('chloroweave-legs',8),e('chloroweave-vest',6),e('moon-disc',4),e('cloud-robe',2)]},
 'mutant-boar':{id:'mutant-boar',rolls:3,chance:.92,entries:[e('mutant-bone',28,1,4),e('beast-hide',20,1,3),e('chlorinated-core',12),e('chloroweave-vest',9),e('chloroweave-legs',7),e('mountain-blade',4),e('jade-spear',3)]},
 'bog-angler':{id:'bog-angler',rolls:2,chance:.9,entries:[e('chlorinated-core',25,1,2),e('spirit-jade',14),e('beast-hide',12),e('chloroweave-hood',8),e('chloroweave-belt',7),e('star-staff',3)]},
 'chlorine-bat':{id:'chlorine-bat',rolls:3,chance:.9,entries:[e('red-feather',26,1,4),e('chlorinated-core',14),e('mutant-bone',12),e('chloroweave-bracers',8),e('chloroweave-boots',8),e('frost-bow',3),e('sword-wings',1)]},
 zheng:{id:'zheng',rolls:3,chance:.95,entries:[e('mutant-bone',24,2,5),e('primordial-shard',12),e('jade-spear',9),e('twin-moon',7),e('thunder-shoulders',5),e('chloroweave-vest',5),e('chloroweave-legs',5)]},
 fox:{id:'fox',rolls:5,chance:1,entries:[e('godbeast-core',22),e('primordial-shard',24,1,3),e('primordial-god-boots',12),e('primordial-god-bracers',10),e('frost-immortal-bow',6),e('heavenfall-bow',2.2),e('yin-yang-dual',1.6)],guaranteed:[{...e('godbeast-core',1),conditions:'firstKill'}]},
 gudiao:{id:'gudiao',rolls:5,chance:1,entries:[e('godbeast-core',20),e('primordial-shard',25,1,4),e('primordial-god-crown',12),e('primordial-god-belt',10),e('phoenix-cape',6),e('myriad-law-staff',2.1),e('celestial-burial-spear',1.8)],guaranteed:[{...e('primordial-shard',2,2,2),conditions:'firstKill'}]},
 'golden-queen':{id:'golden-queen',rolls:5,chance:1,entries:[e('godbeast-core',22),e('primordial-shard',25,1,4),e('primordial-god-crown',12),e('primordial-god-bracers',11),e('heaven-sword',6),e('primordial-star-sword',2),e('mythic-sword',1.2)],guaranteed:[{...e('primordial-shard',2,2,2),conditions:'firstKill'}]},
  kui:{id:'kui',rolls:6,chance:1,entries:[e('kui-horn',18),e('godbeast-core',24,1,2),e('primordial-shard',25,2,5),e('primordial-god-armor',12),e('primordial-god-legs',11),e('primordial-god-belt',8),e('kui-drum',4),e('primordial-star-sword',2.1),e('void-sundering-blade',1.8),e('mythic-sword',.8),e('demon-king-shield',3.2)],guaranteed:[{...e('thunder-sword',1),conditions:'firstKill'},{...e('primordial-god-armor',1),conditions:'firstKill'}]},

};
for(const monster of Object.values(MONSTERS)) for(const entry of [...LOOT_TABLES[monster.lootTable].entries,...(LOOT_TABLES[monster.lootTable].guaranteed??[])]) if(!ITEMS[entry.itemId].dropSource.includes(monster.name)) ITEMS[entry.itemId].dropSource.push(monster.name);
