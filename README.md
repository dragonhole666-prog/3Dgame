# 青嵐志 / Qinglan Webgame

Browser-based 3D xianxia game under active P0 rendering migration.

## Runtime architecture

The active runtime is **Babylon.js only**.

- Babylon.js 8
- TypeScript
- Vite
- WebGPU first when available
- Babylon WebGL2 fallback for compatibility and deterministic visual capture
- Babylon PBR materials, cascaded shadows, MirrorTexture water and DefaultRenderingPipeline
- no Three.js / TSL / React Three Fiber / three-stdlib compatibility layer

The architecture gate is:

```bash
npm run verify:babylon-only
```

## P0 visual target

The current art-direction target is a cinematic xianxia garden look with:

- reflective cyan-blue water dominating the foreground
- coral / vermilion maple framing
- warm timber pavilions and stone bridge
- layered blue-grey karst mountains
- pale cyan daylight and atmospheric depth
- restrained bloom and ACES tone mapping
- distinct PBR response for water, foliage, wood, roof and stone

Use `?lookdev=1` to open the runtime Babylon LookDev panel.

## Development

```bash
npm install
npm run verify:babylon-only
npm run typecheck
npm run build
npm test
npm run visual:capture
```

Active development branch: `hf27-remote-visual-pipeline`.

See `AGENTS.md` and `PROJECT_HANDOFF.md` before continuing substantial work.
