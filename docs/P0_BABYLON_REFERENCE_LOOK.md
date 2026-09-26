# P0 Reference Look — Babylon.js

Primary visual target: the user-supplied xianxia promotional reference showing a reflective lake, coral maple canopy, stone arch bridge, warm Chinese pavilions and layered blue-grey mountains.

## What must match

### Composition
The target image is not merely a color palette.

The P0 hero view should read in this order:
1. reflective lake in the foreground
2. maple-framed left/right banks
3. stone arch bridge near the center
4. warm pavilion architecture in the middle distance
5. layered cyan / blue-grey mountains in atmospheric haze

Large empty flat terrain, random forests and generic fantasy composition are failures even if the colors are similar.

### Color hierarchy
Cold family:
- sky: pale cyan / blue
- water: deep cyan-blue with bright sky reflection
- atmospheric perspective: desaturated blue-grey
- deep shadows: cool-neutral rather than black

Warm family:
- maple foliage: vermilion, coral, orange-red, warm peach highlights
- timber: dark warm brown through amber highlights
- flower accents: controlled pink/magenta

Ground green is subordinate. It should support the warm/cool contrast and must not dominate the image.

### Lighting
- daylight key is warm-neutral, not orange sunset
- shadows remain open enough to preserve material detail
- cool sky/fill light separates silhouettes from warm foliage and architecture
- specular response on water and stone is visible without clipping large areas
- bloom is restrained and limited to bright reflections/highlights

### Atmospheric depth
Three depth layers are required:
- foreground: highest local contrast and saturation
- middle ground: architecture/bridge/maples with clear material separation
- background: lower contrast, blue-shifted mountains and mist

Fog should create depth without bleaching the whole scene.

### Water
Water is a hero material, not a flat blue plane.
Required cues:
- strong reflected sky
- reflected warm foliage
- dark deep-water body color
- bright shallow/reflection color
- low but non-zero roughness
- readable bridge reflection
- no plastic cyan appearance

### Foliage
Maple canopy should use at least four tonal families:
- deep shadow
- base vermilion/coral
- warm lit orange-red
- peach/coral highlight

Avoid one flat red material applied to every leaf mass.

### Architecture
Pavilion and bridge must remain warm/cool balanced:
- wood: dark warm brown with amber lit faces
- roof: slate blue-grey
- stone: warm grey with cool ambient side
- no saturated yellow "gold" unless used as a small metal accent

## P0 Reference Profile
The checked-in source of truth is:
- `src/rendering/referenceProfile.ts`

Runtime tuning:
- launch with `?lookdev=1`
- adjust the P0 Babylon LookDev panel
- copy JSON only after a fixed-camera screenshot is visually approved

## P0 Acceptance Gates
P0 visual architecture is accepted only when all are true:
- Babylon.js is the active renderer.
- WebGPU is attempted first with WebGL2 fallback.
- TypeScript typecheck passes in CI.
- Vite production build passes in CI.
- the Spawn / Bridge / Pavilion / Forest fixed cameras render deterministically.
- the reference-composition scene is visible without missing objects.
- `?lookdev=1` can tune the main art-direction parameters live.
- water reflection, warm/cool lighting, fog depth and bloom are independently tunable.
- visual regression can capture and compare PNG output.
- no new Three.js runtime rendering code is required for the P0 scene.

## Important scope boundary
P0 proves the new Babylon rendering/look-development foundation. Legacy gameplay, combat, inventory, networking, character animation and all historical content systems are separate migration work unless they are explicitly ported into this branch.
