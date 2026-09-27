# HF27 Source Import Status

## Current authoritative branch
`hf27-remote-visual-pipeline` now contains the Babylon-only P0 runtime shell, reference-match world, LookDev controls, fixed visual-capture cameras and CI architecture gate.

The runtime package dependencies are Babylon.js only. A repository guard rejects Three.js / React-Three runtime imports before build.

## HF26.5 baseline role
The extracted HF26.5 Visual Reboot archive remains useful as a migration reference for:
- gameplay rules
- networking contracts
- UI behavior
- character/equipment data
- project-owned VRM/GLB/PBR assets
- tests whose behavior remains valid

It is **not** an authoritative renderer source anymore. Do not transfer the previous renderer wholesale and do not preserve a compatibility bridge.

## Current GitHub limitation
The complete HF26.5 gameplay/server/assets tree has not yet been transferred into GitHub. The full archive was roughly 299 MB extracted and contains many binary VRM/GLB/PBR assets.

This means the current branch proves the Babylon rendering/LookDev foundation, but it is not yet the complete historical game feature set.

## Next import target
Port in this order:
1. engine-independent gameplay/data contracts
2. server / worker / network policy
3. UI metadata and application state
4. character and equipment loading through Babylon `SceneLoader` / `AssetContainer`
5. project-owned large assets through a versioned asset manifest
6. tests adapted to the Babylon-only runtime

Every imported text/source batch must pass:
- `npm run verify:babylon-only`
- TypeScript typecheck
- production build
- relevant tests

Do not import legacy renderer modules just to make old code compile.
