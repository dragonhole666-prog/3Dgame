import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const exists=p=>fs.existsSync(path.join(root,p));
const must=(ok,msg)=>{if(!ok)throw new Error('HF35 FULL-GAME FAIL: '+msg);console.log('PASS ',msg);};

const required=[
 'src/main.ts',
 'src/client/core/babylon-game.ts',
 'src/client/babylon/actor-runtime.ts',
 'src/client/babylon/world/xianxia-world.ts',
 'src/client/rendering/babylon-preview.ts',
 'src/client/ui/game-ui.ts',
 'src/client/input/game-input-controller.ts',
 'src/client/networking/connection.ts',
 'src/shared/data/skills.ts',
 'src/shared/data/skill-vfx-profiles.ts',
 'src/shared/data/monsters.ts',
 'src/shared/data/monster-telegraph-profiles.ts',
 'src/shared/data/world.ts',
 'src/shared/data/hf265-world-layout.ts',
 'src/shared/data/equipment.ts',
 'src/shared/combat/weapon-skills.ts',
 'src/shared/domains/navigation.ts',
 'server/index.ts','server/world.ts','server/persistence.ts'
];
for(const p of required)must(exists(p),'preserved source exists: '+p);

const main=read('src/main.ts');
const game=read('src/client/core/babylon-game.ts');
const actors=read('src/client/babylon/actor-runtime.ts');
const ui=read('src/client/ui/game-ui.ts');
const skills=read('src/shared/data/skills.ts');
const monsters=read('src/shared/data/monsters.ts');
const world=read('src/shared/data/world.ts');
const equipment=read('src/shared/data/equipment.ts');
const weaponSkills=read('src/shared/combat/weapon-skills.ts');
const server=read('server/world.ts');
const navigation=read('src/shared/domains/navigation.ts');

must(/import\('\.\/client\/core\/babylon-game'\)/.test(main),'main boots the full BabylonGame runtime');
must(!/client\/core\/game/.test(main)&&!/engine=three|requested===['"]three/.test(main),'normal boot has no Three.js fallback');

must(/new Connection\(\)/.test(game)&&/onSnapshot/.test(game),'full Babylon client consumes authoritative network snapshots');
must(/skillForHotkey/.test(game)&&/type:'attack'/.test(game),'weapon hotkeys and attack commands remain connected');
must(/MONSTERS/.test(game)&&/ensureMonster/.test(game),'monster definitions are projected into Babylon actors');
must(/NPCS/.test(game)&&/bootNpcs/.test(game),'NPC world data is projected into Babylon actors');
must(/snapshot\.drops/.test(game)&&/pickup/.test(game),'world drops and pickup interactions remain connected');
must(/type:'navigate'/.test(game)&&/resolveInteractionTarget/.test(game),'navigation and contextual interactions remain connected');
must(/setMobileMovement/.test(game)&&/mobileBasicAttack/.test(game),'mobile movement and combat controls remain connected');

must(/SceneLoader/.test(actors)&&/LoadAssetContainerAsync/.test(actors),'player/NPC/monster assets load through Babylon SceneLoader/AssetContainer');
must(/qinglan-main\.vrm/.test(actors),'original Qinglan avatar path remains the historical default');
must(/assetLocal\|\|def\.assetUrl/.test(actors),'authored monster asset paths remain preferred before fallback');
must(!/from\s+['"]three/.test(actors)&&!/@pixiv\/three-vrm/.test(actors),'Babylon actor runtime has no Three/three-vrm imports');

must(/class="hotbar"|class="hotbar-wrap"/.test(ui)&&/data-skill/.test(ui),'original skill hotbar remains in the UI');
must(/id="minimap"/.test(ui)&&/data-panel="map"/.test(ui),'minimap/world-map UI remains present');
must(/bestiary/.test(ui)&&/equipment/.test(ui)&&/creator/.test(ui),'bestiary, equipment and character creator panels remain present');
must(/ModelPreview/.test(ui)&&/babylon-preview/.test(ui),'UI model preview is Babylon-native');

must(/SKILL_DEFINITIONS/.test(skills)&&/fire-orb|ice-spike|blizzard/.test(skills),'authored skill definitions remain present');
must(/wolf/.test(monsters)&&/golden-queen/.test(monsters),'normal monsters and boss definitions remain present');
must(/NPCS/.test(world)&&/REGIONS/.test(world)&&/WORLD/.test(world),'world/NPC/region data remains present');
must(/ITEMS/.test(equipment),'equipment database remains present');
must(/resolveSkillHotbar/.test(weaponSkills)||/skillForHotkey/.test(weaponSkills),'weapon skill loadout logic remains present');

must(/class GameWorld/.test(server)&&/command|applyCommand|handleCommand/.test(server),'authoritative server world remains present');
must(!/from\s+['"]three/.test(navigation)&&!/from\s+['"]three-pathfinding/.test(navigation),'shared navigation is renderer-independent');

console.log('HF35 FULL-GAME PRESERVATION VERIFICATION PASS');
