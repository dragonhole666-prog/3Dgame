# PROJECT_HANDOFF.md — 青嵐志 / Qinglan Webgame

## Repository
dragonhole666-prog/3Dgame

## Active Branch
hf27-remote-visual-pipeline

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
- HF27 serializable visual profile added.
- Runtime Visual LookDev panel added; enable with ?lookdev=1.
- LookDev controller can tune environment, lights, bloom and cinematic-grade uniforms at runtime.
- WebGPU capability probe added. WebGL2 remains production renderer until TSL/post-processing parity is reached.
- HF27 visual baseline profile and screenshot plan added.
- Playwright visual-capture configuration and capture test scaffold added.
- Manual GitHub Actions remote visual gate added.
- HF27 remote-pipeline architecture documentation added.
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

Reason: npm dependency installation did not complete in the local tool environment, so node_modules was not available.

## Known Issues
- Complete HF26.5 source/server/tests/scripts/package-lock/assets are not yet in GitHub.
- Heavy binary VRM/GLB/PBR assets make a direct one-shot repository transfer unsuitable through the current chat GitHub connector.
- Screenshot URLs exist, but deterministic camera-preset handling for visualCapture=spawn/bridge/pavilion/etc. still needs to be wired into the actual game runtime.
- No public remote preview URL has been deployed yet.
- WebGPU is capability-detected only; the live renderer is not yet migrated to WebGPU.
- CI remains workflow_dispatch-only until the authoritative source tree is present.

## Current Work
Complete the source migration strategy, then make screenshot capture deterministic and deploy the first remote preview.

## Next Actions
1. Transfer authoritative text/source tree into GitHub: src, server, cloudflare worker, tests, scripts, package-lock and project configs.
2. Externalize/reprovision large third-party and generated binary assets instead of treating all of them as ordinary Git blobs.
3. Implement deterministic visualCapture camera/state presets for Spawn, Bridge, Pavilion, Forest, Character Front/Back, Equipment Closeup and Combat.
4. Run npm ci, typecheck, build, Vitest and Playwright in a real remote runner.
5. Deploy first remote preview and validate ?lookdev=1 against the real browser render.
6. Add visual comparison metrics: Oklab distance, hue/chroma distribution, luminance percentiles, clipping ratios and cool/warm separation.
7. Begin staged TSL material/post migration; keep WebGL2 fallback until visual-regression parity is proven.
8. Enable pull-request CI only after the authoritative source tree is complete.

## Cross-Conversation Resume Instruction
In any new ChatGPT conversation:
1. Open this repository.
2. Read AGENTS.md.
3. Read PROJECT_HANDOFF.md.
4. Inspect the active branch and latest commits.
5. Continue from Current Work and Next Actions.
6. Do not claim a verification passed unless its actual output was observed.

## Session Handoff Rule
Before ending a substantial development session, update:
- Current Work
- Completed
- Known Issues
- Next Actions
- Verification Results

This file is the primary cross-conversation continuation document.
