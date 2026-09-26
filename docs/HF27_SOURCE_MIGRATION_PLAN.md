# HF27 Authoritative Source Migration Plan

## Inventory observed from the HF26.5 Visual Reboot baseline

The extracted baseline contains approximately:
- 478 files total
- ~299 MB extracted
- 337 text/source/config files
- 1,691,928 bytes of text/source/config content

The size difference is dominated by binary assets such as VRM, GLB and PBR textures.

## Migration policy

### Phase A — authoritative code first
Move these into GitHub as ordinary source:
- src/
- server/
- cloudflare/
- tests/
- scripts/
- package-lock.json
- package.json
- tsconfig.json
- Vite / Wrangler / test configuration
- documentation and license manifests

This makes build logic, rendering logic, gameplay logic and verification rules portable across conversations.

### Phase B — reproducible third-party assets
Do not duplicate freely downloadable third-party binaries when they can be reproduced deterministically.

For Quaternius / Poly Haven assets:
- keep an asset registry
- record source URL / asset ID / license
- record expected local target path
- record SHA-256 when practical
- fetch through a versioned bootstrap script

This keeps Git history smaller and makes remote runners reproducible.

### Phase C — project-owned heavy assets
For project-specific VRM/GLB/textures that cannot be reproduced from a public source:
- keep an explicit manifest and checksum
- store them in an approved binary distribution location
- download them during remote bootstrap
- cache them in CI
- do not silently replace or regenerate them

A storage backend must be chosen before these assets become part of the remote release gate.

## Current connector constraint

The ChatGPT GitHub connector can create/update repository files and Git objects, but it does not expose a direct "upload this mounted local directory/archive into the repository" operation.

Therefore the migration is being staged rather than pretending the 299 MB project has already been transferred.

## Completion criteria

Source migration is complete only when:
1. package-lock.json is present.
2. src/client/core/game.ts is present.
3. server/index.ts is present.
4. cloudflare worker source/config is present.
5. scripts/verify-current.mjs is present.
6. tests are present.
7. remote npm ci succeeds.
8. typecheck/build/tests succeed in a remote runner.
9. the remote preview boots using the intended asset manifest.
