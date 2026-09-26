# PROJECT_HANDOFF.md — 青嵐志 / Qinglan Webgame

## Repository
dragonhole666-prog/3Dgame

## Current Target
HF27 Remote Visual Production Pipeline

## Mission
Convert the project to a remote-first browser 3D production workflow:

Three.js / WebGPU / TSL
+ Remote Web 3D Preview
+ Visual LookDev Editor
+ Quaternius / Poly Haven asset pipeline
+ Automated Build
+ Automated Screenshot Capture
+ Visual Regression

## Current State
The GitHub repository has been initialized for remote development.

The previous project baseline discussed before migration is P0.26.8 / HF26.5 Visual Reboot. The authoritative project source has not yet been imported into this repository.

## Known HF26.x Direction
- Legacy uploaded map path was being removed.
- Scene direction moved toward a rebuilt xianxia hero garden.
- Quaternius nature assets and Poly Haven assets were selected as preferred free sources.
- Visual direction emphasizes cool sky/water, coral-orange foliage, warm architecture, layered blue-grey haze, and differentiated PBR materials.
- Equipment needs explicit material-role mapping rather than broad name-based recoloring.
- World placement/collision/navigation/camera collision should converge on shared placement data.

## HF27 Architecture Target
GitHub
→ source changes
→ typecheck/tests/build
→ remote preview
→ fixed-camera screenshots
→ reference comparison
→ LookDev tuning
→ visual regression gate
→ PR / merge

## Required HF27 Systems
1. Remote preview environment.
2. Visual LookDev panel with serializable profiles.
3. WebGPU/TSL migration plan with safe fallback.
4. Reference-image comparison tooling.
5. Fixed-camera screenshot capture.
6. Visual regression thresholds.
7. Asset registry + license manifest.
8. Performance budget and regression checks.

## Initial Visual Acceptance Targets
- sky must not look like flat/dead blue
- ground must not look muddy green
- maple canopy should read coral/orange/pink rather than dull brown
- water should reflect sky and warm foliage accents
- distant mountains should read blue-grey with layered haze
- cloth should not look like blue plastic
- metal should not look flat yellow
- skin should not look grey-white
- cool/warm separation should remain controlled and coherent

## Current Work
Initialize the GitHub repository and prepare the HF27 remote production branch.

## Completed
- Repository connection verified.
- README created.

## Known Issues
- Authoritative source archive has not yet been imported into GitHub.

## Next Actions
1. Import the authoritative source project into this repository.
2. Create/confirm branch hf27-remote-visual-pipeline.
3. Audit package.json, renderer setup, world renderer, post-processing, asset loading, and tests.
4. Add remote-preview workflow.
5. Add Visual LookDev profile system.
6. Add fixed-camera screenshot capture.
7. Add visual-regression baseline and metrics.
8. Begin staged WebGPU/TSL migration.

## Session Handoff Rule
Before ending a substantial development session, update:
- Current Work
- Completed
- Known Issues
- Next Actions
- Verification Results

This file is the primary cross-conversation continuation document.
