# Qinglan Realms — Current Third-Party Notices

This file replaces the historical per-release notice files that were removed during the P0.25.6r cleanup.

## Runtime libraries
- Three.js — MIT License. Used for WebGL rendering, GLTF loading, animation, post-processing and utility APIs.
- @pixiv/three-vrm — MIT License. Used for VRM humanoid loading/runtime support.
- three-pathfinding — MIT License. Used by navigation/pathfinding logic.
- ws — MIT License. Used by the local Node.js WebSocket server.

## Character assets
- `public/assets/open/p022/characters/qinglan-main.vrm`: VRoid Studio beta HairSample_Male sample; project records identify this sample as CC0.
- `public/assets/open/p0238/characters/03_...` through `10_...`: embedded VRM 0.x metadata reports `licenseName=CC0`, commercial use allowed, users allowed.
- `01_Base_Female.vrm` and `02_Base_Male.vrm`: embedded metadata reports `licenseName=Other`, commercial use allowed, author `jin`. They are intentionally not relabeled as CC0. Preserve original source/license records before external redistribution.

## Monster visual fallback assets
The runtime can optionally load selected Gobkit free animal GLBs from `Ariescar/gobkit-free-assets`, pinned commit `0d654ab3306515b1b63621a5c6548554034482dc`: Corgi, Rhino, Bat and Anglerfish. Project records identify these assets as CC0 1.0/public domain. If unavailable, Qinglan uses its procedural creature fallback.

## User-supplied equipment
- `public/assets/user-equipment/ice-mythic-sword.glb`: user-provided project content (uploaded as `神裝冰劍.glb`). No license metadata was supplied with the file. Verify redistribution/commercial rights before distributing this asset outside the project.

## Project-authored assets
- `public/assets/animations/default/*.vrma` are Qinglan-authored/generated gameplay animations.
- `public/assets/equipment/*.glb` are project-authored/generated equipment assets.
- `public/assets/user-world/xianxia_world.glb` is the project-supplied primary world asset.

## Design/API references
Some combat/IK implementation work was informed by public APIs and design patterns from Three.js, pixiv/three-vrm and MIT-licensed third-person combat examples. The project implementation is adapted to Qinglan's own server-authoritative combat/runtime architecture.

## HF25 External Look-dev Sources

### Poly Haven
- Public API: https://api.polyhaven.com
- Assets: https://polyhaven.com
- Runtime look-dev uses CC0 HDRI, PBR texture and model assets discovered through the official Poly Haven API.
- Poly Haven assets are CC0. The live API is credited in the login footer as "Powered by Poly Haven".

### Polyfork secondary LOD
- https://polyfork.dev
- HF25 uses only free, hotlinkable secondary/distant LOD assets from the public catalog.
- These assets are not redistributed as a standalone asset pack and are not the hero visual source.
