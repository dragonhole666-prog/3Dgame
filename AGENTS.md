# AGENTS.md — 青嵐志 / Qinglan Webgame

## Project Goal
Build and maintain a browser-based 3D xianxia game using a remote-first production workflow.

## Authoritative Stack
- Babylon.js 9.28.0 is the primary game renderer/runtime.
- WebGPU where supported, with Babylon WebGL2 fallback.
- Three.js is legacy compatibility only and must require explicit ?engine=three.
- New world rendering, materials, water, post-processing and LookDev work belongs in src/client/babylon/.
- TypeScript
- Vite
- GitHub as source of truth
- Remote preview deployment
- Automated build/test/screenshot/visual-regression pipeline

## Visual Production Workflow
1. Modify source code/assets on a feature branch.
2. Run build/typecheck/tests.
3. Deploy a remote preview.
4. Capture fixed-camera screenshots.
5. Compare against reference visual targets.
6. Tune lighting, materials, atmosphere, water, post-processing, composition.
7. Re-run visual regression before merge.

## Visual Art Direction
Target: realistic/dreamlike xianxia, not flat cartoon rendering.

Core look:
- cool cyan/blue sky and water
- pale blue atmospheric haze
- coral/orange-red maple foliage
- warm timber and architectural accents
- clean highlights and cool shadows
- strong but controlled cool/warm separation
- layered distant mountains and mist
- cloth, metal, jade, skin treated as distinct material classes

## Remote LookDev
The project should expose a runtime Visual LookDev panel for:
- sun intensity / temperature
- environment exposure
- fog density / color
- foliage palette
- water deep/shallow colors
- Fresnel / reflection
- material roughness / metalness / env response
- post exposure / bloom / contrast / color grade

LookDev values must be serializable into a versioned visual profile.

## Fixed Visual Regression Cameras
Minimum:
- Spawn
- Bridge
- Pavilion
- Forest
- Character Front
- Character Back
- Equipment Closeup
- Combat

## Visual Metrics
Track where useful:
- Oklab color distance
- hue distribution
- chroma / saturation
- luminance distribution
- highlight clipping
- shadow clipping
- cool/warm separation

## Asset Policy
Preferred free sources:
- Quaternius
- Poly Haven

Do not introduce assets without recording source and license in the repository.

## Architecture Rules
- UI metadata must have a single source of truth.
- Shared network policy must be centralized.
- Do not move new rendering work back into the legacy Three.js pipeline.
- Do not use removed/deprecated Three.js Geometry/Face3 APIs in compatibility code.
- Avoid per-frame object allocation in requestAnimationFrame hot paths.
- Repeated foliage/rocks should use instancing where practical.
- World visual placement, collision, navigation obstruction, and camera collision should derive from shared placement data where practical.
- Do not reintroduce the legacy uploaded-map pipeline once removed.

## Git Workflow
- main = stable baseline
- active development branch = hf34-babylon-reference-look
- substantial work should be reviewed through PRs
- never claim a test passed unless the actual command/output was observed

## Cross-Conversation Continuity
At the start of a new ChatGPT conversation:
1. Open PROJECT_HANDOFF.md.
2. Inspect current branch and latest commits.
3. Read AGENTS.md.
4. Continue from Current Work and Next Actions.
5. Update PROJECT_HANDOFF.md before ending a substantial work session.

## Verification Principle
Never substitute inferred success for observed success.
If build/test/preview cannot run, record the limitation explicitly.
