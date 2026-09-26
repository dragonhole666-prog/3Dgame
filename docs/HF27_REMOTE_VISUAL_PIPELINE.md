# HF27 Remote Visual Production Pipeline

HF27 changes the visual-development loop from ZIP handoffs to a repeatable remote pipeline.

## Runtime direction
- Keep Three.js as the game runtime.
- Keep WebGL2 as the production backend during the first migration stage because the current EffectComposer/SSAO/Bloom stack is WebGL-oriented.
- Detect WebGPU and treat it as a migration candidate. Port custom materials/post effects to TSL before switching the production renderer.
- Use `?lookdev=1` to expose the HF27 Visual LookDev panel in development/preview builds.

## LookDev contract
A versioned visual profile controls environment, key/fill/rim/bounce lighting, exposure, bloom, and cinematic grade uniforms. Values persist in localStorage while tuning and can be copied as JSON for promotion into the checked-in baseline.

## Remote visual-regression contract
The screenshot plan is stored in `config/hf27-screenshot-plan.json`. Playwright captures deterministic 1600×900 frames for Spawn, Bridge, Pavilion, Forest, Character Front/Back, Equipment Closeup, and Combat.

A future metric stage compares captures against approved reference frames using Oklab distance, hue/chroma distributions, luminance percentiles, clipping ratios, and cool/warm separation. Pixel-perfect comparison is intentionally not the primary gate for a real-time 3D scene.

## WebGPU / TSL migration gates
1. WebGPU capability detection and diagnostics.
2. TSL equivalents for custom material nodes and creative grading.
3. Post-processing parity with current SSAO/Bloom/grade.
4. Screenshot-regression parity across WebGL2 and WebGPU.
5. Only then allow WebGPU as the default backend.
