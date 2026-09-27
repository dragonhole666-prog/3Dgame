# HF27 Authoritative Source Migration Plan

## Inventory observed from the HF26.5 Visual Reboot baseline

The extracted baseline contains approximately:
- 478 files total
- ~299 MB extracted
- 337 text/source/config files
- 1,691,928 bytes of text/source/config content

The size difference is dominated by binary assets such as VRM, GLB and PBR textures.

## Non-negotiable runtime boundary

The target repository is Babylon.js only.

Do not bulk-copy the HF26 renderer tree into the active branch. Three.js, TSL, React Three Fiber, three-stdlib and renderer compatibility adapters are prohibited. The old archive is an input for behavior and asset migration, not an engine dependency.

`npm run verify:babylon-only` must pass after every migration batch.

## Phase A — port engine-independent code first

Migrate or rewrite:
- gameplay state and rules
- inventory / equipment data
- quests and combat data
- shared network policy
- server and Cloudflare worker code that does not depend on the old renderer
- UI metadata/state whose ownership is engine-independent
- tests for the above behavior

When an old module mixes gameplay and renderer code, split it. Keep the gameplay contract and rewrite the rendering side against Babylon APIs.

## Phase B — Babylon-native client systems

Port client behavior to:
- `SceneLoader` / `AssetContainer` for GLB/VRM-capable asset ingestion
- Babylon cameras and collision ownership
- Babylon animation groups / skeletons
- `PBRMaterial` material-role mapping
- instances / thin instances for repeated environment assets
- Babylon GUI or DOM UI where appropriate
- shared placement data for render/collision/navigation/camera obstruction

No temporary dual-renderer bridge is allowed.

## Phase C — reproducible third-party assets

For Quaternius / Poly Haven assets:
- keep an asset registry
- record source URL / asset ID / license
- record expected local target path
- record SHA-256 when practical
- fetch through a versioned bootstrap script

## Phase D — project-owned heavy assets

For project-specific VRM/GLB/textures that cannot be reproduced from a public source:
- keep an explicit manifest and checksum
- store them in an approved binary distribution location
- download them during remote bootstrap
- cache them in CI
- do not silently replace or regenerate them

## Current connector constraint

The ChatGPT GitHub connector can create/update repository files and Git objects, but it does not expose a one-shot upload of the mounted ~299 MB archive. Migration therefore remains staged.

## Completion criteria

Source migration is complete only when:
1. Babylon-only architecture gate passes.
2. All required gameplay/server/UI behavior is present without legacy renderer dependencies.
3. Character/equipment/world assets load through Babylon-native systems.
4. project-owned binary assets have a reproducible manifest/bootstrap path.
5. remote typecheck and production build succeed.
6. automated tests succeed.
7. fixed-camera visual capture succeeds.
8. remote preview boots and matches approved reference-look tolerances.
9. no Three.js/TSL compatibility layer is required anywhere in runtime code.
