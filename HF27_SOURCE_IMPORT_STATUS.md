# HF27 Source Import Status

## Verified local baseline
The mounted HF26.5 Visual Reboot full archive was extracted and used as the local integration baseline.

Local checks after the HF27 LookDev integration:
- `node scripts/verify-current.mjs` → PASS
- `node scripts/verify-package-integrity.mjs` → PASS
- HF27 JSON and Node script syntax checks → PASS
- focused TypeScript parse check found no HF27 errors other than unresolved third-party imports while `node_modules` is unavailable

## Current GitHub limitation
The GitHub branch currently contains the HF27 pipeline files and bootstrap entry files, but the complete HF26.5 source/assets have not yet been transferred into GitHub. The full project archive is roughly 299 MB extracted and includes many binary VRM/GLB/PBR assets.

Do not enable pull-request CI until the authoritative source tree is present. The workflow is intentionally `workflow_dispatch` only during this bootstrap stage.

## Next import target
Transfer source code, server, Cloudflare worker, tests, scripts, package-lock, and then externalize large binary assets into a reproducible asset pipeline rather than embedding all heavy binaries in ordinary Git commits.
