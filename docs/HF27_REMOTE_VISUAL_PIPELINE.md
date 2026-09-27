# HF27 Remote Visual Production Pipeline

HF27 uses GitHub as the source of truth for a repeatable Babylon.js visual-development loop.

## Runtime direction
- Babylon.js is the only runtime 3D engine.
- WebGPU is attempted first where the browser supports it.
- Babylon Engine/WebGL2 remains a Babylon-native fallback and the deterministic screenshot backend.
- Three.js, TSL, React Three Fiber, three-stdlib and dual-renderer compatibility layers are prohibited.
- `npm run verify:babylon-only` is the architecture gate.
- Use `?lookdev=1` to expose the P0 Babylon Visual LookDev panel.

## Reference-match direction
The supplied 1200×675 xianxia reference is treated as an art-direction target, not merely a palette swatch.

The v2 reference profile is calibrated around:
- pale cyan daylight and haze
- deep cyan/blue water and open cool shadows
- coral/vermilion maple masses with peach highlights
- warm brown timber
- slate blue-grey roof material
- warm-neutral stone
- restrained bloom, moderate ACES contrast and controlled saturation

The visual stack is Babylon-native:
- PBRMaterial for world surfaces
- CascadedShadowGenerator for outdoor key shadows
- MirrorTexture plus procedural normal detail for hero water
- DefaultRenderingPipeline for FXAA, bloom and sharpening
- ImageProcessingConfiguration / ColorCurves for ACES exposure, contrast, warm highlights and cool shadows

## LookDev contract
The versioned visual profile controls:
- exposure / contrast
- linear fog start / end / color
- sun intensity / color / azimuth / elevation
- sky, ground, cool-fill and warm-rim balance
- four-tone maple palette and three-tone ground palette
- water deep/shallow color, reflection, roughness, alpha and normal strength
- wood / roof / stone material families
- bloom, vignette, saturation, warm-highlight/cool-shadow grade and sharpening

Values persist in localStorage while tuning and can be copied as JSON for promotion into the checked-in baseline.

## Remote visual-regression contract
The screenshot plan is stored in `config/hf27-screenshot-plan.json`. Playwright captures deterministic 1200×675 frames for Spawn, Bridge, Pavilion, Forest, Character Front/Back, Equipment Closeup and Combat.

The metric stage compares captures against approved reference frames using Oklab distance, hue/chroma distributions, luminance percentiles, clipping ratios and cool/warm separation. Pixel-perfect comparison is not the primary gate for a real-time 3D scene; the purpose is to detect material, lighting and grading drift.

## Migration rule
Legacy HF26 source is a reference pool for gameplay logic and project-owned assets only. Do not copy the old renderer into this branch. Any required gameplay behavior must be ported behind Babylon-native scene, camera, asset, material and render ownership.
