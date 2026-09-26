# PROJECT_HANDOFF.md — 青嵐志 / Qinglan Webgame

## Repository
dragonhole666-prog/3Dgame

## Active Branch
hf27-remote-visual-pipeline

## Current Target
HF34 Babylon.js Reference-Look Lock

## Mission
Run the game primarily on Babylon.js and converge the shipped rendering language on the supplied xianxia garden reference:

Babylon.js / WebGPU / WebGL2 fallback
+ Quaternius hero-garden assets
+ ACES reference grade
+ reflective water / atmospheric depth
+ fixed-camera visual regression
+ remote preview and CI

## Current State
GitHub is now the remote source-of-truth target and the HF27 feature branch is active.

The authoritative local baseline available to this work session is P0.26.8 / HF26.5 Visual Reboot. The complete HF26.5 source/assets have not yet been transferred into GitHub; the branch currently contains HF27 bootstrap/configuration files and new remote-visual tooling.

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

## Completed
- GitHub write access verified for dragonhole666-prog/3Dgame.
- README.md, AGENTS.md and this handoff document created.
- Development branch hf27-remote-visual-pipeline created.
- Draft PR #1 opened for the HF27 bootstrap; it must remain draft until the authoritative source is migrated and browser verification passes.
- HF27 serializable visual profile added.
- Runtime Visual LookDev panel added; enable with ?lookdev=1.
- LookDev controller can tune environment, lights, bloom and cinematic-grade uniforms at runtime.
- WebGPU capability probe added. WebGL2 remains production renderer until TSL/post-processing parity is reached.
- HF27 visual baseline profile and screenshot plan added.
- Playwright visual-capture configuration and capture test scaffold added.
- Dependency-free PNG perceptual visual-regression analyzer added.
- Oklab, luminance, chroma, highlight/shadow share and warm/cool-balance thresholds added.
- Manual GitHub Actions remote visual gate added.
- HF27 remote-pipeline and visual-regression documentation added.
- Authoritative source-migration plan added.
- Source-import status document added.
- Local HF26.5 integration baseline was extracted and checked with existing project verifiers.

## Verification Results
Observed local verification after HF27 integration:
- node scripts/verify-current.mjs → PASS
- node scripts/verify-package-integrity.mjs → PASS
- HF27 JSON / Node syntax checks → PASS
- focused HF27 TypeScript parse produced no HF27 errors after excluding unresolved third-party-module errors caused by node_modules being unavailable

Not yet verified:
- npm typecheck
- npm build
- Vitest suite
- Playwright screenshot suite
- deployed browser preview
- end-to-end visual-regression comparison against captured browser output

Reason: npm dependency installation did not complete in the local tool environment, so node_modules was not available.

## Source Migration Inventory
Observed from the extracted HF26.5 baseline:
- approximately 478 files total
- approximately 299 MB extracted
- 337 text/source/config files
- 1,691,928 bytes of text/source/config content

The size difference is primarily VRM/GLB/PBR and other binary assets.

## Known Issues
- Complete HF26.5 source/server/tests/scripts/package-lock/assets are not yet in GitHub.
- Heavy binary VRM/GLB/PBR assets make a direct one-shot repository transfer unsuitable through the current chat GitHub connector.
- Screenshot URLs exist, but deterministic camera-preset handling for visualCapture=spawn/bridge/pavilion/etc. still needs to be wired into the actual game runtime.
- No public remote preview URL has been deployed yet.
- WebGPU is capability-detected only; the live renderer is not yet migrated to WebGPU.
- CI remains workflow_dispatch-only until the authoritative source tree is present.

## Current Work
HF34 reference lock is implemented on branch hf34-babylon-reference-look:
- Babylon remains the default runtime; Three.js is explicit legacy fallback only.
- Reference palette/metrics live in src/client/babylon/reference-style.ts.
- ACES/Bloom/SSAO tuning lives in src/client/babylon/rendering/reference-pipeline.ts.
- Hero garden prefers local Quaternius glTF assets and falls back visually when absent.
- Water uses Babylon MirrorTexture plus normal detail.
- HF265 movement/collision layout remains authoritative and unchanged by HF34.

## Completed
- Babylon/WebGPU path with WebGL2 fallback.
- Reference-style quantitative target and palette.
- Quaternius-aware Babylon hero-garden rendering.
- HF34 source regression test and CI branch coverage.

## Known Issues
- Quaternius assets must exist under public/assets/quaternius/nature for the highest quality path; run npm run assets:quaternius:hf265 when absent.
- Final visual fidelity still requires fixed-camera screenshot comparison against the supplied reference image.
- Legacy Three.js code remains packaged for explicit compatibility fallback.

## Next Actions
1. Observe HF34 CI typecheck/build/test results.
2. Capture Spawn / Bridge / Pavilion / Forest screenshots from Babylon.
3. Compare captures to the reference metrics and image.
4. Tune composition, tree placement, water framing and architecture silhouette without changing gameplay collision/movement.
5. Merge only after the visual regression gate is acceptable.

## Session Handoff Rule
Before ending a substantial development session, update:
- Current Work
- Completed
- Known Issues
- Next Actions
- Verification Results

This file is the primary cross-conversation continuation document.
