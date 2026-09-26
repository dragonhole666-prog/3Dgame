import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let failed=false;
const pass=(ok,label)=>{console.log(`${ok?'PASS':'FAIL'}  ${label}`);if(!ok)failed=true;};
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

const monsters=text('src/shared/data/monsters.ts');
const loot=text('src/shared/data/loot-tables.ts');
const world=text('src/shared/data/world.ts');
const types=text('src/shared/types.ts');
const monsterModel=text('src/client/character/monster-model.ts');
const runtime=text('src/client/character/vrm-character-runtime.ts');
const curated=text('src/client/character/curated-equipment.ts');
const appearance=text('src/client/character/appearance.ts');
const grip=text('src/client/character/weapon-grip.ts');
const retarget=text('src/client/character/mixamo-retarget.ts');
const architecture=text('src/client/character/character-runtime-architecture.ts');
const queenAnimator=text('src/client/character/golden-queen-animator.ts');
const gui=text('QINGLAN_TEST_CENTER.py');
const pkg=JSON.parse(text('package.json'));

for(const id of ['fox','gudiao','kui']){
  pass(new RegExp(`(?:^|\\n)\\s*(?:'${id}'|${id}):\\{`).test(monsters),`${id} procedural map boss remains registered`);
}
for(const id of ['green-wraith','wasteland-swordsman','ruin-chieftain']){
  pass(!monsters.includes(`'${id}':`),`${id} uploaded map boss data removed`);
  pass(!loot.includes(`'${id}':`),`${id} obsolete loot table removed`);
  pass(!world.includes(`'${id}'`),`${id} obsolete NPC intel removed`);
}
pass(!exists('public/assets/user-monsters'),'uploaded user-monsters directory is removed');
pass(!exists('src/client/character/monster-rigid-motion.ts'),'obsolete rigid static-boss motion module is removed');
pass(!exists('tests/monster-rigid-motion.test.ts'),'obsolete rigid static-boss regression is removed');
pass(!types.includes('MonsterAssetMotionProfile')&&!types.includes('assetMotionProfile'),'obsolete static-boss motion schema is removed');
pass(!monsterModel.includes('sampleRigidMonsterMotion')&&monsterModel.includes('this.legs.forEach')&&monsterModel.includes('this.wings.forEach')&&monsterModel.includes('this.tails.forEach'),'MonsterModel uses native procedural boss body-part animation');
pass(exists('tests/procedural-boss-animation.test.ts'),'procedural boss animation regression is packaged');

pass(runtime.includes('GRIP_CHAINS')&&runtime.includes('physical handle cylinder')&&runtime.includes('for(let pass=0;pass<3;pass++)'),'finger grip solver iteratively closes onto the physical handle surface');
pass(runtime.includes('resetGripRig')&&runtime.includes('entry.bone.quaternion.copy(entry.rest)'),'finger grip is reset each frame to prevent cumulative deformation');
pass(runtime.includes('mountGripPoint')&&grip.includes('WEAPON_GRIP_PROFILES'),'weapon grip points and two-hand offsets are data-driven');
pass(curated.includes('shieldGrip?:{handleLength:number;handleRadius:number;plateOffset:number}')&&curated.includes('installShieldGrip'),'shield grip is data-driven and installs a physical handle');
pass(curated.includes("shieldGrip:{handleLength:.24,handleRadius:.026,plateOffset:.105}"),'Demon King shield uses physical back-handle parameters');
pass(appearance.includes('Rear handle is centered on the hand mount'),'procedural shields include a visible rear handle');

pass(monsters.includes("'golden-queen':")&&monsters.includes("bossBehavior:'queen-duelist'")&&monsters.includes("assetLocal:'/assets/bosses/golden_queen.glb'"),'Golden Queen rigged map boss is registered');
for(const asset of ['public/assets/bosses/golden_queen.glb','public/assets/animations/mixamo/Walking.glb','public/assets/animations/mixamo/Fast_Run.glb'])pass(exists(asset)&&fs.statSync(path.join(root,asset)).size>0,`R14 supplied asset exists: ${path.basename(asset)}`);
pass(retarget.includes('PropertyBinding.sanitizeNodeName')&&retarget.includes('mixamoBone')&&architecture.includes("Walk:{kind:'glb-mixamo'")&&architecture.includes("Run:{kind:'glb-mixamo'")&&runtime.includes("asset.kind==='glb-mixamo'")&&runtime.includes('loadMixamoVrmRotationClip(asset.url')&&(retarget.includes('retargetVrmNormalizedClip')||retarget.includes('retargetSameRigClip')),'Walking/Fast Run replace locomotion through sanitized-name-safe Mixamo retarget');
pass(queenAnimator.includes("queen-slash")&&queenAnimator.includes("queen-cross")&&queenAnimator.includes("queen-spin")&&queenAnimator.includes("queen-dash")&&queenAnimator.includes("queen-burst"),'Golden Queen has dedicated visible attack pose overlays');
pass(grip.includes("mirroredSecondaryWeapon:true")&&runtime.includes('FallbackWeapon_${item.baseId}_Left'),'dual profile creates a real second held weapon');
pass(runtime.includes('physical PALM grip point')&&runtime.includes('this.leftWeaponMount.getWorldPosition(this.ikWrist)')&&runtime.includes('secondary.palmInset'),'two-hand CCD solves the physical support-palm Grip Point instead of the wrist origin');

for(const asset of [
  'public/assets/user-equipment/demon_king_shield.glb',
  'public/assets/user-equipment/divine_helmet.glb',
  'public/assets/user-equipment/ice-mythic-sword.glb',
  'public/assets/user-equipment/mythic_demon_bow.glb',
  'public/assets/user-equipment/mythic_demon_spear.glb',
]){
  pass(exists(asset)&&fs.statSync(path.join(root,asset)).size>0,`retained user equipment asset exists: ${path.basename(asset)}`);
}
pass(pkg.scripts?.['verify:r13']==='node scripts/verify-r13.mjs'&&pkg.scripts?.['verify:r14']==='node scripts/verify-r14.mjs'&&pkg.scripts?.['verify:r15']==='node scripts/verify-r15.mjs'&&pkg.scripts?.['verify:r16']==='node scripts/verify-r16.mjs','package exposes backward-compatible verify:r13/r14/r15 and current verify:r16');
pass(!pkg.scripts?.['verify:r10']&&!pkg.scripts?.['verify:r11']&&!pkg.scripts?.['verify:r12'],'obsolete R10/R11/R12 package gates removed');
pass(String(pkg.scripts?.check??'').includes('verify:r16')&&!String(pkg.scripts?.check??'').includes('verify:r12'),'npm check uses current R16 gate');
pass(gui.includes('scripts/verify-r16.mjs')&&gui.includes('_procedural_boss_tests()'),'Python test center runs current R16 animation-authority regression gate');

if(failed){console.error('R13 VERIFICATION: FAIL');process.exit(1);}
console.log('R13 VERIFICATION: PASS');
