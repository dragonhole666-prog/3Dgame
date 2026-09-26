import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(root, 'package.json');
const runtimePath = path.join(root, 'public/assets/open/p022/runtime.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = readJson(packagePath);
if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version)) {
  throw new Error(`Invalid package version: ${String(pkg.version)}`);
}

const expectedRelease = `P${pkg.version}`;
const runtime = readJson(runtimePath);
if (!runtime || typeof runtime !== 'object' || !Array.isArray(runtime.candidates)) {
  throw new Error('VRM runtime registry is malformed; refusing to rewrite it.');
}

if (runtime.release === expectedRelease) {
  console.log(`Runtime release metadata already synchronized: ${expectedRelease}`);
  process.exit(0);
}

const previous = runtime.release;
runtime.release = expectedRelease;
const tmp = `${runtimePath}.tmp-${process.pid}`;
try {
  fs.writeFileSync(tmp, `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, runtimePath);
} finally {
  try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
}
console.log(`Runtime release metadata synchronized: ${String(previous)} -> ${expectedRelease}`);
