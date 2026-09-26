import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (relative:string) => fs.existsSync(path.join(root, relative));

describe('release package integrity', () => {
  it('ships every Python-GUI gate required for a clean local/network run', () => {
    for (const relative of [
      'QINGLAN_TEST_CENTER.py',
      'QINGLAN_TEST_CENTER.pyw',
      'scripts/verify-package-integrity.mjs',
      'scripts/verify-current.mjs',
      'scripts/verify-world-sync.mjs',
      'scripts/sync-runtime-release.mjs',
      'scripts/development-baseline.json',
      'tests/development-guard-r8.test.ts'
    ]) expect(exists(relative), relative).toBe(true);
  });

  it('does not ship legacy BAT/PowerShell launchers', () => {
    for (const relative of [
      'START_GAME.bat',
      'DEPLOY_CLOUDFLARE.bat',
      'scripts/start-game.ps1',
      'scripts/ensure-node-runtime.ps1'
    ]) expect(exists(relative), relative).toBe(false);
  });
});
