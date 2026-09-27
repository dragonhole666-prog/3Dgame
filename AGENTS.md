# AGENTS.md — 青嵐志 / Qinglan Webgame HF35 Recovery

## Non-negotiable goal
Recover the complete historical game (player characters, equipment, animations, skills, monsters, NPCs, map/world, UI, networking, combat and server authority) while migrating the runtime to **Babylon.js only**.

## Runtime engine policy
- Babylon.js is the only allowed runtime 3D engine.
- WebGPU first where stable; Babylon WebGL2 fallback is allowed.
- Three.js, three-pathfinding, @pixiv/three-vrm, React Three Fiber, TSL and renderer compatibility bridges are forbidden in the shipping/runtime import graph.
- Never replace or discard gameplay systems merely to simplify rendering migration.
- Preserve shared gameplay data, server/network contracts, map coordinates, collision rules, combat numbers, skills, monsters, NPCs, equipment and character customization unless a change is explicitly required for Babylon parity.
- Legacy Three files may exist only as temporary migration reference while being ported. They must never be selected by runtime flags or fallbacks and must be removed/quarantined from the final build.

## Recovery source hierarchy
1. Full historical gameplay/source/assets from HF34 / HF26.5 packages are authoritative for game features.
2. HF27 visual branch is authoritative only for the newer Babylon LookDev/reference-match rendering work.
3. HF35 combines both: full game behavior + Babylon-only rendering.

## Babylon migration mapping
- THREE.Scene/WebGLRenderer -> Babylon Scene/Engine/WebGPUEngine.
- PerspectiveCamera/OrbitControls -> FreeCamera/ArcRotateCamera or game camera controller.
- Mesh/Geometry/Material -> Babylon Mesh/PBRMaterial.
- GLTFLoader/VRMLoader -> Babylon SceneLoader/AssetContainer. VRM files are GLB containers; load with glTF plugin and ignore unsupported VRM extensions where necessary.
- AnimationMixer/AnimationAction -> Babylon AnimationGroup/Skeleton/TransformNode animation.
- EffectComposer/Bloom/SSAO/color grade -> Babylon DefaultRenderingPipeline/SSAO2/GlowLayer/ImageProcessing.
- Three particle/VFX -> Babylon ParticleSystem/GPUParticleSystem/NodeMaterial/custom Babylon meshes.
- Raycaster -> scene.pick / PickingInfo.
- three-pathfinding -> engine-independent authoritative navigation or Babylon navmesh; server gameplay must not depend on a browser renderer.
- InstancedMesh -> Babylon instances/thin instances.

## Preservation gates
A migration is not accepted unless:
- original world/map data still loads;
- player and NPCs are visible;
- monsters are visible;
- hotkey skills still resolve from shared skill data;
- combat/network snapshots remain authoritative;
- equipment/customization data remains readable;
- Babylon-only architecture gate passes for the active runtime;
- typecheck/build and browser smoke capture are observed.

## Visual direction
Use the supplied xianxia garden reference as the LookDev target. Visual tuning must not delete gameplay content. Rendering quality work comes after gameplay-preservation gates.

## Active branch
hf35-fullgame-babylon-recovery

## Workflow
1. Port one subsystem.
2. Verify feature parity.
3. Remove that subsystem's Three dependency.
4. Run architecture/type/build/browser checks.
5. Record status in PROJECT_HANDOFF.md.
