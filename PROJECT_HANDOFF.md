# PROJECT_HANDOFF.md — 青嵐志 / Qinglan Webgame

## Repository
dragonhole666-prog/3Dgame

## Active Branch
hf35-fullgame-babylon-recovery

## Current Target
Recover the complete historical game while migrating every active runtime rendering subsystem to Babylon.js only.

## Non-negotiable end state
- Preserve original player characters, equipment, customization, animations, skills, monsters, NPCs, world/map data, combat rules, UI, networking and server authority.
- Babylon.js is the only shipping/runtime 3D engine.
- No Three.js fallback, compatibility bridge or selectable legacy renderer.
- WebGPU first where stable; Babylon WebGL2 fallback only.
- Remove Three.js / three-pathfinding / @pixiv/three-vrm dependencies after their remaining migration-reference files are ported or quarantined out of the build.
- Visual LookDev work must never replace or delete gameplay content.

## Recovery source hierarchy
1. HF34 / HF26.5 full-game branch is authoritative for gameplay and authored content.
2. HF27 visual branch is reference material for newer Babylon LookDev / screenshot work only.
3. HF35 is the integration branch: full game + Babylon-native rendering.

## Completed in HF35
- Normal boot now loads `BabylonGame`; old `client/core/game.ts` is not selected by runtime flags or fallback.
- Shared/server gameplay authority remains intact.
- Player, NPC and monster network snapshots are projected into Babylon actors.
- Player/NPC/monster GLB/VRM containers load through Babylon `SceneLoader.LoadAssetContainerAsync`.
- Original avatar candidate selection remains wired into the Babylon actor loader.
- `three-pathfinding` active navigation path was replaced by renderer-independent A* navigation.
- Babylon-native UI preview path added.
- Babylon-native equipment attachment layer added using actor sockets and shared equipment data.
- Babylon actor runtime now exposes humanoid socket nodes for equipment.
- Player equipment is synchronized from authoritative snapshot equipment onto Babylon actors.
- Babylon-native skill presentation runtime added; cast/hit events now produce Babylon effects from shared skill definitions.
- Active-runtime architecture gate rejects Three.js / three-pathfinding / @pixiv/three-vrm imports reachable from the shipping Babylon entry.
- Full-game preservation gate checks network snapshots, players, monsters, NPCs, shared skills and Babylon asset loading.

## Verification
Observed before the latest skill-FX commit:
- HF35 CI reached TypeScript typecheck and exposed equipment typing errors.
- Those equipment typing errors were fixed in commits:
  - `fe5782f51800ac05ce971a8694c3a86939367968`
  - `6fe9b79dd5b21363f395aae1bdbcac88035bedd2`
- A subsequent CI run showed TypeScript typecheck PASS and moved into production build.

Latest migration commits:
- `c4fd64349814177389982af65859f4b4971480f6` — Babylon-native skill FX runtime.
- `d1fac9ef33da1fd817a9c15e7743b828560fa693` — wire authoritative skill events into Babylon FX runtime.

The CI run for the latest head must still be observed before claiming the head is green.

## Known Issues / Remaining Three migration
Legacy Three.js source files still exist as migration references, including examples such as:
- `src/client/core/game.ts`
- `src/client/character/character.ts`
- `src/client/character/monster-model.ts`
- `src/client/rendering/xianxia-skill-fx.ts`
- `src/client/world/world-renderer.ts`

They are not allowed to become runtime fallbacks. Their required behavior must be ported subsystem-by-subsystem to Babylon, then the legacy files/dependencies removed.

`package.json` still contains `three`, `three-pathfinding`, `@pixiv/three-vrm` and `@types/three` temporarily because legacy reference files are still included in the TypeScript project. This is migration debt, not the target architecture.

## Next Actions
1. Observe/fix the latest HF35 CI until typecheck, build, Babylon runtime gate and full-game preservation gate all pass.
2. Port locomotion / idle / run / attack / skill animation selection from legacy character code to Babylon `AnimationGroup` control.
3. Port remaining skill-specific VFX behavior from the Three implementation into `BabylonSkillFx` without importing Three code.
4. Port monster-specific presentation / boss animation behavior to Babylon actor controllers.
5. Port any world/map rendering behavior still only represented by legacy Three world modules into `client/babylon/world`, preserving `shared/data/hf265-world-layout.ts` coordinates/collision.
6. Quarantine/delete converted Three renderer files from the TypeScript build.
7. Remove `three`, `three-pathfinding`, `@pixiv/three-vrm`, `@types/three` from package/package-lock.
8. Run final repository-wide no-Three gate plus full-game browser smoke tests.
9. Only after gameplay-preservation gates are stable, resume 90% visual-reference iteration on the full game.

## Session Handoff Rule
Before ending substantial work, update this file with:
- migrated subsystem
- remaining legacy subsystem
- exact verification output
- latest commit/run
