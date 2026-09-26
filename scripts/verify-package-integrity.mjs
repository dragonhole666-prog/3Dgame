import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolveRoot = relative => path.join(root, relative.replaceAll('/', path.sep));
const existsFile = relative => {
  const target = resolveRoot(relative);
  return fs.existsSync(target) && fs.statSync(target).isFile() && fs.statSync(target).size > 0;
};
const read = relative => fs.readFileSync(resolveRoot(relative), 'utf8').replace(/^\uFEFF/, '');
const must = (ok, message) => {
  if (!ok) throw new Error(`PACKAGE INTEGRITY FAIL: ${message}`);
  console.log('PASS ', message);
};

const required = [
  'package.json',
  'package-lock.json',
  'README_使用說明_P0.26.8_HF9.txt',
  'README_使用說明_P0.26.8_HF10.txt',
  'QINGLAN_TEST_CENTER.py',
  'QINGLAN_TEST_CENTER.pyw',
  'scripts/sync-runtime-release.mjs',
  'scripts/verify-current.mjs',
  'scripts/verify-package-integrity.mjs',
  'scripts/verify-world-sync.mjs',
  'scripts/bake-garment-morph-assets.mjs',
  'scripts/verify-garment-morph-assets.mjs',
  'scripts/garment-morph-asset-report.json',
  'scripts/sync-equipment-fit-modules.mjs',
  'scripts/verify-equipment-fit-modules.mjs',
  'scripts/equipment-fit-module-report.json',
  'scripts/verify-all-garment-fit.mjs',
  'scripts/verify-editor-equipment-import.mjs',
  'server/equipment-import.ts',
  'src/shared/data/editor-equipment.generated.ts',
  'tests/editor-equipment-import-hf9.test.ts',
  'server/index.ts',
  'cloudflare/world-worker/src/index.js',
  'cloudflare/world-worker/wrangler.jsonc',
  'src/shared/network/network-policy.ts',
  'src/client/ui/panel-registry.ts',
  'src/client/character/action-rpg-weapon-layer.ts',
  'src/client/character/character-composition-runtime.ts',
  'src/client/character/character-morph-runtime.ts',
  'src/client/character/garment-fit-standard.ts',
  'src/client/character/garment-morph-runtime.ts',
  'src/shared/data/equipment-fit-modules.generated.ts',
  'src/client/character/character-expression-runtime.ts',
  'src/client/character/character-runtime-architecture.ts',
  'src/client/character/combat-animation-types.ts',
  'src/client/character/weapon-animation-profiles.ts',
  'src/client/character/class-animation-sets.ts',
  'src/client/character/combat-animation-resolver.ts',
  'src/client/character/locomotion-style-profiles.ts',
  'tests/character-architecture-p0260.test.ts',
  'tests/combat-animation-architecture-p0263.test.ts',
  'tests/locomotion-archery-p0264.test.ts',
  'tests/cloudflare-deployment-version-r262.test.ts',
  'tests/network-policy.test.ts',
  'tests/network-interest.test.ts',
  'tests/panel-registry.test.ts',
  'tests/development-guard-r8.test.ts',
  'tests/ui-layout-r9.test.ts',
  'tests/procedural-boss-animation.test.ts',
  'tests/r16-glb-authority.test.ts',
  'tests/weapon-upper-base-r18.test.ts',
  'tests/animation-transition-r19.test.ts',
  'tests/locomotion-root-r20.test.ts',
  'tests/garment-morph-assets-hf5.test.ts',
  'tests/all-garment-fit-hf7.test.ts',
  'tests/garment-auto-fit-hf8.test.ts',
  'tests/weapon-stance-r22.test.ts',
  'tests/weapon-layer-r24.test.ts',
  'tests/weapon-style-r25.test.ts',
  'tests/weapon-motion-r26.test.ts',
  'src/shared/data/skill-vfx-profiles.ts',
  'tests/skill-vfx-hf11.test.ts',
  'README_使用說明_P0.26.8_HF11.txt',
  'README_P0.26.8_HF12_戰鬥演出與命中回饋強化.txt',
  'tests/skill-vfx-hf12.test.ts',
  'src/shared/data/monster-telegraph-profiles.ts',
  'tests/combat-readability-hf13.test.ts',
  'README_P0.26.8_HF13_戰鬥可讀性與狀態演出強化.txt',
  'README_P0.26.8_HF14_裝備顯示與最近目標鎖定修正.txt',
  'README_P0.26.8_HF15_裝備解剖骨架合身修正.txt',
  'README_P0.26.8_HF18_商業仙俠PBR視覺優化.txt',
  'README_P0.26.8_HF18.2_TypeScript編譯修正.txt',
  'README_P0.26.8_HF21_商業仙俠場景材質與主地圖修正.txt',
  'README_P0.26.8_HF22_Cinematic_Rendering_Pipeline.txt',
  'README_P0.26.8_HF23_AI修仙短劇成色重製.txt',
  'README_P0.26.8_HF24_免費AI_API美術資產管線.txt',
  'README_P0.26.8_HF25_驚豔成品_ExternalArtLookdev.txt',
  'src/client/rendering/external-art-assets.ts',
  'src/client/world/external-prop-layer.ts',
  'tests/external-lookdev-hf25.test.ts',
  'scripts/ai-free-3d-bootstrap.mjs',
  'public/assets/external-lookdev/maple_leaf_mask.png',
  'public/assets/external-lookdev/peach_flower.png',
  'public/assets/external-lookdev/soft_glow.png',
  'scripts/ai-api-common.mjs',
  'scripts/ai-api-doctor.mjs',
  'scripts/ai-style-transfer.mjs',
  'scripts/ai-generate-materials.mjs',
  'scripts/ai-material-postprocess.py',
  'scripts/ai-trellis2-generate.mjs',
  'tools/trellis2_qinglan_api.py',
  'tests/ai-art-pipeline-hf24.test.ts',
  'src/client/world/ai-cinematic-props.ts',
  'public/assets/ai-models/manifest.json',
  'public/assets/ai-cinematic/grass_albedo.png',
  'public/assets/ai-cinematic/grass_normal.png',
  'public/assets/ai-cinematic/grass_roughness.png',
  'public/assets/ai-cinematic/stone_albedo.png',
  'public/assets/ai-cinematic/stone_normal.png',
  'public/assets/ai-cinematic/stone_roughness.png',
  'public/assets/ai-cinematic/wood_albedo.png',
  'public/assets/ai-cinematic/wood_normal.png',
  'public/assets/ai-cinematic/wood_roughness.png',
  'public/assets/ai-cinematic/roof_albedo.png',
  'public/assets/ai-cinematic/roof_normal.png',
  'public/assets/ai-cinematic/roof_roughness.png',
  'tests/cinematic-rendering-hf23.test.ts',
  'public/assets/hf23/grass_albedo.png',
  'public/assets/hf23/grass_normal.png',
  'public/assets/hf23/stone_albedo.png',
  'public/assets/hf23/stone_normal.png',
  'public/assets/hf23/wood_albedo.png',
  'public/assets/hf23/wood_normal.png',
  'public/assets/hf23/roof_albedo.png',
  'public/assets/hf23/roof_normal.png',
  'public/assets/hf23/water_normal.png',
  'public/assets/hf23/maple_leaf.png',
  'src/client/rendering/cinematic-rendering-pipeline.ts',
  'src/client/world/xianxia-cinematic-atmosphere.ts',
  'tests/cinematic-rendering-hf22.test.ts',
  'src/client/world/xianxia-hero-garden.ts',
  'public/assets/hf21/maple_leaf.png',
  'public/assets/hf21/mist.png',
  'public/assets/hf21/grass_albedo.png',
  'public/assets/hf21/grass_roughness.png',
  'public/assets/hf21/stone_albedo.png',
  'public/assets/hf21/stone_roughness.png',
  'public/assets/hf21/stone_normal.png',
  'public/assets/hf21/wood_albedo.png',
  'public/assets/hf21/wood_roughness.png',
  'public/assets/hf21/roof_albedo.png',
  'public/assets/hf21/roof_roughness.png',
  'public/assets/hf21/water_normal.png',
  'src/client/rendering/xianxia-visual-style.ts',
  'src/shared/data/hf265-world-layout.ts',
  'src/client/assets/quaternius-asset-registry.ts',
  'src/client/rendering/hf265-nature-materials.ts',
  'src/client/rendering/hf265-equipment-art-direction.ts',
  'src/client/world/hf265-terrain.ts',
  'src/client/world/hf265-quaternius-nature-layer.ts',
  'src/client/world/hf265-architecture-layer.ts',
  'src/client/world/hf265-water-layer.ts',
  'src/client/world/hf265-atmosphere.ts',
  'src/client/world/hf265-horizon-mountains.ts',
  'scripts/fetch-quaternius-hf265.mjs',
  'public/assets/quaternius/nature/README_LICENSE.txt',
  'tests/visual-reboot-hf265.test.ts',
  'README_P0.26.8_HF26.5_Visual_Reboot.txt',
  'tests/visual-style-hf18.test.ts',
  'tests/node-safe-render-import-hf25.3.test.ts',
  'README_P0.26.8_HF25.3_本機啟動與無DOM測試修正.txt',
  'scripts/verify-r13.mjs',
  'scripts/verify-r14.mjs',
  'scripts/verify-r15.mjs',
  'scripts/verify-r16.mjs',
  'scripts/development-baseline.json'
];
for (const relative of required) must(existsFile(relative), `required release file exists: ${relative}`);

// R3+: production launch/deploy is Python-GUI only. Legacy shell launchers are forbidden.
const forbiddenLegacyLaunchers = [
  'START_GAME.bat',
  'DEPLOY_CLOUDFLARE.bat',
  'scripts/start-game.ps1',
  'scripts/ensure-node-runtime.ps1'
];
for (const relative of forbiddenLegacyLaunchers) {
  must(!fs.existsSync(resolveRoot(relative)), `legacy shell launcher is absent: ${relative}`);
}

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
must(lock.version === pkg.version, `package-lock version matches package.json (${pkg.version})`);
must(lock.packages?.['']?.version === pkg.version, `package-lock root package version matches (${pkg.version})`);

const lockRoot = lock.packages?.[''] ?? {};
for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  const declared = pkg[section] ?? {};
  const locked = lockRoot[section] ?? {};
  for (const [name, spec] of Object.entries(declared)) {
    must(locked[name] === spec, `package-lock root ${section} matches ${name}@${spec}`);
  }
  for (const name of Object.keys(locked)) {
    must(Object.hasOwn(declared, name), `package-lock root has no stale ${section}: ${name}`);
  }
}

const resolveLockedDependency = (fromPackagePath, dependencyName) => {
  let cursor = fromPackagePath;
  while (true) {
    const candidate = cursor ? `${cursor}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`;
    if (lock.packages?.[candidate]) return candidate;
    if (!cursor) return null;
    const nestedAt = cursor.lastIndexOf('/node_modules/');
    cursor = nestedAt >= 0 ? cursor.slice(0, nestedAt) : '';
  }
};
for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
  for (const dependencyName of Object.keys(entry?.dependencies ?? {})) {
    must(Boolean(resolveLockedDependency(packagePath, dependencyName)), `lock dependency resolves: ${packagePath || '<root>'} -> ${dependencyName}`);
  }
}
for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
  if (!packagePath || entry?.link) continue;
  if (typeof entry?.resolved === 'string' && entry.resolved.startsWith('https://registry.npmjs.org/')) {
    must(typeof entry.integrity === 'string' && entry.integrity.startsWith('sha512-'), `registry lock entry has integrity: ${packagePath}`);
  }
}

const packageScriptRefs = Object.values(pkg.scripts ?? {})
  .flatMap(command => [...String(command).matchAll(/scripts[\/]([A-Za-z0-9._-]+\.(?:mjs|js|cjs))/g)])
  .map(match => `scripts/${match[1]}`);
for (const relative of new Set(packageScriptRefs)) must(existsFile(relative), `package.json script dependency exists: ${relative}`);

const gui = read('QINGLAN_TEST_CENTER.py');
must(/npm-cli\.js/.test(gui) && /npx-cli\.js/.test(gui), 'Python GUI invokes npm/npx through Node JS entrypoints');
must(/_assert_direct\(command\)/.test(gui) && /shell=False/.test(gui), 'Python GUI enforces direct subprocess execution without shell mode');
must(/verify-world-sync\.mjs/.test(gui) && /vite["']?\s*\/\s*["']bin/.test(gui), 'Python GUI owns local frontend/backend and WebSocket gates');
must(!/cmd \/d \/c|START_GAME\.bat|DEPLOY_CLOUDFLARE\.bat|start-game\.ps1/i.test(gui), 'Python GUI contains no legacy BAT/PowerShell execution path');
must(/def network_test\(self, open_browser: bool\)/.test(gui) && /_deployment_fingerprint/.test(gui), 'Python GUI network test is fully automatic');
must(!/請先填入網路網址/.test(gui) && !/network_entry/.test(gui), 'Python GUI has no manual network URL field or prompt');
must(/_quiesce_for_dependency_mutation/.test(gui) && /npm ci（EPERM 自動重試）/.test(gui) && /taskkill\.exe/.test(gui), 'Python GUI releases its local process tree before npm ci');
must(/PROJECT_RULES = \(/.test(gui) && /class DevelopmentGuard/.test(gui) && /CHANGE_IMPACT_RULES = \(/.test(gui), 'Python GUI embeds executable development rules and change-impact matrix');
must(/run_development_guard/.test(gui) && /accept_development_baseline/.test(gui) && /development-guard-latest\.json/.test(gui), 'Python GUI gates workflows with Development Guard and baseline tracking');
must(/scripts\/verify-r16\.mjs/.test(gui) && /_procedural_boss_tests/.test(gui) && /self\._typecheck\(\)/.test(gui), 'Python GUI hard-gates R16 authoritative GLB motion and TypeScript before launch/release');
console.log('PACKAGE INTEGRITY: PASS');
