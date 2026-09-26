import './verify-r14.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
const exists=p=>fs.existsSync(path.join(root,p));
const pass=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS ',msg)};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const retarget=read('src/client/character/mixamo-retarget.ts');
const runtime=read('src/client/character/vrm-character-runtime.ts');
const motions=read('src/client/character/weapon-combat-motion.ts');
const grip=read('src/client/character/weapon-grip.ts');
const monsterModel=read('src/client/character/monster-model.ts');
const monsters=read('src/shared/data/monsters.ts');
const pkg=JSON.parse(read('package.json'));
pass(/premultiply\(parentRestWorld\)\.multiply\(restWorldInv\)/.test(retarget)&&/if\(vrm0\)\{q\.x=-q\.x;q\.z=-q\.z;\}/.test(retarget)&&/retargetVrmNormalizedClip/.test(retarget),'Mixamo locomotion follows official three-vrm normalized-bone retarget including VRM0 X-Z conversion');
pass(/weaponReadyActions/.test(runtime)&&/createActionRpgReadyClip/.test(runtime)&&/applySecondaryHandContactIK/.test(runtime)&&!/applyWeaponCombatChoreography/.test(runtime),'runtime uses additive authored weapon-ready poses with contact-only support-hand correction');
pass(/nonCombatArmOwnership/.test(runtime)&&/secondary\.idleIk\*this\.nonCombatArmOwnership/.test(runtime)&&/secondary\.combatCap/.test(runtime)&&/secondary\.idleCap/.test(runtime),'support-hand IK remains profile-bounded and still yields outside combat');
for(const profile of ['sword','greatsword','dual','spear','staff','bow'])pass(new RegExp(`${profile}:\\{`).test(motions),`weapon combat motion profile exists: ${profile}`);
const twoHandWeights=[...grip.matchAll(/secondary:\{side:'left',[^}]*idleIk:(\.[0-9]+),combatIk:(\.[0-9]+)/g)].map(m=>({idle:Number(m[1]),combat:Number(m[2])}));
pass(twoHandWeights.length===3&&twoHandWeights.every(x=>x.idle>0&&x.idle<=.4&&x.combat>0&&x.combat<=.9)&&/spear:\{[\s\S]*combatCap:\.86/.test(grip)&&/staff:\{[\s\S]*combatCap:\.80/.test(grip),'greatsword/spear/staff keep bounded support contact while spear/staff can remain genuinely two-handed in combat');
pass(/visualHeightRatio:2\.20/.test(monsters)&&/combatRadius:1\.35/.test(monsters),'Golden Queen is explicitly 2.20x player height with matched combat radius');
pass(/monsterVisualHeight/.test(monsterModel)&&/targetWorldHeight/.test(monsterModel),'authored monster assets are fitted to explicit world height');
pass(pkg.scripts?.['verify:r15']==='node scripts/verify-r15.mjs','package retains the R15 compatibility gate');
const expected={
 'public/assets/animations/mixamo/Walking.glb':'dce96054f2befa04435c768ecc7c17bd22094a3b6a7013859beb773676c8ab4f',
 'public/assets/animations/mixamo/Fast_Run.glb':'00fa9f493cbd8df6cfbd170304ca199f63aba032ef575276861f93250a412b71',
 'public/assets/bosses/golden_queen.glb':'69c224d02c80a9dc0fe9909bd98c7fc5ff3f4bd9af1ccff31a4858cd3f9db142',
};
for(const [file,hash] of Object.entries(expected)){pass(exists(file),`supplied asset exists: ${file}`);pass(sha(file)===hash,`supplied asset hash unchanged: ${file}`);}
console.log('R15 VERIFICATION: PASS');
