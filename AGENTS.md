# AGENTS.md — 青嵐志 / Qinglan Webgame

## Project Goal
Build and maintain a browser-based 3D xianxia game with a remote-first production workflow and commercial-grade rendering.

## Authoritative Runtime Stack
- Babylon.js
- WebGPU first where stable; WebGL2 fallback when required
- TypeScript
- Vite
- GitHub as source of truth
- Remote preview deployment
- Automated build / screenshot / visual-regression pipeline

Three.js / TSL is no longer the target runtime architecture for new P0 work. Do not add new Three.js rendering code unless it is part of a temporary migration adapter that is explicitly marked for removal.

## P0 Visual Target
The supplied reference image is the primary art-direction target for P0.

Target characteristics:
- cinematic xianxia garden composition
- lake/water occupying a large foreground share
- coral / vermilion / orange-red maple canopy
- warm timber pavilions and bridge against cool cyan atmosphere
- layered blue-grey karst mountains
- pale cyan daylight and atmospheric perspective
- high material separation: water / foliage / stone / wood / metal / cloth / skin
- clean highlights, cool deep shadows, warm key accents
- realistic/dreamlike rendering, never flat-cartoon or muddy

The goal is progressive reference matching, not blind palette copying. Composition, material response, lighting ratios, fog depth, reflection strength and post-processing must all be tuned together.

## Babylon Rendering Policy
Use Babylon-native systems:
- WebGPUEngine with Engine fallback
- PBRMaterial / PBRMetallicRoughnessMaterial
- DefaultRenderingPipeline for bloom / FXAA / image processing where suitable
- CascadedShadowGenerator for outdoor key shadows
- MirrorTexture / reflection probes / environment textures for water and reflective assets
- thin instances / instances for repeated foliage and props
- AssetContainer / SceneLoader for modular GLB import
- GUI or DOM-based LookDev controls with serializable profiles

## Remote LookDev
Runtime LookDev must expose:
- exposure / contrast / tone mapping
- sun intensity / color / direction
- sky / hemisphere / fill / rim balance
- fog color / density
- maple / grass / stone / wood palette
- water deep/shallow color, roughness, reflection
- bloom / vignette
- environment intensity

All values must serialize to a versioned visual profile.

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
- luminance percentiles
- highlight clipping
- shadow clipping
- cool/warm separation

## Asset Policy
Preferred free sources:
- Quaternius
- Poly Haven

Every imported external asset must record source, license and target path.

## Architecture Rules
- UI metadata must have a single source of truth.
- Shared network policy must be centralized.
- Avoid per-frame object allocation in render hot paths.
- Repeated foliage / rocks / props should use instances or thin instances where practical.
- World placement, collision, navigation obstruction and camera collision should derive from shared placement data.
- Do not reintroduce the legacy uploaded-map pipeline.
- Do not reintroduce Three.js as the primary renderer.

## Git Workflow
- main = stable baseline
- active development branch = hf27-remote-visual-pipeline
- substantial work goes through PR review
- never claim a test passed unless actual output was observed

## Cross-Conversation Continuity
At the start of a new ChatGPT conversation:
1. Open PROJECT_HANDOFF.md.
2. Inspect the active branch and latest commits.
3. Read AGENTS.md.
4. Continue from Current Work and Next Actions.
5. Update PROJECT_HANDOFF.md before ending substantial work.

## Verification Principle
Never substitute inferred success for observed success.
If build/test/preview cannot run, record the limitation explicitly.
