# PROJECT_HANDOFF.md — 青嵐志 / Qinglan Webgame

## Repository
dragonhole666-prog/3Dgame

## Active Branch
hf27-remote-visual-pipeline

## Current Target
P0 Babylon-only runtime + reference-matched commercial LookDev foundation

## Mission
Build the browser game on one rendering architecture only:

Babylon.js
+ WebGPU first / Babylon WebGL2 fallback
+ PBR material-role pipeline
+ Remote Web 3D Preview
+ Visual LookDev
+ Fixed-camera capture
+ Perceptual visual regression
+ GitHub source of truth

Three.js, TSL, React Three Fiber, three-stdlib and dual-renderer compatibility layers are prohibited.

## Current State
The active branch now has a Babylon-only P0 runtime shell and no Three.js runtime dependency in `package.json`.

The branch is intentionally no longer waiting for a wholesale HF26 renderer transfer. HF26.5 is treated as a migration reference for gameplay behavior, server/UI contracts and project-owned assets only. Rendering behavior must be ported to Babylon-native systems.

The complete historical gameplay/server/character/assets tree is still not in GitHub, so the branch is not yet a complete game build.

## Completed

### Babylon-only architecture
- Babylon.js packages are the only runtime rendering dependencies.
- `scripts/verify-babylon-only.mjs` rejects Three.js / React-Three runtime imports and forbidden renderer packages.
- `npm run build` now runs the Babylon-only architecture gate first.
- AGENTS.md and migration documentation prohibit renderer compatibility bridges.
- `createQinglanEngine` is explicitly Babylon-only.
- WebGPU is attempted first; Babylon Engine/WebGL2 is the fallback and deterministic capture backend.

### Rendering / LookDev refactor
- Added `BabylonVisualDirector` as the single owner for:
  - ACES tone mapping
  - exposure / contrast
  - color curves
  - linear fog
  - hemisphere / sun / cool fill / warm rim
  - bloom / FXAA / sharpening
- Sun azimuth/elevation in the visual profile now actually drives the directional light.
- LookDev profile upgraded to v2 with safe migration of old localStorage profiles.
- LookDev panel exposes the new lighting, fog, water, material and post controls.

### Reference-match calibration
The supplied 1200×675 xianxia reference was sampled and used to define major tonal anchors:
- deep cool water/shadow near `#1C3B4A`
- cyan-blue middle values near `#2A546D`
- pale sky near `#CFE7F2`
- maple/coral middle values near `#8F433E`
- warm peach highlights near `#D8AB98`

The profile was retuned around these anchors rather than applying them as flat colors.

### World / material pass
- Rebuilt world materials around Babylon `PBRMaterial`.
- Added differentiated dark/base/lit material families for:
  - maple
  - grass
  - timber
  - roof
  - stone
- Water now uses:
  - PBR clear coat
  - Babylon `MirrorTexture`
  - procedural normal detail
  - runtime-adjustable reflection / roughness / alpha / normal strength
- Sky billboard replaced by an enclosing Babylon sky dome.
- Cascaded outdoor shadows remain Babylon-native.
- Reference composition still centers on hero water, bridge, warm pavilions, maple framing and layered blue-grey mountains.

### Visual capture / CI
- Fixed camera capture remains wired for Spawn / Bridge / Pavilion / Forest / Character Front / Character Back / Equipment Closeup / Combat.
- Capture test now asserts the runtime identifies itself as Babylon.
- P0 workflow now includes the Babylon-only architecture gate.
- The branch workflow has a PR trigger in addition to branch push/manual triggering.

## Verification Results

### Historical checks before the current Babylon v2 refactor
Previously observed:
- `node scripts/verify-current.mjs` → PASS
- `node scripts/verify-package-integrity.mjs` → PASS
- earlier HF27 JSON / Node syntax checks → PASS

These historical results do **not** prove the current refactor passes.

### Observed P0 Babylon gate
Observed on commit `bcd60eea218a1f7c40b9ead3f0b562653db1b76a`, workflow run `36279975363`:
- Babylon-only architecture gate → PASS
- Typecheck → PASS
- Production build → PASS
- Chromium install → PASS
- Fixed-camera Playwright capture → PASS
- Visual capture artifact upload → PASS
- Production dist artifact upload → PASS

The captured 1200×675 screenshots were downloaded and inspected. This is the first verified browser output for the Babylon-only P0 shell.

### Current v2.3 visual-tuning commits
Latest visual tuning commits:
- `b3043656fc2a16a0aa19d3dc540573bc745499c3` — v2.3 LookDev retune
- `3f51529e610007db50b13b125b8e8a310c7959f4` — softer procedural foliage / atmosphere / water
- `318ff61aaf16fd059926438faee9c98c27bc55ef` — wider hero capture framing

A workflow result for the new v2.3 head has not yet been observed. Do not claim the current head is green until a run is visible.

## Known Issues
- Complete historical gameplay/server/UI content has not yet been ported.
- Character/equipment GLB/VRM assets are not yet integrated into the current Babylon P0 shell.
- Character Front/Back, Equipment Closeup and Combat capture slots therefore do not yet represent final migrated gameplay content.
- No approved remote screenshot baseline exists for the new v2 look.
- No public remote preview URL has been validated.
- `package-lock.json` is still absent from the current GitHub P0 shell.
- The current procedural P0 world validates rendering direction; commercial final quality still requires production GLB/PBR assets, foliage detail and texture work.
- Large project-owned binaries still require a versioned storage/bootstrap strategy.

## Current Work
Continue the Babylon-only v2.3 visual-match pass from real browser captures. The first real P0 capture run was observed and exposed the main gap: composition was structurally correct but the procedural foliage was too bulbous/dark, mountains too cyan/opaque, water too mirror-heavy and the overall lighting contrast too hard compared with the supplied airy xianxia garden reference.

The current branch has now been retuned to a softer, brighter v2.3 profile, smaller/more numerous maple clusters, paler atmospheric mountains, softer water reflection and a slightly wider hero camera. The new commits still need their own observed build/capture run before visual acceptance.

## Next Actions
1. Observe the workflow triggered by the v2.3 head and fix any regression until architecture gate, typecheck, build and capture are green.
2. Download/review the new Spawn / Bridge / Pavilion / Forest captures at 1200×675.
3. Re-run perceptual comparison against the supplied reference; focus on canopy silhouette, shadow floor, mountain haze, water luminance/reflection and warm/cool separation.
4. Continue geometry/material upgrades only from measured capture differences; avoid palette-only tuning.
5. Deploy the first remote preview and validate `?lookdev=1` in-browser.
6. Add production-grade free/open assets from Quaternius / Poly Haven with source/license/checksum records.
7. Port historical gameplay/server/UI modules in engine-independent batches; do not import the old renderer.
8. Port character/equipment loading to Babylon `SceneLoader` / `AssetContainer` and explicit material-role mapping.
9. Choose the storage/bootstrap route for large project-owned VRM/GLB/PBR assets.
10. Keep PR #1 Draft until current build/capture output is observed and the source/gameplay migration boundary is stable.

## Cross-Conversation Resume Instruction
At the start of a new conversation:
1. Open this repository and the active branch.
2. Read AGENTS.md.
3. Read this file.
4. Inspect PR #1 and the latest branch commit.
5. Continue from Current Work / Next Actions.
6. Never reintroduce Three.js or a compatibility bridge.
7. Never claim a test passed without observed output.

## Session Handoff Rule
Before ending substantial work, update:
- Current Work
- Completed
- Known Issues
- Next Actions
- Verification Results
