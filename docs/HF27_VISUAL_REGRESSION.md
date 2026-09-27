# HF27 Visual Regression Metrics

HF27 uses scene-level perceptual metrics rather than a strict pixel-equality gate. Real-time 3D rendering can differ slightly across GPU/browser combinations even when art direction is unchanged.

The current dependency-free analyzer accepts 8-bit RGB/RGBA, non-interlaced PNG files and reports:
- mean Oklab per-pixel distance
- median luminance drift
- mean chroma drift
- highlight-share drift
- shadow-share drift
- warm/cool balance drift

Thresholds live in `config/hf27-visual-thresholds.json`.

Example:

```
node scripts/hf27-visual-regression.mjs --reference artifacts/reference/bridge.png --candidate artifacts/hf27-screenshots/bridge.png --thresholds config/hf27-visual-thresholds.json --json artifacts/hf27-visual-report.json
```

This metric gate is intentionally only one layer. Human review of composition, material response, character readability and xianxia art direction remains required before accepting a visual baseline.
